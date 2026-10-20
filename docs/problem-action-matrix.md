# 问题—处置矩阵（FR-1）

> Prototype，不用于生产。核实日期：**2026-10-20**。每条处置都对应 `docs/architecture.md` 的事实编号（F-xx），链接为官方页面。官方页面会更新，使用前请重新打开链接确认。

背景：某智能商用设备厂商的产品研发团队，经过启动日（Activation Day）和两期 workshop 后第一批研发同事开始试用，反馈了下面四类问题。客户原话与具体场景未提供（见 `OPEN-QUESTIONS.md` Q-03），背景列使用通用描述。

## 总表

| 问题 | 现在能做什么（官方可核实） | 适用条件 | 限制 | 官方链接 | 不能解决时怎么办 |
|---|---|---|---|---|---|
| 1. 长周期任务难以无人值守执行：缺少内置浏览器联动自动化测试；IDE 端没有全托管模式 | (a) 本地 IDE/CLI：在 `.kiro/settings/mcp.json` 配 Playwright MCP，让 agent 打开页面、点击、截图、读控制台消息（F-01、F-02、F-03）；用 steering 规定「改前端后必须浏览器验证」（F-06）；用 Stop hook 自动跑浏览器测试（F-07）；dev server 后台运行（F-09）；Autopilot 模式减少逐步批准（F-17）。本仓库 `examples/` 提供可复制配置。(b) 云端会话：从 IDE（Agent Focus）、CLI（`--cloud`）或 Kiro Web 启动，客户端断开后 agent 继续运行，可选 Autonomous（F-13、F-15）；Web 沙箱内置无头 Chrome 和 Playwright MCP 等工具（F-05、F-04）。(c) Kiro Crew：Task Runner 按 spec 长时间无人值守执行，带检查点与重试；Browser 功能可操作浏览器（F-18）。(d) CLI 无头模式用于 CI（F-21） | (a) 本机有 Node；组织未关闭 MCP，若启用 MCP registry 需把 Playwright MCP 加入允许清单（F-36）。(b) 付费订阅；IAM Identity Center 组织需管理员启用 Cloud Sessions；仅 `us-east-1`；仓库在已连接的 GitHub/GitLab（F-13、F-14、F-43）。(c) 在自有机器上安装运行并登录 kiro-cli（F-18）。(d) 需 API key 且管理员允许（F-21） | (a) agent 能否自动调用 MCP 工具受批准设置影响；本仓库示例 `autoApprove` 为空，需人工批准。(b) 无 Supervised 模式；IDE 中 `#File` 等选择器不可用；有并发上限；Web 会话不运行 hooks（F-13、F-07）。(c) Crew 为开源个人 agent，企业治理能力官方未说明（见 OPEN-QUESTIONS Q-01）。官方文档未记载 IDE 本地会话内置浏览器 | https://kiro.dev/docs/mcp/configuration/ ；https://kiro.dev/docs/mcp/servers/ ；https://kiro.dev/docs/cloud-sessions/ ；https://kiro.dev/docs/web/sandbox/ ；https://kiro.dev/docs/crew/features/task-runner/ | 详见 `usage-modes.md` 选择方式。需要 IDE 本地会话内置浏览器时，通过官方反馈渠道提交需求（GitHub kirodotdev/Kiro 的 Suggest an idea，或 CLI `/feedback`，F-38） |
| 2. 高频调试场景交互效率偏低：不支持把文件拖进对话框 | IDE：文档（PDF、CSV、DOC、DOCX、XLS、XLSX、HTML、TXT、Markdown）可粘贴或拖拽到聊天输入框（F-11）；用 `#file`、`#folder`、`#problems`、`#terminal`、`#git diff`、`#current` 等引用上下文（F-10）；manual steering 用 `#名称` 或 `/` 调用固定指令（F-06）；Stop/PostFileSave 等 hooks 自动执行重复动作（F-07）。CLI：图片拖入终端、`/paste`、`@路径` 引用文件（F-12） | IDE 0.11 及以上（文档附件）；hooks 新格式需 IDE 1.0 / CLI V3（F-07） | 每条消息附件数量有上限（F-11）；云端会话中 `#File`/`#Folder`/`#Terminal`/`#Problems` 选择器不可用，但附件可用（F-13）；从文件树拖拽代码文件是否支持官方未说明（U-03），用 `#file` 代替 | https://kiro.dev/docs/ide/chat/ ；https://kiro.dev/changelog/ide/0-11/ ；https://kiro.dev/docs/cli/chat/file-references/ ；https://kiro.dev/docs/steering/ | 详见 `interaction-efficiency.md`。需要从文件树拖拽代码文件时，通过官方反馈渠道提交（F-38） |
| 3. 对网络环境要求较高：网络不稳定时容易连接中断 | 按官方放行清单配置防火墙/代理（F-22）；IDE/CLI 设置 `HTTPS_PROXY` 等或 Settings > Proxy（F-22）；用官方 `curl -v` 命令区分网络与服务问题（F-23）；需要私有连接时评估 VPC 终端节点（F-24）；长任务改用云端会话，断开不影响 agent，重连后回放记录（F-13）；Kiro Web 标签页恢复后自动重连并回放（F-16） | 网络团队可修改放行规则；云端会话条件同第 1 行 | 浏览器登录绕过 IDE/CLI 代理设置（F-22）；TLS inspection 可能干扰连接（F-23）；本地 IDE 会话断网后的行为官方未说明（U-07） | https://kiro.dev/docs/privacy-and-security/firewalls/ ；https://kiro.dev/docs/ide/troubleshooting/ ；https://kiro.dev/docs/cloud-sessions/ | 详见 `network-checklist.md`。按清单收集证据后，企业用户通过 AWS Support 或官方反馈渠道（F-38）提交 |
| 4. Credit 消耗过快：高频使用下消耗速度超出预期 | 了解计量：credit 按请求小数计量，复杂任务、spec 任务、hook 执行都消耗，不同模型速率不同（F-25、F-26）；降低消耗：按任务选模型或 Auto（F-26），降低 reasoning effort（F-27），hooks 用 command 动作而不是 agent 动作（F-08），用 steering 的 `fileMatch`/`manual`/`auto` 让说明按需载入（F-06），`.kiroignore` 排除大文件和构建产物（F-40），长会话依靠 compaction / `/compact`（F-28）；监控：订阅面板、低余量通知（F-25、F-29），企业用户活动报告 `Credits_Used`（F-34），超额默认关闭并可设上限（F-32） | 企业报表需管理员在 Kiro 控制台开启并指定 S3 桶（F-34） | 官方没有给出「某做法能省多少」的数据，本仓库也不给数字；倍率相同的模型实际消耗也可能不同（F-26） | https://kiro.dev/faq/ ；https://kiro.dev/docs/models/ ；https://kiro.dev/docs/models/effort/ ；https://kiro.dev/docs/hooks/actions/ ；https://kiro.dev/docs/enterprise/monitor-and-track/user-activity/ | 详见 `credit-governance.md`。按月用 `tools/reconcile-subscriptions.mjs` 找出高消耗与未活跃用户，调整套餐（F-32）；计量方式疑问通过官方渠道咨询 |

