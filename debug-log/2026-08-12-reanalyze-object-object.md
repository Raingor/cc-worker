# 2026-08-12 "开始重新分析"报错 [object Object]

## 问题
Web 版数据分析面板点击「开始重新分析」后，状态区显示红色错误 `❌ [object Object]`，
无法看到真实失败原因。

## 根因
服务端错误响应存在**两种格式**：

1. `{"error": {"message": "..."}}` —— `error` 是**对象**（401/503/400/404 等校验类错误）
2. `{"success": false, "error": "字符串"}` —— `error` 是**字符串**（AI 调用失败等）

而 `web/assets/analysis.js` 里统一写的是：

```js
throw new Error(d.error || d.message || '重新分析失败 (' + r.status + ')');
```

当 `d.error` 是对象 `{"message": "..."}` 时，`new Error()` 会对其执行 `String()`，
对象被转成 `"[object Object]"`，于是真实错误信息（如 Unauthorized / AI API not configured）
被吞掉，只显示 `[object Object]`。

## 解决方案（web/assets/analysis.js）
新增 `errMsg()` 辅助函数，兼容两种错误格式：

```js
/* 兼容服务端两种错误格式：{"error": {"message": "..."}} 与 {"error": "字符串"} */
function errMsg(d) {
  if (!d) return '';
  if (typeof d.error === 'string') return d.error;
  if (d.error && typeof d.error.message === 'string') return d.error.message;
  if (typeof d.message === 'string') return d.message;
  return '';
}
```

替换 4 处错误抛出点（analyze + reanalyze 的 `!r.ok` 与 `!data.success` 分支）：
`new Error(d.error || d.message || ...)` → `new Error(errMsg(d) || ...)`。

## 验证
- `node --check web/assets/analysis.js` 通过
- 修复后对象格式错误会显示真实 message（如 "Unauthorized"），不再出现 `[object Object]`

## 遗留
- 本 bug 只影响展示层；若再次出现报错，现在能看到真实原因（token 失效 / AI API 未配置 / 记录不存在等），
  按对应提示排查即可
