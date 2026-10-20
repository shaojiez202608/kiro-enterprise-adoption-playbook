# AGENTS.md

Guidance for AI coding assistants working on this repository.

## Role

You maintain a prototype: documentation, example Kiro configuration, a synthetic frontend demo with Playwright
tests, and offline Node.js scripts. Nothing is deployed to AWS. Every product statement about Kiro or AWS must be
backed by an official page listed in the fact table of `docs/architecture.md`.

## Common commands

| Command | Purpose |
|---|---|
| `make preflight` | Read-only check of the local tool chain |
| `make setup` | Install the demo test dependencies and Chromium (no global installs) |
| `make lint` | Syntax, JSON and text hygiene checks |
| `make test` | Unit tests and browser tests |
| `make links` | Reachability of official links (needs network) |
| `make scan` | gitleaks over the full history plus a canary that must be detected |
| `make verify-cleanup` | Read-only AWS residue check (needs credentials) |

## Git workflow

- One topic per commit; Conventional Commits (`feat(scope): ...`, `fix`, `docs`, `test`, `chore`, `ci`, `refactor`).
- The commit body says what changed, why, and how it was verified.
- Run `make lint test scan` before committing.
- Do not rewrite published history. Do not push; the maintainer decides where the repository is published.

## Boundaries

**Always**

- Add or update an `F-xx` row (official link and verification date) before using a new product statement.
- Keep sample data synthetic; use `111122223333` for account IDs, `<UPPER_SNAKE>` for other placeholders,
  `example.com` for host names.
- Add a test for every behaviour change in `examples/scripts/` and `tools/`.
- Record decisions in `DECISIONS.md` and unresolved technical questions in `OPEN-QUESTIONS.md`.

**Ask first**

- Changing the Stop hook semantics (exit codes, retry limit), `examples/.kiro/settings/mcp.json`, or pinned versions.
- Adding dependencies, new link domains, or anything that talks to AWS.
- Editing CI, `.gitleaks.toml`, `CODEOWNERS`, or this file.

**Never**

- Commit credentials, real account IDs, customer names, personal data, or screenshots of official pages.
- Weaken or delete a test to make it pass, or add a scanner exemption without a scoped reason.
- Write prices, credit amounts or quotas; link the official page instead.
- Run commands that create, change or delete AWS resources.
