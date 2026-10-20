# Security

## Reporting a vulnerability

If you discover a potential security issue in this project, please notify AWS/Amazon Security via the
[vulnerability reporting page](https://aws.amazon.com/security/vulnerability-reporting/) or by email to
aws-security@amazon.com. Please do **not** create a public GitHub issue for security problems.
Do not include credentials, personal data, or customer information in any report.

## What this project deploys

Nothing in AWS. The repository contains documentation, example Kiro configuration, a static demo page served on
`127.0.0.1`, and local Node.js scripts. `make verify-cleanup` confirms (read-only) that no resource with the
project prefix `proto-kiro-` or the project tag exists.

## How data is handled

| Data | Where it goes |
|---|---|
| Demo page content, console messages, screenshots | Read by the agent through Playwright MCP and sent to the model as context (`THREAT_MODEL.md`). The demo data is synthetic (`examples/frontend-demo/public/data/devices.json`). |
| Subscription export and user activity reports (contain e-mail addresses) | Read from local files by `tools/reconcile-subscriptions.mjs`; output goes to stdout only. Nothing is uploaded. |
| Stop hook retry counters | Small JSON files in the system temporary directory (`kiro-ui-verify/`): failure count, result, and a hash of the changed files. No file content. |

## Controls and where they are implemented

| Control | Implementation |
|---|---|
| Demo server binds to `127.0.0.1`, GET/HEAD only, path traversal rejected, CSP and `nosniff` headers | `examples/frontend-demo/server.mjs`; tested in `examples/frontend-demo/tests/ui.spec.mjs` |
| Playwright MCP pinned to an exact version, headless, isolated profile, origin limited to the demo, no auto-approve | `examples/.kiro/settings/mcp.json`; tested in `tests/kiro-config.test.mjs` |
| Steering: page content is data, not instructions; only the local origin; do not edit tests to pass | `examples/.kiro/steering/frontend-verification.md` |
| Stop hook runs one fixed command (no input from the event is executed), bounded automatic retries, sanitised session ID | `examples/scripts/kiro-ui-verify.mjs`; tested in `tests/ui-verify-hook*.test.mjs` |
| Hooks use command actions only | `examples/.kiro/hooks/ui-verify-on-stop.json`; tested in `tests/kiro-config.test.mjs` |
| Reconciliation stops on wrong columns or join keys instead of producing a misleading result | `tools/reconcile-subscriptions.mjs`; tested in `tests/reconcile.test.mjs` |
| Output files of the reconciliation tool are git-ignored | `.gitignore` (`reconcile-output*`) |
| No prices, account IDs or banned names in the repository; links only to allow-listed domains | `tests/content-policy.test.mjs` |
| Secret scanning of the full history with a canary | `tools/scan-secrets.sh`, `.gitleaks.toml`, `.github/workflows/ci.yml` |

## Known considerations

- `--allowed-origins` of Playwright MCP is not a security boundary (upstream documentation).
- Kiro's MCP governance and sign-in restrictions are enforced on the client and can be bypassed by a local
  administrator (`docs/architecture.md`, F-35, F-36).
- An agent can rewrite hook configuration, the hook script, or the tests during a session; review changes to these
  paths like code (`THREAT_MODEL.md`).
- A committed `.kiro/settings/mcp.json` also applies in cloud sessions (F-41).
- The Kiro-side behaviour was not run inside Kiro by this project (`VERIFICATION.md`).

## Hardening before production use

1. Mirror `@playwright/mcp` and `@playwright/test` in an internal registry and put version updates through review.
2. Register the Playwright MCP server in the organisation's MCP registry if one is enforced (F-36).
3. Decide on `autoApprove` deliberately and document it; keep it empty for tools that change state.
4. Never point the agent's browser at production systems or real data; keep the origin restriction and the
   steering rules.
5. Use Supervised mode, or review the diff of `.kiro/`, `scripts/` and test files after each agent session.
6. Treat reconciliation input and output as personal data: store it per your data classification, never commit it.
7. Require code-owner review for CI, scanning configuration, AI assistant configuration and `.kiro/` (`CODEOWNERS`).

The longer checklist is in `docs/handover.md`.

## Cleanup

There are no cloud resources to delete. `make clean` removes local dependencies and test output (with
confirmation); `make verify-cleanup` checks AWS read-only for residue. See the Cleanup section of `README.md`.
