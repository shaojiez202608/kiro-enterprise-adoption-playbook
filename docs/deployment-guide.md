# 部署指南（本地运行）

> Prototype，不用于生产。本项目没有 AWS 部署组件（`DEPLOYMENT-LOG.md`：不适用），「部署」指在本机运行示例和工具，以及把 `examples/` 复制到团队仓库。

## 前置条件

| 项目 | 要求 |
|---|---|
| Node.js | 20 或以上（本项目在 Node 24 上验证） |
| 网络 | 首次安装需访问 npm 与 Playwright 浏览器下载地址 |
| Kiro（仅在 Kiro 内使用示例时） | Kiro IDE 1.0 / Kiro CLI V3 及以上（新 hooks 格式，F-07）；组织未关闭 MCP（F-36） |
| AWS | 不需要 |

## 一条命令准备并运行全部测试

```bash
npm run setup:e2e && npm test
```

- `setup:e2e`：安装 `examples/frontend-demo` 的开发依赖（`@playwright/test`，固定版本）并下载 Chromium 到 Playwright 默认缓存。不做全局安装。
- `npm test`：先运行单元测试（配置格式、hook 脚本、核对工具、内容规则），再运行浏览器测试。

## 参数

所有可调参数集中在下表；没有其他配置文件。

| 参数 | 位置 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 环境变量 | `4173` | 示例前端端口。修改后需同步改 `examples/.kiro/settings/mcp.json` 的 `--allowed-origins` 与 steering 中的地址 |
| `KIRO_UI_VERIFY_MAX_ATTEMPTS` | 环境变量 | `2` | Stop hook 每个会话（事件没有 `session_id` 时按工作区）自动回传失败、请求新回合的最大次数；超过后以退出码 3 结束并提示询问用户，测试通过后计数清零（D-08） |
| `PW_REUSE_EXISTING_SERVER` | 环境变量（hook 脚本自动设置为 `1`） | 未设置 | 为 `1` 时 Playwright 复用已在 `PORT` 上运行的 dev server，即使设置了 `CI`。Playwright 只检查该地址能否响应，请确认占用端口的就是示例前端 |
| `@playwright/mcp` 版本 | `examples/.kiro/settings/mcp.json` | `0.0.83` | 升级时显式修改（D-04） |
| `--month`、`--sub-key`、`--sub-status`、`--act-key`、`--min-match-rate` | `tools/reconcile-subscriptions.mjs` 参数 | 见脚本头注释（`--min-match-rate` 默认 0.5） | 月度核对；退出码 0 正常、2 输入错误、3 关联键疑似不对（`runbook-activation-day.md` 第 4 节） |

## 把示例放进团队仓库

`examples/` 的目录结构就是工作区根目录的样子：

```text
<your-repo>/
├── .kiro/
│   ├── settings/mcp.json
│   ├── steering/frontend-verification.md
│   ├── steering/debug-report.md
│   └── hooks/ui-verify-on-stop.json
├── scripts/kiro-ui-verify.mjs
└── frontend-demo/            # 换成你的前端目录时，同步修改 steering 的 fileMatchPattern、hook 脚本的 FRONTEND_DIR
```

步骤：

1. 复制上述文件到仓库根目录。
2. 在 `frontend-demo/` 中运行 `npm install` 与 `npm run browsers:install`。
3. 在 Kiro IDE 中确认 MCP 支持已启用、`playwright` 服务器已连接（F-01）。
4. 按 `docs/demo-script.md` 演示。

注意：以上 Kiro 侧步骤依据官方文档编写，**未在 Kiro 内运行**。

## 月度核对工具

```bash
npm run reconcile:sample   # 合成数据
node tools/reconcile-subscriptions.mjs --subscriptions <导出.csv> --activity <报告1.csv> <报告2.csv> --month YYYY-MM --format markdown
```

## 链接可达性检查（可选，需要联网）

```bash
npm run check:links
```

只检查文档中官方链接是否返回成功状态，不检查页面内容是否变化。
