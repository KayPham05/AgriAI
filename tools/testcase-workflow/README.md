# AgriVision testcase workflow

Run from the repository root:

```powershell
python tools/testcase-workflow/workflow.py sync --dry-run
python tools/testcase-workflow/workflow.py sync
python -m pip install -r tools/testcase-workflow/requirements.txt
$env:GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE = "E:/AgriAI/angelic-tracer-477405-b6-4e7d814654bf.json"
$env:AGRIVISION_WRITE_SHEETS = "true"
python tools/testcase-workflow/workflow.py sync --sheets
python tools/testcase-workflow/workflow.py run screen
python tools/testcase-workflow/workflow.py run api
python tools/testcase-workflow/workflow.py run playwright
python tools/testcase-workflow/workflow.py check-health --url http://localhost:5000/api/health
python tools/testcase-workflow/workflow.py check-guest-prediction --url http://localhost:5080/api/predictions --file "frontend/src/assets/Bệnh lá/Ớt/ớt khỏe mạnh.jpg"
```

The workflow uses stable IDs and preserves summary, template, and legacy tabs. The local state file is generated only after a non-dry-run sync and is ignored by Git. Google Sheets writing is isolated behind explicit per-kind mappings: API -> `Report bug`, Screen -> `Report`, Viewpoint -> `Overview`.

The workflow is repository-owned: team members clone the repository, install the existing project dependencies, and run the same commands. Browser coverage uses the existing Python Playwright CLI-style scripts under `frontend/tests/browser/`; it requires a running frontend and a locally installed Playwright browser.

Google Sheets writes are opt-in. Service Account credentials are preferred through `GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE` or `GOOGLE_APPLICATION_CREDENTIALS`; the legacy short-lived `GOOGLE_SHEETS_ACCESS_TOKEN` remains a fallback. The key file is ignored and must never be committed. Share each spreadsheet with `sheets-test-runner@angelic-tracer-477405-b6.iam.gserviceaccount.com` as Editor, then run `sync --dry-run` before `sync --sheets`. `AGRIVISION_WRITE_SHEETS=true` is required for writes.

GitHub Actions stores the JSON as Base64 secret `GCP_SA_KEY_BASE64`, validates the expected service-account email and project without printing the private key, decodes it only into `$RUNNER_TEMP`, uses it for the trusted write job, and removes it in an `always()` cleanup step. Pull requests from forks never receive the write secret. Before every commit, run `git check-ignore -v angelic-tracer-477405-b6-4e7d814654bf.json`, `git status --short`, and inspect `git diff --cached --name-only`; stop if any credential path is staged.

Run one explicit live case with `python tools/testcase-workflow/workflow.py run-case API-HEALTH-01` or `run-case API-PRED-GUEST-01`; use `run-all --guest-image <fixture> --sheets` only on a trusted environment. Group commands store `RUN-*` evidence and cannot mark an individual case Passed without a per-case adapter.
