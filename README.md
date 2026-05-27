# CC 销售助手 - M365 Copilot 声明式代理

为谭斯雅（CC）定制的 Microsoft 365 Copilot 声明式代理，帮助处理销售与客户服务日常工作。

## 功能概览

- **邮件回复**：自动理解客户意图，草拟专业回复
- **产品查询**：从 SharePoint 知识库查找产品信息、规格和报价
- **订单跟踪**：汇总订单状态，标记延期风险
- **会议准备**：整理客户背景、历史记录和会议议程
- **投诉处理**：分析客户投诉，提供处理建议
- **工作提效**：优先级排序、模板生成、数据汇总

## 前置要求

- Microsoft 365 企业版订阅（E3/E5 或 Business Premium）
- Microsoft 365 Copilot 许可证
- SharePoint Online 访问权限
- [Teams Toolkit for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) v5.0+
- Node.js 18+

## 项目结构

```
cc-worker/
├── appPackage/
│   ├── declarativeAgent.json    # 代理清单文件（核心）
│   ├── color.png                # 彩色图标 192x192
│   └── outline.png              # 轮廓图标 32x32
├── .vscode/
│   └── tasks.json               # VS Code 任务
├── teamsapp.yml                 # Teams Toolkit 配置
├── env/
│   ├── .env.dev                 # 开发环境变量
│   └── .env.local               # 本地环境变量（不提交）
├── README.md
└── .gitignore
```

## 快速开始

### 1. 安装 Teams Toolkit

在 VS Code 扩展市场搜索 "Teams Toolkit" 并安装。

### 2. 登录 M365 账号

在 VS Code 中按 `Cmd+Shift+P`，运行 `Teams: Sign in to Microsoft 365`，使用 CC 的工作账号登录。

### 3. 配置 SharePoint 知识源

打开 `appPackage/declarativeAgent.json`，将以下占位符替换为实际的 SharePoint 站点 URL：

- `{CC_OneDrive_Url}` → CC 的 OneDrive 地址（如 `https://yourcompany-my.sharepoint.com/personal/cc_yourcompany_com`）
- `{SharePoint_Site_Url_Products}` → 产品知识库站点
- `{SharePoint_Site_Url_Orders}` → 订单管理站点
- `{SharePoint_Site_Url_Customers}` → 客户资料站点

如果三个 SharePoint 站点是同一个，只需要保留一个条目，修改 description 即可。

### 4. 替换图标

将实际的应用图标替换 `appPackage/color.png`（192x192）和 `appPackage/outline.png`（32x32）。当前是占位图标。

### 5. 本地旁加载测试

在 VS Code 中按 F5 启动调试，或运行任务 `Preview in Copilot (sideload)`。

这将在 Microsoft 365 Copilot 中旁加载代理，你可以立即开始测试。

### 6. 在 Copilot 中使用

在 Microsoft Teams 或 [Microsoft 365 Copilot](https://m365.cloud.microsoft) 中，在聊天面板右侧的 Copilot 代理列表中选择"CC 销售助手"，即可开始对话。

## 部署到组织

### 方法一：通过 Teams 管理中心（推荐）

1. 运行 VS Code 任务 `Build for production` 生成 `build/cc-sales-assistant-agent.zip`
2. 登录 [Microsoft Teams 管理中心](https://admin.teams.microsoft.com)
3. 导航到 "Teams apps" > "Manage apps"
4. 点击 "Upload" > 上传 `build/cc-sales-assistant-agent.zip`
5. 设置应用权限策略，将其发布给 CC 的账号或她所在的组

### 方法二：通过 Teams Toolkit 直接发布

在 VS Code 中按 `Cmd+Shift+P`，运行 `Teams: Publish to Teams`，按照向导完成发布。

## SharePoint 知识库准备建议

为了让代理发挥最大效果，建议在 SharePoint 中按以下结构组织文档：

### 产品知识库站点
```
/Shared Documents/
├── 产品规格书/
│   ├── 产品A规格书.docx
│   └── 产品B规格书.docx
├── 价目表/
│   └── 2026年价格表.xlsx
└── 技术文档/
    └── 产品使用手册.pdf
```

### 订单管理站点
```
/Shared Documents/
├── 订单总表.xlsx
├── 生产进度/
└── 发货记录/
```

### 客户资料站点
```
/Shared Documents/
├── 客户档案/
├── 沟通记录/
└── 合同文档/
```

## 常见问题

### Q: 代理找不到我需要的信息怎么办？
A: 确保相关的 SharePoint 站点已添加到 `declarativeAgent.json` 的 `capabilities` 中，并且文档内容已被 Microsoft 365 索引（上传后通常需要几分钟到几小时才能被检索到）。

### Q: 可以添加更多知识源吗？
A: 可以。在 `capabilities` 中添加新的 SharePoint 站点 URL 或 OneDrive 文件夹即可。

### Q: 代理回复不够准确怎么办？
A: 可以在 `instructions` 字段中增加更详细的行为指导和示例，然后重新发布。声明式代理的行为完全由 instructions 驱动。

### Q: 如何修改代理的名称或描述？
A: 编辑 `declarativeAgent.json` 中的 `name` 和 `description` 字段，重新打包部署即可。

## 版本历史

- v1.0.0 - 初始版本：邮件回复、产品查询、订单跟踪、会议准备、投诉处理、工作提效
