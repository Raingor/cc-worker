#!/usr/bin/env bash
# Run ON the server (120.79.7.233) as root after rsync. Or via: ssh root@HOST 'bash -s' < scripts/setup-server-remote.sh
set -euo pipefail

OLD_DIR="/home/www/html/flask_uwsgi"
NEW_DIR="/home/www/html/cc-worker-api"

echo "==> Stop old uwsgi"
if [ -f "$OLD_DIR/uwsgi.pid" ]; then
  uwsgi --stop "$OLD_DIR/uwsgi.pid" 2>/dev/null || true
  sleep 1
fi
pkill -f "uwsgi.*5001" 2>/dev/null || true
sleep 2  # 等旧实例释放端口，避免 bind(): Address already in use

echo "==> Remove old project"
rm -rf "$OLD_DIR"

echo "==> Ensure new directory"
mkdir -p "$NEW_DIR"
cd "$NEW_DIR"

if [ ! -f .env ]; then
  echo "ERROR: Create $NEW_DIR/.env from .env.example before starting uwsgi"
  exit 1
fi

# Office→PDF uses LibreOffice headless. Install it only when the server does not
# already provide soffice/libreoffice. Keep this outside the Python venv because
# it is a system binary used by server/app.py.
if ! command -v soffice >/dev/null 2>&1 && ! command -v libreoffice >/dev/null 2>&1; then
  echo "==> Install LibreOffice headless for Office→PDF"
  yum install -y libreoffice
fi

if ! command -v soffice >/dev/null 2>&1 && ! command -v libreoffice >/dev/null 2>&1; then
  echo "ERROR: LibreOffice installation completed but no soffice/libreoffice binary was found"
  exit 1
fi

if ! command -v pdfseparate >/dev/null 2>&1; then
  echo "WARNING: pdfseparate is not installed; PDF splitting endpoints will return 503"
fi

if [ ! -d venv ]; then
  python3 -m venv venv
fi
./venv/bin/pip install -q -r requirements.txt

if [ -f uwsgi.pid ] && kill -0 "$(cat uwsgi.pid)" 2>/dev/null; then
  ./venv/bin/uwsgi --stop uwsgi.pid || true
  sleep 1
fi

./venv/bin/uwsgi --ini uwsgi.ini
sleep 1
curl -sS http://127.0.0.1:5001/health || true
echo ""
echo "Done. Verify: curl -sS https://api.sz-hrhb.com/health"
