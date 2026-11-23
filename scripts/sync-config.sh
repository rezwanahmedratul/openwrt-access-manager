#!/bin/ash
# ==============================================================================
# OpenWrt Access Manager — Config Sync & Telemetry Client Script
# Periodically checks for updated firewall & ethers configs from the web panel,
# verifies checksums, performs pre-apply validation, backs up configs, applies,
# executes post-apply WAN connectivity checks with automatic rollback, reports
# deployment status, and publishes router heartbeat telemetry.
#
# Usage:
#   /root/sync-config.sh              # Normal sync cycle
#   /root/sync-config.sh heartbeat    # Send telemetry heartbeat only
#
# Crontab example (every 5 minutes):
#   */5 * * * * /root/sync-config.sh >> /tmp/sync-config.log 2>&1
#
# Environment / Configuration (edit below or pass via environment):
# ==============================================================================

# ── Configuration ─────────────────────────────────────────────────────────────
# Base URL of the Access Manager web panel (no trailing slash)
SERVER_URL="${ACCESS_MANAGER_URL:-http://10.0.0.75:3000}"

# Bearer token matching ROUTER_SECRET on the server
AUTH_TOKEN="${ROUTER_SECRET:-OpenWrt_Access_Manager_Secret_Token_2026}"

# Paths to the live config files on the router (allows override for testing)
FIREWALL_FILE="${FIREWALL_CONFIG:-/etc/config/firewall}"
ETHERS_FILE="${ETHERS_CONFIG:-/etc/ethers}"

# State directory for tracking applied hash, version, and last error
STATE_DIR="${STATE_DIRECTORY:-/tmp/access-manager}"
HASH_FILE="$STATE_DIR/last_config_hash"
VERSION_FILE="$STATE_DIR/last_config_version"
LAST_ERROR_FILE="$STATE_DIR/last_error"

# Temporary download directory
TMP_DIR="$STATE_DIR/downloads"

# Lock file to prevent concurrent runs
LOCK_FILE="$STATE_DIR/sync.lock"

# Maximum retries for HTTP requests
MAX_RETRIES=3
RETRY_DELAY=5

# Network timeout (seconds)
TRANSFER_TIMEOUT=30

# ── Logging ───────────────────────────────────────────────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# ── Cleanup & Lock Management ─────────────────────────────────────────────────
cleanup() {
    rm -rf "$TMP_DIR" 2>/dev/null
    rm -f "$LOCK_FILE" 2>/dev/null
}

trap cleanup EXIT INT TERM

acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        old_pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            log "Another instance (PID $old_pid) is already running. Exiting."
            trap - EXIT INT TERM
            exit 0
        fi
        log "Removing stale lock file (PID $old_pid no longer running)."
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"
}

# ── HTTP Client Helpers ───────────────────────────────────────────────────────
# Always passes Authorization: Bearer $AUTH_TOKEN

http_get() {
    _url="$1"
    _output="$2"
    _attempt=1

    while [ "$_attempt" -le "$MAX_RETRIES" ]; do
        rm -f "$_output" 2>/dev/null

        if command -v curl >/dev/null 2>&1; then
            if [ -n "$AUTH_TOKEN" ]; then
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -H "Authorization: Bearer $AUTH_TOKEN" \
                    -o "$_output" "$_url" 2>/dev/null
            else
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -o "$_output" "$_url" 2>/dev/null
            fi
        else
            # OpenWrt wget (uclient-fetch / busybox wget / gnu wget)
            if [ -n "$AUTH_TOKEN" ]; then
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    --header="Authorization: Bearer $AUTH_TOKEN" \
                    -O "$_output" "$_url" 2>/dev/null
            else
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    -O "$_output" "$_url" 2>/dev/null
            fi
        fi

        if [ -f "$_output" ] && [ -s "$_output" ]; then
            return 0
        fi

        log "  Attempt $_attempt/$MAX_RETRIES failed for $_url"
        _attempt=$(( _attempt + 1 ))
        [ "$_attempt" -le "$MAX_RETRIES" ] && sleep "$RETRY_DELAY"
    done

    log_error "All $MAX_RETRIES attempts failed for GET $_url"
    return 1
}

