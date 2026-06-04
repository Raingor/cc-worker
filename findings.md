# Findings: Excel 分析 + 每日提醒

## Feature 1: Excel Upload & Auto Analysis

### 现有 email-analyzer 技能分析能力

**位置**: `/Users/a123/.agents/skills/email-analyzer/`
**支撑脚本**:
| 脚本 | 用途 |
|------|------|
| `check_email_imap.py` | Gmail 连接 + 下载附件 (242行) |
| `send_reply_smtp.py` | SMTP 发送回复邮件 (111行) |
| `email_config.py` | Gmail/QQ 邮箱配置 |

**可复用的分析能力**（需要提取到 cc-worker）:
- Excel 读取（pandas + openpyxl）
- 支持的分析类型：差异分析、趋势分析、波动分析、汇总统计、异常检测、月度对比
- 输出格式：Excel 多 sheet 报告 + PDF 可视化

**注意事项**:
- email-analyzer 的分析逻辑是 Cursor Agent 驱动的（Agent 写代码执行），不是预封装函数
- 需要将分析能力抽象为可调用的 Python 模块，放在 `server/analysis/` 下
- SKILL.md 中的分析维度定义非常有价值（7 种分析类型）

### 后端架构设计

```
server/
├── app.py                    ← 现有：添加 upload 路由
├── analysis/
│   ├── __init__.py
│   ├── reader.py             ← Excel 文件读取 + 列结构检测
│   ├── stats.py              ← 汇总统计
│   ├── trend.py              ← 趋势分析
│   └── fluctuation.py        ← 波动分析
├── requirements.txt          ← 新增 pandas, openpyxl
└── prompts/
    └── cc_instructions.txt
```

### 前端文件上传方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| 直接 multipart upload | 简单，后端直接处理文件 | 需要后端存储/处理 |
| Base64 嵌入 messages | 不需要新端点 | 大文件不友好 |
| FileReader + 分片 | 大文件友好 | 实现复杂 |

**选择**: multipart upload 到 `/v1/chat/upload`。对于 CC 的 Excel 文件（通常 <5MB）足够了。

### 前端架构

```javascript
// 添加到 app.js 的新功能
- 聊天输入区新增上传按钮
- Drag & drop 支持（拖拽到 message-list 区域）
- 上传进度条组件
- 分析结果作为 AI 消息的 system note 或 tool result 展示
- 错误状态：文件太大、格式不对、分析失败
```

### 数据流

```
User 选择文件 → 前端 File API → multipart POST → Flask upload endpoint
                                                      ↓
                                              分析模块解析 Excel
                                                      ↓
                                              AI 生成分析结果说明
                                                      ↓
                                              返回 {analysis: {...}}
                                                      ↓
                                              前端渲染为 chat message
```

## Feature 2: Daily Reminders

### 现有指令中的工作日历

在 `server/prompts/cc_instructions.txt` 和 `declarativeAgent.json` 中，每日任务定义为：

| 日 | 任务 |
|----|------|
| 周一 | 更新 CFC/厦门/墨西哥出运资料 |
| 周二 | Gap Crasher 缺料检查 + 墨西哥下周出运装箱单 |
| 周三 | 更新 Order Pattern 并下单 + 厦门当周出运装箱单 |
| 周四 | 墨西哥&厦门新订单处理 + 越南波动分析 + 厦门趋势分析 + 删除上周 SAP PIR |
| 周五 | 完成当周 PIR 上传 SAP + 检查报关资料 |
| 每月第三周 | LE 数据分析（额外） |

**解析方式**: 从 `cc_instructions.txt` 中正则提取 "### 周X：" 区块

### 浏览器通知方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| Notification API | 原生，无需权限弹窗 | 需要 HTTPS（GitHub Pages 满足） |
| 自定义弹窗 | 样式可控 | 用户可能错过 |
| Service Worker push | 即使关闭页面也能推送 | 需要后端 push 服务，太复杂 |

**选择**: Notification API + 页面内 toast 兜底。

### 邮件提醒方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| QQ 邮箱 SMTP | 国内网络稳定，已有配置 | 需要暴露 auth code 在 server .env |
| Gmail SMTP | 功能完整 | 国内网络可能不稳定 |
| SendGrid/Mailgun | 第三方专业服务 | 需要额外注册 |

**选择**: QQ 邮箱 SMTP（参考 `email_config.py`），配置文件放在服务器 `.env` 中，不提交 Git。

### 浏览器定时提醒实现

```javascript
// 前端实现方案
1. APP 启动时检查今日是否已提醒（localStorage 记录上次提醒日期）
2. 如果未提醒且 Notification 权限已获取 → 发送通知
3. 设置定时器每小时检查一次（应对跨日场景）
4. 如果权限未获取 → 首次请求权限
5. 用户在设置页面可配置：
   - 提醒开关
   - 提醒时间（默认 09:00）
   - 提醒方式（浏览器通知 / 邮件 / 两者都开）
```

### 后端邮件提醒端点

```
POST /v1/reminder/email
Body: { "email": "user@example.com", "type": "daily" }
Auth: Bearer APP_TOKEN
Response: { "status": "sent" }

服务器的定时触发方式：
- 方案 A: 外部 cron job 每天定时 curl 该端点
- 方案 B: 在 chat 界面中用户手动触发"发送今日提醒到邮箱"
- 优先级：方案 B（简单够用）+ 后续加 cron
```

## 新增/修改文件清单

### server/ (后端)
| 文件 | 操作 | 说明 |
|------|------|------|
| `server/app.py` | 修改 | 添加 upload 路由和 reminder 路由 |
| `server/requirements.txt` | 修改 | 添加 pandas, openpyxl |
| `server/analysis/__init__.py` | 新建 | 分析模块包 |
| `server/analysis/reader.py` | 新建 | Excel 文件读取 |
| `server/analysis/stats.py` | 新建 | 汇总统计 |
| `server/analysis/trend.py` | 新建 | 趋势分析 |
| `server/analysis/fluctuation.py` | 新建 | 波动分析 |
| `server/analysis/email_sender.py` | 新建 | 邮件发送 |
| `server/templates/email_reminder.html` | 新建 | 提醒邮件模板 |
| `server/.env.example` | 修改 | 添加 QQ 邮箱配置项 |

### web/ (前端)
| 文件 | 操作 | 说明 |
|------|------|------|
| `web/index.html` | 修改 | 添加上传按钮 DOM + 提醒设置 UI |
| `web/assets/app.js` | 修改 | 添加文件上传逻辑 + 通知逻辑 |
| `web/assets/style.css` | 修改 | 添加上传/通知相关样式 |

### scripts/ (暂无修改)
