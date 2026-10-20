# Examples

This folder is laid out like the root of a workspace. Copy its contents to the root of a practice repository.

| Path | Purpose |
|---|---|
| `.kiro/settings/mcp.json` | Workspace MCP configuration with a pinned, headless Playwright MCP server limited to the local demo origin |
| `.kiro/steering/frontend-verification.md` | `fileMatch` steering: verify frontend changes in a browser before reporting done |
| `.kiro/steering/debug-report.md` | `manual` steering: reusable debugging report format (`#debug-report`) |
| `.kiro/hooks/ui-verify-on-stop.json` | `Stop` hook that runs the browser suite and reports failures back with bounded retries |
| `scripts/kiro-ui-verify.mjs` | Script used by the hook |
| `frontend-demo/` | Synthetic static frontend, local server, and Playwright tests |

Formats follow the official Kiro documentation (see `docs/architecture.md`, facts F-01, F-06, F-07).
The Kiro-side behaviour has **not** been run inside Kiro by this project. The browser tests in `frontend-demo/`
were run locally; see `VERIFICATION.md`.
