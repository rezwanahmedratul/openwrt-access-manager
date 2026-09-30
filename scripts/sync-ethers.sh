#!/bin/ash
# ==============================================================================
# OpenWrt Access Manager — Ethers Sync Script
# Periodically checks for updated ethers (MAC-IP bindings / static leases) config
# from the web panel and applies it to the router when changes are detected.
#
# NOTE: This script ONLY manages /etc/ethers and reloads dnsmasq.
#       It does NOT touch /etc/config/firewall or reload any firewall services.
#
# Usage:
#   /root/sync-ethers.sh
#
# Crontab example (every 5 minutes):
#   */5 * * * * /root/sync-ethers.sh >> /tmp/sync-ethers.log 2>&1
#
# Environment / Configuration (edit below):
# ==============================================================================

# ── Configuration ─────────────────────────────────────────────────────────────
# Base URL of the Access Manager web panel (no trailing slash)
SERVER_URL="${ACCESS_MANAGER_URL:-https://server.example}"

# Bearer token matching ROUTER_SECRET on the server
AUTH_TOKEN="${ROUTER_SECRET:-openwrt-secret-token-change-in-production}"

# Path to the live ethers config file on the router (allows override for testing)
ETHERS_FILE="${ETHERS_CONFIG:-/etc/ethers}"

# Where we store the last-known config hash to detect changes
STATE_DIR="${STATE_DIRECTORY:-/tmp/access-manager}"
HASH_FILE="$STATE_DIR/last_ethers_hash"

# Temporary download directory
TMP_DIR="$STATE_DIR/downloads_ethers"

# Lock file to prevent concurrent runs
LOCK_FILE="$STATE_DIR/sync-ethers.lock"

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

# Ensure cleanup runs on exit, interrupt, or termination
trap cleanup EXIT INT TERM

# Prevent concurrent runs
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        # Check if the PID in the lock file is still running
        old_pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            log "Another instance (PID $old_pid) is already running. Exiting."
            # Remove trap so we don't delete the other process's lock
            trap - EXIT INT TERM
            exit 0
        fi
        # Stale lock — remove it
        log "Removing stale lock file (PID $old_pid no longer running)."
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"
}

# ── HTTP Fetch with Retries ───────────────────────────────────────────────────
# Usage: http_get <url> <output_file> [auth]
# Returns 0 on success, 1 on failure
http_get() {
    _url="$1"
    _output="$2"
    _use_auth="${3:-auth}"
    _attempt=1

    while [ "$_attempt" -le "$MAX_RETRIES" ]; do
        rm -f "$_output" 2>/dev/null

        if command -v curl >/dev/null 2>&1; then
            if [ -n "$AUTH_TOKEN" ] && [ "$_use_auth" = "auth" ]; then
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -H "Authorization: Bearer $AUTH_TOKEN" \
                    -o "$_output" "$_url" 2>/dev/null
            else
                curl -s -f -k -m "$TRANSFER_TIMEOUT" \
                    -o "$_output" "$_url" 2>/dev/null
            fi
        else
            # OpenWrt wget (compatible with BusyBox wget, uclient-fetch, and GNU wget)
            if [ -n "$AUTH_TOKEN" ] && [ "$_use_auth" = "auth" ]; then
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    --header="Authorization: Bearer $AUTH_TOKEN" \
                    -O "$_output" "$_url" 2>/dev/null
            else
                wget -q -T "$TRANSFER_TIMEOUT" --no-check-certificate \
                    -O "$_output" "$_url" 2>/dev/null
            fi
        fi

        # Verify output file exists and has non-zero size
        if [ -f "$_output" ] && [ -s "$_output" ]; then
            return 0
        fi

        log "  Attempt $_attempt/$MAX_RETRIES failed for $_url"
        _attempt=$(( _attempt + 1 ))
        [ "$_attempt" -le "$MAX_RETRIES" ] && sleep "$RETRY_DELAY"
    done

    log_error "All $MAX_RETRIES attempts failed for $_url"
    return 1
}

# ── Validate Downloaded Config ────────────────────────────────────────────────
# Basic sanity checks to avoid applying corrupt files
validate_ethers() {
    _file="$1"
    # File must exist
    if [ ! -f "$_file" ]; then
        log_error "Ethers file does not exist"
        return 1
    fi
    # Detect HTML error pages returned by web servers / reverse proxies
    if grep -qiE '<html|<body|<error' "$_file"; then
        log_error "Ethers file contains HTML markup (server error page?)"
        return 1
    fi
    return 0
}

