# cc-worker — AGENTS.md

## 项目概述

CC 销售助手，M365 Copilot 声明式代理。为谭斯雅（CC）定制。

## 已集成技能

- **email-analyzer** — Gmail 邮件自动数据分析。支持检查未读邮件、下载 Excel 附件、执行数据分析（差异/趋势/波动/月度对比/Monthly Demand对比/汇总统计）、通过 SMTP 回复结果。
  - 收件人：sylvia.tan@assaabloy.com
  - 输出路径：`/Users/a123/workspace/wwwroot/CC/`
  - 相关文件：`~/.agents/skills/email-analyzer/SKILL.md`

## 关键文件

| 文件 | 说明 |
|------|------|
| `appPackage/declarativeAgent.json` | 代理核心配置（instructions, capabilities, conversation_starters） |
| `teamsapp.yml` | Teams Toolkit v5 部署配置 |
| `env/.env.dev` | 开发环境变量 |

## 部署

```bash
# 使用 Teams Toolkit VS Code 扩展
# F5 旁加载测试
# 或通过 Teams 管理中心上传 build 包
```
