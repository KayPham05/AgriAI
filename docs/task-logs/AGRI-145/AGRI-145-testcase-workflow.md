# AGRI-145 — Task log

- **Branch:** `AGRI-145-testcase-design-demo` | **Pull request:** [#64](https://github.com/KayPham05/AgriAI/pull/64).
- **Report:** [README.md](../../reports/AGRI-145/README.md) | **Status:** Ready for PR.
- **Next / Blocker:** Chờ duyệt report trước commit, sau đó chạy CI trên commit mới và hoàn tất review PR.

## Log

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
- Manual E2E trên Chrome thật (2026-11-17 – 2026-11-18, commit `89c40dd`): Chạy tương tác qua `browser` subagent trên Docker stack 5 service (`postgres`, `ai-service` đã rebuild/recreate healthy, `backend`, `frontend`, `mailpit`) với ảnh mẫu từ `E:\Dataset\dataset_v2\full_images_test` → **10/10 Pass** (`0 Fail`, `0 Blocked`); xem chi tiết tại [manual_e2e_test_cases.md](../../reports/AGRI-145/manual_e2e_test_cases.md) và [README.md](../../reports/AGRI-145/README.md). Đã dọn sạch dữ liệu/user test và server tạm.
- Chuẩn hóa Google Sheets sync (`2026-11-18`): cập nhật `cases.json`, `sheets.json`, `sheets_client.py`, `workflow.py`, `test_workflow.py` để đánh STT `No.`, `Screen`, `Type` (`UI/Function/Validate`), `Status Testing` dropdown + style/border chuẩn, công thức `Progress` (`=E/D`), hyperlink `#gid=...`, và chèn testcase mới ngay dưới dòng mới nhất; kiểm chứng **29/29** workflow unit tests OK, **40/40** Playwright UI tests (`103.396s`) import xong, và live `sync --sheets` **47/47 `unchanged`** khi chạy lại.
- Rà soát & hoàn thiện vòng cuối (`2026-11-18`):
  - **Code & CI**: sửa `workflow.py` + `sheets_client.py` (chốt `state["cases"]` khi `--sheets`, giữ kết quả sẵn có nếu thiếu `latest_results`, công thức `=IF(...)` cho `Status Testing`, đặt cột theo index, khớp ID `viewpoint_table` exact boundary, parse số `vi_VN`, bounds `Overview` động, POSIX `pnpm`, xử lý `Skipped`/`Deprecated`, dùng `"Blocked"` trực tiếp, sửa `WEB-*` `A1/C7/G9/G10/C11`, reset format khi xóa hyperlink); thêm `E2E_BASE_URL: http://127.0.0.1:3000` trong `.github/workflows/testcase-workflow.yml`.
  - **3 Google Sheets & tài liệu**: dọn `SR_001` (`WEB-PRED-01/02`, `I8`), xóa `'Template\xa0'`, đưa `Report`/`Report bug` về `index=0`, chuẩn hóa 10 tab `WEB-*` (4 CF theo trạng thái, dropdown `I/J`), xóa `R5` trên `VP-API-01`, chuẩn hóa `Testcase API` (`Template`, `API-HEALTH-01`, `API-PRED-01` bỏ divider `44..67` & đổi sang `Blocked`), reset `API-PRED-01` (`K16='Not run'`, gỡ `RUN-api` cũ trong `state.json`), và đồng bộ tài liệu [README.md](../../reports/AGRI-145/README.md), [manual_e2e_test_cases.md](../../reports/AGRI-145/manual_e2e_test_cases.md), [manual_e2e_execution_guide.md](../../reports/AGRI-145/manual_e2e_execution_guide.md), [agri_test_viewpoints.md](../../notes/agri_test_viewpoints.md).
  - **Verify**: `unittest` **53/53 Pass**, `py_compile` & `run_suite.py --list` (`40` cases) OK, standalone Next.js `127.0.0.1:3199/diagnose` **HTTP 200**, full Vitest **81 files / 575 passed** (`56.97s`), `AgriVision.ApiTests` trên Docker **294/294 Pass** (`1m2s`) + `run-case API-PRED-01` (`GuestPredictionsControllerTests.InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage`) **3/3 Pass**, full Playwright UI **40/40 Pass** (`95.212s`), và `sync --sheets` đồng bộ `API-PRED-01` lên `Passed` (`Report`: `708` total / `619` pass, `87,43%`; `Report bug`: `262` total / `163` pass, `62%`, `API-PRED-01` = `Test Done 100%`). Chi tiết tại [README.md](../../reports/AGRI-145/README.md).

### [2026-11-18 19:05 +07:00] Per-case TRX/Vitest parsing & Git-backed CI state

- **Changed:** `workflow.py` thêm `parse_trx_case_results()`, `parse_vitest_case_results()`, `load_previous_cases_from_git()`, `_mark_deprecated_sheet_rows()` và bỏ chạy lặp trong `run_all()`; `.github/workflows/testcase-workflow.yml` bật `fetch-depth: 0` (`workflow-smoke`, `live-contract`, `sheets-sync`) và bổ sung `--expected-id` cho `API-PRED-01/02`, `WEB-PRED-01/02`; `test_workflow.py` thêm 6 test mới.
- **Verified:** `py_compile` pass; `unittest` **59/59 pass** (`1.210s`); PyYAML parse **7 jobs**; `workflow.py run screen` + `validate_results.py` thật ra **3/3** kết quả (`WEB-PRED-01`, `WEB-PRED-02`, `RUN-screen`, `9/9` Vitest pass trong `4.822s`).
- **Remaining:** `run_group("api")` thật với Docker chưa chạy lại lượt này (Docker Desktop đang tắt); chạy trên GitHub Actions sau khi push.

### [2026-11-18 19:13 +07:00] Config-driven Sheet layout & locale-aware formulas

- **Changed:** Chuyển tọa độ/header/công thức tab chi tiết sang cấu hình `sheets.json` qua `build_detail_summary_updates()` dùng dải mở `<col><start_row>:<col>` (bỏ cứng `1000`/`1108` và tọa độ trong Python), thêm `spreadsheet_locale()` + `formula_separator_for_locale()` chọn `,`/`;` theo locale Sheet, gom `_build_parsed_case_result()`, và bổ sung test tại `test_workflow.py` + `test_sheets_client.py`.
- **Verified:** `py_compile` pass; `unittest` **61/61 pass**; `sync --dry-run` (`47` cases) & `git diff --check` pass.
- **Remaining:** Xác nhận ghi live lên Google Sheets sau khi push CI hoặc chạy local với Service Account key.

### [2026-11-21 12:24 +07:00] Require testcase-level evidence

- **Changed:** Bỏ dùng kết quả nhóm để điền kết quả testcase và yêu cầu đủ ID bắt buộc từ registry trong CI.
- **Verified:** Ba kiểm tra hồi quy bắt được lỗi trước khi sửa. Review lại luồng runner → validator → sync, **63/63** unit tests pass.
- **Remaining:** Kiểm tra exit code khi runner thiếu report.

### [2026-11-21 12:25 +07:00] Fail when a runner report is missing

- **Changed:** Chặn exit 0 khi thiếu report và từ chối report Playwright tường minh còn sót từ lượt trước.
- **Verified:** Review lại các nhánh API, Vitest, Playwright. **65/65** unit tests pass, Vitest thật **9/9** và validator nhận **3/3** ID.
- **Remaining:** Kiểm tra mốc so sánh khi push nhiều commit.

### [2026-11-21 12:26 +07:00] Use the push baseline for deprecation

- **Changed:** CI truyền mốc trước push cho Sheets sync khi chưa có snapshot cục bộ.
- **Verified:** Review lại fixture repo nhiều commit, SHA toàn số 0 và SHA không khả dụng. **65/65** unit tests pass, `sync --dry-run` đọc **47** case. Xem [bằng chứng vòng sửa](../../reports/AGRI-145/README.md#2026-11-21-kiểm-chứng-vòng-sửa-3-finding).
- **Remaining:** Xác minh GitHub Actions và ghi–đọc lại Sheets. Refactor hướng 1 trong diff riêng.

### [2026-11-21 12:30 +07:00] Verify browser artifacts and report freshness

- **Changed:** So sánh thời gian sửa đổi để loại report cũ ngay cả khi thời gian truy cập đã đổi.
- **Verified:** Review fixture report cũ, **65/65** unit tests pass. Playwright retry **40/40** pass; validator nhận **41** bản ghi. Xem [kết quả và artifact](../../reports/AGRI-145/README.md#2026-11-21-kiểm-chứng-vòng-sửa-3-finding).
- **Remaining:** GitHub Actions, API và Live System E2E trên Docker, ghi–đọc lại Sheets, refactor hướng 1.

### [2026-11-21 13:46 +07:00] Fix findings from the pre-merge review

- **Changed:** Khôi phục quy tắc mặc định của Gitleaks, yêu cầu report cho `run-case`, tải ảnh kết quả qua `PrivateImage` và loại dòng nguồn `[Moved]` khỏi tổng active.
- **Verified:** Review lại bốn luồng. **67/67** workflow unit tests pass, Vitest `run-case` thật phân biệt khớp/không khớp selector, Gitleaks fixture và protected preview test đều pass. Xem [bằng chứng vòng sửa](../../reports/AGRI-145/README.md#2026-11-21-kết-quả-vòng-sửa-sau-review-pr).
- **Remaining:** CI trên bản sửa, API và Live System E2E với Docker, ghi–đọc lại Sheets.

### [2026-11-21 13:50 +07:00] Verify frontend and Gitleaks end to end

- **Changed:** Bổ sung kết quả vào [technical report](../../reports/AGRI-145/README.md#2026-11-21-kết-quả-vòng-sửa-sau-review-pr).
- **Verified:** **576/576** Vitest, **40/40** Playwright UI và **41** bản ghi hợp lệ. Chromium xác nhận ảnh riêng tư trả HTTP 200. Gitleaks quét **279 commit** không báo phát hiện.
- **Remaining:** Đóng gói standalone bị chặn bởi `EPERM` trên Windows. Chờ CI, Docker API/Live System E2E, ghi–đọc lại Sheets và reviewer approval.

### [2026-11-21 14:02 +07:00] Persist the published Sheets registry and exclude deprecated rows

- **Changed:** Tab ẩn giữ snapshot đã xác nhận và các vị trí Sheet đang ghi dở. Loại dòng Deprecated khỏi các số liệu active và review plan Level 2.
- **Verified:** **69/69** workflow unit tests, **9/9** Vitest và **3/3** bản ghi hợp lệ, dry-run **47/47**. Xem [bằng chứng và review plan](../../reports/AGRI-145/README.md#2026-11-21-snapshot-sheets-và-số-liệu-active).
- **Remaining:** Ghi–đọc lại snapshot trên Sheets, CI trên bản sửa, API và Live System E2E với Docker.

### [2026-11-21 14:08 +07:00] Update the Level 2 plan and capture the refactor baseline

- **Changed:** Thêm plan Level 2 đã chỉnh và dùng lại bảng tra vị trí khi tạo journal trong `sync()`.
- **Verified:** Khớp **39** chữ ký, dry-run **47** case và **11** bản ghi trace trước/sau. **69/69** unit tests và Vitest **9/9** từ cả hai thư mục. Xem [bằng chứng](../../reports/AGRI-145/README.md#chuẩn-bị-tách-module-level-2-2026-11-21).
- **Remaining:** Giai đoạn dời module, CI trên bản sửa, API và Live System E2E với Docker, ghi–đọc lại Sheets.

### [2026-11-21 14:17 +07:00] Extract Level 2 workflow modules and verify parity

- **Changed:** Tách registry/state, Sheets và runner, dời test về module sở hữu, cập nhật CI discovery và bỏ hai helper đọc cột không còn caller.
- **Verified:** **69/69** unit tests sau từng bước, **9/9** Vitest từ cả hai thư mục và **40/40** Playwright UI. Khớp baseline ở **39** chữ ký, dry-run **47** case và **11** bản ghi trace Sheets. Xem [kết quả Level 2](../../reports/AGRI-145/README.md#2026-11-21-kết-quả-thực-thi-level-2).
- **Remaining:** CI trên commit mới, API và Live System E2E với Docker, ghi–đọc lại Sheets và approval.

### [2026-11-21 17:43 +07:00] Complete testcase workflow pre-commit review

- **Changed:** Tách module Sheets và parser, chặn rerun cũ, xử lý report lỗi, sửa an toàn tab mẫu và phục hồi testcase. Cập nhật Next.js lên 16.4.5 để qua build.
- **Verified:** **82/82** unit tests × **3**, **294/294** API, **2/2** live contracts, **576/576** Vitest, **40/40** Playwright, **49** bản ghi qua validator và **47/47** ID Sheets đúng tab. [Report và ảnh bằng chứng](../../reports/AGRI-145/README.md#kiểm-tra-trước-commit)
- **Remaining:** Chờ duyệt report trước commit. CI trên commit mới, full Live System E2E và ghi–đọc lại Sheets thật còn chờ nghiệm thu.

## Còn lại

- GitHub run `43570450037` pass toàn bộ jobs trước đó; cần chạy CI Ubuntu sau khi push/PR cho vòng sửa `AGRI-145` cuối; viewpoint chưa có runner tự động.
- Vấn đề `/history` chạm rate limit `429` khi tải nhiều thumbnail (`PrivateImage.tsx` eager `useEffect` fetch + `StorageTrafficLimits.cs` `PermitLimit=8`) đã ghi nhận thành follow-up Jira ngoài phạm vi `AGRI-145`.