# ── Backup Existing Config ────────────────────────────────────────────────────
backup_config() {
    _src="$1"
    if [ -f "$_src" ]; then
        _backup="${_src}.bak"
        cp -f "$_src" "$_backup"
        log "  Backed up $_src -> $_backup"
    fi
}

# ── Rollback on Failure ───────────────────────────────────────────────────────
rollback() {
    log_error "Rolling back to previous ethers configuration..."
    if [ -f "${ETHERS_FILE}.bak" ]; then
        cp -f "${ETHERS_FILE}.bak" "$ETHERS_FILE"
        log "  Restored $ETHERS_FILE from backup"
        # Reload dnsmasq to re-read the restored backup
        if /etc/init.d/dnsmasq reload 2>/dev/null; then
            log "  dnsmasq reloaded with backup config."
        fi
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════
main() {
    log "─── Ethers config sync started ───"

    # Setup directories
    mkdir -p "$STATE_DIR" "$TMP_DIR"

    # Acquire lock
    acquire_lock

    # ── Step 1: Check server version / hash ──────────────────────────────
    log "Checking config version at $SERVER_URL..."
    _version_file="$TMP_DIR/version.json"

    if ! http_get "$SERVER_URL/api/config/version" "$_version_file" "auth"; then
        log_error "Cannot reach server — skipping this cycle."
        exit 1
    fi

    # Parse the JSON response (lightweight: use awk/sed since jq may not exist)
    _remote_hash=$(cat "$_version_file" | sed 's/.*"hash"[[:space:]]*:[[:space:]]*"//' | sed 's/".*//')
    _remote_version=$(cat "$_version_file" | sed 's/.*"version"[[:space:]]*:[[:space:]]*//' | sed 's/[,}].*//' | tr -d ' "')

    if [ -z "$_remote_hash" ] || [ "$_remote_hash" = "null" ]; then
        log_error "Server returned no config hash (no published config?). Response:"
        cat "$_version_file" >&2
        exit 1
    fi

    log "  Remote version: $_remote_version  hash: $_remote_hash"

    # ── Step 2: Compare with local hash ──────────────────────────────────
    _local_hash=""
    if [ -f "$HASH_FILE" ]; then
        _local_hash=$(cat "$HASH_FILE" 2>/dev/null)
    fi

    if [ -n "$_remote_hash" ] && [ "$_remote_hash" = "$_local_hash" ]; then
        log "  Ethers config unchanged (hash: $_remote_hash) — nothing to do."
        exit 0
    fi

    log "  Change detected (local: ${_local_hash:-<none>}  remote: $_remote_hash)  →  downloading ethers config..."

    # ── Step 3: Download ethers config ───────────────────────────────────
    _eth_tmp="$TMP_DIR/ethers"
    if ! http_get "$SERVER_URL/api/config/ethers?download=true" "$_eth_tmp"; then
        log_error "Failed to download ethers config."
        exit 1
    fi
    log "  Downloaded ethers config ($(wc -c < "$_eth_tmp") bytes)"

    # ── Step 4: Validate download ────────────────────────────────────────
    if ! validate_ethers "$_eth_tmp"; then
        log_error "Ethers config validation failed — aborting."
        exit 1
    fi

    log "  Ethers config passed validation."

    # ── Step 5: Backup current ethers config ─────────────────────────────
    backup_config "$ETHERS_FILE"

    # ── Step 6: Replace ethers file ──────────────────────────────────────
    if ! cp -f "$_eth_tmp" "$ETHERS_FILE"; then
        log_error "Failed to write $ETHERS_FILE"
        rollback
        exit 1
    fi

    log "  $ETHERS_FILE replaced successfully."

    # ── Step 7: Reload dnsmasq service ───────────────────────────────────
    log "  Reloading dnsmasq..."
    if /etc/init.d/dnsmasq reload 2>/dev/null; then
        log "  dnsmasq reloaded OK."
    elif killall -HUP dnsmasq 2>/dev/null; then
        log "  dnsmasq reloaded via SIGHUP OK."
    else
        log_error "Could not reload dnsmasq — manual restart may be needed."
    fi

    # ── Step 8: Persist the new hash ─────────────────────────────────────
    echo "$_remote_hash" > "$HASH_FILE"
    log "  Saved new ethers config hash."

    log "─── Ethers sync complete (v$_remote_version applied) ───"
}

main "$@"