http_post() {
    _url="$1"
    _data="$2"
    _attempt=1

    while [ "$_attempt" -le "$MAX_RETRIES" ]; do
        if command -v curl >/dev/null 2>&1; then
            if [ -n "$AUTH_TOKEN" ]; then
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -X POST \
                    -H "Authorization: Bearer $AUTH_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$_data" \
                    "$_url" >/dev/null 2>&1 && return 0
            else
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -X POST \
                    -H "Content-Type: application/json" \
                    -d "$_data" \
                    "$_url" >/dev/null 2>&1 && return 0
            fi
        else
            if [ -n "$AUTH_TOKEN" ]; then
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    --header="Authorization: Bearer $AUTH_TOKEN" \
                    --header="Content-Type: application/json" \
                    --post-data="$_data" \
                    -O /dev/null "$_url" >/dev/null 2>&1 && return 0
            else
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    --header="Content-Type: application/json" \
                    --post-data="$_data" \
                    -O /dev/null "$_url" >/dev/null 2>&1 && return 0
            fi
        fi

        _attempt=$(( _attempt + 1 ))
        [ "$_attempt" -le "$MAX_RETRIES" ] && sleep "$RETRY_DELAY"
    done

    log_error "POST failed for $_url after $MAX_RETRIES attempts"
    return 1
}

# ── Validation ────────────────────────────────────────────────────────────────
validate_firewall() {
    _file="$1"
    if [ ! -s "$_file" ]; then
        log_error "Firewall config is empty or does not exist"
        return 1
    fi
    if grep -qiE '<html|<body|<error' "$_file"; then
        log_error "Firewall config contains HTML markup (server error page?)"
        return 1
    fi
    if ! grep -q "^config " "$_file"; then
        log_error "Firewall config missing 'config' directives — invalid UCI format"
        return 1
    fi
    if command -v uci >/dev/null 2>&1; then
        _parent_dir=$(dirname "$_file")
        if ! uci -c "$_parent_dir" show "$(basename "$_file")" >/dev/null 2>&1; then
            log_error "UCI parser failed to validate firewall configuration syntax"
            return 1
        fi
    fi
    return 0
}

validate_ethers() {
    _file="$1"
    if [ ! -f "$_file" ]; then
        log_error "Ethers file does not exist"
        return 1
    fi
    if grep -qiE '<html|<body|<error' "$_file"; then
        log_error "Ethers file contains HTML markup (server error page?)"
        return 1
    fi
    return 0
}

# ── Checksum Verification ─────────────────────────────────────────────────────
# Hashes: combined firewall:\n<firewallContent>\n---\nethers:\n<ethersContent>
verify_checksum() {
    _fw="$1"
    _eth="$2"
    _expected_hash="$3"

    _comb="$TMP_DIR/combined_check.txt"
    printf "firewall:\n" > "$_comb"
    cat "$_fw" >> "$_comb"
    printf "\n---\nethers:\n" >> "$_comb"
    cat "$_eth" >> "$_comb"

    _computed_hash=""
    if command -v sha256sum >/dev/null 2>&1; then
        _computed_hash=$(sha256sum "$_comb" | awk '{print $1}')
    elif command -v openssl >/dev/null 2>&1; then
        _computed_hash=$(openssl dgst -sha256 "$_comb" | awk '{print $NF}')
    else
        log_error "Neither sha256sum nor openssl available to verify checksum"
        rm -f "$_comb" 2>/dev/null
        return 1
    fi

    rm -f "$_comb" 2>/dev/null

    if [ "$_computed_hash" != "$_expected_hash" ]; then
        log_error "SHA256 checksum mismatch!"
        log_error "  Expected: $_expected_hash"
        log_error "  Computed: $_computed_hash"
        return 1
    fi

    log "  SHA256 checksum verified OK ($_computed_hash)"
    return 0
}

# ── Backup & Rollback ─────────────────────────────────────────────────────────
backup_config() {
    _src="$1"
    if [ -f "$_src" ]; then
        _backup="${_src}.bak"
        cp -f "$_src" "$_backup"
        log "  Backed up $_src -> $_backup"
    fi
}

rollback() {
    log_error "Rolling back to previous configuration (.bak)..."
    _rollback_failed=0
    for _f in "$FIREWALL_FILE" "$ETHERS_FILE"; do
        if [ -f "${_f}.bak" ]; then
            if cp -f "${_f}.bak" "$_f"; then
                log "  Restored $_f from backup"
            else
                log_error "  Failed to restore $_f from backup"
                _rollback_failed=1
            fi
        else
            log_error "  Backup file ${_f}.bak does not exist!"
            _rollback_failed=1
        fi
    done
    return $_rollback_failed
}

