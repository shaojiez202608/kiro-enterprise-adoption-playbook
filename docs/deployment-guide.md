# 部署指南（本地运行）

> Prototype，不用于生产。本项目没有 AWS 部署组件（`DEPLOYMENT-LOG.md`：不适用），「部署」指在本机运行示例和工具，以及把 `examples/` 复制到团队仓库。

## 前置条件

| 项目 | 要求 |
|---|---|
| Node.js | 20 或以上（本项目在 Node 24 上验证） |
| 网络 | 首次安装需访问 npm 与 Playwright 浏览器下载地址 |
| Kiro（仅在 Kiro 内使用示例时） | Kiro IDE 1.0 / Kiro CLI V3 及以上（新 hooks 格式，F-07）；组织未关闭 MCP（F-36）。Kiro CLI V1/V2 只自动载入 `inclusion: always` 的 steering，`fileMatch` 与 `manual` 不会自动载入（F-06），因此示例的前端验证 steering 在 V1/V2 中不会自动生效，需要升级到 V3 或手动引用 |
| AWS | 不需要 |

## 安装与运行

安装、测试与把示例复制到练习仓库的命令只写在 `README.md` 的「Deploy / 部署」一节，本文不重复。本文只说明参数和目录结构。

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

复制与安装步骤见 `README.md` 的「Deploy / 部署」一节；演示步骤见 `docs/demo-script.md`。

注意：以上 Kiro 侧步骤依据官方文档编写，**未在 Kiro 内运行**。

## 月度核对工具

用法与退出码见 `runbook-activation-day.md` 第 4 节，参数见上表。

## 链接可达性检查（可选，需要联网）

`make links`（即 `npm run check:links`）只检查文档中官方链接是否返回成功状态，不检查页面内容是否变化。
