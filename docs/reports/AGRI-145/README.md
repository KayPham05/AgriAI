# AGRI-145 — Testcase workflow

- **Trạng thái (2026-11-22)** — Đã sửa các finding trên head `f1892da` của PR #64 trong working tree.
- **Bằng chứng** — [Kết quả kiểm tra R1–R7](pr64_fixes.md) và [review lại các đường lỗi](pr64_fixes.md#review-lại-các-đường-lỗi-sau-vòng-sửa-tiếp-theo).
- **Task log:** [AGRI-145-testcase-workflow.md](../../task-logs/AGRI-145/AGRI-145-testcase-workflow.md).

## Phạm vi

Workflow quản lý registry testcase cho `api`, `screen`, `viewpoint`; thực thi nhóm API/.NET, Vitest và Playwright; nhập artifact kết quả rồi đồng bộ Google Sheets. Mapping group → testcase dùng `case_ids`, không fan-out ngầm.

## Thay đổi chính

- Validator artifact kiểm tra schema, duplicate, status và trả exit `1` cho `Failed`/`Blocked`.
- Runner ghi `results.json`, giữ exit code, import artifact trước Sheets sync.
- Sync bảo vệ cột manual/business, đánh dấu testcase cũ `Deprecated`, retry lỗi mạng/429/5xx và batch value writes.
- CI có 7 job, gồm live-contract cho health/guest adapters, artifact aggregation, readiness, concurrency cho Sheets sync và quyền tối thiểu `contents: read`.

## Bằng chứng hiện tại

- `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -v`: **53/53 pass** (bao gồm `SheetsClient` helpers/retry/hyperlink reset, bảo vệ kết quả manual và `state["cases"]` khi chạy local/dry-run, công thức live `=IF(...)` cho `Status Testing`, đặt cột theo index, khớp ID chính xác trên `viewpoint_table`, parse số `vi_VN` kể cả `0`, dynamic bounds & optional cols trên `update_summary_list`, xử lý `Skipped`/`Deprecated`, guard `screen` CF, cache `append` nhất quán, schema guards `cases.json` và tách biệt `overlap = 0` với manual E2E).
- YAML parse & standalone probe (`.github/workflows/testcase-workflow.yml` + `frontend/tests/browser/e2e/support.py`): **7 jobs**, `playwright-contract` chạy server Next.js standalone (`HOSTNAME=127.0.0.1 PORT=3000 node .next/standalone/server.js`) kèm `E2E_BASE_URL: http://127.0.0.1:3000`; xác minh local `ensure_next_server('http://127.0.0.1:3199', auto_start=True)` phục vụ `GET /diagnose` đạt **HTTP 200**.
- Docker Compose (lần xác minh tích hợp đầy đủ trước đó): postgres, AI, backend, frontend **healthy**; `/diagnose` và `/api/health`: **HTTP 200**.
- Backend / API baseline: `dotnet test backend/tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj --no-restore --verbosity minimal` trên Docker local vừa chạy lại đạt **294/294 pass** (`1m2s`); chạy riêng `workflow.py run-case API-PRED-01` (`GuestPredictionsControllerTests.InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage`) đạt **3/3 pass** (`10.27s`), đồng bộ lên Sheet thành `Passed` (`Test Done`, `100%`). Nhánh hiện tại cũng đã xác nhận `228/228` `AgriVision.UnitTests` pass.
- Explicit API adapters: `API-HEALTH-01` và `API-PRED-GUEST-01` pass locally và trong live-contract CI.
- Screen group (`Vitest`): `corepack pnpm --dir frontend test` vừa chạy lại đạt **81 files / 575 passed** (`56.97s`).
- Playwright browser UI (`run_suite.py --with-server --json-report .cache/e2e-full.json`): vừa chạy lại đạt **40/40 `E2E-*` cases pass** trong `95.212s`; khi chạy qua `workflow.py run playwright` xuất `results.json` gồm 40 kết quả từng ca + `RUN-playwright` (`41` records, `valid: true`, `failed_cases: []`).
- Live System E2E (`run_live_suite.py` trên Docker stack thật, trước đợt chuẩn hóa Sheets): 8 script hoàn tất trong `70.691s`; runner cũ suy ra 40 ID từ exit code. Manual E2E Chrome thật: **10/10 pass**.
- Sheets sync local với service account: **47/47 cases** đồng bộ live thành công lên 3 Google Sheets (`Test viewpoint`, `Testcase API`, `Testcase Screen`); kiểm chứng trực tiếp qua Google Sheets API sau lượt chạy local (`Report`: `708` total / `619` pass / `25` failed / `64` blocked / `0` not run, `87,43%`; `Report bug`: `262` total / `163` pass / `31` failed / `5` blocked / `63` not run, `62%`, `API-PRED-01` = `Test Done 100%`). Remote protected sync cũng pass ở lịch sử run `43570450037`. Lưu ý: `.cache/test-results/` chỉ được CI tạo qua `AGRIVISION_RESULT_DIR`; cục bộ hiện có `.cache/e2e-*.json` và `tools/testcase-workflow/config/state.json` (gitignored).
- Security audit: key service account không bị Git track, path được `.gitignore` bỏ qua, không phát hiện secret pattern thật trong workflow/config.

## Giới hạn còn lại

- GitHub Actions run `43570450037` **pass toàn bộ** tại thời điểm chạy trước đó; cần push/chạy lại CI sau khi commit vòng sửa `AGRI-145` cuối để xác nhận trên runner Ubuntu.
- Vấn đề `/history` có thể trả `429 Too Many Requests` khi hiển thị nhiều ảnh (do `PrivateImage.tsx` gọi eager `useEffect` fetch kết hợp `StorageTrafficLimits.cs` `PermitLimit=8`) là lỗi ứng dụng hiện hữu đã được tách thành **follow-up Jira ngoài phạm vi `AGRI-145`** (không sửa app code trong nhánh này).
- Viewpoint vẫn là evidence/design rows, chưa có runner riêng.
- Key service account chỉ dùng protected secret; không đưa vào Git.

## PR CI fix (2026-11-14)

- `secret-scan` bắt dummy JWT test-only trong lịch sử; thêm `.gitleaks.toml` allowlist đúng chuỗi placeholder.
- `frontend` fail vì assertion `getByRole` gặp hai preview ảnh; đổi sang `findAllByRole` và kiểm tra preview đầu tiên.
- Commit `f348ac1`; PR checks sau push: `secret-scan`, `frontend`, `ci-gate` và các job liên quan đều pass.

## Automated Browser UI Tests & System E2E (2026-11-16)

### Phạm vi đã triển khai

- Triển khai **40 automated browser UI tests** bằng Python Playwright tại `frontend/tests/browser/e2e/` (`support.py`, `run_suite.py`, `test_auth.py`, `test_diagnosis.py`, `test_history.py`, `test_profile.py`, `test_catalog.py`, `test_admin.py`, `test_home_system.py`).
- Các ca dùng `ApiStub` chặn `**/api/**` (và `AdminOverview` dùng `AdminMockProvider` có sẵn); được phân loại chính xác là **UI/browser test**, không phải system E2E qua backend/PostgreSQL/AI thật.
- Tích hợp 40 mã `E2E-*` vào `tools/testcase-workflow/config/cases.json`, `groups.playwright.case_ids` trong `tools/testcase-workflow/config/test-groups.json`, thêm `runner == "playwright"` trong `workflow.py run-case` và guard kiểm tra selector trong `test_workflow.py`.

### Bằng chứng thực thi local (2026-11-16)

- Build frontend: `node node_modules/next/dist/bin/next build --webpack` trong `frontend/` **pass** (Turbopack gặp lỗi spawn worker PostCSS trên môi trường Windows hiện tại; webpack build tạo đủ 17 route trong `frontend/.next`).
- Smoke P0 (`python frontend/tests/browser/e2e/run_suite.py --priority P0 --with-server --json-report .cache/e2e-p0.json`): **13/13 Passed** trong `32.166s` (`E2E-AUTH-01..03`, `E2E-PROF-01`, `E2E-DIAG-01..03`, `E2E-HIST-01,02`, `E2E-PROF-AGRI-01`, `E2E-CAT-01`, `E2E-ADM-01,02`).
- Full browser UI suite (`python frontend/tests/browser/e2e/run_suite.py --with-server --json-report .cache/e2e-full.json`): **40/40 Passed** trong `82.891s` (0 fail, 0 skip).
- Vitest (`corepack pnpm --dir frontend test`): **81 test files / 575 passed** (`58.97s`).
- Workflow unit tests (`python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -v`): **27/27 Passed** (bao gồm `test_automated_e2e_and_manual_cases_are_strictly_separated`, `test_upsert_multiple_new_cases_in_same_tab_assigns_distinct_rows`, `test_update_summary_dashboard_assigns_distinct_rows_and_sums_updated_counts`, `test_run_all_executes_api_screen_and_playwright_groups`); `workflow.py sync --dry-run`: **47 cases** hợp lệ.
- `py_compile` và kiểm tra anti-pattern (`wait_for_timeout`/`page.pause`) trong `frontend/tests/browser/e2e/*.py`: **0 vi phạm**. `git diff --check`: **clean**.

### Đặc tả browser tự động (40 ca) và Manual E2E (10 ca)

- **Browser UI tự động (40 ca)** — đặc tả riêng tại [frontend_e2e_test_specification.md](frontend_e2e_test_specification.md), khai báo trong `tools/testcase-workflow/config/cases.json` + `test-groups.json` và thực thi qua `frontend/tests/browser/e2e/` (`run_suite.py`: **40/40**).
- **Manual E2E (10 ca):** tách riêng hoàn toàn từ tài liệu đến code tại [manual_e2e_test_cases.md](manual_e2e_test_cases.md) (`E2E-DIAG-04`, `E2E-DIAG-06`, `E2E-DIAG-08`, `E2E-HIST-04`, `E2E-HIST-05`, `E2E-PROF-AGRI-04`, `E2E-PROF-AGRI-05`, `E2E-CAT-05`, `E2E-CAT-06`, `E2E-ADM-05`), không nằm trong `frontend/tests/browser/e2e/` hay `tools/testcase-workflow/config/`. Đã chạy tay tương tác trên Chrome thật (`2026-11-17` – `2026-11-18`, commit `89c40dd`): **10/10 Pass** (`0 Fail`, `0 Blocked`).

### Kết quả chạy tay Manual E2E (2026-11-17 – 2026-11-18)

- Thực thi trực tiếp trên trình duyệt Chrome (qua `browser` subagent, không mock API, không thay bằng script Playwright) đối với Docker stack 5 service (`postgres`, `ai-service` đã rebuild/recreate healthy, `backend`, `frontend`, `mailpit`) tại `http://localhost:3000` và ảnh mẫu từ `E:\Dataset\dataset_v2\full_images_test`.
- **Tổng kết:** **10/10 Pass**, `0 Fail`, `0 Blocked` (`E2E-DIAG-04,06,08`, `E2E-HIST-04,05`, `E2E-PROF-AGRI-04,05`, `E2E-CAT-05,06`, `E2E-ADM-05`). Chi tiết bằng chứng từng ca xem tại [manual_e2e_test_cases.md](manual_e2e_test_cases.md).
- **Ghi chú kỹ thuật ghi nhận trong quá trình chạy:**
  - `E2E-DIAG-06`: lệnh `--expire-images` chỉ dọn `prediction_images` trong DB của user đã đăng nhập, còn ảnh guest lưu trong RAM (`GuestPredictionStore`, TTL 60 phút hoặc xóa khi `restart backend`).
  - `E2E-HIST-05`: `User B` gọi `GET` trả `404 Not Found` và `DELETE` trả `401 Unauthorized` (bị chặn đúng mục tiêu cô lập dữ liệu; bản ghi `User A` còn nguyên trong PostgreSQL).
  - `E2E-CAT-06`: đã kiểm tra cả empty state, `Slow 3G` loading indicator, `Offline` retry và dừng thật container `backend` (proxy trả `500 Internal Server Error` → `Thử lại` khôi phục `200 OK`).
  - Sau lượt chạy đã tắt server tĩnh tạm thời (`127.0.0.1:18765`), xóa `.cache/manual-e2e-images/` và xóa tài khoản test `manual_user_b_20261118@example.test` khỏi PostgreSQL.

### Chuẩn hóa cấu hình & đồng bộ Google Sheets (`2026-11-18`)

- Chuẩn hóa `tools/testcase-workflow/` (`sheets.json`, `cases.json`, `sheets_client.py`, `workflow.py`, `test_workflow.py`) cho cả 3 bảng tính (`Test viewpoint`, `Testcase API`, `Testcase Screen`):
  - **Tab tổng quan (`Overview`, `Report bug`, `Report`)**: tự động đánh STT `No.`, gán `Screen` / `API name`, gắn hyperlink `#gid=...` vào cột `Sheet name`, copy format + dropdown `Status`/`Status Testing` từ dòng chuẩn đầu bảng (`PASTE_FORMAT` + `PASTE_DATA_VALIDATION`), bổ sung đếm `Type` (`UI`, `Function`, `Validate`) và dùng công thức `Progress` (`=E{row}/D{row}`) đúng quy ước `Passed / Total`.
  - **Tab chi tiết (`API-*`, `WEB-*`, `VP-*`)**: sửa `screen.template_tab` sang `WEB-DIAG-01 Diagnosis` (có đủ cột `Type`), luôn chèn dòng mới ngay dưới testcase cuối cùng (`append below latest`), copy format + validation từ dòng đầu xuống tới `max_row`, chuẩn hóa `Automation` → `Auto` và font đen chuẩn `Times New Roman 12`.
- **Kiểm chứng**:
  - `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client`: **29/29 Pass** (`0.415s`).
  - `python frontend/tests/browser/e2e/run_suite.py --with-server --json-report .cache/e2e-full.json`: **40/40 Pass** (`103.396s`), import vào `state.json`.
  - `workflow.py sync --sheets`: **47/47 cases** đồng bộ live thành công lên 3 Google Sheets; chạy lại lần hai **47/47 `unchanged`** và kiểm tra trực tiếp qua Sheets API xác nhận đủ STT, dropdown validation, `Type`, `Progress`, hyperlink `#gid=...` và border/font chuẩn trên mọi dòng.
- **Hoàn thiện công thức live cross-tab, dọn 3 Google Spreadsheets & sửa triệt để vòng cuối (`2026-11-18`)**:
  - **Workflow & SheetsClient (`A1`)**: chỉ cập nhật `state["cases"]` khi `sync --sheets` ghi thành công (tránh mất `prior_auto_row` sau local/`--dry-run`); `upsert_row()` không ghi đè `"Not run"` lên dòng sẵn có khi `latest_results` chưa có ca đó và đặt cột theo `indexes[column]`; chuyển `Status Testing` trên `Report` (cột `O`) & `Report bug` (cột `L`) sang công thức live `=IF(D{r}=0;"To do";IF(E{r}+F{r}+G{r}=0;"To do";IF(H{r}=0;"Test Done";"Testing")))`; sửa khớp ID `viewpoint_table` theo exact boundary; hỗ trợ phân cách nghìn `vi_VN` (`.` và `,`); tính bounds `update_summary_list()` động theo mapping; `run_case()` Vitest dùng `"pnpm.cmd" if os.name == "nt" else "pnpm"`; xử lý nhất quán `Skipped`/`Deprecated`; bỏ workaround `"Blocked"` sang nhãn cũ; và `set_hyperlink_request(..., uri=None)` reset cả `underline` và màu chữ đen chuẩn.
  - **Làm sạch 3 Google Spreadsheets (`A2`)**: `Testcase Screen` đưa `Report` về `index=0`, xóa tab legacy `'Template\xa0'`, xóa 2 dòng mồ côi `R18`/`R19` (`WEB-PRED-01/02`) và CF lạc `I8` trên `SR_001` (`C7=0`, `C11=115`), chuẩn hóa header `A1=''` / `C7` / `G9` / `G10` / `C11` và 4 rule CF theo trạng thái (`#b7e1cd`, `#f4c7c3`, `#fce8b2`, `#efefef`) + dropdown `I`/`J` trên toàn bộ 10 tab `WEB-*`; `Test viewpoint` xóa dòng mồ côi `R5` trên `VP-API-01 Prediction Upload` và giữ `Overview` sạch `A:E` kèm `#gid=...`; `Testcase API` đưa `Report bug` về `index=0`, chuẩn hóa `Template` (`C5:C11` đồng bộ `K1000`/`L1000`), `API-HEALTH-01`, `API-PRED-01` (`A7='BLOCKED'`, `C7`/`C10`/`C11`, dropdown `K`/`L` với `'Blocked'` & `'N/A'`, 4 rule CF, xóa divider mồ côi vùng `44..67`).
  - **Đồng bộ tài liệu & CI (`A3`, `A4`)**: chuẩn hóa `cases.json` + schema guards; cập nhật tài liệu `manual_e2e_test_cases.md` (gồm sửa tiền điều kiện `E2E-DIAG-06` khớp RAM `GuestPredictionStore`), `manual_e2e_execution_guide.md`, `agri_test_viewpoints.md` khớp code (`404`/`401`, `GuestPredictionStore` RAM TTL); thêm `E2E_BASE_URL: http://127.0.0.1:3000` cho standalone Next.js trong `.github/workflows/testcase-workflow.yml`; gỡ bản chạy `API-PRED-01` cũ (`2026-11-13`) + `RUN-api` cũ (`2026-11-14`) khỏi `latest_results` trong `state.json` trước khi chạy lại thật trên Docker.
  - **Kiểm chứng vòng cuối & chạy full local**: `unittest` **53/53 Pass**, `py_compile` & `run_suite.py --list` (`40` cases) pass; standalone `127.0.0.1:3199/diagnose` **HTTP 200**; full Vitest **81 files / 575 passed** (`56.97s`); `AgriVision.ApiTests` trên Docker **294/294 Pass** (`1m2s`) + `run-case API-PRED-01` **3/3 Pass** (`GuestPredictionsControllerTests.InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage`); full Playwright UI **40/40 Pass** (`95.212s`); `sync --sheets` đồng bộ `API-PRED-01` lên `Passed` và read-back Sheets API xác nhận `Report` (`708` total / `619` pass / `25` failed / `64` blocked / `0` not run, `87,43%`), `Report bug` (`262` total / `163` pass / `31` failed / `5` blocked / `63` not run, `62%`, `API-PRED-01` = `Test Done 100%`, `Template!C5:C11` = `1000`), `0` stray `I8` CFs trên `SR_001` & 10 tab `WEB-*`, đủ `#gid=...` và công thức `=IF(...)`.

### System E2E smoke (2026-11-16)

- Docker Compose đã build/start thành công với `postgres`, `ai-service`, `backend` và `frontend`.
- Backend `/api/health` trả `200` với database `Healthy`; AI `/health` trả `200`.
- `frontend/tests/browser/e2e/live_smoke.py` chạy không intercept API và đã xác minh các route public `/plants`, `/diseases`, `/medicines`, `/knowledge`, `/about` cùng guest diagnosis đi qua API proxy và AI thật.
- Lệnh xác minh: `$env:PLAYWRIGHT_BROWSERS_PATH='C:\Users\Admin\AppData\Local\ms-playwright'; python frontend/tests/browser/e2e/live_smoke.py` — exit `0`.
- `frontend/tests/browser/e2e/live_account.py` đã kiểm tra chặn sai CAPTCHA + lỗi `401` sai mật khẩu từ backend thật, đăng ký user test thật, cập nhật họ tên qua API thật, reload `/profile`, upload avatar, kiểm tra empty state `/history` và đăng xuất — exit `0`.
- `frontend/tests/browser/e2e/live_admin.py` đã kiểm tra chặn Guest & User thường truy cập `/admin`, đăng nhập bằng demo Admin thật, lọc ngày trên Overview `AdminCalendar`, điều hướng responsive mobile/desktop qua các view, tìm kiếm Users qua `/api/admin/users` và tra cứu Sessions qua `/api/admin/sessions` — exit `0`.
- `frontend/tests/browser/e2e/live_diagnosis.py` đã đăng nhập bằng demo User thật, gửi ảnh qua `/diagnose`, nhận kết quả AI (confidence + Top-3), mở modal chi tiết snapshot trên `/history` và xóa bản ghi có xác nhận — exit `0`.
- `frontend/tests/browser/e2e/live_agricultural_profile.py` đã tạo hồ sơ nông nghiệp qua API thật, reload trang, chỉnh sửa tên/mô tả hồ sơ, xác minh dữ liệu sau reload và dọn sạch hồ sơ test khỏi database trong khối `finally` — exit `0`.
- `frontend/tests/browser/e2e/live_catalog_admin.py` đã tạo bản ghi plant qua Admin UI, reload danh sách, mở lại bản ghi từ API thật và xóa vĩnh viễn bản ghi test khỏi database (kèm dọn dẹp dự phòng trong `finally`) — exit `0`.
- `frontend/tests/browser/e2e/live_prediction_profile.py` đã tạo profile thật, chạy diagnosis thật, chọn profile trong dialog, xác minh prediction được liên kết và dọn sạch cả prediction lẫn profile test khỏi database trong `finally` — exit `0`.
- Chạy lại toàn bộ 8 live runner (`live_smoke`, `live_account`, `live_diagnosis`, `live_prediction_profile`, `live_agricultural_profile`, `live_admin`, `live_catalog_admin`, `live_email_auth`) trong một lượt đều exit `0`; dữ liệu synthetic được dọn sạch sau lượt chạy.
- Consolidated live runner `python frontend/tests/browser/e2e/run_live_suite.py --json-report .cache/e2e-live.json` đã gán 40 trạng thái từ 8 exit code trong `70.691s`; report có đầy đủ metadata môi trường, testcase ID, runner và status.
- `live_smoke.py` bao phủ điều hướng danh mục công khai (danh sách + trang chi tiết `/[id]`), trang giới thiệu `/`, responsive 1280/768/375, menu mobile, reduced-motion, `/about`, 404/noindex, guest diagnosis và client file validation bằng assertion live.
- `frontend/tests/browser/e2e/live_email_auth.py` đã chạy reset password qua UI, đọc OTP từ Mailpit, đăng nhập bằng mật khẩu mới, bật Email 2FA, đọc mã xác minh từ Mailpit và xác nhận trạng thái 2FA được giữ nguyên sau `reload` — exit `0`.
- Cùng runner đã đổi mật khẩu tài khoản qua UI, đọc mã `PasswordChange` từ Mailpit và xác nhận phiên bị đăng xuất sau khi đổi thành công — exit `0`.
- `live_account.py` đã upload avatar qua UI và xác nhận trạng thái lưu vào tài khoản với storage thật — exit `0`.
- `docker-compose.e2e.yml` cung cấp Mailpit nội bộ; backend production mặc định vẫn dùng STARTTLS, chỉ E2E override dùng SMTP test không mã hóa trên network cô lập.
- Runner cũ gắn cùng ID cho các luồng khác hành vi. Từ bản sửa PR #64, browser và live có danh sách kết quả thực thi riêng.

### [2026-11-18 19:05 +07:00] Per-case TRX/Vitest parsing & Git-backed CI state

- **Changed (`tools/testcase-workflow/workflow.py`, `.github/workflows/testcase-workflow.yml`, `tools/testcase-workflow/test_workflow.py`):**
  - Thêm `parse_trx_case_results()` (dotnet `.trx`) và `parse_vitest_case_results()` (Vitest `--reporter=json`) vào `run_group("api")` / `run_group("screen")` để emit kết quả `per_case` theo từng `selector` (`API-PRED-01`, `API-PRED-02`, `WEB-PRED-01`, `WEB-PRED-02`) thay vì chỉ gán chung `RUN-api`/`RUN-screen`; `run_all()` tránh chạy lặp các case đã nằm trong group; `test-result-summary` kiểm tra đủ 9 `--expected-id`.
  - Thêm `load_previous_cases_from_git()` (`HEAD` khi working tree bẩn hoặc `HEAD^1` khi sạch) làm nguồn fallback khi `state.json` chưa có `cases` trên CI (`fetch-depth: 0`), và `_mark_deprecated_sheet_rows()` để giữ dòng lịch sử và cập nhật `execution="N/A"` + `evidence` `[Deprecated]` trên tab sẵn có mà không chạm cột status dropdown.
- **Verified (sau sửa cuối):**
  - `python -m py_compile tools/testcase-workflow/workflow.py tools/testcase-workflow/sheets_client.py tools/testcase-workflow/validate_results.py`: pass.
  - `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -v`: **59/59 pass** (`1.210s`).
  - `yaml.safe_load` trên `.github/workflows/testcase-workflow.yml`: **7 jobs** hợp lệ.
  - Thực thi thật `workflow.py run screen` + `validate_results.py` (`AGRIVISION_RESULT_DIR=.cache/verify-screen`): **pass** (`WEB-PRED-01`, `WEB-PRED-02`, `RUN-screen` `9/9` tests trong `4.822s`, `valid: true`, `failed_cases: []`).
- **Remaining:** `run_group("api")` live với `.trx` trên Docker thật chưa chạy lại trong lượt này (Docker Desktop đang tắt; nhánh `.trx` đã kiểm bằng fixture XML). Đồng bộ GitHub Actions thật chờ push lên CI.

### [2026-11-18 19:13 +07:00] Config-driven Sheet layout & locale-aware formulas

- **Changed (`tools/testcase-workflow/config/sheets.json`, `tools/testcase-workflow/sheets_client.py`, `tools/testcase-workflow/workflow.py`, `tools/testcase-workflow/test_workflow.py`, `tools/testcase-workflow/test_sheets_client.py`):**
  - Bổ sung `detail_header`, `detail_count_field`, `detail_formula_metrics` vào `sheets.json` và chuyển toàn bộ tọa độ/công thức tab chi tiết sang `build_detail_summary_updates()` dùng dải mở `<col><start_row>:<col>` (bỏ giới hạn cứng `1000`/`1108` và bỏ hardcode `C7:C7`, `C10:C11`, `G9:G10`, `C5:C11`, `B1:B3`, `A7:A7`, `A1:A2`).
  - Thêm `SheetsClient.spreadsheet_locale()` và `formula_separator_for_locale()` để chọn dấu `,` hoặc `;` theo locale thực tế của từng Google Spreadsheet.
  - Rút gọn `parse_trx_case_results()` và `parse_vitest_case_results()` qua helper chung `_build_parsed_case_result()`.
- **Verified (sau sửa cuối):** `py_compile` pass; `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -q` **61/61 pass**; `workflow.py sync --dry-run` pass (`47` cases); `git diff --check` pass.
- **Remaining:** Ghi thử thực tế lên Google Sheet (`sync --sheets`) khi có phiên Sheets hoặc sau push CI.

## 2026-11-21 Kiểm chứng vòng sửa 3 finding

| Bước | Thay đổi | Kết quả review |
| --- | --- | --- |
| 1. Kết quả riêng từng testcase | Bỏ lấy `RUN-*` làm kết quả testcase khi sync. Playwright đối chiếu đúng tập ID và đếm `Passed` từ từng bản ghi. CI yêu cầu hợp của các ID có runner trong registry và các ID nhóm, hiện là 46 + 3. | Trước sửa, report Playwright 1/40 vẫn pass, một dòng mới được điền `Passed` từ kết quả nhóm và validator bỏ qua ID nhóm khi dùng cả hai tham số. Sau sửa, suite **63/63** pass. Chạy CLI với artifact giả lập đủ **49** ID pass, bỏ lần lượt `E2E-AUTH-01` hoặc `RUN-playwright` đều bị từ chối. |
| 2. Report bắt buộc | API, Vitest và Playwright phát kết quả `Blocked` và trả lỗi nếu subprocess exit 0 mà thiếu report. Playwright đọc đường dẫn `--json-report` tường minh và yêu cầu file được tạo hoặc cập nhật trong lượt chạy. | Trước sửa, ba nhóm và trường hợp Playwright dùng report cũ đều báo thành công. Sau sửa, suite **65/65** pass. `run screen` thật pass **9/9** và validator chấp nhận đúng **3** bản ghi gồm `WEB-PRED-01`, `WEB-PRED-02` và `RUN-screen`. |
| 3. Mốc trước push | Khi runner chưa có snapshot, CI truyền `github.event.before` qua `AGRIVISION_CASES_BEFORE_SHA`. Push tạo ref mới dùng snapshot rỗng. SHA không có trong checkout làm sync dừng trước khi tạo Sheets client. Chạy local và dispatch vẫn dùng mốc Git mặc định khi thiếu SHA. | Repo fixture có commit đầu thay `API-V1`, commit cuối sửa ghi chú. Trước sửa testcase cũ bị bỏ sót. Sau sửa nhận diện đúng `API-V1`, xử lý cả SHA toàn số 0 lẫn SHA không khả dụng. Suite **65/65** pass. |

- **Nguồn:** [workflow.py](../../../tools/testcase-workflow/workflow.py), [validate_results.py](../../../tools/testcase-workflow/validate_results.py), [test_workflow.py](../../../tools/testcase-workflow/test_workflow.py), [testcase-workflow.yml](../../../.github/workflows/testcase-workflow.yml).
- **Kiểm tra cục bộ:** Python compile, YAML parse **7 jobs**, `git diff --check` và `sync --dry-run` với **47 case** đều pass. Unit tests chạy với thư mục tạm trong workspace và bỏ cấu hình Git được chèn từ host trong tiến trình test.
- **Playwright UI thật:** Lượt đầu không tìm thấy Chromium ở đường dẫn sandbox mặc định. Runner ghi **40 Blocked** và `RUN-playwright Failed`; validator từ chối. Chạy lại với `PLAYWRIGHT_BROWSERS_PATH` trỏ tới Chromium đã cài và frontend Next.js standalone có sẵn trên loopback: **40/40 pass** trong **106.118 giây**, validator chấp nhận **41** bản ghi. Review cuối bổ sung fixture đổi thời gian truy cập của report cũ và giữ nguyên thời gian sửa đổi; suite cuối **65/65** pass.
- **Artifact local:** [Unit test log](../../../.cache/agri145-findings-final-tests.log), [Vitest results](../../../.cache/agri145-findings-screen-67b226b9745f412cbb76bf8236317098/results.json), [Playwright results](../../../.cache/agri145-findings-playwright-063fbac8c1354ce29bd0c5afaaad71d2/results.json).
- **Còn lại:** GitHub Actions chưa xác minh được vì GitHub CLI trả HTTP 401. Docker từ chối kết nối, nên chưa chạy API suite và Live System E2E. Chưa ghi Google Sheets. Refactor hướng 1 là diff tiếp theo.

## 2026-11-21 Kết quả vòng sửa sau review PR

| Finding | Thay đổi và kết quả review |
| --- | --- |
| P1 · Gitleaks thiếu bộ quy tắc mặc định | `.gitleaks.toml` bật `extend.useDefault` và giữ allowlist cho JWT giả dùng trong CI. Gitleaks local phát hiện fixture token giả (exit 1), cho qua JWT giả (exit 0), và không báo phát hiện khi quét diff so với `origin/main` hoặc lịch sử 33 commit của nhánh. |
| P1 · `run-case` có thể ghi `Passed` khi không chạy test | Đọc TRX, Vitest JSON hoặc Playwright JSON theo đúng ID/selector và dùng exit code để xác nhận runner hoàn tất. Fixture có exit 0 nhưng report thiếu kết quả đã thực thi bị chặn ở cả ba adapter. Vitest chạy thật ghi `Passed` khi khớp 1 test và `Blocked` khi khớp 0 test. |
| P2 · Ảnh riêng tư bị vỡ sau khi lưu chẩn đoán khách | Card kết quả dùng `PrivateImage` ở cả nhánh thành công và cảnh báo. Test tích hợp tái hiện thiếu request ảnh có Bearer trước sửa và xác nhận lưu thành công, fetch đúng header, hiển thị ảnh blob sau sửa. |
| P2 · Chuyển tab để lại hai dòng active | Sau khi ghi đích, sync đánh dấu ID dòng nguồn `[Moved]`, giữ nguyên cột và evidence lịch sử. Dashboard API và Screen bỏ qua dòng này trong các mục đếm. Fixture xác nhận chuyển đi, chạy lại và chuyển về cùng ID mà không tạo thêm dòng active. |

- **Bằng chứng workflow:** [67 unit tests](../../../.cache/agri145-review-fixes-unit.log), artifact Vitest `run-case` [khớp selector](../../../.cache/agri145-case-configured-yk09int1/results.json) và [không khớp selector](../../../.cache/agri145-case-unmatched-igbl2hw_/results.json). `sync --dry-run` đọc 47 testcase, 47 `unchanged`.
- **Frontend:** [Vitest đầy đủ](../../../.cache/agri145-review-fixes-vitest.log) **81 file / 576 test pass**. `run screen` pass **9/9**, validator chấp nhận [3 bản ghi](../../../.cache/agri145-review-fixes-screen-e1e2704bc2d44835a0f9ba1a14952bf5/results.json). TypeScript và Biome trên hai file TSX thay đổi đều pass. Chromium chạy kịch bản lưu kết quả với API stub, request ảnh có Bearer trả HTTP 200 và ảnh giải mã được ở chiều rộng 224 px.
- **Playwright UI:** **40/40 pass** trong **102.523 giây** trên output Next.js đã compile. Validator chấp nhận [41 bản ghi](../../../.cache/agri145-review-fixes-browser-edfb7ee4b35547768d3257b28294472b/results.json). Gitleaks local quét thêm `--all` (**279 commit**) và không báo phát hiện.
- **Build local:** [Turbopack build](../../../.cache/agri145-review-fixes-build-retry.log) compile và kiểm tra TypeScript thành công rồi dừng vì `EPERM` khi tạo thư mục/symlink để đóng gói `.next/standalone` trên Windows. Kiểm tra Chromium dùng `next start` với output đã compile.
- **Còn lại:** Chưa chạy API .NET và Live System E2E với Docker do daemon từ chối kết nối. Công thức và thao tác chuyển tab mới được kiểm bằng fixture, chưa ghi lên Google Sheets. Cần CI trên commit chứa bản sửa và approval của reviewer trước khi merge.

## 2026-11-21 Snapshot Sheets và số liệu active

- **Mốc đồng bộ:** `sync --sheets` đọc snapshot từ tab ẩn `_AgriVision Sync State` trong spreadsheet API. Lần đầu khởi tạo dùng state cục bộ hoặc mốc Git. Các lần sau ưu tiên snapshot đã lưu. `sync --dry-run` vẫn đọc local/Git và không mở Sheets client.
- **Thử lại sau lỗi:** Trước khi ghi dòng đích, lưu những vị trí Sheet có thể được tạo trong lượt hiện tại. Chỉ xác nhận registry mới sau khi ghi chi tiết và dashboard xong. Nếu lượt lỗi giữa chừng, snapshot xác nhận vẫn giữ registry cũ và lượt tiếp theo có thể xử lý cả tab đích đã bị bỏ lại. Snapshot dạng JSON chia đoạn, cập nhật tab ẩn bằng một batch cấu trúc. [Sheets API batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate)
- **Số liệu:** Công thức dashboard API/Screen loại cả dòng `[Moved]` và dòng có evidence `[Deprecated]`, kể cả tab nguồn không còn testcase trong registry. Trạng thái cũ vẫn nằm trên dòng lịch sử. Nếu thêm lại ID, sync phục hồi Execution từ cấu hình hoặc kết quả mới và bỏ nhãn Deprecated cũ.
- **Kiểm chứng:** [69/69 workflow unit tests](../../../.cache/agri145-sync-checkpoint-tests.log), gồm fixture so với snapshot đã xuất bản, ngắt sau khi ghi dòng, phục hồi khi registry quay về, và công thức ở tab chỉ còn dòng lịch sử. `run screen` pass **9/9**, validator nhận [3 bản ghi](../../../.cache/agri145-sync-checkpoint-screen-817950a70b0948eea5643dbc85fa1571/results.json). Dry-run **47/47**, Python syntax và YAML **7 jobs** pass.
- **Còn lại:** Chưa tạo checkpoint hoặc ghi thử live. Mốc bootstrap cần khớp lần ghi cuối trước khi bật bản mới trên Sheet chính. API và Live System E2E chưa chạy vì Docker từ chối kết nối. Bản sửa chưa có CI từ xa.

### Review plan Level 2

- Tách theo trách nhiệm sau khi chốt baseline mới. Đặt module production là `case_runners.py` hoặc `runners.py`, để unittest discovery chỉ thu test files. Chiều import là `workflow.py` → `runners` → `sheets_sync` → `registry_state`. Hai module trung gian có thể đọc registry qua module gốc.
- Tách cơ học từng module, chuyển patch tới tên mà hàm tra cứu lúc chạy, rồi đo parity qua CLI và artifact. Giữ re-export tường minh các entrypoint thật sự dùng. Chụp baseline sau bản sửa snapshot, gồm khôi phục sau ghi một phần và bộ lọc `[Deprecated]`.
- Giữ fallback dashboard, migration conditional format và các key mô tả trong đợt tách. Fixture dashboard hiện có đường chạy thiếu `summary_cell_refs`. Việc biến key này thành bắt buộc là thay đổi hành vi. Dọn fallback, helper thực sự không còn caller và fixture boilerplate trong diff nhỏ sau khi có parity.

### Chuẩn bị tách module Level 2 (2026-11-21)

- [Plan đã chỉnh](../../plans/AGRI-145-testcase-workflow-refactor-plan.md) dùng `case_runners.py`, tách cơ học từng nhóm trước cleanup và bổ sung kiểm tra tương đương theo CLI, artifact và lệnh ghi Sheets trên fixture.
- Dọn nhẹ `sync()` bằng cách dùng lại bảng tra vị trí hiện tại/đang ghi dở khi dựng journal. So trước/sau cho kết quả giống hệt ở **39 chữ ký**, JSON dry-run **47 case** và **11 bản ghi trace** gồm ghi dòng, cập nhật dashboard và snapshot trong fixture sync bị ngắt rồi thử lại.
- **69/69** unit tests pass. Hai lượt `run screen` từ repo root và `frontend/` đều pass **9/9**, validator nhận **3** bản ghi mỗi lượt. Hai artifact có nội dung khớp sau khi chuẩn hóa thời lượng, timestamp và run ID. [Baseline và checksum](../../../.cache/agri145-level2-baseline/comparison.json)
- Chưa thực hiện giai đoạn dời module. Ghi–đọc lại Sheets, API .NET và Live System E2E nằm ngoài lượt baseline cục bộ này.

## 2026-11-21 Kết quả thực thi Level 2

- Tách `registry_state.py`, `sheets_sync.py` và `case_runners.py`. `workflow.py` còn **153 dòng** và giữ vai trò CLI cùng re-export tường minh. Dời **25 test Sheets** và **11 test runner** về đúng module và cập nhật namespace của mock.
- Sau từng bước dời, suite pass **69/69**. Sau khi đạt parity, bỏ hai helper đọc cột Sheets đã xác nhận thừa. CI `workflow-smoke` compile **6 module production** và dùng discovery lấy đủ **4 suite**.
- [Artefact đối chiếu](../../../.cache/agri145-level2-baseline/split-comparison.json) xác nhận **39 chữ ký**, tên của **69 test**, JSON dry-run **47 testcase** và thứ tự/payload của **11 thao tác fixture Sheets** khớp baseline. `run screen` từ repo root và `frontend/` đều pass **9/9**, validator nhận **3** bản ghi mỗi lượt. Hai artifact khớp baseline sau chuẩn hóa.
- `run playwright` với output Next.js đã compile pass **40/40** trong **98.657 giây**. Validator chấp nhận [41 bản ghi](../../../.cache/agri145-level2-baseline/split-playwright/results.json), đủ mọi ID Playwright trong cấu hình và `RUN-playwright`. Gitleaks không báo phát hiện trên diff và các file mới. `git diff --check` pass.
- API integration và Live System E2E còn bị chặn vì Docker từ chối kết nối. Chưa ghi Google Sheets thật hoặc xác minh CI trên commit chứa bản tách.

## Kiểm tra trước commit

**2026-11-21, branch `AGRI-145-testcase-design-demo`, working tree trên `d9a9afc`.** Tách riêng dòng testcase, công thức, summary, Sheets API và điều phối sync. Runner, parser report và HTTP contract có module riêng. File production lớn nhất còn **429 dòng**. File test lớn nhất còn **521 dòng**. [Plan cập nhật](../../plans/AGRI-145-testcase-workflow-refactor-plan.md)

| Phát hiện | Bản sửa và bằng chứng |
| --- | --- |
| Rerun cũ có thể ghi đè Sheets mới | CI đối chiếu SHA với đầu `main` trước bước giải mã khóa, đồng thời yêu cầu bốn job tạo artifact và job tổng hợp thành công. Fixture Git remote cục bộ trả **0** cho SHA hiện tại, **1** cho rerun cũ hoặc remote thiếu `main`. [Log](../../../.cache/agri145-sheets-revision-check.log) |
| Report lỗi làm mất artifact | TRX, Vitest và Playwright lỗi đọc hoặc sai cấu trúc đều ghi kết quả từng case và `RUN-*`, kèm lý do và exit khác 0. Runner cũng báo lỗi với ID đã cấu hình nhưng thiếu trong registry. Hai lệnh kiểm HTTP trả lỗi đúng exit code và xác minh payload thực tế. |
| Gián đoạn khi nhân bản tab và trạng thái cũ khi thêm lại testcase | Nhân bản và xóa giá trị testcase mẫu trong cùng batch. Fixture retry giữ tab đã tạo và không để lại dòng mẫu. Testcase được thêm lại dùng trạng thái hiện tại, mặc định `Not run` nếu chưa có kết quả mới. Tên tab có dấu nháy đơn được escape chung ở đọc, ghi và công thức. |
| Next.js 16.4.1 làm build dừng ở bước kiểm tra bảo mật | Cập nhật lên **16.4.5** và chỉ thay các mục lockfile cần cho bản vá. Frozen install, build standalone và Playwright trên bản mới đều pass. [Bản phát hành Next.js](https://github.com/vercel/next.js/releases/tag/v16.4.5) |

| Kiểm tra cục bộ | Kết quả |
| --- | --- |
| Workflow Python, compile, YAML và secret scan | **82/82** unit test ở **3** process mới. `compileall`, `actionlint`, Gitleaks và `git diff --check` pass. [Unit log](../../../.cache/agri145-final/workflow-3.log) |
| CLI và Sheets fixture | **39** chữ ký, dry-run **47** testcase và thứ tự **11** thao tác giữ nguyên. Payload chỉ thay ở ô của testcase được thêm lại, từ `Passed` cũ sang `Not run`. |
| API với Testcontainers và Docker local | **294/294** API tests pass. Health và Guest contract thật pass **2/2** sau khi Docker Desktop hoạt động lại. [TRX](../../../.cache/agri145-final/api-verified/api-results.trx) · [Contract log](../../../.cache/agri145-final-live-contract-verified.log) |
| Frontend và Playwright UI | Vitest **576/576** ở **81** file với 2 workers. `run screen` **9/9** từ repo root và `frontend/`. Chromium trên Next.js 16.4.5 standalone với API stub pass **40/40**. [Vitest](../../../.cache/agri145-final-frontend-verified.log) · [Playwright](../../../.cache/agri145-final-browser-patched.log) |
| Artifact và Google Sheets chỉ đọc | Validator tổng hợp chấp nhận **49** bản ghi, gồm **46** testcase tự động và **3** bản ghi nhóm. Đối chiếu trực tiếp thấy **47/47** ID xuất hiện đúng một lần ở tab dự kiến trong **13** tab quản lý. Cột execution khớp cấu hình ở **46** dòng API/Screen có cột này. Viewpoint có một ID và chưa có runner. [API](https://docs.google.com/spreadsheets/d/1BBHMgQMQMMFzrMlxzjRHDd73QATmPVUvqpf6gKkjsUg/edit) · [Screen](https://docs.google.com/spreadsheets/d/1p1CN5KM1PVFcYvPD_rvfziO8rxcYgljG56LUb0DSCIQ/edit) · [Viewpoint](https://docs.google.com/spreadsheets/d/1wFM32VTHADjP-DnB3yLTZ5WjbPwDEs2HDOgnvcN0TbA/edit) |

Lượt đầu Vitest có ba timeout và nhóm API đạt 293/294. Lượt API kế tiếp bị lỗi kết nối Docker. Các số trong bảng lấy từ lượt nghiệm thu mới. [Ảnh bằng chứng](../../../.cache/agri145-final/precommit-evidence.png)

**Còn lại trước merge:** duyệt report, sau đó chạy CI đúng commit mới và nhận review theo quy trình PR. Lượt này giữ index rỗng và chỉ đọc Google Sheets thật. Luồng ghi được kiểm bằng fixture. Full Live System E2E riêng chưa chạy lại. Guard SHA áp dụng từ bản workflow này trở đi.

## Kiểm tra Playwright sau push

- Trên cùng SHA `f088a15`, lượt push chạy **39/40** Playwright. `E2E-CAT-03` fail và validator ghi đúng hai bản ghi lỗi `E2E-CAT-03` và `RUN-playwright` trong **49** bản ghi. Lượt pull request riêng của cùng SHA pass. [Lượt push](https://github.com/KayPham05/AgriAI/actions/runs/44896167556) · [Lượt pull request](https://github.com/KayPham05/AgriAI/actions/runs/44896170058)
- Artifact cũ chỉ giữ dòng cuối `- alert`, nên chưa xác định được assertion gốc từ lượt đỏ. Ca cũ chạy riêng **8/8** lần pass cục bộ. Đã xác nhận bằng fixture rằng parser cũ làm mất tiêu đề assertion và locator, rồi sửa để giữ hai thông tin đó trong mô tả lỗi có giới hạn.
- `E2E-CAT-03` giờ chờ URL sau đổi trang và lọc cây, kiểm tra request kết hợp ID cây với từ khóa, rồi bấm liên kết trong đúng thẻ thuốc. Các assertion phân trang, kết quả tìm kiếm và chi tiết thuốc vẫn được kiểm.
- **Kết quả cục bộ sau sửa:** Catalog pass **4/4** ở cả **3** process mới. Workflow Playwright pass **40/40** trong **89,093 giây** với Chromium headless, Next.js 16.4.5 standalone và ApiStub. Validator chấp nhận **41** bản ghi. Python pass **83/83**, `actionlint`, Gitleaks và `git diff --check` pass. [Ảnh bằng chứng](../../../.cache/agri145-cat03-fixed/evidence.png) · [Artifact Playwright](../../../.cache/agri145-cat03-fixed/group/results.json)

## Tài liệu liên quan

- Workflow: `.github/workflows/testcase-workflow.yml`
- Runner: `tools/testcase-workflow/`
- Kế hoạch tách module: [AGRI-145-testcase-workflow-refactor-plan.md](../../plans/AGRI-145-testcase-workflow-refactor-plan.md)
- Hướng dẫn chuyển đổi: `docs/notes/production_test_automation_guide.md`
- Đặc tả ma trận E2E Frontend: [frontend_e2e_test_specification.md](frontend_e2e_test_specification.md)
- Checklist chạy tay cho các luồng cần hệ thống thật: [manual_e2e_test_cases.md](manual_e2e_test_cases.md)
- Hướng dẫn thao tác từng bước (Runbook) cho 10 ca Manual E2E: [manual_e2e_execution_guide.md](manual_e2e_execution_guide.md)
