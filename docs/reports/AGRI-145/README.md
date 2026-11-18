# AGRI-145 — Testcase workflow

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
- Live System E2E (`run_live_suite.py` trên Docker stack thật, trước đợt chuẩn hóa Sheets): **40/40 pass** (`70.691s`); Manual E2E Chrome thật: **10/10 pass**.
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

### Tách biệt đặc tả Automated System E2E (40 ca) và Manual E2E (10 ca)

- **Automated System E2E (40 ca):** đặc tả riêng tại [frontend_e2e_test_specification.md](frontend_e2e_test_specification.md), khai báo trong `tools/testcase-workflow/config/cases.json` + `test-groups.json` và thực thi qua `frontend/tests/browser/e2e/` (`run_live_suite.py`: **40/40 Passed** trong `.cache/e2e-live.json`; `run_suite.py`: **40/40**).
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
- Consolidated live runner `python frontend/tests/browser/e2e/run_live_suite.py --json-report .cache/e2e-live.json` đã chạy liên tiếp **40/40 mapped system E2E cases passed** trong `70.691s`; report có đầy đủ metadata môi trường, testcase ID, runner và status.
- `live_smoke.py` bao phủ điều hướng danh mục công khai (danh sách + trang chi tiết `/[id]`), trang giới thiệu `/`, responsive 1280/768/375, menu mobile, reduced-motion, `/about`, 404/noindex, guest diagnosis và client file validation bằng assertion live.
- `frontend/tests/browser/e2e/live_email_auth.py` đã chạy reset password qua UI, đọc OTP từ Mailpit, đăng nhập bằng mật khẩu mới, bật Email 2FA, đọc mã xác minh từ Mailpit và xác nhận trạng thái 2FA được giữ nguyên sau `reload` — exit `0`.
- Cùng runner đã đổi mật khẩu tài khoản qua UI, đọc mã `PasswordChange` từ Mailpit và xác nhận phiên bị đăng xuất sau khi đổi thành công — exit `0`.
- `live_account.py` đã upload avatar qua UI và xác nhận trạng thái lưu vào tài khoản với storage thật — exit `0`.
- `docker-compose.e2e.yml` cung cấp Mailpit nội bộ; backend production mặc định vẫn dùng STARTTLS, chỉ E2E override dùng SMTP test không mã hóa trên network cô lập.
- Bộ `run_suite.py` (40 ca Browser UI test dùng `ApiStub` cho CI) và bộ `run_live_suite.py` (40 ca Live System E2E trên Docker stack thật) được duy trì song song và đồng bộ 100% về danh sách 40 mã kiểm thử tự động.

## Tài liệu liên quan

- Workflow: `.github/workflows/testcase-workflow.yml`
- Runner: `tools/testcase-workflow/`
- Hướng dẫn chuyển đổi: `docs/notes/production_test_automation_guide.md`
- Đặc tả ma trận E2E Frontend: [frontend_e2e_test_specification.md](frontend_e2e_test_specification.md)
- Checklist chạy tay cho các luồng cần hệ thống thật: [manual_e2e_test_cases.md](manual_e2e_test_cases.md)
- Hướng dẫn thao tác từng bước (Runbook) cho 10 ca Manual E2E: [manual_e2e_execution_guide.md](manual_e2e_execution_guide.md)
