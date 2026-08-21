# 2026-08-13 工作面板自定义任务体验优化

## 任务
1. 优化「添加自定义任务」的用户操作体验
2. 确认 GIF 列表无蜡笔小新内容

## 修改内容

### dashboard.js
- 新增 `createAddTaskUI(container, onAdd)` 辅助函数，替代之前分散的按钮+输入框创建逻辑
- FAB 按钮点击后展开为 glassmorphism 风格的输入卡片
- 输入卡片包含：文本输入框、实时字符计数器（接近200上限变红警告）、确认/取消按钮
- 添加成功后显示 `showDashNotice` toast 提示
- 空状态和非空状态共用同一套 UI 逻辑

### style.css
- 新增 `.oa-trello-add-fab` — 悬浮添加按钮，含 hover 时＋号旋转45°动画
- 新增 `.oa-trello-add-card` — 玻璃拟态输入卡片，`backdrop-filter: blur(12px)` + 半透明背景
- 新增 `@keyframes fadeSlideDown` — 卡片展开时的滑入动画
- 新增 `.oa-trello-add-input-el` — 输入框聚焦时边框+阴影联动高亮
- 新增 `.oa-trello-add-confirm` / `.oa-trello-add-cancel` — 确认/取消按钮样式
- 新增 `.oa-trello-add-counter` — 字符计数器，接近上限变警告色
- 新增 `.oa-trello-add-cancel` — 取消按钮 hover 变 terracotta
- 更新 `.oa-trello-del-btn` — 默认透明度降低，hover 变红

### bear-corner.js
- 在 BEAR_GIFS 数组顶部添加过滤规则注释：仅保留 Nagano 原版 joke-bear/nongdamgom/yenkim/ivory 系列，不含蜡笔小新

## GIF 过滤验证
当前列表共 75 个 GIF：
- aigei.com 自嘲熊 22 个（确认非蜡笔小新）
- Tenor joke-bear/nongdamgom/yenkim/ivory 系列 53 个（确认非蜡笔小新）
无蜡笔小新 (Crayon Shin-chan) 内容。

## 注意事项
- 前端改动无需服务器部署，GitHub Pages 自动更新
- `checklist_store.py` 的自定义任务保存逻辑已在之前提交中完成