## 与「建议方向」的对应

原建议是「通过 Kiro 的多终端、Web 和 Crew 方式使用」。核对官方文档后：

- 「多终端」在官方文档中没有这个统一名称，对应的是同一 agent 的多个使用界面：Kiro IDE、Kiro CLI、Kiro Web、Kiro Mobile（Preview）、Kiro Crew，以及云端会话在这些界面之间切换（F-13、F-19、F-20）。
- 「Web」对应 Kiro Web（F-14）。
- 「Crew」在官方文档中有同名产品 Kiro Crew（F-18）。是否就是建议所指，见 `OPEN-QUESTIONS.md` Q-01。

三者的差别和选择方法见 `usage-modes.md`。

## 官方已有的现成示例（直接链接，不重写）

| 主题 | 官方资料 |
|---|---|
| MCP 配置格式与示例 | https://kiro.dev/docs/mcp/configuration/ ，https://kiro.dev/docs/mcp/examples/ |
| Steering 写法 | https://kiro.dev/docs/steering/ |
| Hook 示例模板 | https://kiro.dev/docs/hooks/examples/ |
| 云端会话演练（含视频） | https://kiro.dev/docs/guides/running-kiro-in-the-cloud/ |
| 防火墙放行清单 | https://kiro.dev/docs/privacy-and-security/firewalls/ |
| 企业开通与订阅 | https://kiro.dev/docs/enterprise/getting-started/ |

本仓库补充的是官方没有现成示例的部分：把四类试用问题映射到处置方式，以及「本地前端改动 → 浏览器验证 → 失败回传」的可运行配置（`examples/`）。
