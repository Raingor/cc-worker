# 项目工具箱功能检查（2026-08-22）

## 用户澄清
此前误将“工具箱”理解为 Codex 当前会话的系统工具。用户已澄清，目标是检查 cc-worker 项目自身的“工具箱”板块。

## 检查方法
- 阅读 `web/index.html`、`web/assets/toolbox.js`、`web/assets/app.js`、`server/app.py`、`server/requirements.txt`。
- 对本地页面做浏览器冒烟测试，逐项切换 9 个工具入口。
- 访问远程 GitHub Pages 和 API 健康检查。
- 对 5 个后端工具 API 发送不带文件的安全请求，验证路由、CORS 和参数校验；未上传业务文件。
- 检查本机 Python 模块和系统二进制依赖。

## 结论
### 可用或基本可用
- PDF→Excel：前后端链路存在；依赖服务端 pdfplumber/pandas/openpyxl。
- PDF 合并：纯浏览器端 PDFLib，完整实现。
- PDF 分割：全部分割链路存在；按范围分割按钮未实现。
- 图片转换：纯浏览器端 Canvas + JSZip，完整实现。
- 图片压缩：纯浏览器端 Canvas + JSZip，完整实现。
- PDF 压缩：前后端链路存在；依赖 Ghostscript。
- OCR：前后端链路存在；依赖 Tesseract，PDF 还依赖 pypdfium2。
- 表格提取：前后端链路存在；依赖 pdfplumber/pandas/openpyxl。

### 不可用
- Office→PDF：前端明确显示“此功能需要后端支持，尚未实现”，后端没有对应路由。
- PDF 分割→按范围：按钮存在，但没有绑定 click handler，也没有后端范围参数实现。

## 关键问题与原因
1. **线上工具箱完全不能渲染**
   - 原因：远程 `https://raingor.github.io/cc-worker/` 返回的 HTML 脚本列表缺少 `assets/toolbox.js`。
   - 证据：线上页面加载的脚本包括 app、analysis、dashboard、board、memo、theme、layout-switcher、bear-corner，但没有 toolbox.js；点击工具箱后页面仍显示“选择工具开始使用”。
   - 本地源文件实际包含 `<script src="assets/toolbox.js?v=8"></script>`。
   - 推测原因：GitHub Pages `gh-pages` 分支部署滞后，最后部署提交日期为 2026-06-25；`main` 最新提交日期为 2026-07-14。
   - 解决方案：重新触发/执行 GitHub Pages 部署，使 `web/index.html` 和 `assets/toolbox.js` 同步发布；部署后清理或递增缓存版本，并验证线上脚本 200 与工具渲染。

2. **PDF 分割按范围功能不可用**
   - 原因：`web/assets/toolbox.js` 创建了 `ps-split-range-btn`，但只给 `splitAllBtn` 绑定了 click handler；后端 `/v1/toolbox/pdf-split` 也只接收整个 PDF，没有范围参数。
   - 解决方案：新增页码范围输入、前端校验，并让 API 接收范围参数；或暂时移除该按钮，避免造成“可用”误导。

3. **Office→PDF 不可用**
   - 原因：前端是静态占位提示；后端无 route；本机也没有 LibreOffice/soffice。
   - 解决方案：部署可用的 Office 转换后端和 LibreOffice（需评估服务器 1GB 内存），或隐藏该入口。

4. **本地工具箱页面调用远程 API 出现 CORS**
   - 原因：API CORS 只允许 GitHub Pages origin，不允许 `http://127.0.0.1:19001`。
   - 解决方案：本地开发时把本地 origin 加入开发环境 `CORS_ORIGINS`，生产环境不要放开任意来源。

5. **服务端 token 校验失效**
   - 原因：`server/app.py::_verify_token()` 直接 `return True`。
   - 解决方案：恢复 Authorization Bearer 与 `APP_TOKEN` 的比较，并保留 OPTIONS 放行；这属于安全修复，建议单独处理并回归所有 API。

## 本次检查产生的限制/错误
- 本机缺少服务端 PDF/OCR 系统依赖，因此没有在本机启动完整 API 做真实文件转换。
- 尝试使用浏览器上传工具上传本地样本时，工具拒绝项目路径，提示不在其 workspace roots；因此只完成页面 DOM 冒烟和远程无文件参数检查。
- 启动本地静态服务器时端口 8765、18765 已被其他工作区进程占用；换用 19001/19002 成功。没有终止其他进程。
- 运行 `python3 scripts/sync-instructions.py` 成功，未产生已跟踪文件 diff。

## 修复执行记录
- 2026-08-22：将 `web/index.html` 中 `assets/toolbox.js` 的缓存版本从 `v=8` 更新为 `v=9`。
- 该提交用于触发 GitHub Actions 的 GitHub Pages 部署，使线上入口重新发布并加载工具箱脚本。
- 部署完成后需要验证线上 HTML 包含 `assets/toolbox.js?v=9`，并通过浏览器切换 9 个工具入口确认界面渲染。

## 部署验证
- 修复提交：`07ffbd9 fix: republish toolbox script on GitHub Pages`。
- 已推送到 `origin/main`，GitHub Actions workflow run `32583917796` 返回 `completed/success`。
- 线上 HTML 已确认包含：`<script src="assets/toolbox.js?v=9"></script>`。
- 线上浏览器验证通过：点击“工具箱”后，PDF→Excel、PDF合并、PDF分割、图片转换、图片压缩、Office→PDF、PDF压缩、OCR识别、表格提取 9 个入口均出现，默认 PDF→Excel 上传界面正常渲染。
- 本次修复只解决线上入口脚本缺失问题；Office→PDF 和 PDF 分割“按范围分割”仍保持未实现状态。
