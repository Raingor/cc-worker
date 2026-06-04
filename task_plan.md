# Task Plan: CC Web + API

## Goal
GitHub Pages 静态前端 + api.sz-hrhb.com Flask 代理，废弃 cc-chat，指令以 declarativeAgent.json 为单一来源。

## Current Phase
Phase 6

## Phases

### Phase 0: Planning files
- [x] task_plan.md, findings.md, progress.md
- **Status:** complete

### Phase 1: Remove cc-chat
- [x] Delete cc-chat, update README/AGENTS.md
- **Status:** complete

### Phase 2: sync-instructions.py
- [x] Generate server/prompts + web/assets JSON
- **Status:** complete

### Phase 3: Flask API (server/)
- [x] Bearer auth, CORS, streaming proxy
- **Status:** complete

### Phase 4: Web frontend (web/)
- [x] Chat UI, config.example.js
- **Status:** complete

### Phase 5: GitHub Pages workflow
- [x] deploy-pages.yml
- **Status:** complete

### Phase 6: Server deploy + E2E
- [ ] SSH deploy to api.sz-hrhb.com
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Bearer APP_TOKEN | User choice; AI key server-only |
| uwsgi :5001 | Reuse existing Nginx for api.sz-hrhb.com |
| Server injects system prompt + date | Match old cc-chat behavior |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
