# 清理指南

本项目不创建任何 AWS 资源，无需云端清理（`DEPLOYMENT-LOG.md`：不适用）。

清理命令与「不会被自动删除的资源」清单只写在 `README.md` 的「Cleanup / 清理」一节：

- `make clean`：删除示例依赖与测试产物（执行前确认；删除 Stop hook 重试计数前再确认一次；单步失败时警告并继续）。脚本：`tools/cleanup-local.sh`。
- `make verify-cleanup`：只读核对 AWS 残留（前缀 `proto-kiro-`、项目标签，Kiro 支持的区域与 CLI 默认区域），有残留时非零退出。脚本：`tools/verify-cleanup.sh`。

若已把 `examples/` 复制到团队仓库并想移除：删除 `.kiro/settings/mcp.json` 中的 `playwright` 条目（保存后自动生效，F-01）、删除对应 steering 与 hook 文件、删除 `scripts/kiro-ui-verify.mjs`。
