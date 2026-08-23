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

## 2026-08-22：修复 PDF 按范围分割与 Office→PDF

### 修改内容
- `web/assets/toolbox.js`
  - PDF 分割新增页码范围输入框，支持 `1-3,5,8-10` 和中文逗号。
  - 选择 PDF 后用 `pdf-lib` 读取页数并显示页数提示。
  - “按范围分割”绑定真实事件，向 `/v1/toolbox/pdf-split` 提交 `range` 字段。
  - 保留“全部分割”行为；下载文件名区分全部分割和范围分割。
  - Office→PDF 从占位提示改为真实上传、转换、下载界面，调用 `/v1/toolbox/office-to-pdf`。
- `server/app.py`
  - `/v1/toolbox/pdf-split` 支持 `range` 参数，使用 `pdfinfo` 读取页数、`pdfseparate -f/-l` 生成所需页，再按用户顺序打包 ZIP。
  - 新增 `/v1/toolbox/office-to-pdf`，使用 LibreOffice/soffice headless 转换 doc/docx/xls/xlsx/ppt/pptx 及 OpenDocument 文件。
  - 增加上传文件名清理和页码范围校验，错误返回 400/503/504。
- `scripts/setup-server-remote.sh`
  - 部署时自动检查并安装 LibreOffice；检查 `pdfseparate` 是否存在。
- `scripts/deploy-api.sh`
  - 增加 `.venv/`、`.venv-test/` 排除，避免 rsync --delete 误处理本地测试虚拟环境。
- `web/index.html`
  - `toolbox.js` cache bust 从 v9 更新为 v10。

### 验证
- 本地 `node --check web/assets/toolbox.js`：通过。
- 本地 `python3 -m py_compile server/app.py`：通过。
- Flask 测试客户端：新路由 OPTIONS=204、无文件=400、非法 Office 扩展名=400。
- 远程服务器安装 LibreOffice 5.3.6.1，确认 `/usr/bin/soffice`、`pdfinfo`、`pdfseparate` 存在；Python 3.8 venv 已有 pypdfium2。
- 远程 API `/health`：200。
- 远程真实 PDF（5 页）范围 `2-3,5`：HTTP 200，ZIP 包含第 2、3、5 页。
- 远程真实 PDF 范围 `5,2-3,3`：HTTP 200，ZIP 按第 5、2、3 页输出并去重。
- 远程真实 XLSX：Office→PDF HTTP 200，返回 PDF 文件。
- 远程非法页码范围 `2-9`（5 页 PDF）：HTTP 400，返回页码超出范围。

### 部署注意
- API 后端已通过 SSH 同步并重启 uWSGI，远程真实文件测试已通过。
- Web 前端需要随本次 Git 提交推送后由 GitHub Actions 部署；部署后需验证线上 `toolbox.js?v=10` 和两个新界面。

### 最终线上验证
- 修复提交：`365558a feat: implement PDF range split and Office to PDF`，已推送 `origin/main`。
- GitHub Pages 已发布 `assets/toolbox.js?v=10`，线上资源 HTTP 200，线上与本地脚本 SHA-1 一致。
- 浏览器线上验证：
  - PDF 分割页面显示范围输入框、全部分割和按范围分割按钮。
  - Office→PDF 页面显示 Office 文件上传区和“转换为 PDF”按钮。
  - 页面脚本及工具依赖均 HTTP 200，控制台无工具箱 JavaScript 错误。
- Office 测试生成的 PDF 为 1 页有效 PDF，能够提取英文、中文和数字内容。

## 2026-08-23：桌面模式界面优化（已完成）

### 设计方向
采用“温润工作室 + macOS 工作台”方向：保留 CC 工作台的薄荷青/奶油色品牌基调，同时将桌面模式调整为更清晰的工作空间，而不是单纯的装饰性仿 macOS 窗口。

### 已完成的本地改动
- `web/assets/mac-layout.css`
  - 增强顶部命令栏层级、品牌区、菜单项图标和 active 状态。
  - 扩大桌面有效工作区，降低无意义留白。
  - 重做主窗口标题栏、交通灯、窗口阴影和滚动条。
  - 优化工作面板/Trello 卡片、工具箱上传区、分析/留言/备忘内容卡片。
  - Dock 从纯图标装饰改为带文字、快捷键提示和当前状态的工作区切换器。
  - 桌面模式隐藏熊角落、励志语录和 CCC 徽章，减少遮挡与视觉竞争。
  - 增加状态栏、主题按钮、壁纸按钮的桌面布局适配。
- `web/assets/layout-switcher.js`
  - Dock 增加数据分析入口，共 5 个工作区。
  - 支持 Alt+1 至 Alt+5 快速切换工作区。
  - Dock 项目改为可访问 button，补充 title、aria-label、aria-current。
  - 增加顶部日期/时间状态组件。
  - 动态同步窗口标题和当前工作区。
  - 壁纸、桌面切换按钮补充明确文案和无障碍属性。
- `web/index.html`
  - CSS/JS cache bust 最终更新为 `mac-layout.css?v=8`、`layout-switcher.js?v=12`。

### 本地验证
- Chrome 本地桌面模式已渲染新顶部命令栏、状态时间、5 项 Dock、工作区标题和工具箱下拉菜单。
- 工具箱下拉菜单仍可正常打开，PDF→Excel 页面正常渲染。
- `node --check web/assets/layout-switcher.js` 通过。
- `git diff --check` 通过。

### 最终线上验收
- 提交：`b995a4c feat: refine desktop workspace interface`，已推送至 `origin/main`。
- GitHub Pages 已发布 `mac-layout.css?v=8` 与 `layout-switcher.js?v=12`；线上资源和本地文件 SHA-1 一致。
- 线上 1440px 桌面模式：顶部命令栏高度 52px，主题、日期时间和锁屏控件均位于可视区域；主窗口标题与 5 项 Dock 状态同步正常。
- 快捷键 `Alt+2` 已在线验证，可从工作面板直接切换至工具箱并更新窗口标题为“工具箱 · PDF→Excel”。
- 经典视图切换回归通过：桌面状态栏和 Dock 隐藏，原侧边栏、熊角落、励志语录和 CCC 徽章恢复。
- 1024px 桌面宽度回归通过：导航、窗口和 Dock 均保持可操作；未出现横向溢出。
- 390px 移动宽度回归通过：菜单按钮出现，桌面专属日期时间状态隐藏，移动导航结构保持可用。
- 线上 CSS、JS、工作面板 API 请求均 HTTP 200；控制台无桌面模式 JavaScript 错误，仅保留一个既有表单字段可访问性提示。

### 桌面模式本地视觉验收补充
- 1440px 桌面宽度：顶部命令栏、工作区状态时间、窗口标题、工具箱下拉菜单和 Dock 均正常显示。
- 1024px 桌面宽度：顶部导航仍可用，Dock 保留核心入口并隐藏快捷键提示，主题按钮收缩为图标，未出现横向溢出。
- 交互可用性：Dock 项已改为 button，支持 `Alt+1` 至 `Alt+5` 切换工作区；菜单、Dock、桌面切换、壁纸按钮均补充 aria-label/title。
- 视觉方向：保持薄荷青/奶油色，不引入通用紫色渐变；增加工作区层级、状态反馈、可操作焦点和有节制的动效。
- 本次尚未修改经典模式规则；新增桌面优化主要限定在 `data-layout="mac"` 和桌面媒体查询中。