# ── Service Reloads ───────────────────────────────────────────────────────────
reload_firewall() {
    log "  Reloading firewall service..."
    if [ -x /etc/init.d/firewall ]; then
        /etc/init.d/firewall reload 2>/dev/null && return 0
    fi
    if command -v fw4 >/dev/null 2>&1; then
        fw4 reload 2>/dev/null && return 0
    fi
    if command -v fw3 >/dev/null 2>&1; then
        fw3 reload 2>/dev/null && return 0
    fi
    log "  Firewall reload command completed."
    return 0
}

reload_dnsmasq() {
    log "  Reloading dnsmasq service..."
    if [ -x /etc/init.d/dnsmasq ]; then
        /etc/init.d/dnsmasq reload 2>/dev/null && return 0
    fi
    log "  dnsmasq reload command completed."
    return 0
}

# ── Post-Apply Connectivity Test ──────────────────────────────────────────────
test_connectivity() {
    log "  Testing post-apply WAN connectivity..."
    if [ "${SKIP_CONNECTIVITY_TEST:-0}" = "1" ]; then
        log "  Skipping connectivity test (SKIP_CONNECTIVITY_TEST=1)"
        return 0
    fi

    _target="${CONNECTIVITY_TEST_HOST:-1.1.1.1}"
    if ping -c 2 -W 3 "$_target" >/dev/null 2>&1; then
        log "  WAN connectivity test passed (ping to $_target)"
        return 0
    fi

    if ping -c 2 -W 3 8.8.8.8 >/dev/null 2>&1; then
        log "  WAN connectivity test passed (ping to 8.8.8.8)"
        return 0
    fi

    # Fallback to server check
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f -k -m 5 -H "Authorization: Bearer $AUTH_TOKEN" "$SERVER_URL/api/config/version" >/dev/null 2>&1; then
            log "  WAN connectivity test passed (HTTP to $SERVER_URL)"
            return 0
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q -T 5 --no-check-certificate --header="Authorization: Bearer $AUTH_TOKEN" -O /dev/null "$SERVER_URL/api/config/version" 2>/dev/null; then
            log "  WAN connectivity test passed (HTTP to $SERVER_URL)"
            return 0
        fi
    fi

    log_error "WAN connectivity test failed!"
    return 1
}

# ── Deployment Status & Heartbeat Reporting ───────────────────────────────────
report_status() {
    _ver="$1"
    _status="$2"
    _err="${3:-}"

    _safe_err=$(echo "$_err" | sed 's/"/\\"/g' | tr -d '\n\r')
    _err_json="null"
    if [ -n "$_safe_err" ]; then
        _err_json="\"$_safe_err\""
    fi

    _status_payload=$(cat <<EOF
{
  "version": ${_ver:-0},
  "status": "${_status}",
  "error": ${_err_json}
}
EOF
)

    log "  Reporting status '$_status' for v$_ver to $SERVER_URL/api/config/status..."
    http_post "$SERVER_URL/api/config/status" "$_status_payload"
}

