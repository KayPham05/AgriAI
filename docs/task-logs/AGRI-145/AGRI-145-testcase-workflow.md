# AGRI-145 — Task log

- Hoàn tất result validator, exit-code propagation, artifact aggregation và mapping `case_ids`.
- Hoàn tất retry Sheets, batch writes, bảo vệ cột manual và deprecation scan.
- CI YAML đã có 7 job, gồm live-contract, readiness, artifact gate và Sheets concurrency.
- Verify local: 23 Python tests pass; API 294 pass; health/guest adapters pass; Vitest 9 pass; Playwright pass; Docker health 200.
- Verify Sheets: local sync protected pass, lần chạy thứ hai 7/7 `unchanged`; GitHub protected sync pass ở run `43570450037`.
- Security: service-account key ignored và không tracked.

- PR CI fix `f348ac1`: Gitleaks allowlist cho dummy JWT test-only và sửa preview assertion; `secret-scan`, `frontend`, `ci-gate` pass.
- Tách riêng từ tài liệu đến code giữa **40 ca Automated E2E** tại [frontend_e2e_test_specification.md](../../reports/AGRI-145/frontend_e2e_test_specification.md) (`run_live_suite.py` & `run_suite.py`, `cases.json`, `test-groups.json`) và **10 ca Manual E2E** tại [manual_e2e_test_cases.md](../../reports/AGRI-145/manual_e2e_test_cases.md) (`E2E-DIAG-04,06,08`, `E2E-HIST-04,05`, `E2E-PROF-AGRI-04,05`, `E2E-CAT-05,06`, `E2E-ADM-05`).
- Triển khai 40 automated browser UI tests (`run_suite.py` + `test_*.py`) và 8 live system E2E runners (`run_live_suite.py` + `live_*.py`) tại `frontend/tests/browser/e2e/`, tích hợp vào `tools/testcase-workflow/config/cases.json` (47 cases) và `groups.playwright.case_ids` (40 IDs); bổ sung cache tab chống ghi đè dòng khi `batch_update` và thêm group `screen` vào `run_all()` trong `workflow.py`.
- Verify local (2026-11-17): Live System E2E `run_live_suite.py` **40/40 pass** (`70.691s`, có dọn sạch dữ liệu test khỏi DB); P0 Playwright UI **13/13 pass** (`32.166s`); Full Playwright UI suite **40/40 pass** (`82.891s`, `next build --webpack`); Vitest **81 files / 575 tests pass**; Python workflow unit tests **27/27 pass** (có guard cấm trộn E2E automation và Manual test, đồng bộ priority và cấm `wait_for_timeout`); Backend `dotnet build` **0 errors/0 warnings**, `AgriVision.UnitTests` **228/228 pass** (`AgriVision.ApiTests` **Blocked** cục bộ do Docker daemon chưa bật, cần chạy trên CI PR).

## Còn lại

- GitHub run `43570450037` pass toàn bộ jobs trước đó; viewpoint chưa có runner tự động.
- Chạy `AgriVision.ApiTests` khi bật Docker (hoặc qua CI job `backend-tests` trên PR).
- 10 ca Manual E2E trong [manual_e2e_test_cases.md](../../reports/AGRI-145/manual_e2e_test_cases.md) giữ trạng thái `Not run` chờ kiểm thử thủ công trên môi trường thật theo [manual_e2e_execution_guide.md](../../reports/AGRI-145/manual_e2e_execution_guide.md).
