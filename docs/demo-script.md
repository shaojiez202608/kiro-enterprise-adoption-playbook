# 演示脚本

> Prototype，不用于生产。部分 A 在本机可直接运行；部分 B 需要 Kiro，本项目**未在 Kiro 内运行**，按官方文档编写。

## 部分 A：本机浏览器测试（无需 Kiro）

1. `npm run setup:e2e`
2. `npm --prefix examples/frontend-demo start`，浏览器打开 `http://127.0.0.1:4173/`，展示设备列表、状态筛选、维护记录表单。
3. 打开 `http://127.0.0.1:4173/?simulate-error=1`，在开发者工具中展示控制台错误。
4. 停止服务器，运行 `npm test`，展示单元测试与浏览器测试结果；说明「读控制台错误」测试会在模拟错误页面上确认检测有效。
5. 展示 `examples/frontend-demo/test-results/` 中的截图附件（测试运行后生成，已在 `.gitignore` 中排除）。

## 部分 B：在 Kiro 中演示闭环

前提：已按 `deployment-guide.md` 把 `examples/` 复制到练习仓库，并安装依赖。

1. 打开 Kiro IDE，确认 MCP 面板中 `playwright` 已连接（F-01）。
2. 打开 Steering 面板，说明 `frontend-verification.md` 是 `fileMatch`，`debug-report.md` 是 `manual`（F-06）。
3. 在聊天中输入：「在状态筛选里增加一个 'retired' 选项，并在示例数据里加一台 retired 设备」。
4. 观察：agent 修改 `frontend-demo/public/` 文件时载入前端验证 steering；按 steering 启动 dev server（F-09）、调用 Playwright MCP 打开页面、读控制台、截图（F-03）。默认需要人工批准 MCP 工具调用（D-05）。
5. 回合结束后 Stop hook 运行 `npm --prefix frontend-demo run test:e2e`。由于现有测试断言设备总数，新增设备会让测试失败，hook 把失败摘要回传给 agent（F-08），agent 继续修复测试或询问。
6. 演示重试上限：两次失败后 hook 停止回传并提示询问用户（D-08）。
7. 用 `#debug-report #terminal` 演示 manual steering 与上下文引用（F-06、F-10）。
8. 把一份 PDF 拖进聊天输入框，演示文档附件（F-11）。

## 部分 C：月度核对

1. `npm run reconcile:sample`
2. 讲解五类结果，以及 Pending 不计费、月底取消等规则（`runbook-activation-day.md` 第 4 节）。
