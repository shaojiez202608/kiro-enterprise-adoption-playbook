# Credit 消耗说明与治理（FR-6）

> Prototype，不用于生产。核实日期：**2026-10-20**。本文不写任何价格、额度、倍率数字；需要时打开官方页面。事实编号见 `docs/architecture.md`。

## 1. 官方对计量方式的说明

- Credit 是响应用户提示的工作量单位，按每个请求以小数计量；简单编辑和短提示消耗少，复杂、长任务消耗多（F-25）。
- 执行 spec 任务通常比简单提示消耗多；vibe 或 spec 模式的提示、spec 细化、任务执行、agent hook 执行都会消耗 credit（F-25）。
- 不同模型消耗速率不同，以 Auto 为基准的倍率表示；倍率相同的模型实际消耗也可能不同，取决于生成的 token 数、思考深度、分词器等（F-26）。倍率表见 https://kiro.dev/docs/models/ 。
- IDE、CLI、Web 都按同一 credit 模型计量，云端计算无单独收费（F-19）。
- 月度额度在下一个计费周期开始时重置，未用完的不结转（F-25）。套餐与额度见 https://kiro.dev/pricing/ 和 https://kiro.dev/docs/billing/ 。

## 2. 降低消耗的做法（只列官方可核实的）

| 做法 | 官方依据 | 说明 |
|---|---|---|
| 简单任务用 Auto 或倍率较低的模型，复杂任务再换模型 | F-26 | 模型选择器在聊天输入栏；CLI 用 `/model` |
| 降低 reasoning effort | F-27 | 官方：较低档位消耗更少 credit；只在模型支持时出现 |
| hooks 用 command 动作，少用 agent 动作 | F-08 | 官方：agent 动作触发新循环并消耗 credit，command 不消耗 |
| steering 用 `fileMatch` / `manual` / `auto` 按需载入 | F-06 | 官方表述为保持上下文相关、减少噪声；未给出节省数据 |
| `.kiroignore` 排除大文件、构建产物 | F-40 | 官方表述为保持上下文相关 |
| CLI 用 `@路径` 引用文件 | F-12 | 官方：内联展开、避免工具调用、节省 token |
| 长会话依靠自动 compaction，CLI 可 `/compact` | F-28 | 官方说明压缩中间输出，保留目标与决策 |
| 示例中的 Stop hook 设重试上限 | F-08（Stop 退出码语义） | 本仓库设计选择，限制自动追加的 agent 回合（D-08） |

本仓库不给出「每种做法能省多少」，官方也没有给出这类数据。

## 3. 监控与告警

个人与团队成员：

- 在 Kiro 内的订阅面板查看用量（F-25）。
- 接近月度额度时会收到低余量通知，可在 `Notifications: Billing` 设置中关闭（F-29）。

企业管理员（F-32、F-34）：

- Kiro 控制台仪表盘查看汇总指标。
- 开启用户活动报告，每日 CSV 写入指定 S3 桶，`Credits_Used`、`Total_Messages` 等列可做按人统计。
- 超额（overages）默认关闭；开启后可在 Service Quotas 查看和调整上限。
- 月度核对方法见 `runbook-activation-day.md` 第 4 节和 `tools/reconcile-subscriptions.mjs`。

已有 AWS 示例可做更完整的分析，直接使用即可（见 `docs/prior-art.md`）：aws-samples/sample-kiro-user-analytics-dashboard、aws-samples/sample-kiro-cost-analyzer。

## 4. 试用期建议流程

1. 启动日讲清第 1 节的计量方式和第 2 节的做法（议程见 `runbook-activation-day.md`）。
2. 第一周后，管理员按第 3 节查看用量分布，找出消耗明显偏高的用户。
3. 与这些用户一起复盘：模型/effort 选择、是否有 agent 动作 hooks、会话是否过长、steering 是否全部 `always`。
4. 仍然不够用时，按官方方式调整套餐或开启超额（F-32），不在本仓库给出套餐建议。
