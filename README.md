# Kiro enterprise adoption playbook (prototype)

> **Prototype — not for production use.** This repository contains documentation, example configuration, a synthetic
> demo frontend, and local scripts. It does not deploy cloud resources.
>
> Suggested repository name when published: `kiro-enterprise-adoption-playbook`.

[中文说明](README.zh-CN.md)

## What this is

A configuration and troubleshooting reference for engineering teams piloting Kiro. It is organised by the problems
teams actually report during a pilot, not by product feature:

| Problem reported during a pilot | Where to look |
|---|---|
| Long-running work is hard to leave unattended; no browser-driven test loop | `docs/problem-action-matrix.md`, `docs/usage-modes.md`, `examples/` |
| Repetitive interaction while debugging; dragging files into chat | `docs/interaction-efficiency.md` |
| Sensitive to network conditions; dropped connections | `docs/network-checklist.md` |
| Credits consumed faster than expected | `docs/credit-governance.md` |
| Central account and subscription management; batch onboarding; migration | `docs/enterprise-admin.md` |
| Kick-off day, workshops, feedback loop, monthly reconciliation | `docs/runbook-activation-day.md` |

Every product statement is tied to an official page and a verification date in the fact table of
`docs/architecture.md`. Statements that could not be verified are listed in `docs/unverified-removed.md` and are not
used anywhere else. The main documents are written in Chinese for the target audience.

## Quick start

Requirements: Node.js 20+ (verified on Node 24). No AWS account is needed.

```bash
npm run setup:e2e   # installs @playwright/test for the demo and downloads Chromium (no global installs)
npm test            # unit tests + browser tests
npm run reconcile:sample
```

See `docs/deployment-guide.md` for parameters and for copying `examples/` into a team repository, and
`docs/demo-script.md` for a walkthrough.

## What was verified, and what was not

- The demo frontend's browser tests (Playwright) and all unit tests were run locally. Results: `VERIFICATION.md`.
- The Kiro-side configuration (MCP server, steering, hooks) follows the official formats and is validated by unit
  tests, but it was **not run inside Kiro**.
- No AWS deployment: not applicable (`DEPLOYMENT-LOG.md`).

## Hardening checklist before production

See `docs/handover.md`. In short: mirror and review the pinned MCP and test packages; decide on `autoApprove`
deliberately; register the MCP server in your organisation's MCP registry if one is enforced; never point the agent
browser at production or real data; treat reconciliation output as personal data; review steering and hook changes
like code.

## Repository layout

```text
docs/          problem-action matrix, topic guides, architecture and fact check, prior art, runbooks
examples/      .kiro/ configuration, hook script, synthetic frontend with Playwright tests
tools/         offline subscription reconciliation, link checker
tests/         unit tests (node:test)
sample-data/   synthetic CSV files
```

## Security

See `SECURITY.md`, `SECURITY-NOTES.md`, and `THREAT_MODEL.md`.

## License

MIT-0. See `LICENSE`.
