# 长周期任务：本地 IDE、Web、Crew 的差别（FR-3）

> Prototype，不用于生产。核实日期：**2026-10-20**。只写官方文档记载的行为，事实编号见 `docs/architecture.md`。

## 对比

| 维度 | 本地 IDE / CLI 会话 | 云端会话（Kiro Web，或从 IDE/CLI 发起） | Kiro Crew |
|---|---|---|---|
| 运行位置 | 你的机器 | Kiro 托管的隔离云沙箱（F-13） | 你自己的硬件：本机、本地容器或你控制的远程主机（F-18） |
| 断开客户端后 | 官方未说明（U-07） | agent 继续运行；状态保存在云端；从任一客户端重新连接后回放记录；无人连接时权限请求等待（F-13） | Gateway 作为系统服务或容器常驻时，定时任务、Task Runner 继续运行（F-18） |
| 自主程度 | Autopilot / Supervised（F-17） | Autopilot / Autonomous，无 Supervised（F-13、F-15） | Task Runner 自动拆解、执行、测试、重试；可设强制审批关口（F-18） |
| 浏览器验证 | 需自行配置 MCP（如 Playwright MCP，F-02），本仓库 `examples/` | 沙箱内置无头 Chrome 与 Playwright MCP 等工具，无需配置（F-05） | Browser 功能（F-18） |
| 代码来源 | 本地工作区 | 服务端通过已连接的 GitHub/GitLab 克隆，本地工作副本不上传（F-13） | 本机或远程主机上的目录与 git 仓库（F-18） |
| 配置 | 工作区 `.kiro/` 与 `~/.kiro/` | 仓库中的 `.kiro/` 随克隆生效；`~/.kiro/` 不生效，个人配置用 Configuration Sync（F-41） | Crew 自身配置与 MCP（见官方 Crew 文档） |
| Hooks | 支持（F-07） | 官方两页说法不一致：hooks 页写 Kiro Web 会话不运行 hook 触发器和动作（F-07）；云端会话页写仓库 `.kiro/` 中提交的 hooks 在云端会话中自动生效（F-41）。本仓库不依赖云端会话中的 hook；以会话中实际看到的配置为准（CLI 云端会话中 `/hooks` 显示的是沙箱配置，F-41） | Crew 有自己的 hooks 能力（https://kiro.dev/docs/crew/capabilities/hooks/ ） |
| 前提条件 | 安装客户端并登录 | 付费订阅；IAM Identity Center 组织需管理员启用 Cloud Sessions；仅 `us-east-1`（F-13、F-43） | 安装 Crew 并登录 kiro-cli；订阅可用于 Crew（F-18、F-19） |
| 主要限制 | 依赖本机在线、不休眠 | 并发数有上限；IDE 中部分上下文选择器不可用（F-13） | 需自行运维主机；企业治理能力官方未说明（Q-01） |

## 怎么选

官方「Running Kiro in the cloud」指南给出的判断（F-13 所在页面的配套指南 https://kiro.dev/docs/guides/running-kiro-in-the-cloud/ ）：

- 任务长、需要自主执行，或想并行跑多个任务、或人不在电脑前 → 云端会话。
- 需要快速迭代、直接看本地文件和 diff、逐个批准改动，或依赖仓库外的本地工具和数据 → 本地会话。

在此基础上，本项目的建议（保守取舍，见 `DECISIONS.md` D-11）：

1. 先在本地会话用本仓库 `examples/` 的配置把「改前端 → 浏览器验证」跑通，确认团队能接受 agent 的工作方式。
2. 需要无人值守时，优先云端会话：它是官方托管、受订阅与管理员开关约束的方式。
3. Kiro Crew 适合个人在自有机器上常驻运行的场景。企业推广前，先确认 Crew 在组织治理（MCP 治理、登录方式限制等）下的适用情况，官方文档目前没有说明（Q-01）。

## 云端会话的安全要点

- 网络访问选最小的级别：仅仓库访问 → 常用依赖 → 开放互联网（F-42）。
- 只给任务需要的 secrets（F-42）。
- 仓库中的 `.kiro/` 会进入云端会话（F-41），提交前检查其中不含凭证（steering 文档也要求不写密钥，F-06）。
- 这也包括 `.kiro/settings/mcp.json`：云端会话页写明仓库中提交的 MCP 服务器在云端会话中自动生效（F-41）。把本仓库 `examples/` 的配置提交到团队仓库后，Playwright MCP 也会出现在云沙箱中；`mcp.json` 的 `env` 中不要写凭证（Configuration Sync 页同样提醒上传的 `mcp.json` 会带上 `env` 的字面值，F-41）。云沙箱本身已预装 Playwright MCP（F-05），是否还需要仓库中的这一份，由团队决定。
- Kiro Web 不会自动合并，结果以 PR/MR 形式回到你的代码托管（F-14）。
