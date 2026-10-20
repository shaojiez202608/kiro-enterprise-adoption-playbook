# 企业管理：账号与订阅统一管理（FR-7）

> Prototype，不用于生产。核实日期：**2026-10-20**。事实编号见 `docs/architecture.md`。本文只写官方文档能核实的规则；订阅数量限制只写了官方能核实的部分。

## 1. 官方的统一管理方式

- 在 AWS 管理控制台的 **Kiro 控制台**创建 **Kiro profile**。一个 AWS 账号在一个区域只能有一个 profile；profile 所在区域决定数据存储位置（F-30、F-39）。
- 身份源可接 IAM Identity Center、Okta 或 Microsoft Entra ID（F-30）。
- 在 **Users & Groups** 页按用户或组订阅并选择套餐。订阅组时组内用户逐个被订阅，没有「组订阅」这一概念（F-30）。
- 官方建议在 AWS Organizations 下启用 IAM Identity Center（组织实例）；账号实例不能升级为组织实例，只能删除重建（F-31）。
- 治理：可限制登录方式（F-35）、关闭 MCP 或用 registry 设允许清单（F-36）、开关 Cloud Sessions（F-43）、管理模型可用性等，入口见 https://kiro.dev/docs/enterprise/governance/ 。

部署位置的四种选项（F-31，详见 https://kiro.dev/docs/enterprise/deployment-options/ ）：

| 选项 | 适用 | 注意 |
|---|---|---|
| 1. 独立账号 | 评估、小团队 | 账号实例，功能较少 |
| 2. 管理账号启用 Identity Center，成员账号建 profile 并订阅 | 分布式管理（官方推荐的最佳实践） | 每个组织在每个区域可订阅用户的账号数有上限，可通过 AWS Support 申请提升，不保证批准（数值以官方页面为准） |
| 3. 仅成员账号 | 成员账号管理员独立部署 | 账号实例，功能较少 |
| 4. 仅管理账号 | 集中管理 | 不符合最佳实践；不支持委派管理员 |

## 2. 订阅数量限制：能核实的与不能核实的

| 项目 | 状态 | 依据 |
|---|---|---|
| 每个组织每个区域可订阅用户的账号数上限 | 官方有说明 | F-31 |
| IAM Identity Center 的用户数、组数、可分配给应用的组数等配额 | 官方有配额页 | F-37 |
| 超额（overage）上限 | Service Quotas 中可查看和调整 | F-32 |
| 单个 Kiro profile 可订阅的用户数上限 | **官方文档未找到** | U-10，见 OPEN-QUESTIONS Q-02 |
| 「新账号导入用户需分批」的官方做法 | **官方文档未找到** | U-10 |

如果在控制台操作中遇到数量提示，请记录提示原文、时间、区域，通过 AWS Support 确认，不要据此推断规则（Q-02）。

## 3. 新账号分批导入（基于已核实规则整理的步骤）

官方没有专门的「分批导入」流程，下面的步骤只由已核实的规则组成：

1. **选部署选项**（第 1 节），确认 Identity Center 实例和 Kiro profile 的区域在官方支持列表中（F-39）。
2. **核对配额**：对照 IAM Identity Center 配额页（F-37）和部署选项中的账号数上限（F-31）。
3. **按组分批**：在 Identity Center 或外部 IdP 中为每一批建组（例如「试点组」「第二批」），每批订阅一个组（F-30）。按组管理便于后续改套餐或停用（F-32）。
4. **看状态**：订阅后用户为 Pending，激活后变为 Active；Pending 不计费（F-32）。用 Subscriptions 表的 Download CSV 记录每批结果（F-34）。
5. **开报表**：开启用户活动报告到 S3（F-34），用于第 4 节和月度核对。

## 4. 旧账号迁移的注意点

「旧账号」具体指什么（个人订阅、另一个 Kiro profile、另一个 AWS 账号）未说明（Q-05）。官方没有迁移专门流程，下列是与迁移相关、已核实的规则：

- **避免重复计费**：同一用户在不同 Kiro profile（例如不同区域）下各有订阅会被分别计费；同一 profile 下重复订阅只按最高档计一次（F-33）。迁移期间应尽量缩短新旧 profile 并存的时间。
- **停用旧订阅的时机**：停用可选「月底」或「立即」；月中退订当月按全额计费；月中新订阅按比例计费（F-32、F-33）。可以在新 profile 订阅后，旧 profile 选择月底停用，让用户在过渡期内两边都能用（会产生两份费用，需提前评估）。
- **Identity Center 清理**：旧 profile 使用 Identity Center 且选择月底停用时，需在控制台按提示清理应用分配（F-32）。
- **自动取消**：用户从 Identity Center 或已订阅组中移除时订阅会在月底自动取消；仅停用用户不会取消订阅（F-32）。迁移脚本或流程中不要只做「停用用户」。
- **更换身份源**：变更 Identity Center 身份源可能重建用户 ID，旧订阅会显示为 ID 并在下月初自动取消（F-32）。
- **个人订阅转企业**：用 Google、GitHub 或 AWS Builder ID 登录时，订阅通过 Stripe 计费；企业订阅按每个已订阅用户按月计费，账单在 AWS Billing and Cost Management 的 Kiro 项下（F-44）。可用登录方式限制引导用户使用组织登录（F-35）。个人订阅如何取消见 https://kiro.dev/docs/billing/cancelling/ 。
- **用户本地配置**：用户的 `~/.kiro/`（steering、MCP 配置等）在本机，与订阅无关；团队统一配置建议放在仓库 `.kiro/` 或通过 MDM 分发全局 steering（F-06、F-41）。

## 5. 管理员权限

管理员所需最小权限见官方 IAM 页：https://kiro.dev/docs/enterprise/iam/ 。仪表盘所需权限见 https://kiro.dev/docs/enterprise/monitor-and-track/dashboard/ 。
