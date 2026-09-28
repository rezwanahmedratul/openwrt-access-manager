# OpenWrt MAC Access Manager

A production-ready web application for managing MAC-address-based internet access for an OpenWrt router with Supabase as its persistent database.

## Architecture

```text
                    Web Browser
                        │
                        ▼
                 Web Application
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
          Supabase            Configuration
           Database             Generator
              │                   │
              │            ┌──────┴──────┐
              │            ▼             ▼
              │        firewall       ethers
              │            │             │
              └────────────┴─────────────┘
                           │
                    Published Config
                           │
                           ▼
                      OpenWrt Router
                           │
                  Periodic version/hash
                       check
                           │
                    Download files
                           │
                           ▼
                  OpenWrt handles
                   everything else
```

The website is a **configuration management and publishing system**, not an OpenWrt management system. The server never connects or SSHs into OpenWrt.

---

## Features

- **Users & Multi-Group Association**: Name, canonical MAC address (`0C:F3:46:F3:CC:A9`), and multiple organizational groups.
- **Intelligent Normalization**:
  - **MAC**: Automatically converts non-canonical formats (`0cf346f3cca9`, `0c-f3-46-f3-cc-a9`, `0c:f3...`, etc.) into `0C:F3:46:F3:CC:A9`.
  - **Names**: Replaces spaces with underscores (`ratul ahmed` $\to$ `Ratul_Ahmed`), preserves hyphens (`TP-Link-Anik`), and trims excess whitespace.
- **Server-Side Draft State**:
  - Changes (`ADD`, `MODIFY`, `DELETE`) are queued in a server-side draft.
  - Changes persist across browser refreshes.
  - Step-by-step **Undo** and **Discard All Changes** workflows.
- **Deterministic Configuration Generation**:
  - `firewall`: Dynamic `list src_mac 'XX:XX:...'` entries under `Allow Internet Access`.
  - `ethers`: `MAC_ADDRESS NAME` format, deterministically sorted.
  - Common cryptographic SHA-256 hash for both files.
- **OpenWrt Router API**:
  - `GET /api/config/version` - Checks latest published version and hash.
  - `GET /api/config/firewall` - Raw plain-text firewall configuration.
  - `GET /api/config/ethers` - Raw plain-text ethers configuration.
  - Protected with Bearer token authentication (`Authorization: Bearer <ROUTER_SECRET>`).

---

## Environment Variables

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Router Authentication
ROUTER_SECRET=your-secret-token-here
```

---

## Database Setup (Supabase)

Execute the SQL script located in `supabase/schema.sql` in your Supabase SQL Editor:

1. Creates `users`, `groups`, `user_groups`, `drafts`, `draft_changes`, and `configurations` tables.
2. Configures constraints, indexes, and Row Level Security (RLS) policies.
3. Seeds initial organizational groups.

---

## OpenWrt Client Script Example

Place this lightweight script on your OpenWrt router (e.g. `/root/sync_access.sh`) and add it to `crontab`:

```bash
#!/bin/sh
API_URL="https://your-domain.com/api/config"
ROUTER_SECRET="your-secret-token-here"
LOCAL_HASH_FILE="/etc/config/.access_manager_hash"

CURRENT_HASH=""
[ -f "$LOCAL_HASH_FILE" ] && CURRENT_HASH=$(cat "$LOCAL_HASH_FILE")

# Check version/hash
RESPONSE=$(curl -s -H "Authorization: Bearer $ROUTER_SECRET" "$API_URL/version")
NEW_HASH=$(echo "$RESPONSE" | grep -o '"hash":"[^"]*' | cut -d'"' -f4)

if [ -n "$NEW_HASH" ] && [ "$NEW_HASH" != "$CURRENT_HASH" ]; then
    echo "New configuration detected: $NEW_HASH"
    
    # Download firewall and ethers
    curl -s -H "Authorization: Bearer $ROUTER_SECRET" "$API_URL/firewall" -o /etc/config/firewall.new
    curl -s -H "Authorization: Bearer $ROUTER_SECRET" "$API_URL/ethers" -o /etc/ethers.new
    
    # Validate and apply
    mv /etc/config/firewall.new /etc/config/firewall
    mv /etc/ethers.new /etc/ethers
    echo "$NEW_HASH" > "$LOCAL_HASH_FILE"
    
    /etc/init.d/firewall reload
    /etc/init.d/dnsmasq restart
    echo "Configuration successfully updated."
fi
```
