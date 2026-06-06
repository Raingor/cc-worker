# CC 工作助手

为谭斯雅（CC）定制的 EVA 生产计划与订单协调智能助手。提供两种使用方式：

1. **M365 Copilot 声明式代理**（企业 Copilot 许可）
2. **Web 版** — GitHub Pages 前端 + `api.sz-hrhb.com` 后端（无 Copilot 时使用）

## Web 版

- 前端：<https://raingor.github.io/cc-worker/>
- API：`https://api.sz-hrhb.com`
- 指令来源：`appPackage/declarativeAgent.json`（经 `scripts/sync-instructions.py` 同步）

### 本地预览前端

```bash
python3 scripts/sync-instructions.py
cp web/config.example.js web/config.js   # 填入 appToken
cd web && python3 -m http.server 8080
```

浏览器打开 `http://127.0.0.1:8080`，在设置中填写 API 地址与访问令牌。

### GitHub Pages 部署

1. 仓库 Settings → Pages → Source：**GitHub Actions**
2. 可选 Secrets：`CC_API_BASE`、`CC_APP_TOKEN`（用于生成 `web/config.js`）
3. 推送 `main` 分支后 Actions 自动发布

### API 服务端部署

```bash
# 在服务器 /home/www/html/cc-worker-api/.env 配置（勿提交 Git）
cp server/.env.example server/.env   # 本地编辑后 scp 到服务器

bash scripts/deploy-api.sh
```

服务器需配置：`APP_TOKEN`、`AI_API_BASE`、`AI_API_KEY`、`AI_MODEL`、`CORS_ORIGINS`。

### 同步业务指令

修改 `appPackage/declarativeAgent.json` 后执行：

```bash
python3 scripts/sync-instructions.py
```

会更新 `server/prompts/cc_instructions.txt` 与 `web/assets/cc-meta.json`。

### 安全提示

旧版 `cc-chat/` 曾在 HTML 中硬编码上游 API Key，**请在 AI 厂商侧轮换 Key**。新版本仅在前端保存 APP Token（访问你自己的 API），上游 Key 只放在服务器 `.env`。

---

## M365 Copilot 声明式代理

### 前置要求

- Microsoft 365 企业版 + Copilot 许可
- [Teams Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) v5.0+
- Node.js 18+

### 项目结构

```
cc-worker/
├── appPackage/declarativeAgent.json
├── web/                    # GitHub Pages 静态站
├── server/                 # Flask API (api.sz-hrhb.com)
├── scripts/
│   ├── sync-instructions.py
│   └── deploy-api.sh
├── teamsapp.yml
└── env/.env.dev
```

### SharePoint 占位符

在 `declarativeAgent.json` 中替换：

- `{CC_OneDrive_Url}`
- `{SharePoint_Site_Url_EVA}`
- `{SharePoint_Site_Url_Orders}`
- `{SharePoint_Site_Url_Reports}`

### 旁加载与发布

- VS Code 任务：`Preview in Copilot (sideload)` / `Build for production`
- 或 Teams 管理中心上传 `build/cc-sales-assistant-agent.zip`

## 版本历史

详见 [CHANGELOG.md](CHANGELOG.md)

- v3.0.0 — 全面 UI 优化：暗色模式、流式重试、键盘快捷键、可访问性
- v2.5.0 — OA 工作面板、任务日历、AI 工作总结、Webflow 设计系统
- v2.0.0 — Web 版（GitHub Pages + Flask API），移除 cc-chat
- v1.0.0 — M365 声明式代理初始版
