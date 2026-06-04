# Progress Log

## 2026-06-04

### Completed
- Planning files: task_plan.md, findings.md, progress.md
- Removed cc-chat; added web/, server/, scripts/
- sync-instructions.py → server/prompts + web/assets/cc-meta.json
- Flask API: /health, /v1/chat/completions (Bearer, SSE proxy)
- GitHub Actions: deploy-pages.yml
- Local test: health 200, unauthenticated chat 401

### Server deploy (pending SSH)
- `ssh root@120.79.7.233` failed: Permission denied (publickey)
- Manual steps:
  1. `python3 scripts/sync-instructions.py`
  2. `rsync -av server/ root@120.79.7.233:/home/www/html/cc-worker-api/`
  3. On server: copy `.env.example` → `.env`, fill APP_TOKEN, AI_* keys
  4. `bash scripts/setup-server-remote.sh` (or `bash scripts/deploy-api.sh` from Mac)
  5. `curl https://api.sz-hrhb.com/health`

### GitHub Pages (after push)
- Enable Pages → GitHub Actions in repo settings
- Set secrets: `CC_APP_TOKEN`, optional `CC_API_BASE`
- URL: https://raingor.github.io/cc-worker/

### Security
- Rotate upstream AI key (was in old cc-chat HTML)
