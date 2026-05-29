# CC 工作助手 - 网页版 Chat

为谭斯雅（CC）定制的 AI 工作助手网页版。替代 M365 Copilot，双击 `index.html` 即可在浏览器使用。

## 使用方法

1. **打开**：双击 `index.html`，用 Chrome / Edge / Safari 打开
2. **配置**：首次使用需填写 AI API 信息（地址、Key、模型名）
3. **开始聊天**：保存后进入聊天界面，可直接提问或点快捷按钮

## 配置说明

从你的 AI 厂商获取以下信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API 地址 | OpenAI 兼容格式的 API 地址 | `https://api.openai.com/v1` |
| API Key | API 密钥 | `sk-...` |
| 模型名称 | AI 模型名称 | `gpt-4o`, `claude-sonnet-4-20250514`, `deepseek-chat` |
| 系统提示词 | 已预填 CC 工作助手指令，可按需修改 | — |

### API 地址说明

填写 AI 厂商提供的 **OpenAI 兼容接口** 地址：

- **OpenAI**: `https://api.openai.com/v1`
- **DeepSeek**: `https://api.deepseek.com/v1`（通过 DeepSeek 代理 Claude）
- **Anthropic 直连**: 需使用 Anthropic 的 OpenAI 兼容转换层地址
- **其他厂商**: 按厂商提供的 OpenAI 兼容地址填写

> 配置只保存在**你浏览器**的 localStorage 中，不会上传到任何服务器。

## 如果 API 不支持 CORS（跨域）

部分 AI API 不允许浏览器直接调用。如果遇到跨域错误：

1. 将 `proxy.php` 放到任意一台 PHP 服务器上
2. 修改 API 地址为 `https://你的域名/proxy.php`
3. `proxy.php` 中的 API Key 配置为你的 Key
4. 前端无需再填 API Key（建议清空 Key 字段）

## 数据说明

- 对话历史保存在浏览器 localStorage
- 不会发送到第三方服务器（除了你配置的 AI API）
- 清除浏览器缓存会丢失对话，可手动导出保存

## 快捷键

- `Enter` 发送消息
- `Shift + Enter` 换行

## 本地打开

```
双击 index.html
```
