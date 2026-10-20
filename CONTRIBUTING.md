# Contributing

Thank you for your interest in improving this prototype.

## Ground rules

- Every product statement about Kiro or AWS must be backed by an official page. Add it to the fact table in
  `docs/architecture.md` (new `F-xx` row with link and verification date) before using it elsewhere.
- If a statement cannot be verified, do not add it. Record it in `docs/unverified-removed.md` instead.
- Do not add prices, credit or quota figures, customer names, internal system names, account IDs, credentials,
  or screenshots. Sample data must be synthetic.
- Keep the example configuration consistent with the documented formats; `npm run test:unit` checks this.

## Workflow

1. Fork and create a branch.
2. Run `npm run setup:e2e` once, then `npm test` before opening a pull request.
3. Scan for secrets before committing (for example `uvx detect-secrets scan`).
4. Describe what changed and which official pages you re-checked.

## Reporting issues

Use the issue tracker of the repository where this project is published. For security issues, see `SECURITY.md`.
