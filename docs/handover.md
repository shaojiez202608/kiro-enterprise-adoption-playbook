# 交接说明

> Prototype，不用于生产。

## 交付内容

| 内容 | 位置 | 状态 |
|---|---|---|
| 问题—处置矩阵与专题文档（FR-1、3–8） | `docs/` | 已按官方文档核对（2026-10-20） |
| Kiro 配置示例（MCP、steering、hooks） | `examples/.kiro/` | 格式经单元测试校验；未在 Kiro 内运行 |
| 示例前端与浏览器测试（FR-2） | `examples/frontend-demo/` | 本机实际运行，结果见 `VERIFICATION.md` |
| Stop hook 脚本 | `examples/scripts/kiro-ui-verify.mjs` | 单元测试（假 runner）、集成测试（dev server 已占用端口时运行真实 Playwright）与本机命令行演练；未在 Kiro 内运行 |
| 月度核对工具 | `tools/reconcile-subscriptions.mjs` | 单元测试 + 合成数据 |
| 事实核对表 | `docs/architecture.md` 第 4 节 | 每条含链接与日期 |

## 接手后先做

1. 重新打开 `docs/architecture.md` 中的 F-xx 链接核对内容（官方文档更新频繁），并运行 `make verify`（lint、测试、链接）与 `make scan`。
2. `.github/CODEOWNERS` 的负责人已设为 `@shaojiez202608`；如维护者变更，同步修改该文件。
3. 处理 `OPEN-QUESTIONS.md`，尤其是 Q-01（Crew）、Q-02（订阅数量限制来源）、Q-04（导出表头）。
4. 用真实（脱敏）表头试运行核对工具，确认关联键。

## 可删除资源策略

本项目没有云资源，因此没有「沙箱默认可销毁 / 交付默认保留」的参数。若后续增加 AWS 组件，应把删除策略做成参数：沙箱默认可销毁，交付环境默认保留。

## 上生产前需要加固的清单

- [ ] 把 `@playwright/mcp` 与 `@playwright/test` 版本纳入依赖审查与升级流程；在内部镜像源中缓存，避免直接从公网拉取。Dependabot 只覆盖 `examples/frontend-demo/package.json` 与 GitHub Actions；`mcp.json` 中的 `@playwright/mcp` 版本不在任何清单文件里，需要人工跟进。
- [ ] 评估是否为部分只读 MCP 工具开启 `autoApprove`，并写入团队规范（D-05）。
- [ ] 在组织 MCP registry 中登记 Playwright MCP（若启用 registry，F-36）。
- [ ] 把 hook 脚本中的测试命令替换为团队真实前端的测试命令，并保留重试上限。
- [ ] Stop hook 的运行时间与 `timeout` 按真实测试套件调整。
- [ ] 不要让 agent 浏览器访问生产地址或含真实数据的环境；`--allowed-origins` 只是辅助手段（F-03）。
- [ ] 核对工具输出含用户邮箱：输出文件按内部数据分级存放，不提交到仓库。
- [ ] 若把用户活动报告接入分析平台，对 S3 桶启用加密、阻止公共访问、强制 TLS，并设置保留期（参见官方用户活动报告页面的桶要求）。
- [ ] 团队 steering 变更走代码评审（官方最佳实践，F-06 所在页）。
