#!/usr/bin/env bash
# ==============================================================================
# OpenWrt Access Manager - Production Server Deployment Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Starting Production Deployment ==="

# 1. Check for required compose file
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: $COMPOSE_FILE not found in $PROJECT_ROOT" >&2
    exit 1
fi

# 2. Check for .env file
if [ ! -f ".env" ]; then
    echo "WARNING: .env not found in $PROJECT_ROOT. Using defaults or system environment."
fi

# 3. Authenticate with GitHub Container Registry if credentials are provided
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
    echo "==> Authenticating with GitHub Container Registry (ghcr.io)..."
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

# 4. Pull the latest image
echo "==> Pulling latest image..."
docker compose -f "$COMPOSE_FILE" pull app

# 5. Spin up services (zero-downtime recreation where possible)
echo "==> Updating containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 6. Clean up dangling images
echo "==> Cleaning up unused images..."
docker image prune -f

# 7. Verification / Healthcheck
echo "==> Verifying application health..."
for i in {1..15}; do
    if curl -s -f http://127.0.0.1:3000/ > /dev/null 2>&1 || curl -s http://127.0.0.1:3000/api/config/mac-auth > /dev/null 2>&1; then
        echo "==> [SUCCESS] Application is online and responding on port 3000!"
        exit 0
    fi
    echo "Waiting for app to become ready... (attempt $i/15)"
    sleep 2
done

echo "WARNING: App responded with non-200 or is still booting up. Check logs with 'docker compose -f $COMPOSE_FILE logs app'."
exit 0
