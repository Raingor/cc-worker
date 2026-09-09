# Agnes 生图生视频部署记录

## 现象
首次执行 `scripts/deploy-api.sh` 后，远端 uWSGI 启动但 `/health` 返回 500。

## 原因
生产服务器使用 Python 3.8，而新增代码使用了 Python 3.9/3.10 才支持的类型注解：`tuple[dict, int]`。uWSGI 因导入 `app.py` 失败，进入 no Python application 模式。另：部署脚本前台启动 uWSGI，SSH 会话不会自行结束，工具超时不代表部署失败。

## 处理
- 将 Agnes 代理函数的返回类型改为兼容 Python 3.8 的 `typing.Tuple`。
- 重新执行 API 部署。
- 通过后台方式重启 uWSGI，确认内部健康检查返回 200。
- 将 Agnes API Key 写入远端 `/home/www/html/cc-worker-api/.env`，未写入 Git。

## 验证
- `https://api.sz-hrhb.com/health` 返回 HTTP 200。
- `https://api.sz-hrhb.com/v1/agnes/config` 返回 `hasKey: true`，仅返回脱敏 Key。
- Agnes 配置接口 CORS 预检返回 HTTP 204。
- 生产实测图片生成：`agnes-image-2.5-flash` 返回 1 张图片，HTTP 200。
- 生产实测视频生成：`agnes-video-2.5-flash` 创建任务并轮询至 `completed`，进度 100%，返回视频 URL。
- 页面图片显示为破图：接口已成功返回图片 URL，但前端 CSP 的 `img-src` 未允许 `platform-outputs.agnes-ai.space`。已补充该图片域名，并同时加入 `media-src` 以支持视频预览。
- 视频接口偶发返回 `video queue is full, please retry later`：这是 Agnes 上游队列暂满，不是参数错误。后端已将 429/5xx 标记为可重试，前端遇到队列繁忙会按 15/30/45 秒自动重试 3 次，最终失败才提示错误。
- GitHub Actions `Deploy GitHub Pages #130` 成功，线上页面已包含 Agnes 菜单和脚本。
