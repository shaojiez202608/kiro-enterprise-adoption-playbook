# Verification

| 项目 | 内容 |
|---|---|
| 运行日期 | 2026-10-21（事实核对日期见第 7 节） |
| 被验证的提交 | `dd5955b`（第 1、4、5、6、8 节的结果都在这个提交上运行；本文件在其后的提交中记录，tag `v0.1.0` 指向记录提交） |
| 区域 | 不适用（不部署）；只读残留核对见第 6 节 |
| 配置 | 默认参数：`PORT=4173`、`KIRO_UI_VERIFY_MAX_ATTEMPTS=2`、`@playwright/mcp@0.0.83`、`@playwright/test@1.64.1`；模型：不适用（未在 Kiro 内运行，未调用任何模型） |
| 环境 | macOS（arm64），Node v24.14.0，npm 11.9.0，Playwright 1.64.1（使用本机 Playwright 缓存中已有的 Chromium，未做全局安装）；本机没有 Docker |

## 1. 实际运行的测试

| 命令 | 内容 | 结果 |
|---|---|---|
| `make lint`（`tools/lint.mjs`） | JS 语法、JSON、行尾空白、制表符、文件末换行 | **0 条发现** |
| `npm run test:unit`（`node --test "tests/**/*.test.mjs"`） | 配置格式校验 6 项；Stop hook 脚本 15 项（假 runner 与真实 git：上限与用户提示、上限后不清零、计数文件损坏、无会话 ID 按工作区计数、只在改动变化时重跑、无报告时带出运行器输出、Windows 用 shell）；Stop hook 集成测试 1 项（见下）；核对工具 14 项（含三种输入不匹配、匹配率阈值、多文件缺列、同一报告传两次、同一用户多行订阅）；内容与仓库规则 9 项（新增 README 章节顺序、Actions 按 SHA 固定与只读权限、版权行、DRAFT 标记、VERSION 与 CHANGELOG 一致） | **45 通过，0 失败** |
| 其中 `tests/ui-verify-hook.integration.test.mjs` | 在随机空闲端口上先启动示例 dev server，再设置 `CI=1` 调用 hook 的真实 runner（真实 Playwright）。对照组：按旧行为（强制 `CI`、不复用）直接运行测试套件，确认失败且输出含 "already used"；实验组：hook 退出码 0、无输出，dev server 进程仍在运行 | 通过 |
| `npm run test:e2e`（Playwright，Chromium） | 示例前端：页面加载且无控制台错误；状态筛选；表单校验与保存；整页截图作为证据；模拟控制台错误能被检测到；服务器拒绝路径穿越 | **6 通过，0 失败** |
| `make verify` | lint + `npm test` + 链接检查 | 退出码 0 |
| `make preflight` | 只读检查工具链 | 全部 OK |

修复过程中的两次失败：新增的核对工具测试与本文件初稿中出现了「货币符号 + 数字」形式的正则反向引用写法，被内容规则测试判为金额写法而失败；改写后通过。

## 2. Stop hook 的本机演练：dev server 已在运行时（不在 Kiro 内）

演练于 2026-10-20 在 hook 修复提交（`cdc9350`）的代码上进行；此后 `examples/scripts/kiro-ui-verify.mjs` 与 `playwright.config.mjs` 没有再改动，本轮未重做演练（集成测试在 `dd5955b` 上覆盖了 dev server 已占用端口的场景）。

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
| ASH | **未运行**：本机无 Docker，ASH 及其缺失的扫描器（grype、syft、checkov、cfn-nag、cdk-nag 等）未安装；按项目约定不为此安装大量本地工具。按规范视为未通过。CI 中新增 `ash` job（container 模式，有可处理发现、失败或缺失的扫描器即失败），等 GitHub 上运行后补记结果 |
| osv-scanner | **未运行**：未安装（brew 安装未完成即停止）。以 `npm audit` 作为 lock 文件漏洞检查的替代，见第 4 节 |
| CI workflow | **未在 GitHub 运行，仅本地等效执行**（lint、测试、链接、gitleaks + canary 都在本机用同样的命令跑过） |

## 4. 安全扫描与静态检查

扫描输出写在项目目录之外（`../_scan_out/Kiro_enterprise/`）。扫描前确认项目内没有 zip 文件（`node_modules` 之外）。

