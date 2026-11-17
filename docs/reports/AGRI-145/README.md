# AGRI-145 — Testcase workflow

## Phạm vi

Workflow quản lý registry testcase cho `api`, `screen`, `viewpoint`; thực thi nhóm API/.NET, Vitest và Playwright; nhập artifact kết quả rồi đồng bộ Google Sheets. Mapping group → testcase dùng `case_ids`, không fan-out ngầm.

## Thay đổi chính

- Validator artifact kiểm tra schema, duplicate, status và trả exit `1` cho `Failed`/`Blocked`.
- Runner ghi `results.json`, giữ exit code, import artifact trước Sheets sync.
- Sync bảo vệ cột manual/business, đánh dấu testcase cũ `Deprecated`, retry lỗi mạng/429/5xx và batch value writes.
- CI có 7 job, gồm live-contract cho health/guest adapters, artifact aggregation, readiness, concurrency cho Sheets sync và quyền tối thiểu `contents: read`.

## Bằng chứng hiện tại

- `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -q`: **23 pass**.
- YAML parse bằng PyYAML: **7 jobs**.
- Docker Compose: postgres, AI, backend, frontend **healthy**; `/diagnose` và `/api/health`: **HTTP 200**.
- API group: **294 pass, 0 fail**, `RUN-api`, exit `0` (dotnet cases).
- Explicit API adapters: `API-HEALTH-01` and `API-PRED-GUEST-01` pass locally and in live-contract CI.
- Screen group: **9 pass, 0 fail**, `RUN-screen`, exit `0`.
- Playwright: **11 trạng thái, 3 kích thước**, `RUN-playwright`, exit `0`.
- Sheets sync local với service account: **pass**; chạy lần hai **7/7 unchanged**, không duplicate. Remote protected sync cũng pass ở run `43570450037`.
- Security audit: key không bị Git track, key path bị ignore, không phát hiện secret pattern thật trong workflow/config.

## Giới hạn còn lại

- GitHub Actions run `43570450037` **pass toàn bộ**: smoke, live-contract, backend, frontend, Playwright, summary và `sheets-sync`.
- Live-contract đã được xác minh trên GitHub: checkpoint/migration stack, health và guest adapter pass. Sheets key được cleanup bằng `if: always()`.
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
- **Manual E2E (10 ca):** tách riêng hoàn toàn từ tài liệu đến code tại [manual_e2e_test_cases.md](manual_e2e_test_cases.md) (`E2E-DIAG-04`, `E2E-DIAG-06`, `E2E-DIAG-08`, `E2E-HIST-04`, `E2E-HIST-05`, `E2E-PROF-AGRI-04`, `E2E-PROF-AGRI-05`, `E2E-CAT-05`, `E2E-CAT-06`, `E2E-ADM-05`), không nằm trong `frontend/tests/browser/e2e/` hay `tools/testcase-workflow/config/`, giữ trạng thái `Not run` cho tới khi chạy tay trên môi trường thật.

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
