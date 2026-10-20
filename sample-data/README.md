# Sample data

All files in this folder are synthetic and were written by hand for this prototype. They contain no real users,
organisations, accounts, or usage. Values (including credit figures) are placeholders chosen only to exercise the
reconciliation logic; they are not representative of real consumption and must not be read as guidance.

| File | Mimics | Notes |
|---|---|---|
| `subscriptions-export.sample.csv` | Kiro console, Users & Groups, Subscriptions table, "Download CSV" | Field list from the official docs; exact header spelling is an assumption (see `OPEN-QUESTIONS.md`). |
| `user-activity-ide.sample.csv`, `user-activity-cli.sample.csv` | Daily per-client user activity report in Amazon S3 | Column names from the official "CSV report metrics and structure" table. |

The frontend demo data lives in `examples/frontend-demo/public/data/devices.json` so that the example folder can be copied on its own. It is also synthetic.
