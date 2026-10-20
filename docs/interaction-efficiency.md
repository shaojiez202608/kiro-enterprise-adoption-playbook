# 交互效率：上下文引用、附件与减少重复指令（FR-4）

> Prototype，不用于生产。核实日期：**2026-10-20**。事实编号见 `docs/architecture.md`。

## 1. 官方支持的上下文引用方式

### Kiro IDE 聊天输入框（`#` 上下文提供者，F-10）

| 写法 | 用途 |
|---|---|
| `#codebase` | 让 Kiro 在项目中自动查找相关文件 |
| `#file`（输入 `#` 后选择文件，如 `#auth.ts`） | 引用指定文件 |
| `#folder` | 引用文件夹及其内容 |
| `#git diff` | 引用当前 Git 改动 |
| `#terminal` | 引用当前终端的近期输出和命令历史 |
| `#problems` | 引用当前文件的问题（诊断） |
| `#url` | 引用网页文档 |
| `#code` | 直接附上一段代码 |
| `#repository` | 引用仓库结构图 |
| `#current` | 引用当前活动文件 |
| `#steering` | 引用指定 steering 文件 |
| `#docs` | 引用文档文件 |
| `#spec` | 引用某个 spec 的全部文件 |
| `#mcp` | 使用已连接 MCP 服务器的工具、提示和资源模板 |

可在一条消息中组合多个，例如 `#terminal #problems 这个构建为什么失败`。

注意：早期草稿写作 `#File`、`#Folder`、`#Problems`、`#Terminal`、`#Git Diff`。官方提供者表格用小写，dev servers 页与云端会话页用首字母大写，官方未说明是否区分大小写（U-04）。云端会话中 `#File`/`#Folder`/`#Terminal`/`#Problems` 选择器不可用（F-13）。

### Kiro CLI（F-12）

- `@src/index.ts` 引用文件内容，`@src/` 引用目录树；内容在发送前内联展开。
- 把图片拖进终端窗口会插入图片路径；`/paste` 粘贴剪贴板图片。

## 2. 拖拽与附件的支持范围（以官方为准）

| 场景 | 官方说明 | 来源 |
|---|---|---|
| IDE：把文档拖进或粘贴到聊天输入框 | 支持，格式包括 PDF、CSV、DOC、DOCX、XLS、XLSX、HTML、TXT、Markdown；每条消息数量有上限；可与文字、图片混合 | F-11 |
| IDE：图片如何添加 | 官方 IDE 文档未写明添加方式（changelog 只说文档可与图片混合在同一提示） | U-02 |
| IDE：从文件树拖拽代码文件 | 官方未说明 | U-03 |
| CLI：拖拽图片 | 支持（插入路径） | F-12 |
| 云端会话：附件 | 图片和文档附件可用，内容会上传到会话 | F-13 |

对代码文件，统一建议用 `#file`（IDE）或 `@路径`（CLI）引用，这两种方式有官方依据。

## 3. 用 steering 和 hooks 减少重复指令

本仓库 `examples/.kiro/` 中的示例：

| 文件 | 机制 | 解决的重复动作 |
|---|---|---|
| `steering/frontend-verification.md` | `inclusion: fileMatch`，只在改 `frontend-demo/public/**` 时载入（F-06） | 不必每次提醒「改完前端要开浏览器验证、读控制台、截图、跑测试」 |
| `steering/debug-report.md` | `inclusion: manual`，用 `#debug-report` 或 `/debug-report` 调用（F-06） | 不必每次重复「先复述症状、列证据、最小改动、跑测试」的报告格式 |
| `hooks/ui-verify-on-stop.json` | `Stop` 触发的 command 动作（F-07） | 不必每次手动说「跑一下浏览器测试」；失败会回传给 agent，有重试上限 |

其他官方可核实的做法：

- 在 `.kiro/steering/` 放 `product.md`、`tech.md`、`structure.md` 等基础文件，默认每次交互载入（F-06）。
- 团队统一规范可放到全局 `~/.kiro/steering/`，由 MDM 或组策略分发（F-06）。
- 用 `#[[file:路径]]` 在 steering 中引用实时文件，避免复制内容后过期（F-06）。
- 让 dev server 在后台运行，用 steering 规定改动后检查其输出（F-09）。

hooks 选择 command 动作而不是 agent 动作的原因：官方说明 agent 动作会触发新的 agent 循环并消耗 credit，command 动作不消耗（F-08）。
