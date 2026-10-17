#!/usr/bin/env bash
# ObjDock one-click redeploy (for automation agents).
# Assumes: Docker + Docker Compose v2 installed, code at /opt/objdock.
# Optional env: HEALTH_URL (e.g. https://oss.example.com/) for the final check.
set -euo pipefail

cd /opt/objdock
git fetch origin && git reset --hard origin/main
APP_VERSION=$(git rev-parse --short HEAD) docker compose up -d --build --force-recreate
sleep 8
docker ps --filter name=objdock --format '{{.Names}} {{.Status}}'
if [ -n "${HEALTH_URL:-}" ]; then
  curl -sk -o /dev/null -w 'site:%{http_code}\n' "$HEALTH_URL" || true
fi
