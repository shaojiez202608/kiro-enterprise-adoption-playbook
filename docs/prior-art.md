# Prior-art 检索

检索日期：2026-10-20。

检索方式：

- GitHub 搜索：`kiro org:aws-samples`、`kiro org:awslabs`、`org:kirodotdev`、`kiro steering hooks`。
- kiro.dev：站点地图中全部文档页、changelog、博客，全文检索 playwright、browser、enterprise、firewall、subscription 等关键词。
- AWS 博客：博客目录接口按关键词 "kiro" 检索（148 篇），按标题筛选企业落地、治理、浏览器测试、网络、用量相关文章。
- AWS Prescriptive Guidance：未能用检索接口完成检索（文档搜索接口不可用），此项**未完成**，发布前建议负责人补查。

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

## 差异点

1. **按试用问题组织**：四类问题各一行，给出官方可核实的处置、适用条件、限制、链接、无法解决时的做法（spec 第 7 节方向）。官方文档按功能组织。
2. **本地会话的浏览器验证闭环可直接运行**：`examples/` 把 Playwright MCP 配置、`fileMatch` steering、带重试上限的 Stop hook 和一个合成前端组合起来，前端浏览器测试在本机实际运行。官方现成示例集中在 Kiro Web 云沙箱。
3. **事实可追溯**：每条产品说法都有编号、官方链接和核实日期；核实不了的单独列出。
4. **月度核对零基础设施**：只读两份管理员可下载的文件，离线运行。需要仪表盘或深入分析时，直接使用上面两个 aws-samples 示例，本项目不重写。

## 结论

与已有资产没有高度重合，差异点明确，继续开发。已有的内容（配置格式、云端演练、用量仪表盘、安全基线）在本仓库中只做链接。
