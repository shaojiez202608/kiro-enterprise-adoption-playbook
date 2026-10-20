# Verification

最近一次运行日期：2026-10-21（事实核对日期为 2026-10-20，见第 7 节）。环境：macOS（arm64），Node v24.14.0，npm 11.9.0，Playwright 1.64.1（使用本机 Playwright 缓存中已有的 Chromium，未做全局安装）。

## 1. 实际运行的测试

| 命令 | 内容 | 结果 |
|---|---|---|
| `npm run test:unit`（`node --test "tests/**/*.test.mjs"`） | 配置格式校验 6 项；Stop hook 脚本 15 项（假 runner 与真实 git：上限与用户提示、上限后不清零、计数文件损坏、无会话 ID 按工作区计数、只在改动变化时重跑、无报告时带出运行器输出、Windows 用 shell）；Stop hook 集成测试 1 项（见下）；核对工具 14 项（含三种输入不匹配、匹配率阈值、多文件缺列、同一报告传两次、同一用户多行订阅）；内容规则 7 项 | **43 通过，0 失败** |
| 其中 `tests/ui-verify-hook.integration.test.mjs` | 在随机空闲端口上先启动示例 dev server，再设置 `CI=1` 调用 hook 的真实 runner（真实 Playwright）。对照组：按旧行为（强制 `CI`、不复用）直接运行测试套件，确认失败且输出含 "already used"；实验组：hook 退出码 0、无输出，dev server 进程仍在运行 | 通过 |
| `npm run test:e2e`（Playwright，Chromium） | 示例前端：页面加载且无控制台错误；状态筛选；表单校验与保存；整页截图作为证据；模拟控制台错误能被检测到；服务器拒绝路径穿越 | **6 通过，0 失败** |
| `npm test` | 以上两者 | 退出码 0 |

修复过程中的两次失败：新增的核对工具测试与本文件初稿中出现了「货币符号 + 数字」形式的正则反向引用写法，被内容规则测试判为金额写法而失败；改写后通过。

## 2. Stop hook 的本机演练：dev server 已在运行时（不在 Kiro 内）

做法：把 `examples/` 复制到系统临时目录并 `git init` 提交；在后台运行 `npm --prefix frontend-demo start`（监听 `127.0.0.1:4173`，模拟 steering 要求的常驻 dev server）；修改 `frontend-demo/public/` 下的文件后，用管道把模拟的 Stop 事件 JSON（`{"session_id": "...", "cwd": "..."}`）传给 `node scripts/kiro-ui-verify.mjs`。演练结束后停止 dev server 并删除临时目录。

| 场景 | 结果 |
|---|---|
| 对照：修复前的脚本与 Playwright 配置，dev server 已占用 4173 | 退出码 1，stderr 为 `passed=0 failed=0 ...`，没有任何失败用例名，也没有原因（即审查指出的误报） |
| 修复后：dev server 已占用 4173，改动不破坏页面 | **退出码 0，无输出**；`results.json` 显示 6 个用例全部通过；4173 上仍是原来的 dev server 进程（被复用，未被替换） |
| 同一状态再次触发（文件未再变化） | 不重跑测试，退出码 0 |
| 改坏页面标题，第 1、2 次失败（每次之间都有新改动） | 退出码 1，stderr 为失败摘要（`passed=5 failed=1` 与失败用例名，`automatic retry 1 of 2` / `2 of 2`） |
| 第 3 次失败 | 退出码 3，stdout 为空，stderr 为失败摘要与「Report this failure to the user and ask how to proceed」 |
| 达到上限后文件未变化再次触发 | 不重跑，退出码 0；计数仍为 3（未清零） |
| 修好页面后 | 退出码 0，计数文件 `failures` 归 0 |
| 计数文件内容改为无效 JSON 后失败 | 不抛异常：stderr 先提示忽略了无法读取的计数文件，再输出 `automatic retry 1 of 2`，退出码 1；计数文件被重写为有效内容 |
| 事件中没有 `session_id` | 按工作区路径哈希计数（计数文件名 `ws-<哈希>.json`），退出码 1 |