send_heartbeat() {
    _cfg_ver="${1:-0}"
    _err="${2:-}"

    _uptime=0
    if [ -f /proc/uptime ]; then
        _uptime=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
    fi

    _owrt_ver="OpenWrt"
    if [ -f /etc/openwrt_release ]; then
        _owrt_ver=$(grep 'DISTRIB_DESCRIPTION=' /etc/openwrt_release | cut -d"'" -f2 2>/dev/null || echo "OpenWrt")
    elif [ -f /etc/os-release ]; then
        _owrt_ver=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d'"' -f2 2>/dev/null || echo "Linux")
    fi

    _cpu_usage=0.0
    if [ -f /proc/loadavg ]; then
        _cpu_usage=$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0.0)
    fi

    _mem_usage=0.0
    if [ -f /proc/meminfo ]; then
        _mem_total=$(grep 'MemTotal:' /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)
        _mem_avail=$(grep 'MemAvailable:' /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)
        if [ "$_mem_avail" -eq 0 ] 2>/dev/null; then
            _mem_avail=$(grep 'MemFree:' /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)
        fi
        if [ "$_mem_total" -gt 0 ] 2>/dev/null; then
            _mem_usage=$(awk "BEGIN {printf \"%.1f\", (($_mem_total - $_mem_avail) / $_mem_total) * 100}" 2>/dev/null || echo 0.0)
        fi
    fi

    _disk_free=0
    if command -v df >/dev/null 2>&1; then
        _disk_free=$(df -k / 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)
    fi

    _wan_status="offline"
    if ping -c 1 -W 2 1.1.1.1 >/dev/null 2>&1 || ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
        _wan_status="online"
    fi

    _client_count=0
    if [ -f /tmp/dhcp.leases ]; then
        _client_count=$(wc -l < /tmp/dhcp.leases 2>/dev/null || echo 0)
    elif [ -f /proc/net/arp ]; then
        _client_count=$(awk 'NR>1 && $4!="00:00:00:00:00:00" {count++} END {print count+0}' /proc/net/arp 2>/dev/null || echo 0)
    fi

    _safe_err=$(echo "$_err" | sed 's/"/\\"/g' | tr -d '\n\r')
    _err_json="null"
    if [ -n "$_safe_err" ]; then
        _err_json="\"$_safe_err\""
    fi

    _hb_payload=$(cat <<EOF
{
  "uptime": ${_uptime:-0},
  "openwrt_version": "${_owrt_ver:-OpenWrt}",
  "config_version": ${_cfg_ver:-0},
  "cpu_usage": ${_cpu_usage:-0},
  "memory_usage": ${_mem_usage:-0},
  "disk_free": ${_disk_free:-0},
  "wan_status": "${_wan_status}",
  "client_count": ${_client_count:-0},
  "connected_clients": ${_client_count:-0},
  "last_error": ${_err_json},
  "last_sync_error": ${_err_json}
}
EOF
)

    log "  Reporting heartbeat to $SERVER_URL/api/config/heartbeat..."
    http_post "$SERVER_URL/api/config/heartbeat" "$_hb_payload"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════
