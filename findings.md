# Findings: CC Web + API

## Server (api.sz-hrhb.com)

- IP: 120.79.7.233, CentOS 7, ~931MB RAM
- Nginx: 443 → uwsgi 127.0.0.1:5001
- Old project: `/home/www/html/flask_uwsgi/` — code missing, port offline
- New deploy path: `/home/www/html/cc-worker-api/`
- SSL cert: `/etc/nginx/cert/api.sz-hrhb.com.pem`

## GitHub

- Repo: Raingor/cc-worker
- Pages URL: https://raingor.github.io/cc-worker/

## Security

- Old cc-chat committed API keys in HTML; rotate upstream keys
- DB/root credentials in server notes — not stored in this repo

## CORS

- Allow origin: `https://raingor.github.io`