| 工具 | 范围与命令 | 结果 |
|---|---|---|
| gitleaks 8.30.1 | 全部历史：`make scan`（`gitleaks git --log-opts="--all"`，23 个提交） | no leaks found |
| gitleaks canary | `make scan`：运行时生成一个假的访问密钥写入临时目录，用同一配置扫描，必须报出（退出码 42） | **检出**（证明扫描器与配置能报出泄漏） |
| detect-secrets 1.5.0 | 当前工作区：`uvx detect-secrets scan --exclude-files 'node_modules/.*' --exclude-files 'package-lock.json' --exclude-files 'test-results/.*' .` | 0 条结果（CI 中 gitleaks 发布包的 SHA-256 校验和、ASH 标签对应的提交哈希两行用行内 pragma 放行，理由见 `SECURITY-NOTES.md`） |
| detect-secrets 1.5.0 | 全部历史：`git archive` 导出全部 23 个提交的文件树，在非 git 目录中以 `--all-files` 扫描 | 3 条，全部是误报：提交 `013cfba`、`a5087f9` 中的公开校验和（在 `4ef539a` 加 pragma），`8e01acb` 中的 ASH 提交哈希（在 `dd5955b` 加 pragma）。说明：上一轮的历史扫描未加 `--all-files`，实际没有扫描到文件，结论无效，本轮已重做 |
| zizmor 1.31.1 | `uvx zizmor --gh-token … .github/workflows`（在线模式） | No findings |
| semgrep 1.181.0 | `uvx semgrep scan --config p/default --metrics off .`（git 跟踪的 68 个文件，255 条规则） | 首次 1 条：`tools/preflight.mjs` 的 `spawn-shell-true`（只在 Windows 上为调用 `npm.cmd` 使用 shell，命令与参数都是常量），已加行内 `nosemgrep` 并写理由；复扫 0 条 |
| npm audit | `npm audit --prefix examples/frontend-demo`（lock 文件） | found 0 vulnerabilities |
| osv-scanner、ASH | — | 未运行（见第 3 节） |
| Holmes | — | 未运行（本机没有） |

## 5. 链接与端点检查

| 命令 | 结果 |
|---|---|
| `make links`（`npm run check:links`） | 文档中 81 个官方链接全部返回成功状态（只检查可达性，不检查内容变化） |
| `curl -v https://runtime.us-east-1.kiro.dev`、`curl -v https://management.us-east-1.kiro.dev` | 均为 TLS 握手成功并返回 HTTP 404。按官方排障说明（F-23），这表示本机到 Kiro 端点的网络连通。按 `docs/network-checklist.md` 第 4 节的排查建议查看证书 issuer：为公共 CA（Amazon），说明本机连接未经过 TLS 检查。两者是服务端点而非文档页，因此不计入链接检查 |

## 6. AWS 残留核对

本项目未调用任何创建资源的 AWS API。只读核对（区域 `<REGION>`，账号 `111122223333`（占位，不记录真实账号），2026-10-21）：

| 检查 | 命令 | 结果 |
|---|---|---|
| 凭证可用 | `aws sts get-caller-identity` | 成功（输出未记录） |
| 全部类别 | `make verify-cleanup`（`tools/verify-cleanup.sh`）：区域 us-east-1、eu-central-1 与 CLI 默认区域；CloudFormation 栈（前缀 `proto-kiro-`）、带项目标签的资源、日志组、SSM 参数；全局 S3 桶与 IAM 角色（前缀） | 无残留，退出码 0 |

结论：**不适用（未部署）；按栈名与标签核对无残留。**

## 7. 事实核对

见 `docs/architecture.md` 第 4 节（49 条。F-01 至 F-46 核实日期 2026-10-20；F-47 至 F-49 于 2026-10-21 规范对齐时新增；新增与修改的条目均逐页打开官方页面核对原文）与 `docs/unverified-removed.md`（16 条）。

## 8. 仓库历史

所有提交（含历史提交）的作者与提交者统一为同一身份 `shaojiez <shaojiez@example.invalid>`。对全部提交的补丁与提交信息做全文检索（大小写不敏感），不含内部前缀和本机绝对路径；`git log --format='%an <%ae>|%cn <%ce>' | sort -u` 只输出一行。

全部 23 个提交的主题都符合 Conventional Commits（`type: subject` 或 `type(scope): subject`）。为统一加 scope 的历史重写被本机权限拦下，未重试（D-33），因此本文件中的提交哈希有效。

## 9. 这些结果不能证明什么

- 不能证明示例在 Kiro 内按预期工作：MCP 调用、steering 载入、hook 触发与退出码在 IDE 中的效果都没有在 Kiro 内运行（Q-11、Q-12）。
- 不能证明 CI workflow 在 GitHub 上能跑通：只在本机执行了等效命令；`ubuntu-24.04` 上 `playwright install --with-deps` 与 `ash` job 等步骤未实际运行。
- 不能证明没有供应链风险：npm audit 只覆盖示例前端的 lock 文件；`npx` 拉取的 `@playwright/mcp` 及其依赖未扫描；ASH 与 osv-scanner 未运行。
- 不能证明在 Windows 上可用：Windows 分支只有单元测试。
- 链接检查只证明页面可达，不证明页面内容与事实表一致；事实以第 7 节的核对日期为准。
- 失败项：本轮无失败的测试或检查；未运行项见第 3 节，按规范视为未通过。
