# 企业研发团队落地 Kiro 的配置与排障参考（原型）

> **Prototype，不用于生产。** 本仓库包含文档、示例配置、合成示例前端和本地脚本，不部署任何云资源。
>
> 建议发布时的仓库名：`kiro-enterprise-adoption-playbook`。

[English](README.md)

## 这是什么

把企业研发团队试用 Kiro 时反馈的问题，整理成「问题 → 官方可核实的处置方式 → 配置示例 → 不能解决时怎么办」。

| 试用中反馈的问题 | 对应文档 |
|---|---|
| 长周期任务难以无人值守；缺少浏览器联动的自动化测试 | `docs/problem-action-matrix.md`、`docs/usage-modes.md`、`examples/` |
| 调试时交互重复；拖拽文件进对话框 | `docs/interaction-efficiency.md` |
| 对网络环境要求高、易断线 | `docs/network-checklist.md` |
| Credit 消耗过快 | `docs/credit-governance.md` |
| 账号与订阅统一管理、分批导入、旧账号迁移 | `docs/enterprise-admin.md` |
| 启动日与 workshop、试用期反馈、月度核对 | `docs/runbook-activation-day.md` |

所有产品说法都在 `docs/architecture.md` 的「事实核对」中有编号、官方链接和核实日期（2026-10-20）。核实不了的内容列在 `docs/unverified-removed.md`，不出现在其他文件中。

## 快速开始

需要 Node.js 20 及以上（在 Node 24 上验证）。不需要 AWS 账号。

```bash
npm run setup:e2e   # 安装示例前端的 @playwright/test 并下载 Chromium（不做全局安装）
npm test            # 单元测试 + 浏览器测试
npm run reconcile:sample
```

参数和把 `examples/` 复制到团队仓库的方法见 `docs/deployment-guide.md`，演示步骤见 `docs/demo-script.md`。

## 验证范围

- 示例前端的浏览器测试（Playwright）与全部单元测试已在本机实际运行，结果见 `VERIFICATION.md`。
- Kiro 侧配置（MCP、steering、hooks）按官方格式编写并由单元测试校验格式，**未在 Kiro 内运行**。
- AWS 部署：不适用（`DEPLOYMENT-LOG.md`）。

## 上生产前需要加固的清单

详见 `docs/handover.md`：

- 固定版本的 MCP 与测试依赖纳入审查并改用内部镜像；
- 有意识地决定 `autoApprove`；
- 组织启用 MCP registry 时登记 Playwright MCP；
- 不让 agent 浏览器访问生产地址或真实数据；
- 核对工具输出按个人数据处理；
- steering 与 hooks 的变更走代码评审。

## 目录

```text
docs/          问题—处置矩阵、专题文档、架构与事实核对、prior-art、手册
examples/      .kiro/ 配置、hook 脚本、合成前端与 Playwright 测试
tools/         离线订阅核对、链接检查
tests/         单元测试（node:test）
sample-data/   合成 CSV
```

## 安全

见 `SECURITY.md`、`SECURITY-NOTES.md`、`THREAT_MODEL.md`。

## 许可

MIT-0，见 `LICENSE`。
