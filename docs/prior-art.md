# Prior-art 检索

检索日期：2026-10-20。

检索方式：

- GitHub 搜索：`kiro org:aws-samples`、`kiro org:awslabs`、`org:kirodotdev`、`kiro steering hooks`。
- kiro.dev：站点地图中全部文档页、changelog、博客，全文检索 playwright、browser、enterprise、firewall、subscription 等关键词。
- AWS 博客：博客目录接口按关键词 "kiro" 检索（148 篇），按标题筛选企业落地、治理、浏览器测试、网络、用量相关文章。
- AWS Prescriptive Guidance（2026-10-20 补完）：从 docs.aws.amazon.com 的站点地图索引取得全部 281 份 Prescriptive Guidance 出版物（patterns 与各 guide/strategy）的页面清单（4117 个页面），按 URL 检索 kiro、q-developer、coding-assistant 等关键词；对标题含 agentic、gen-ai、developer、software-dev-lifecycle、security-reference-architecture-generative-ai 的 5 份指南（73 个页面）下载全文检索「Kiro」。命中结果见下表最后三行，均已用页面原文核对（F-45、F-46）。

## 相近资产

| 资产 | 链接 | 覆盖了什么 | 没覆盖什么 |
|---|---|---|---|
| Kiro 官方文档（MCP、Steering、Hooks、防火墙、云端会话、企业管理） | https://kiro.dev/docs/ | 按功能完整说明配置格式、行为、限制 | 不按「企业试用中遇到的问题」组织；没有把前端改动与浏览器验证、失败回传串起来的可运行示例 |
| Kiro 文档 Learn by playing | https://kiro.dev/docs/guides/learn-by-playing/ | 用示例游戏项目带新用户走一遍 steering、specs、hooks、MCP | 不涉及企业网络、订阅、用量治理 |
| Kiro 博客：Agentic engineering in the cloud | https://kiro.dev/blog/agentic-engineering-in-the-cloud/ | Kiro Web 与云端会话中用 Playwright 复现与验证浏览器问题 | 本地 IDE/CLI 会话的配置示例 |
| aws-samples/sample-kiro-user-analytics-dashboard | https://github.com/aws-samples/sample-kiro-user-analytics-dashboard | 用 Glue + Athena + Streamlit 可视化用户活动报告（消息、会话、credit、客户端类型、用户参与度），Terraform 部署 | 不读取控制台订阅导出（含 Pending 状态）；需要部署基础设施 |
| aws-samples/sample-kiro-cost-analyzer | https://github.com/aws-samples/sample-kiro-cost-analyzer | 无服务器架构分析 credit 用量、套餐优化建议、沉睡用户识别、多账号 | 规模较大，需部署；不涉及试用问题处置与客户端配置 |
| aws-samples/sample-kiro-secops-baseline | https://github.com/aws-samples/sample-kiro-secops-baseline | 安全基线：`permissions.yaml`、steering、skills、安全审查 agent、hooks | 不涉及前端浏览器验证闭环、网络排查、订阅管理 |
| kirodotdev-labs/awesome-kiro | https://github.com/kirodotdev-labs/awesome-kiro | 社区整理的 steering、hooks、skills、工具清单 | 非官方维护；不按企业问题组织 |
| kirodotdev/Kiro（官方问题与反馈跟踪） | https://github.com/kirodotdev/Kiro | 官方公开的缺陷与需求提交入口 | 不是落地资料 |
| AWS 博客中含 Kiro 的文章 | https://aws.amazon.com/blogs/ | 多为特定场景（数据库排障、迁移、DevOps 集成）的案例 | 按标题筛选未发现「企业试用问题—处置」类文章 |
| Prescriptive Guidance pattern：Deploy real-time coding security validation by using an MCP server with Kiro and other coding assistants | https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-real-time-coding-security-validation-by-using-an-mcp-server-with-kiro-and-other-coding-assistants.html | 一个本地 MCP 服务器，把 IaC 与源代码安全扫描接入 Kiro 等编码助手；给出 Kiro 的 `.kiro/settings/mcp.json` 配置，并说明 `autoApprove` 的取舍；代码在 aws-samples/sample-mcp-security-scanner | 只做安全扫描，不涉及浏览器验证、hooks、网络排查、订阅与 credit 治理 |
| Prescriptive Guidance 指南：Governing and architecting agentic AI（应用层：生成式 AI 终端用户方案） | https://docs.aws.amazon.com/prescriptive-guidance/latest/govern-architect-agentic-ai/gen-ai-end-user-solutions-layer.html | 把 Kiro 列为面向终端用户的代码助手类现成方案，概括其 spec 模式与 MCP 能力 | 架构层面的定位，没有落地、配置或排障内容 |
| Prescriptive Guidance 指南：AWS Security Reference Architecture for generative AI，能力 6（AI 应用的安全访问） | https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture-generative-ai/ai-apps.html | 对 Kiro 等用户侧 AI 应用给出安全建议：IAM Identity Center 集中身份、Kiro 的 PrivateLink 终端节点、用户活动遥测、客户托管 KMS 密钥等，并链接 Kiro 文档 | 安全基线建议，不涉及试用问题处置、浏览器验证闭环、订阅核对 |

## 差异点

1. **按试用问题组织**：四类问题各一行，给出官方可核实的处置、适用条件、限制、链接、无法解决时的做法（需求输入的差异化方向）。官方文档按功能组织。
2. **本地会话的浏览器验证闭环可直接运行**：`examples/` 把 Playwright MCP 配置、`fileMatch` steering、带重试上限的 Stop hook 和一个合成前端组合起来，前端浏览器测试在本机实际运行。官方现成示例集中在 Kiro Web 云沙箱。
3. **事实可追溯**：每条产品说法都有编号、官方链接和核实日期；核实不了的单独列出。
4. **月度核对零基础设施**：只读两份管理员可下载的文件，离线运行。需要仪表盘或深入分析时，直接使用上面两个 aws-samples 示例，本项目不重写。

## 结论

与已有资产没有高度重合，差异点明确，继续开发。Prescriptive Guidance 中与 Kiro 相关的三份资料分别是安全扫描 MCP 服务器、架构定位与安全基线，与本仓库的「试用问题—处置」和本地浏览器验证闭环互补；安全基线中与本仓库重叠的部分（PrivateLink、用户活动报告）在本仓库中只链接 Kiro 官方页面（F-24、F-34）。已有的内容（配置格式、云端演练、用量仪表盘、安全基线）在本仓库中只做链接。
