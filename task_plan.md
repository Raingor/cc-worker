# Task Plan: CC Worker — Excel 分析 + 每日提醒

## Goal
在 CC Worker 现有 Web 聊天基础上新增两个功能：(1) 上传 Excel 文件自动分析；(2) 每日工作自动提醒。

## Background

项目当前状态：
- `web/` — GitHub Pages 静态前端，支持文本聊天（Markdown 渲染，多会话，localStorage 持久化）
- `server/` — Flask API，Bearer auth，OpenAI streaming proxy + 日期感知 system prompt 注入
- `appPackage/declarativeAgent.json` — 单一指令来源（含完整 daily/weekly workflow）
- `scripts/sync-instructions.py` — manifest → server/prompts + web/assets
- email-analyzer skill: `/Users/a123/.agents/skills/email-analyzer/scripts/` 下有现成的 Excel 分析 Python 脚本（pandas/openpyxl）

## Current Phase
Phase 0: Planning

## Phases

### Phase 0: Planning
- [x] task_plan.md — 本文档
- [x] findings.md — 已有 email-analyzer 技术调研
- [x] progress.md — 进度跟踪
- **Status:** complete

### Phase 1: 后端 — Excel 上传与分析 API
- [x] 在 `server/` 添加文件上传端点 `/v1/chat/upload`
- [x] 创建 `server/analysis/` 模块（reader, stats, analyzer）
- [x] 添加依赖：pandas, openpyxl 到 requirements.txt
- [x] Excel 解析：自动检测版本表 + Monthly Demand
- [x] 分析能力：汇总统计、版本对比、波动分析、COO 分类
- [x] 测试通过：真实 XM SQ&RQ 文件解析正常
- **Status:** complete

### Phase 2: 前端 — Excel 文件上传交互
- [x] 聊天输入区添加文件上传按钮（📎 图标）
- [x] 支持拖拽上传 + drop overlay
- [x] 文件类型限制 + 大小限制（20MB）
- [x] 文件上传进度/状态显示（loading spinner / error / success）
- [x] 上传完成自动触发分析并显示 Markdown 结果
- [x] 表格渲染：分析结果中以 Markdown 表格展示
- **Status:** complete

### Phase 3: 前端 — 浏览器每日提醒
- [x] 提取工作日程（JS 内置 DAY_REMINDERS）
- [x] 使用 Notification API 发送提醒（含权限请求）
- [x] 设置页面添加提醒配置（开关、时间、浏览器通知）
- [x] localStorage 持久化提醒偏好 + lastReminded 防重复
- [x] 每分钟定时检查 + 设置页面弹出时同步
- **Status:** complete

### Phase 4: 后端 — 邮件提醒功能
- [x] 创建 `server/analysis/email_sender.py` 邮件发送模块
- [x] 添加邮件发送端点 `POST /v1/reminder/email`
- [x] 更新 `.env.example` 添加 QQ 邮箱配置
- [x] 提醒内容：根据当日 weekday 生成任务邮件
- **Status:** complete

### Phase 5: 集成测试与部署
- [ ] 本地 API 端点测试（health, upload, reminder）
- [ ] 前端文件结构完整性验证
- [ ] 所有新文件 git add + 代码审查
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 分析逻辑用 Python pandas | email-analyzer 已有现成实现，直接复用 |
| 文件上传端点 vs Base64 传参 | 大文件场景，multipart 上传更可靠 |
| 浏览器 Notification API | 无需额外依赖，用户无感 |
| QQ 邮箱 SMTP | 国内网络稳定，email-analyzer 已配置好 |
| 提醒日程从 instructions 解析 | 单一来源，改 instructions 同步更新提醒 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