Kiro 是否按文档把 stderr 回传给 agent、IDE 中退出码 1/3 是否开始新回合，**未在 Kiro 内运行验证**（`OPEN-QUESTIONS.md` Q-12）。Windows 下用 shell 调用 npm 只有单元测试覆盖，未在 Windows 上运行。

## 3. 未运行项

| 项目 | 原因 |
|---|---|
| Kiro 内的 MCP 调用、steering 载入、hook 触发 | 项目约定：Kiro 不作为本项目运行环境，只提供配置（D-17） |
| 云端会话、Kiro Web、Kiro Crew 的行为 | 同上；行为来自官方文档 |
| `cdk synth` / cdk-nag | 无 CDK 应用（D-02、D-03） |
| AWS 部署与端到端验证 | 不适用（`DEPLOYMENT-LOG.md`） |
| Holmes 扫描 | 本机没有 Holmes，未运行 |
| 用真实订阅导出与活动报告运行核对工具 | 无真实数据；只用合成数据 |
| ASH 重新扫描 | 本次未重跑；上一次结果：bandit、detect-secrets、npm-audit 通过，其余扫描器未安装（MISSING） |

## 4. 安全扫描

扫描输出写在项目目录之外的临时目录，查看后已删除。扫描前确认项目内没有 zip 文件（`node_modules` 之外）。

| 工具 | 范围与命令 | 结果 |
|---|---|---|
| gitleaks 8.30.1 | 全部历史：`gitleaks git --log-opts="--all" .`（17 个提交） | no leaks found |
| detect-secrets 1.5.0 | 当前工作区：`uvx detect-secrets scan --exclude-files 'node_modules/.*' --exclude-files 'package-lock.json' --exclude-files 'test-results/.*' .` | 0 条结果 |
| detect-secrets 1.5.0 | 全部历史：用 `git archive` 导出每个提交的文件树（17 个）后逐一扫描 | 0 条结果 |
| Holmes | — | 未运行（本机没有） |

## 5. 链接与端点检查

| 命令 | 结果 |
|---|---|
| `npm run check:links` | 文档中 78 个官方链接全部返回成功状态（只检查可达性，不检查内容变化） |
| `curl -v https://runtime.us-east-1.kiro.dev`、`curl -v https://management.us-east-1.kiro.dev` | 均为 TLS 握手成功并返回 HTTP 404。按官方排障说明（F-23），这表示本机到 Kiro 端点的网络连通。按 `docs/network-checklist.md` 第 4 节的排查建议查看证书 issuer：为公共 CA（Amazon），说明本机连接未经过 TLS 检查。两者是服务端点而非文档页，因此不计入链接检查 |

## 6. AWS 残留核对

本项目未调用任何创建资源的 AWS API。只读核对（区域 `<REGION>`，账号 `<ACCOUNT_ID>`，2026-10-21）：

| 检查 | 命令 | 结果 |
|---|---|---|
| 凭证可用 | `aws sts get-caller-identity` | 成功（输出未记录） |
| CloudFormation 栈 | `aws cloudformation list-stacks`，按栈名前缀 `proto-kiro-` 过滤 | 0 个 |
| 带项目标签的资源 | `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=kiro-enterprise-playbook` | 0 个 |

结论：**不适用（未部署）；按栈名与标签核对无残留。**

## 7. 事实核对

见 `docs/architecture.md` 第 4 节（46 条，核实日期 2026-10-20；本次修订新增 F-44、F-45、F-46，修改 F-06、F-07、F-08、F-09、F-31、F-41，均逐页打开官方页面核对原文）与 `docs/unverified-removed.md`（16 条）。

## 8. 仓库历史

所有提交（含历史提交）的作者与提交者统一为同一身份 `shaojiez <shaojiez@example.invalid>`。对全部提交的补丁与提交信息做全文检索（大小写不敏感），不含内部前缀和本机绝对路径；`git log --format='%an <%ae>|%cn <%ce>' | sort -u` 只输出一行。
