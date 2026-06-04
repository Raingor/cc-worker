# cc-worker — AGENTS.md

## 项目概述

CC 工作助手：M365 Copilot 声明式代理 + Web 版（GitHub Pages + api.sz-hrhb.com）。为谭斯雅（CC）定制。

## 架构

| 组件 | 路径 | 说明 |
|------|------|------|
| 指令源 | `appPackage/declarativeAgent.json` | instructions、conversation_starters |
| Web 前端 | `web/` | GitHub Pages，Bearer APP_TOKEN |
| API | `server/` | Flask 代理，注入 system prompt |
| 同步 | `scripts/sync-instructions.py` | manifest → server/prompts + web/assets |

## 已集成技能（Cursor）

- **email-analyzer** — Gmail 邮件数据分析（`~/.agents/skills/email-analyzer/SKILL.md`）

## 部署

```bash
# 同步指令
python3 scripts/sync-instructions.py

# Web：推 main → GitHub Actions

# API
bash scripts/deploy-api.sh

# M365：Teams Toolkit F5 / 上传 zip
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `appPackage/declarativeAgent.json` | Copilot 代理与 Web 指令源 |
| `server/app.py` | API 入口 |
| `web/assets/app.js` | 聊天前端逻辑 |
| `teamsapp.yml` | Teams Toolkit v5 |
