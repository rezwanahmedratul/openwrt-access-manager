<div align="center">
  <img src="docs/banner.jpg" alt="OpenWrt Access Manager" width="100%" />

  <br />
  <br />

  **A web-based MAC address access control panel for OpenWrt routers.**
  
  Manage who can access the internet on your network — from any device, anywhere.

  <br />

  ![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
  ![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=flat-square&logo=supabase)
  ![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=flat-square&logo=redis)
  ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
  ![OpenWrt](https://img.shields.io/badge/OpenWrt-Compatible-00B5E2?style=flat-square&logo=openwrt)
  ![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Set Up Supabase](#1-set-up-supabase)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Run Locally](#3-run-locally)
- [Deployment](#deployment)
  - [Vercel (Cloud / Serverless)](#vercel-cloud--serverless)
  - [Docker (Standalone / Self-Hosted)](#docker-standalone--self-hosted)
  - [Manual Deployment](#manual-deployment)
- [OpenWrt Router Setup](#openwrt-router-setup)
  - [Install Sync Script](#install-sync-script)
  - [Configure Cron Job](#configure-cron-job)
  - [Verify](#verify)
- [API Reference](#api-reference)
- [Role-Based Access Control](#role-based-access-control)
- [Configuration Generator](#configuration-generator)
- [Caching](#caching)
- [Default Credentials](#default-credentials)

---

## Overview

**OpenWrt Access Manager** is a self-hosted web application that lets you control which devices can access the internet on your OpenWrt-powered network. Instead of SSHing into your router and manually editing firewall rules, you manage everything through a clean dashboard — add users by MAC address, organize them into groups, toggle internet access, and publish changes that your router automatically picks up.

### The Problem

Managing MAC-based internet access on OpenWrt typically requires:

- SSH access to the router
- Manually editing `/etc/config/firewall` and `/etc/ethers`
- Understanding UCI syntax
- Restarting services after every change
- No audit trail, no undo, no multi-user access

### The Solution

This application provides a web UI that:

1. **Manages users/devices** by name and MAC address
2. **Generates valid OpenWrt firewall & ethers configurations** automatically
3. **Publishes versioned configs** that your router pulls via a cron job
4. **Supports multiple admin accounts** with role-based permissions
5. **Tracks change history** with full version audit trail

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                        YOUR NETWORK                          │
│                                                              │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────┐  │
│  │   OpenWrt    │────▶│  Access Manager  │◀────│ Supabase │  │
│  │   Router     │     │   (Next.js)      │     │    DB    │  │
│  │             │     │                  │     │          │  │
│  │  Cron job    │     │  - Dashboard     │     │  Users   │  │
│  │  pulls new   │     │  - User mgmt     │     │  Groups  │  │
│  │  configs     │     │  - Config gen    │     │  Configs │  │
│  │  every 5 min │     │  - Version ctrl  │     │  Drafts  │  │
│  └─────────────┘     └──────────────────┘     └──────────┘  │
│                                                              │
│  Flow:                                                       │
│  1. Admin adds/modifies users in the web panel               │
│  2. Changes are staged as "drafts" (pending changes)         │
│  3. Admin clicks "Apply" to publish a new config version     │
│  4. Router's cron job detects the new version (hash check)   │
│  5. Router downloads firewall + ethers files                 │
│  6. Router validates, backs up, replaces, and reloads        │
└──────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow

1. **Admin logs in** to the web dashboard
2. **Adds/edits/deletes users** — each user has a name, MAC address, and group assignments
3. Changes are saved as **draft changes** (staged, not yet live)
4. Admin reviews pending changes and clicks **"Apply"**
5. The server:
   - Executes all draft operations (ADD/MODIFY/DELETE) against the database
   - Generates deterministic `firewall` and `ethers` config files
   - Computes a SHA-256 hash of the combined configs
   - Publishes a new versioned configuration record
   - Clears the draft queue
6. The **OpenWrt router** runs a cron job (`sync-config.sh`) that:
   - Checks `/api/config/version` for the current config hash
   - Compares it to the last-known local hash
   - If changed: downloads new configs, validates, backs up old ones, replaces, and reloads services

---

## Features

| Feature | Description |
|---|---|
| **User Management** | Add, edit, delete devices by name and MAC address |
| **Group System** | Organize users into groups (Family, Guests, Students, etc.) |
| **No-Internet Groups** | Mark groups as "No Internet" to block all devices in that group |
| **MAC Authentication Toggle** | Enable/disable MAC filtering globally (with RBAC controls) |
| **Draft System** | Stage changes before applying — review, undo, then publish |
| **Version History** | Full audit trail of every published configuration |
| **Config Preview** | Download and preview generated firewall/ethers files |
| **Role-Based Access** | Admin and Subadmin roles with granular permission levels |
| **Account Management** | Admins can create/delete subadmin accounts |
| **Password Management** | Admins can change passwords for both admin and subadmin accounts |
| **Auto-Sync to Router** | Cron-based script on the router pulls changes automatically |
| **Dark / Light Theme** | System-aware theme with manual toggle |
| **Responsive Design** | Works on desktop, tablet, and mobile (bottom nav on mobile) |
| **Redis & Memory Caching** | Optional Redis cache with automated zero-config in-memory fallback |
| **MAC Normalization** | Accepts MAC addresses in any format (colon, dash, dot, raw) |
| **Dual Deployment Ready** | 100% dual-compatible: deploy on Vercel Serverless or standalone Docker |

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Next.js Application                  │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │  API Routes  │  │   Libraries  │ │
│  │              │  │              │  │              │ │
│  │  page.tsx    │  │  /users      │  │  auth.ts     │ │
│  │  (React SPA) │  │  /groups     │  │  cache.ts    │ │
│  │              │  │  /draft      │  │  config-     │ │
│  │  Dashboard   │  │  /apply      │  │  generator   │ │
│  │  Users tab   │  │  /accounts   │  │  supabase.ts │ │
│  │  Groups tab  │  │  /config/*   │  │  types.ts    │ │
│  │  Settings    │  │  /auth/*     │  │  mock-store  │ │
│  │  History     │  │  /system/*   │  │              │ │
│  └──────────────┘  └──────┬───────┘  └──────────────┘ │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
        │  Supabase  │ │  Redis  │ │  In-Memory  │
        │ (Postgres) │ │ (Cache) │ │  Fallback   │
        │            │ │ Optional│ │  (Default)  │
        └────────────┘ └─────────┘ └─────────────┘
```

---

## Project Structure

```
access-manager/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── accounts/       # Admin account management (CRUD)
│   │   │   ├── apply/          # Publish draft changes → new config version
│   │   │   ├── auth/
│   │   │   │   ├── login/      # Credential authentication
│   │   │   │   ├── logout/     # Session termination
│   │   │   │   └── me/         # Current session info
│   │   │   ├── config/
│   │   │   │   ├── ethers/     # Generated /etc/ethers content
│   │   │   │   ├── firewall/   # Generated /etc/config/firewall content
│   │   │   │   ├── history/    # Version history of published configs
│   │   │   │   ├── mac-auth/   # MAC authentication toggle
│   │   │   │   └── version/    # Current config version + hash (for router)
│   │   │   ├── draft/          # Draft/pending changes management
│   │   │   ├── groups/         # User group CRUD
│   │   │   ├── system/
│   │   │   │   └── status/     # Cache diagnostics + flush
│   │   │   └── users/          # User/device CRUD
│   │   ├── globals.css         # Full design system (dark/light themes)
│   │   ├── layout.tsx          # Root layout with theme detection
│   │   └── page.tsx            # Main SPA (dashboard, users, groups, settings)
│   ├── lib/
│   │   ├── auth.ts             # Session token encoding/decoding
│   │   ├── cache.ts            # Redis + in-memory fallback cache
│   │   ├── config-generator.ts # Deterministic firewall/ethers generation
│   │   ├── mock-store.ts       # In-memory data store (no-DB mode)
│   │   ├── normalize-mac.ts    # MAC address format normalization
│   │   ├── normalize-name.ts   # Username formatting
│   │   ├── supabase.ts         # Supabase client factory
│   │   └── types.ts            # TypeScript type definitions
│   └── utils/supabase/         # Supabase SSR helpers
├── scripts/
│   └── sync-config.sh          # OpenWrt router sync script (ash-compatible)
├── supabase/
│   ├── schema.sql              # Full database schema + seeds
│   └── migration.sql           # Schema migration
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # App + Redis deployment
├── .env.example                # Environment variable template
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** (for local development)
- **A Supabase project** (free tier works perfectly) — or run without it using the built-in mock store
- **An OpenWrt router** (for actual deployment to a network)

### 1. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. This creates all tables, indexes, seed data (default groups + admin account), and RLS policies

> **💡 No Supabase?** The app works without Supabase using an in-memory mock store. Data won't persist across restarts, but it's great for testing.

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Router Authentication Secret (shared between server and router script)
ROUTER_SECRET=your-secure-secret-here

# Redis (Optional — falls back to in-memory cache)
REDIS_URL=redis://127.0.0.1:6379
```

### 3. Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the default credentials.

---

## Deployment

The application is built with **100% dual-compatibility**: you can deploy it as a serverless web app on **Vercel** or self-host it on a Linux server using **Docker**.

### Vercel (Cloud / Serverless)

Deploying to Vercel provides a globally distributed, zero-maintenance HTTPS endpoint for both your web dashboard and OpenWrt router polling.

#### 1. Import to Vercel

1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset will automatically be recognized as **Next.js**.

#### 2. Configure Environment Variables in Vercel

In the Vercel project configuration screen under **Environment Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Your Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for backend API operations) |
| `ROUTER_SECRET` | Yes | Shared secret string for OpenWrt router synchronization |
| `REDIS_URL` | Optional | Remote Redis URL (e.g. Upstash Redis). If omitted, the app uses built-in in-memory caching |

> **💡 Serverless Caching Note:** If `REDIS_URL` is omitted on Vercel, the app automatically runs its high-speed in-memory cache without errors or connection delays. For distributed caching across multiple edge instances, connect a free [Upstash Redis](https://upstash.com) integration on Vercel.

#### 3. Deploy

Click **Deploy**. Once built, Vercel will provide your live production URL (e.g., `https://mac.yourdomain.com` or `https://openwrt-access-manager.vercel.app`).

---

### Docker (Standalone / Self-Hosted)

The project includes a multi-stage Dockerfile and docker-compose configuration for standalone VPS or local server deployment.

#### Quick Deploy

```bash
# Clone the repository
git clone https://github.com/your-username/openwrt-access-manager.git
cd openwrt-access-manager

# Create your environment file
cp .env.example .env.local

# Edit with your Supabase credentials and router secret
nano .env.local

# Build and start
docker compose up -d --build
```

The app will be available at `http://your-server-ip:3000`.

#### What Docker Compose Includes

| Service | Image | Purpose |
|---|---|---|
| `app` | `node:20-slim` (custom build) | Next.js application (standalone mode) |
| `redis` | `redis:7-alpine` | Optional cache layer with persistence |

#### Build Arguments

The Supabase public keys are baked into the Next.js client bundle at build time:

```bash
docker compose build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Or set them in your `.env.local` file (docker-compose reads them automatically).

#### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ROUTER_SECRET` | Yes | Shared secret for router API authentication |
| `REDIS_URL` | No | Redis connection URL (defaults to in-memory cache) |
| `PORT` | No | Server port (default: `3000`) |

### Manual Deployment

```bash
# Install dependencies
npm ci

# Build the production bundle
npm run build

# Start the production server
node .next/standalone/server.js
```

---

## OpenWrt Router Setup

The router uses a lightweight ash script ([`scripts/sync-config.sh`](scripts/sync-config.sh)) that periodically checks for configuration updates and applies them.

### Quick Install (Run directly on Router)

SSH into your OpenWrt router (`ssh root@192.168.1.1`) and execute:

```bash
# 1. Download the script to your router
wget --no-check-certificate -O /root/sync-config.sh https://raw.githubusercontent.com/rezwanahmedratul/openwrt-access-manager/main/scripts/sync-config.sh

# 2. Make it executable
chmod +x /root/sync-config.sh

# 3. Test run it manually once
/root/sync-config.sh

# 4. Add to crontab to run every 2 minutes
(crontab -l 2>/dev/null; echo "*/2 * * * * /root/sync-config.sh >> /tmp/sync-config.log 2>&1") | crontab -
```

### Script Configuration

Edit `/root/sync-config.sh` on the router (`vi /root/sync-config.sh`) to ensure `SERVER_URL` and `AUTH_TOKEN` point to your deployment:

```bash
# Base URL of the Access Manager web panel (no trailing slash)
SERVER_URL="https://mac.ratul.fun"  # or your Vercel URL / server IP:port

# Bearer token — must match ROUTER_SECRET on the server
AUTH_TOKEN="your-secure-secret-here"

# Paths to live config files on the router
FIREWALL_FILE="/etc/config/firewall"
ETHERS_FILE="/etc/ethers"
```

After editing, restart cron to ensure scheduled executions run smoothly:

```bash
/etc/init.d/cron restart
```

### How the Sync Script Works

```
┌────────────────────────────────────────────────────┐
│              sync-config.sh execution              │
│                                                    │
│  1. Acquire lock (prevent concurrent runs)         │
│  2. GET /api/config/version → remote hash          │
│  3. Compare with /tmp/access-manager/last_hash     │
│     ├── Same → exit (nothing to do)                │
│     └── Different → continue ↓                     │
│  4. Download /api/config/firewall                  │
│  5. Download /api/config/ethers                    │
│  6. Validate both files (structure checks)         │
│  7. Backup current configs (.bak)                  │
│  8. Replace firewall + ethers files                │
│  9. Reload firewall service (fw3/fw4)              │
│ 10. Reload dnsmasq                                 │
│ 11. Save new hash to disk                          │
│                                                    │
│  On failure after backup: auto-rollback            │
└────────────────────────────────────────────────────┘
```

### Script Features

- **Pure ash** — no bash, jq, or non-busybox dependencies
- **Lock file** with stale-PID detection
- **3 retries** with 5-second delays per HTTP request
- **Validation** before applying (rejects empty/malformed configs)
- **Automatic backup** of current configs before replacement
- **Rollback** on write failure
- **Compatible with fw3 and fw4** firewall backends

### Verify

Run the script manually to test:

```bash
/root/sync-config.sh
```

Check the log:

```bash
cat /tmp/sync-config.log
```

Expected output on success:

```
[2025-01-15 10:30:00] ─── Config sync started ───
[2025-01-15 10:30:01] Checking config version at http://192.168.1.100:3000...
[2025-01-15 10:30:01]   Remote version: 3  hash: a1b2c3d4...
[2025-01-15 10:30:01]   Change detected (local: <none>)  →  downloading new configs...
[2025-01-15 10:30:02]   Downloaded firewall config (2847 bytes)
[2025-01-15 10:30:02]   Downloaded ethers config (156 bytes)
[2025-01-15 10:30:02]   Both configs passed validation.
[2025-01-15 10:30:02]   Backed up /etc/config/firewall -> /etc/config/firewall.bak
[2025-01-15 10:30:02]   Backed up /etc/ethers -> /etc/ethers.bak
[2025-01-15 10:30:02]   Config files replaced successfully.
[2025-01-15 10:30:03]   Firewall reloaded OK.
[2025-01-15 10:30:03]   dnsmasq reloaded OK.
[2025-01-15 10:30:03]   Saved new config hash.
[2025-01-15 10:30:03] ─── Config sync complete (v3 applied) ───
```

---

## API Reference

All API routes are under `/api/`. Router-facing endpoints use Bearer token authentication. Dashboard endpoints use cookie-based session authentication.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Login with username/password |
| `POST` | `/api/auth/logout` | Session | End current session |
| `GET` | `/api/auth/me` | Session | Get current user info |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Session | List all users with groups |
| `POST` | `/api/users` | Session | Create a new user |
| `DELETE` | `/api/users?id=<uuid>` | Session | Delete a user |

### Groups

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/groups` | Session | List all groups |
| `POST` | `/api/groups` | Session | Create a new group |
| `DELETE` | `/api/groups?id=<uuid>` | Session | Delete a group |

### Draft Changes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/draft` | Session | Get pending draft changes |
| `POST` | `/api/draft` | Session | Add a draft change (ADD/MODIFY/DELETE) |
| `DELETE` | `/api/draft?id=<uuid>` | Session | Remove a specific draft change |

### Configuration

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/apply` | Session | Apply all pending changes → publish new version |
| `GET` | `/api/config/version` | Bearer | Current config version + SHA-256 hash |
| `GET` | `/api/config/firewall` | Bearer or `?download=true` | Generated firewall config |
| `GET` | `/api/config/ethers` | Bearer or `?download=true` | Generated ethers config |
| `GET` | `/api/config/history` | Session | List all published config versions |
| `GET` | `/api/config/mac-auth` | Session | Get MAC auth status |
| `POST` | `/api/config/mac-auth` | Session | Toggle MAC authentication |

### Accounts & System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/accounts` | Admin | List all accounts |
| `POST` | `/api/accounts` | Admin | Create a subadmin account |
| `PATCH` | `/api/accounts` | Admin | Change password for admin or subadmin accounts |
| `DELETE` | `/api/accounts?id=<uuid>` | Admin | Delete a subadmin account |
| `GET` | `/api/system/status` | Session | Cache engine status + diagnostics |
| `POST` | `/api/system/status` | Admin | Flush all caches |

---

## Role-Based Access Control

The application supports two roles with different permission levels:

| Capability | Admin | Subadmin |
|---|---|---|
| View dashboard & stats | ✅ | ✅ |
| Add / edit / delete users | ✅ | ✅ |
| Manage groups | ✅ | ✅ |
| Apply pending changes | ✅ | ✅ |
| View config history | ✅ | ✅ |
| Download configs | ✅ | ✅ |
| Disable MAC auth permanently | ✅ | ❌ |
| Disable MAC auth temporarily | ✅ | ✅ (max 30 days) |
| Manage subadmin accounts | ✅ | ❌ |
| Change account passwords | ✅ (Admin & Subadmins) | ❌ |
| View accounts list | ✅ | ❌ |
| Flush system cache | ✅ | ❌ |

---

## Configuration Generator

The config generator (`src/lib/config-generator.ts`) produces deterministic OpenWrt configuration files:

### Firewall Config

Generates a complete `/etc/config/firewall` with:

- Standard base rules (DHCP, ping, IGMP, IPv6, IPSec)
- LAN and WAN zone definitions with hardware flow offloading
- Per-user `Allow Internet Access` rule (by MAC address)
- Per-user `Block Internet` rule for users in no-internet groups
- Forwarding section controlled by MAC auth toggle:
  - **MAC auth ON** → `option dest 'unspecified'` (only listed MACs get internet)
  - **MAC auth OFF** → `option dest 'wan'` (all devices get internet)

### Ethers Config

Generates `/etc/ethers` in standard format:

```
AA:BB:CC:DD:EE:FF  John's Phone
11:22:33:44:55:66  Living Room TV
```

### Determinism

- Users are sorted by MAC address (firewall) or name (ethers) for reproducible output
- A SHA-256 hash of the combined configs ensures change detection is reliable
- The router only downloads new files when the hash changes

---

## Caching

The application includes a two-tier caching system (`src/lib/cache.ts`):

| Tier | Engine | Latency | Persistence | Requirement |
|---|---|---|---|---|
| Primary | Redis | ~1ms | Disk-backed | Optional (`REDIS_URL`) |
| Fallback | In-Memory Map | ~0ms | None (process lifetime) | Always available |

- All cache operations have **100ms timeout failsafes** — if Redis is slow or down, the app instantly falls back to memory
- Cache is automatically invalidated when data is mutated (POST/DELETE operations)
- Cache keys use prefixes (`cache:users:`, `cache:config:`, etc.) for targeted invalidation
- Periodic memory store purge runs every 60 seconds to clean expired entries

---

## Default Credentials

When first initialized via database seed:

| Username | Initial Password | Role | Password Modification |
|---|---|---|---|
| `admin` | `admin123` | Admin | Admin only (via UI or API) |
| `subadmin` | `subadmin123` | Subadmin | Admin only (via UI or API) |

> 🔒 **Security Notice:** The login screen does not expose or auto-fill credentials. Administrators can change the password for both the primary `admin` account and any `subadmin` accounts at any time through the **Change Password** option in the user profile menu or the **Accounts** tab.

---

## License

MIT © OpenWrt Access Manager

---

<div align="center">
  <br />
  <sub>Built with Next.js, Supabase, and ❤️ for network admins who are tired of SSH.</sub>
  <br />
  <br />
</div>