main() {
    # If invoked only for heartbeat
    if [ "$1" = "heartbeat" ] || [ "$1" = "--heartbeat" ]; then
        mkdir -p "$STATE_DIR"
        _local_version=$(cat "$VERSION_FILE" 2>/dev/null || echo 0)
        _last_err=$(cat "$LAST_ERROR_FILE" 2>/dev/null || echo "")
        send_heartbeat "$_local_version" "$_last_err"
        exit 0
    fi

    log "─── Config sync started ───"
    mkdir -p "$STATE_DIR" "$TMP_DIR"
    acquire_lock

    _local_version=$(cat "$VERSION_FILE" 2>/dev/null || echo 0)
    _local_hash=$(cat "$HASH_FILE" 2>/dev/null || echo "")

    # ── Step 1: Check server version / hash ──────────────────────────────
    log "Checking config version at $SERVER_URL..."
    _version_file="$TMP_DIR/version.json"

    if ! http_get "$SERVER_URL/api/config/version" "$_version_file"; then
        log_error "Cannot reach server version endpoint — skipping cycle."
        echo "Failed to connect to $SERVER_URL/api/config/version" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Cannot reach server version endpoint"
        exit 1
    fi

    _remote_hash=$(cat "$_version_file" | sed 's/.*"hash"[[:space:]]*:[[:space:]]*"//' | sed 's/".*//')
    _remote_version=$(cat "$_version_file" | sed 's/.*"version"[[:space:]]*:[[:space:]]*//' | sed 's/[,}].*//' | tr -d ' "')

    if [ -z "$_remote_hash" ] || [ "$_remote_hash" = "null" ]; then
        log_error "Server returned no config hash. Response:"
        cat "$_version_file" >&2
        echo "Server returned invalid version payload" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Server returned invalid version payload"
        exit 1
    fi

    log "  Remote version: $_remote_version  hash: $_remote_hash"

    # ── Step 2: Compare with local hash ──────────────────────────────────
    if [ -n "$_remote_hash" ] && [ "$_remote_hash" = "$_local_hash" ]; then
        log "  Config unchanged (hash: $_remote_hash) — nothing to apply."
        rm -f "$LAST_ERROR_FILE" 2>/dev/null
        send_heartbeat "$_local_version" ""
        exit 0
    fi

    log "  Change detected (local: ${_local_hash:-<none>} remote: $_remote_hash) → downloading configs..."

    # ── Step 3: Download firewall config ─────────────────────────────────
    _fw_tmp="$TMP_DIR/firewall"
    if ! http_get "$SERVER_URL/api/config/firewall?download=true" "$_fw_tmp"; then
        log_error "Failed to download firewall config."
        report_status "$_remote_version" "failed" "Failed to download firewall config"
        echo "Failed to download firewall config" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Failed to download firewall config for v$_remote_version"
        exit 1
    fi
    log "  Downloaded firewall config ($(wc -c < "$_fw_tmp") bytes)"

    # ── Step 4: Download ethers config ───────────────────────────────────
    _eth_tmp="$TMP_DIR/ethers"
    if ! http_get "$SERVER_URL/api/config/ethers?download=true" "$_eth_tmp"; then
        log_error "Failed to download ethers config."
        report_status "$_remote_version" "failed" "Failed to download ethers config"
        echo "Failed to download ethers config" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Failed to download ethers config for v$_remote_version"
        exit 1
    fi
    log "  Downloaded ethers config ($(wc -c < "$_eth_tmp") bytes)"

    # ── Step 5: Pre-apply Validation ─────────────────────────────────────
    if ! validate_firewall "$_fw_tmp"; then
        log_error "Pre-apply firewall config validation failed — aborting."
        report_status "$_remote_version" "failed" "Pre-apply firewall validation failed"
        echo "Pre-apply firewall validation failed" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Pre-apply firewall validation failed for v$_remote_version"
        exit 1
    fi

    if ! validate_ethers "$_eth_tmp"; then
        log_error "Pre-apply ethers config validation failed — aborting."
        report_status "$_remote_version" "failed" "Pre-apply ethers validation failed"
        echo "Pre-apply ethers validation failed" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Pre-apply ethers validation failed for v$_remote_version"
        exit 1
    fi

    # ── Step 6: SHA256 Checksum Verification ─────────────────────────────
    if ! verify_checksum "$_fw_tmp" "$_eth_tmp" "$_remote_hash"; then
        log_error "Checksum verification failed — aborting."
        report_status "$_remote_version" "failed" "SHA256 checksum verification mismatch"
        echo "Checksum mismatch for v$_remote_version" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Checksum mismatch for v$_remote_version"
        exit 1
    fi

    log "  Validation and checksum passed."

    # ── Step 7: Backup Existing Configs ──────────────────────────────────
    backup_config "$FIREWALL_FILE"
    backup_config "$ETHERS_FILE"

    # ── Step 8: Apply New Configs ────────────────────────────────────────
    if ! cp -f "$_fw_tmp" "$FIREWALL_FILE"; then
        log_error "Failed to write $FIREWALL_FILE"
        rollback
        report_status "$_remote_version" "failed" "Failed to write $FIREWALL_FILE"
        echo "Failed to write $FIREWALL_FILE" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Failed to write firewall config"
        exit 1
    fi

    if ! cp -f "$_eth_tmp" "$ETHERS_FILE"; then
        log_error "Failed to write $ETHERS_FILE"
        rollback
        report_status "$_remote_version" "failed" "Failed to write $ETHERS_FILE"
        echo "Failed to write $ETHERS_FILE" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Failed to write ethers config"
        exit 1
    fi

    log "  Config files installed."

    # ── Step 9: Reload Services ──────────────────────────────────────────
    reload_firewall
    reload_dnsmasq

    # ── Step 10: Post-Apply Connectivity Test & Automatic Rollback ───────
    if ! test_connectivity; then
        log_error "Post-apply WAN connectivity test failed!"
        log_error "Initiating automatic rollback to previous configuration..."
        rollback
        reload_firewall
        reload_dnsmasq
        report_status "$_remote_version" "rolled_back" "Post-apply WAN connectivity test failed"
        echo "Rolled back v$_remote_version due to WAN connectivity failure" > "$LAST_ERROR_FILE"
        send_heartbeat "$_local_version" "Rolled back v$_remote_version due to WAN connectivity failure"
        exit 1
    fi

    # ── Step 11: Persist State & Report Success ──────────────────────────
    echo "$_remote_hash" > "$HASH_FILE"
    echo "$_remote_version" > "$VERSION_FILE"
    rm -f "$LAST_ERROR_FILE" 2>/dev/null

    report_status "$_remote_version" "applied"
    send_heartbeat "$_remote_version" ""

    log "─── Config sync complete (v$_remote_version applied successfully) ───"
}

main "$@"
