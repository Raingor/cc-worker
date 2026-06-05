#!/usr/bin/env bash
# Deploy server/ to api.sz-hrhb.com. Requires SSH access to root@120.79.7.233
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@120.79.7.233}"
REMOTE_DIR="/home/www/html/cc-worker-api"

echo "==> Sync instructions"
python3 "$ROOT/scripts/sync-instructions.py"

echo "==> Rsync server files"
rsync -avz --delete \
  --exclude '.env' \
  --exclude 'venv/' \
  --exclude '__pycache__/' \
  --exclude 'data/' \
  --exclude 'uwsgi.pid' \
  --exclude 'uwsgi.log' \
  "$ROOT/server/" "$REMOTE_HOST:$REMOTE_DIR/"

echo "==> Remote: setup (remove flask_uwsgi, start uwsgi)"
ssh "$REMOTE_HOST" 'bash -s' < "$ROOT/scripts/setup-server-remote.sh"

echo "==> Done. Test: curl -s https://api.sz-hrhb.com/health"
