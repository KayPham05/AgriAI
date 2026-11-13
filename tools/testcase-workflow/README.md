# AgriVision testcase workflow

Run from the repository root:

```powershell
python tools/testcase-workflow/workflow.py sync --dry-run
python tools/testcase-workflow/workflow.py sync
GOOGLE_SHEETS_ACCESS_TOKEN=<oauth-token> python tools/testcase-workflow/workflow.py sync --sheets
python tools/testcase-workflow/workflow.py run screen
python tools/testcase-workflow/workflow.py run api
python tools/testcase-workflow/workflow.py run playwright
python tools/testcase-workflow/workflow.py check-health --url http://localhost:5000/api/health
python tools/testcase-workflow/workflow.py check-guest-prediction --url http://localhost:5080/api/predictions --file "frontend/src/assets/Bệnh lá/Ớt/ớt khỏe mạnh.jpg"
```

The workflow uses stable IDs and preserves summary, template, and legacy tabs. The local state file is generated only after a non-dry-run sync and is ignored by Git. Google Sheets writing is intentionally isolated behind the configured tab/ID mapping so the connector or Apps Script adapter can be added without changing case generation or test execution.

The workflow is repository-owned: team members clone the repository, install the existing project dependencies, and run the same commands. Browser coverage uses the existing Python Playwright CLI-style scripts under `frontend/tests/browser/`; it requires a running frontend and a locally installed Playwright browser.

Google Sheets writes are opt-in. Each team member supplies a short-lived OAuth access token with Sheets edit scope through `GOOGLE_SHEETS_ACCESS_TOKEN`; tokens and generated state are never committed. A case is written to its detail tab and to the matching summary tab: API → `Report bug`, Screen → `Report`, Viewpoint → `Overview`. The default sync remains dry-run friendly and does not write external Sheets.
