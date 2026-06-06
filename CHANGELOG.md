# Changelog

CC 工作助手版本更新记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

---

## [3.0.0] — 2026-06-06

### Added
- **暗色模式** — 自动跟随系统 `prefers-color-scheme: dark`
- **流式响应重试** — 网络中断后保留已接收内容，显示「↺ 重新生成」按钮
- **文件上传进度条** — XMLHttpRequest 实时百分比进度
- **消息操作菜单** — 悬浮显示「复制 / 重新生成」按钮
- **长消息折叠** — 超过 500px 高度自动折叠，点击「展开全部」展开
- **表格移动端横滑** — Markdown 表格自动包裹 `table-wrap` 容器
- **键盘快捷键** — `Esc` 关闭侧栏/弹窗、`Ctrl+N` 新对话、`Ctrl+K` 搜索、`Ctrl+,` 设置
- **设置页「测试连接」** — 验证 API 地址与令牌有效性
- **空状态功能引导** — 新对话显示 3 条功能提示卡片
- **Dashboard 切换动画** — chat ↔ dashboard 滑动过渡
- **提醒开关联动** — 关闭「启用提醒」后子选项自动灰显
- **ARIA 可访问性** — `role="listbox/log"`、`aria-label`、`aria-selected`
- **DOMPurify XSS 防护** — Markdown 渲染输出过滤

### Changed
- 移动端 textarea 字体调整为 16px（防止 iOS Safari 自动缩放）
- 移除 `user-scalable=no`，允许用户缩放
- 对比度修复：`--mute` 从 `#898989` → `#767676`（满足 WCAG AA 4.5:1）
- 移除未使用字体（Playfair Display / IBM Plex Sans），仅加载 Inter
- CSP 补充 `font-src https://fonts.gstatic.com`
- 设置保存后增加淡出过渡动画，替代生硬的 setTimeout

### Fixed
- 流式响应中断后用户消息不丢失
- 文件上传失败后可一键重试，无需重新选择文件

---

## [2.5.0] — 2026-06-05

### Added
- **OA 工作面板（Dashboard）** — 今日任务 / 工作日历 / 每日总结三个标签页
- **任务卡片系统** — 上午/下午分组、复选框打勾、备注编辑、进度环
- **AI 工作总结** — 一键生成当日任务完成情况总结
- **工作日历** — 月视图，标记有数据的日期，点击查看历史任务
- **每日总结历史** — 按月查看已保存的 AI 总结
- **每日邮件提醒** — 工作日 08:45 / 16:30 自动发送任务邮件（crontab）
- **Webflow 设计系统** — ink/canvas 配色、chromatic accents、hairline borders
- **对话消息复制按钮** — 每条消息底部「复制」按钮
- **使用教程页（help.html）** — 完整功能说明文档

### Changed
- 设置页重新设计 — 深色品牌头部、更精致的表单布局
- Dashboard 从模态框改为全屏页面
- 侧栏在桌面端始终显示，移动端通过 ☰ 按钮切换

---

## [2.0.0] — 2026-06-04

### Added
- **Web 版前端** — GitHub Pages 静态站，Bearer Token 认证
- **Flask API 后端** — `api.sz-hrhb.com`，OpenAI 流式代理
- **Excel 文件上传分析** — 支持 .xlsx / .xls / .csv，自动分析汇总
- **邮件分析集成** — 通过 IMAP 检查 Sylvia 邮件并分析附件
- **多对话管理** — 新建/切换/删除对话，侧栏列表
- **对话搜索** — 按标题筛选对话
- **用量统计面板** — Token 用量（累计/今日）、Provider/Model 信息
- **浏览器每日提醒** — Notification API 工作日定时推送
- **CSP 安全策略** — Content-Security-Policy 头部
- **增量消息渲染** — 避免全量重绘
- **Toast 提示** — 操作反馈通知
- **长期记忆存储** — SQLite 化对话存储 + 跨会话记忆
- **指令同步脚本** — `sync-instructions.py` 从 manifest 同步到 server/web

### Changed
- 从旧版 cc-chat 迁移到全新 Web 版架构
- 对话存储从 localStorage 迁移到 SQLite

---

## [1.0.0] — 2026-05-28

### Added
- **M365 Copilot 声明式代理** — 通过 Teams Toolkit 部署
- **基础对话能力** — 连接 SharePoint / OneDrive 数据
- **业务指令** — EVA 生产计划、订单协调、出运安排
- **Teams 旁加载** — VS Code F5 开发调试
