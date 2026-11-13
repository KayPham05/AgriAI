# AGRI-145 — Testcase workflow

## Scope

The workflow owns only three testcase kinds: `api`, `screen`, and `viewpoint`. The Git registry in `tools/testcase-workflow/config/cases.json` is the case source; Google Sheets stores execution evidence and dashboards. Existing summary, template, and legacy tabs are preserved.

Routing is explicit: API detail tabs write to `Report bug`, Screen detail tabs write to `Report`, and Viewpoint detail tabs write to `Overview`. Summary tabs are dashboards; the workflow updates configured rows and counters and never appends arbitrary testcase rows to them.

## Security

Service Account authentication uses the Sheets-only scope through `GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE` (with `GOOGLE_APPLICATION_CREDENTIALS` and the legacy short-lived token as fallback). The key basename is ignored by Git and is decoded only in a protected GitHub Actions environment from `GCP_SA_KEY_BASE64`. The workflow redacts bearer, guest, access-token and private-key values before storing evidence.

## Verification

- `python -m unittest tools.testcase-workflow.test_workflow -v`: 9 tests passed locally.
- Python source compilation check passed.
- `python tools/testcase-workflow/workflow.py sync --dry-run`: 7 configured cases, no external write.
- Docker API smoke: `GET /api/health` returned HTTP 200 Healthy.
- Docker guest prediction: `POST /api/predictions` returned HTTP 200 with prediction and guest-token presence.
- API suite run: 294 passed, 0 failed.
- Screen integration run: 9 passed, 0 failed (recorded before the runner mapping was changed to run-level evidence).
- Service Account read/write/read-back sync completed for API (`Report bug`), Screen (`Report`) and Viewpoint (`Overview`); detail rows and summary totals were verified through the Sheets API.

The live Service Account Sheet write now passes locally with `google-auth` and the supplied key. CI still requires the same key as protected `GCP_SA_KEY_BASE64` and Editor access on all three spreadsheets.

## Execution policy

Explicit health, guest prediction, .NET filter and Vitest selector adapters update individual cases. Broad API and Playwright commands are stored as `RUN-*` evidence until their native result artifacts are parsed; they never fan out a group exit code into individual cases. Viewpoint cases remain design/evidence rows until a dedicated viewpoint runner is configured.
