# 清理指南

本项目不创建任何 AWS 资源，无需云端清理（`DEPLOYMENT-LOG.md`：不适用）。

本机清理：

```bash
# 停止示例前端（如果在前台运行，Ctrl+C 即可）
# 删除依赖与测试产物
rm -rf examples/frontend-demo/node_modules examples/frontend-demo/test-results examples/frontend-demo/playwright-report
# Stop hook 的重试计数文件
rm -rf "${TMPDIR:-/tmp}/kiro-ui-verify"
# 可选：删除 Playwright 下载的浏览器（会影响本机其他使用 Playwright 的项目）
(cd examples/frontend-demo && npx playwright uninstall)
```

若已把 `examples/` 复制到团队仓库并想移除：删除 `.kiro/settings/mcp.json` 中的 `playwright` 条目（保存后自动生效，F-01）、删除对应 steering 与 hook 文件、删除 `scripts/kiro-ui-verify.mjs`。
