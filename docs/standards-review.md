# 规范对齐 review（AWS 原型项目通用规范，附录 A–F）

> 日期：2026-10-21。对照《AWS 原型项目通用规范与经验》附录的 review 清单逐项检查。本项目没有 AWS 部署，凡是只与部署相关的要求标「不适用」并写理由。
> 状态取值：**满足**（本轮前已满足）/ **需修改 → 已修改**（本轮修改，最终状态为满足）/ **不适用**。证据为本轮修改后的文件与行号。

## 汇总

| 状态 | 条数 |
|---|---|
| 满足（本轮前已满足） | 6 |
| 需修改 → 已修改 | 25 |
| 不适用 | 6 |

不适用项：C-1 中的部署配置模板与删除策略参数、C-2 中的账号区域确认与破坏性变更保护、D-1 中的 cdk-nag 与信任策略 / 资源策略、D-2 中的 synth 与部署验证 workflow、E-1 中的云端清理脚本、E-2 中的 bootstrap 资产清理。共同理由：项目不创建任何 AWS 资源（`DEPLOYMENT-LOG.md`、D-26 至 D-32）。

## A. 定性与脱敏

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| A-1 | README 第一屏免责声明（非生产、使用方负责、安全与法务评估、链接加固清单） | 需修改 → 已修改 | `README.md:3-9`、`README.zh-CN.md:3-9` | 原来只有「Prototype — not for production」；补齐三要点、责任共担模型链接（F-49）与加固清单链接。测试检查免责声明在第一个二级标题之前（`tests/content-policy.test.mjs`） |
| A-2 | grep 客户名、人名、域名、12 位数字、个人 profile 名、「[INSERT」 | 满足 | 全仓库检索（`node_modules` 除外）：12 位数字只有占位 `111122223333`；无 `[INSERT`、无 `--profile` / `AWS_PROFILE`；禁用词由 `tests/content-policy.test.mjs:12-38` 持续检查 | 上一轮已完成客户场景泛化与内部用语中性化 |
| A-3 | 占位符 `<UPPER_SNAKE>`、`example.com`、`111122223333`；截图来源；合成数据 | 需修改 → 已修改 | `VERIFICATION.md:66`；`tests/content-policy.test.mjs:47`；`sample-data/README.md:3` | `<ACCOUNT_ID>` 换成 `111122223333`（D-24）；内容测试只放行这一个 12 位数字。仓库没有截图（测试运行时生成的截图在 `.gitignore` 中）。数据全部合成，含边界样本（无订阅的活动用户、跨月数据、已取消但有使用；测试中另有大小写不同、重复报告、同一用户多行订阅） |

## B. 仓库标配

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| B-1a | LICENSE（MIT-0 + Amazon 版权行） | 满足 | `LICENSE:1-3` | 测试新增版权行检查（D-22） |
| B-1b | SECURITY（完整写法） | 需修改 → 已修改 | `SECURITY.md:3-60` | 原来只有上报方式与范围；补上部署内容、数据处理、控制与实现文件对照、注意事项、加固 7 步、清理，并加上 aws-security@amazon.com（D-23） |
| B-1c | CODE_OF_CONDUCT | 满足 | `CODE_OF_CONDUCT.md:3` | 指向亚马逊开源行为准则 |
| B-1d | CONTRIBUTING（测试、提交规范、不能提交账号 ID、许可证确认、AI 使用规则） | 需修改 → 已修改 | `CONTRIBUTING.md:12,17-25,31,37,42-44` | 原来缺 Conventional Commits、账号 ID 占位、许可证确认、AI 规则；已补齐 |
| B-2a | THIRD-PARTY-LICENSES 两张表 | 需修改 → 已修改 | `THIRD-PARTY-LICENSES:9,15` | 新增。许可证取自 `package-lock.json`、npm registry 元数据（`@playwright/mcp@0.0.83`）与 Chromium 源码仓库 LICENSE；声明不重新授权 |
| B-2b | CHANGELOG（Keep a Changelog）+ VERSION | 需修改 → 已修改 | `CHANGELOG.md:8`、`VERSION` | 新增 `0.1.0`；测试检查 VERSION 与 CHANGELOG 一致；打 tag `v0.1.0` |
| B-3a | Issue / PR 模板 | 需修改 → 已修改 | `.github/ISSUE_TEMPLATE/config.yml:1`、`bug_report.yml`、`doc_correction.yml`、`.github/pull_request_template.md:3,11` | 表单式；关闭空白 issue 并给出安全联系方式；PR 模板列出跑了哪些检查、什么没测 |
| B-3b | AGENTS.md + CLAUDE.md | 需修改 → 已修改 | `AGENTS.md:32,40,46`、`CLAUDE.md:1` | 角色、常用命令、git 流程、Always / Ask first / Never；CLAUDE.md 只有 `@AGENTS.md`（测试检查） |
| B-3c | Makefile | 需修改 → 已修改 | `Makefile` | 统一入口：`preflight lint test synth deploy verify destroy verify-cleanup scan`，另有 `setup`、`links`、`clean`。`synth`、`deploy`、`destroy` 明确输出「不适用」；CI 用到的目标只检查不改动 |
| B-3d | `.gitignore` / `.dockerignore`（`.example` 例外） | 需修改 → 已修改 | `.gitignore:8-12,17-22` | 补上 `.example` 例外与本地缓存；`.dockerignore` 不需要（没有 Docker 构建） |
| B-3e | CODEOWNERS | 需修改 → 已修改 | `.github/CODEOWNERS` | CI、扫描配置、AI 配置、`.kiro/` 与 hook 脚本；负责人为 `@shaojiez202608`（Q-13 已关闭） |
| B-4 | DECISIONS / OPEN-QUESTIONS / SECURITY-NOTES / THREAT_MODEL（DRAFT）/ VERIFICATION / DEPLOYMENT-LOG | 需修改 → 已修改 | `THREAT_MODEL.md:3` | 文件都已存在；THREAT_MODEL 顶部加 `Status: DRAFT`（测试检查）；DECISIONS 增加 D-22 至 D-33 |

## C. 配置与部署

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| C-1a | 配置模板、`make init`、删除策略参数、标签统一 | 不适用 | `docs/deployment-guide.md` 参数表 | 没有部署配置。运行参数只有环境变量与命令行参数（D-26）；标签与前缀只在只读核对中使用（`proto-kiro-`、`Project=kiro-enterprise-playbook`） |
| C-1b | 输入校验 | 满足 | `examples/scripts/kiro-ui-verify.mjs`（`parseMaxAttempts`、`sanitizeSessionId`）、`tools/reconcile-subscriptions.mjs`（`parseArgs`、`requireColumns`） | 不合法输入报错或回退到安全默认值，均有测试 |
| C-2a | 预检 | 需修改 → 已修改 | `tools/preflight.mjs`、`make preflight` | 只读检查 Node、npm、git、示例依赖、Playwright 浏览器缓存、gitleaks。账号与区域确认、Docker、服务区域可用性：不适用（D-27） |
| C-2b | 破坏性变更保护、`ALLOW_PAID` | 不适用 | — | 没有 `cdk diff` / 部署；仓库中没有会产生 AWS 费用的命令（D-27） |
| C-2c | 冒烟或端到端验证（含拒绝路径） | 满足 | `tests/ui-verify-hook.integration.test.mjs`、`examples/frontend-demo/tests/ui.spec.mjs`、`VERIFICATION.md` 第 2 节 | 含故意做错的反例：旧行为对照组必须失败；模拟控制台错误必须被检出；路径穿越必须被拒；核对工具三种错误输入必须报错 |
| C-3 | 验证记录含日期、区域、配置、提交哈希、失败项、局限 | 需修改 → 已修改 | `VERIFICATION.md` 开头与第 9 节 | 补上被验证的提交哈希、配置与「这个结果不能证明什么」 |

## D. 安全与 CI

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| D-1a | 静态检查零未处理发现，每条抑制有理由 | 需修改 → 已修改 | `SECURITY-NOTES.md`「扫描配置与豁免」；`VERIFICATION.md` 第 4 节 | 跑了 zizmor、semgrep、npm audit、gitleaks、detect-secrets。抑制项 3 条，都在行内并写明理由：semgrep 1 条（`tools/preflight.mjs`），detect-secrets 2 条（CI 中的公开校验和与提交哈希）；内容规则测试中的两处放行也写明理由（`SECURITY-NOTES.md`）。ASH 与 osv-scanner 本机未运行（无 Docker / 未安装），按规范视为未通过，ASH 交给 CI 的 `ash` job |
| D-1b | cdk-nag、信任策略带 SourceAccount 与 SourceArn、敏感资源有资源策略 | 不适用 | `SECURITY-NOTES.md`「cdk-nag 与 AWS 安全基线」 | 不创建 IAM 角色或资源（D-28） |
| D-2a | CI 含 lint、测试、密钥扫描；Actions 按 SHA 固定、权限最小 | 需修改 → 已修改 | `.github/workflows/ci.yml:10-11,23,26` | 新增：lint、单元与集成测试、Playwright、链接检查、gitleaks 全历史 + canary、ASH（container 模式，扫描器未完成即失败）。SHA 用 `git ls-remote` 查出（checkout v6.1.0、setup-node v6.5.0），`persist-credentials: false`；测试检查 SHA 固定与 `contents: read`。zizmor 无发现。**未在 GitHub 上运行，仅本地等效执行** |
| D-2b | synth 与部署验证 workflow | 不适用 | — | 没有 IaC 与部署（D-29） |
| D-2c | Dependabot 分组、cooldown | 需修改 → 已修改 | `.github/dependabot.yml:1-8` | npm（`examples/frontend-demo`）与 GitHub Actions，按周、分组、冷却期，注释写明固定版本的原因 |
| D-2d | gitleaks 豁免有理由 | 需修改 → 已修改 | `.gitleaks.toml` | 新增，无豁免，写明原因 |
| D-3 | 没有修改账号级设置 | 满足 | `SECURITY-NOTES.md` 基线表 | 只做过只读查询 |

## E. 清理

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| E-1a | 清理脚本（带确认）与残留核对脚本 | 需修改 → 已修改 | `tools/cleanup-local.sh:21,27`、`tools/verify-cleanup.sh:14,56` | 本机清理：两次确认、单步失败警告并继续。残留核对：只读，有残留时退出码 1，输出中 12 位数字一律替换 |
| E-1b | 云端清理脚本 | 不适用 | — | 没有云资源（D-32） |
| E-1c | README 列出不会被自动删除的资源 | 需修改 → 已修改 | `README.md:119-135` | 浏览器缓存、npx 缓存、hook 计数文件、复制到其他仓库的文件、管理员创建的 Kiro profile / 订阅 / S3 桶 |
| E-2a | 所有用过的区域核对并有结论 | 需修改 → 已修改 | `VERIFICATION.md` 第 6 节 | `make verify-cleanup` 核对 Kiro 支持的区域与 CLI 默认区域：无残留 |
| E-2b | 共享 bootstrap 资产只删本项目的 | 不适用 | — | 从未部署，没有本项目的 bootstrap 资产（D-32） |

## F. 文档与提交

| # | 检查项 | 状态 | 证据 | 处理 |
|---|---|---|---|---|
| F-1a | 事实核对表每条有官方链接和日期 | 需修改 → 已修改 | `docs/architecture.md` 第 4 节 | 新增 F-47 至 F-49（成本维度、Budgets、责任共担模型），WebFetch 核对，日期 2026-10-21；测试检查每行链接与日期 |
| F-1b | 成本只写维度 | 需修改 → 已修改 | `README.md:46-64` | 新增「前置条件和成本」：Kiro 与 S3 的计费维度、定价页链接、不预设免费额度、Budgets 告警 |
| F-1c | README 章节顺序；部署命令只在 README 一处；ARCHITECTURE 标明版本 | 需修改 → 已修改 | `README.md:31-165`、`README.zh-CN.md`；`docs/deployment-guide.md`「安装与运行」；`docs/architecture.md:5` | 两份 README 按规定顺序重排（测试检查）；deployment-guide、demo-script、cleanup 改为引用 README；architecture 标明对应 `v0.1.0`，新增部署拓扑与信任边界图 |
| F-2 | 提交信息符合 Conventional Commits，正文写验证结果；不推送 | 需修改 → 已修改 | `git log`；D-33 | 现有 17 个提交主题都符合 `type: subject` 格式；为加 scope 的 filter-repo 重写被本机权限拦下，未重试，历史未重写。本轮新提交带 scope 并写验证方式；未推送；打 tag `v0.1.0` |
