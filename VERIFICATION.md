# Verification

运行日期：2026-10-20。环境：macOS（arm64），Node v24.14.0，npm 11.9.0，Playwright 1.64.1（Chromium headless shell）。

## 1. 实际运行的测试

| 命令 | 内容 | 结果 |
|---|---|---|
| `npm run test:unit`（`node --test "tests/**/*.test.mjs"`） | 配置格式校验（mcp.json、hooks v1、steering front matter）6 项；Stop hook 脚本 6 项（假 runner）；核对工具 4 项；内容规则 7 项（禁用词、价格/账号 ID、链接域名、必备文件、矩阵结构、编号引用、事实行的链接与日期） | **23 通过，0 失败** |
| `npm run test:e2e`（Playwright，Chromium） | 示例前端：页面加载且无控制台错误；状态筛选；表单校验与保存；整页截图作为证据；模拟控制台错误能被检测到；服务器拒绝路径穿越 | **6 通过，0 失败** |
| `npm test` | 以上两者 | 退出码 0 |

开发过程中的一次失败：首次运行浏览器测试时，「表单校验」用例因定位器 `getByLabel('Device')` 同时匹配到区域标题和下拉框而失败（测试代码问题，非应用问题），改为精确匹配后通过。

## 2. Stop hook 脚本的本机演练（不在 Kiro 内）

在临时目录复制 `examples/` 并 `git init` 后，用管道把模拟的 Stop 事件 JSON 传给 `node scripts/kiro-ui-verify.mjs`：

| 场景 | 结果 |
|---|---|
| 前端文件无改动 | 不运行测试，退出码 0 |
| 有改动且测试通过 | 退出码 0，无输出 |
| 有改动且测试失败（改掉页面标题），第 1 次 | stderr 输出失败摘要（passed=5 failed=1 及失败用例名），退出码 1 |
| 同一会话第 2 次仍失败 | stdout 提示停止自动重试，退出码 0 |

Kiro 是否按文档把 stderr 回传给 agent、是否开始新回合，**未在 Kiro 内运行验证**。

## 3. 未运行项

| 项目 | 原因 |
|---|---|
| Kiro 内的 MCP 调用、steering 载入、hook 触发 | 负责人规则：Kiro 不作为本项目运行环境，只提供配置（D-17） |
| 云端会话、Kiro Web、Kiro Crew 的行为 | 同上；行为来自官方文档 |
| `cdk synth` / cdk-nag | 无 CDK 应用（D-02、D-03） |
| AWS 部署与端到端验证 | 不适用（`DEPLOYMENT-LOG.md`） |
| Holmes 扫描 | 本机没有 Holmes，未运行 |
| 用真实订阅导出与活动报告运行核对工具 | 无真实数据；只用合成数据 |

## 4. 安全扫描

扫描输出放在项目目录之外（`../_scan_out/Kiro_enterprise/`）。扫描前确认项目内没有 zip 文件（`node_modules` 之外）。

| 工具 | 命令 | 结果 |
|---|---|---|
| detect-secrets 1.5.0 | `uvx detect-secrets scan --exclude-files 'node_modules/.*' --exclude-files 'package-lock.json' .` | 0 条结果 |
| ASH v3.7.1（从 GitHub 发布源码包安装） | `ash --mode local --source-dir . --output-dir <项目外目录>/ash` | bandit、detect-secrets、npm-audit：PASSED，0 条可处理发现。cdk-nag、cfn-nag、checkov、grype、opengrep、semgrep、syft：MISSING（依赖未安装或安装超时，local 模式下未运行）。无需处理的发现 |
| Holmes | — | 未运行（本机没有） |

说明：PyPI 上同名的 `automated-security-helper` 包不是官方发布（元数据为占位包），未安装；ASH 从官方 GitHub 发布的源码包安装。

## 5. 链接与端点检查

| 命令 | 结果 |
|---|---|
| `npm run check:links` | 文档中 75 个官方链接全部返回成功状态（只检查可达性，不检查内容变化） |
| `curl https://runtime.us-east-1.kiro.dev`、`curl https://management.us-east-1.kiro.dev` | 均为 TLS 握手成功（证书校验通过）并返回 HTTP 404。按官方排障说明（F-23），这表示本机到 Kiro 端点的网络连通；两者是服务端点而非文档页，因此不计入链接检查 |

## 6. AWS 残留核对

本项目未调用任何创建资源的 AWS API。只读核对（区域 `<REGION>`，账号 `<ACCOUNT_ID>`）：

| 检查 | 命令 | 结果 |
|---|---|---|
| 凭证可用 | `aws sts get-caller-identity` | 成功（输出未记录） |
| CloudFormation 栈 | `aws cloudformation list-stacks`，按约定栈名前缀过滤 | 0 个 |
| 带项目标签的资源 | `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=kiro-enterprise-playbook` | 0 个 |

结论：**不适用（未部署）；按栈名与标签核对无残留。**

## 7. 事实核对

见 `docs/architecture.md` 第 4 节（43 条，核实日期 2026-10-20）与 `docs/unverified-removed.md`（16 条）。
