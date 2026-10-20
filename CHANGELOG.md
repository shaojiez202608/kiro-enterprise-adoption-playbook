# Changelog

All notable changes to this project are documented in this file. The format follows
Keep a Changelog, and the project uses Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-10-21

### Added

- Problem-action matrix and topic guides for four issues reported during a Kiro pilot (long-running work,
  interaction efficiency, network, credit consumption), enterprise administration notes, and a runbook.
- Fact table with official links and verification dates (`docs/architecture.md`), and a list of statements
  that could not be verified (`docs/unverified-removed.md`).
- Example `.kiro/` configuration: pinned, headless Playwright MCP server; `fileMatch` and `manual` steering;
  a `Stop` hook that runs the browser suite and reports failures with a bounded number of automatic retries.
- Synthetic frontend demo with Playwright tests; offline subscription reconciliation tool with synthetic data.
- Repository standards: Makefile entry point, CI workflow (lint, tests, link check, gitleaks full history with a
  canary), Dependabot, CODEOWNERS, issue and PR templates, AGENTS.md, THIRD-PARTY-LICENSES, read-only preflight
  and AWS residue check, local cleanup script.

### Fixed

- Stop hook: reuses a dev server that already listens on the test port, includes the runner output when no test
  result was reported, reports the retry limit on stderr with exit code 3, keeps counting after the limit,
  tolerates a corrupt counter file, and counts per workspace when the event has no session ID.
- Reconciliation tool: stops on missing columns or an empty `--month` selection, and exits 3 when the join key
  matches no or few users; prints match statistics; counts duplicate reports once.
