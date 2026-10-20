# Contributing

Thank you for your interest in improving this prototype. Bug reports, fact corrections and pull requests are
welcome.

## Ground rules

- Every product statement about Kiro or AWS must be backed by an official page. Add it to the fact table in
  `docs/architecture.md` (new `F-xx` row with link and verification date) before using it elsewhere.
- If a statement cannot be verified, do not add it. Record it in `docs/unverified-removed.md` instead.
- Do not add prices, credit or quota figures, customer names, internal system names, real account IDs,
  credentials, or screenshots. Use `111122223333` for account IDs, `<UPPER_SNAKE>` for other placeholders and
  `example.com` for host names. Sample data must be synthetic.
- Keep the example configuration consistent with the documented formats; `make test` checks this.

## Tests

Every change to behaviour (`examples/scripts/`, `tools/`, `examples/frontend-demo/`) comes with a test. Before
opening a pull request, run:

```bash
make lint test scan   # lint, unit and browser tests, gitleaks full history with a canary
make links            # when docs or links changed
```

The pull request template asks which checks you ran and what was not tested (for example "not run inside Kiro").

## Branches and commits

1. Fork and create a branch per topic. One pull request does one thing; it is squash-merged.
2. Commit messages follow Conventional Commits: `feat(scope): ...`, `fix(...)`, `docs(...)`, `test(...)`,
   `chore(...)`, `ci(...)`, `refactor(...)`. The body says what changed, why, and how it was verified.
3. Scan for secrets and account IDs before every commit (`make scan`).

## Use of AI assistants

You may use AI assistants. You are responsible for the result: you must be able to explain every line of the
change, including the lines an assistant wrote, and you must have run the tests yourself. Guidance for assistants
is in `AGENTS.md`.

## Licensing

See the `LICENSE` file for this project's licensing. By submitting a pull request you confirm that your
contribution is made under the terms of the MIT-0 license and that you have the right to submit it.
Third-party components are listed in `THIRD-PARTY-LICENSES`.

## Security issue notifications

If you discover a potential security issue in this project, notify AWS/Amazon Security via the
[vulnerability reporting page](https://aws.amazon.com/security/vulnerability-reporting/) or by email to
aws-security@amazon.com. Please do **not** create a public GitHub issue. See `SECURITY.md`.

## Reporting issues

Use the issue forms of the repository where this project is published. Problems with Kiro itself belong in the
official Kiro tracker (https://github.com/kirodotdev/Kiro).
