# AGRI-145 — Kế hoạch triển khai E2E frontend

## Mục tiêu

Triển khai các ca trong `docs/reports/AGRI-145/frontend_e2e_test_specification.md` bằng Playwright, phân biệt rõ browser UI test dùng mock với E2E đi qua Web → API → PostgreSQL/AI.

## Trình tự thực hiện

1. **Chốt hợp đồng và dữ liệu**
   - Đối chiếu route, selector và API payload với source hiện tại.
   - Tạo dữ liệu synthetic cho guest, user, admin, prediction, profile, catalog và session.
   - Chuẩn bị reset DB/seed theo test để mỗi case độc lập.

2. **Thiết lập fixture**
   - Tạo `storageState` cho guest/user/admin.
   - Dùng fixture tạo và dọn dữ liệu theo test; không dùng tài khoản thật, secret, upload thật hoặc dataset ngoài phạm vi.
   - Chỉ mock AI/storage ở các case lỗi hoặc case UI được đánh dấu rõ; case persistence phải dùng service thật.
   - Duy trì runner system riêng `frontend/tests/browser/e2e/live_smoke.py` để kiểm chứng live API proxy và AI; không trộn route interception vào runner này.
   - Dùng các live runner tách biệt cho authenticated diagnosis, account/profile, agricultural profile, Admin Users và Admin catalog; mỗi runner phải tạo dữ liệu test cô lập và dọn dữ liệu sau khi xác minh persistence.
   - Dùng Mailpit trong `docker-compose.e2e.yml` cho OTP/reset/2FA; không dùng mailbox production và không ghi credential test vào Git.

3. **Triển khai theo lớp ưu tiên**
   - P0: Auth, guest/authenticated diagnosis, history isolation, admin access, admin overview/date filter.
   - P1: Password recovery UI, profile, diagnosis confidence/error/retry, agricultural profile, public catalog, homepage navigation/sections, admin users/images/sessions/catalog publication.
   - P2: Diagnosis validation, history pagination/empty, catalog loading/error/empty, responsive/404, About page, homepage reduced-motion.

4. **Triển khai Admin**
   - Tách spec theo view: Overview, Users, Images, Sessions, Plants, Diseases, Medicines, Knowledge.
   - Bao phủ search/clear/empty/page reset, date filter, responsive rail, lock/restore/logout-all, warning/delete và publication lifecycle.
   - Xác nhận thao tác với bản ghi khác không làm mất phiên Admin hiện tại.

5. **Triển khai các phạm vi bổ sung**
   - `E2E-AUTH-07`: dùng email/OTP emulator hoặc test adapter được kiểm soát; không phụ thuộc hộp thư thật.
   - `E2E-HIST-06`: chạy với dataset 0, 1 và nhiều bản ghi; kiểm tra empty state, 1 mẫu và danh sách nhiều mẫu.
   - `E2E-SYS-04`: xác nhận route `/about`, metadata cơ bản và link quay lại.
   - `E2E-HOME-01..04`: tái sử dụng các script homepage hiện có, bổ sung assert route, overflow và reduced-motion.

6. **Kiểm chứng từng case**
   - Mỗi case có ID ổn định, precondition, dữ liệu vào, request/assertion UI và hậu kiểm persistence.
   - Gắn testcase ID vào registry `tools/testcase-workflow/config/cases.json` và `playwright.case_ids` sau khi test chạy ổn định.
   - Không gọi là system E2E nếu route API bị intercept toàn bộ.
   - Chạy live smoke trước mỗi nhóm chuyển đổi để xác nhận Docker stack và API proxy còn hoạt động.

7. **Chạy và báo cáo**
   - Chạy Playwright theo viewport desktop/tablet/mobile và reduced-motion khi phù hợp.
   - Chạy riêng smoke, P0, full suite; lưu artifact, trace/screenshot khi fail.
   - Chạy `git diff --check`, test workflow và kiểm tra không có secret/generated artifact.
   - Cập nhật `docs/reports/AGRI-145/README.md` với số liệu thực tế, giới hạn môi trường và các case chưa chạy.

## Tiêu chí hoàn tất

- Mọi ID P0 có test chạy được và assertion nghiệp vụ/persistence rõ ràng.
- Các ID trong ma trận có phân loại rõ giữa automated UI/browser test, system E2E (Blocked nếu thiếu backend/DB/AI) và Manual; không gắn pass cho case chưa chạy.
- Homepage, About, pagination/empty và danh mục công khai có test riêng, không chỉ suy ra từ test route khác.
- Admin có coverage tự động cho quyền truy cập, Overview, Users, Sessions và Catalog publication (`E2E-ADM-01..04,06,07`); Admin Images (`E2E-ADM-05`) tách riêng sang bộ Manual E2E.
- Mỗi ca được phân loại đúng giữa UI/browser test và system E2E.
- Không ghi nhận test pass nếu chỉ có mock hoặc chưa chạy qua môi trường phụ thuộc.

## Trạng thái thực hiện (2026-11-16)

### Đã hoàn tất (Browser UI / Playwright với API double có kiểm soát & Live System E2E)
- Đối chiếu route, selector, payload và sai khác thực tế trong `frontend/src` (cập nhật trong `docs/reports/AGRI-145/frontend_e2e_test_specification.md`).
- Xây dựng suite Python Playwright dùng chung tại `frontend/tests/browser/e2e/` (`support.py`, `run_suite.py`, 7 file `test_*.py`) gồm **40 ca automated UI/browser test**:
  - P0 (13 ca): `E2E-AUTH-01..03`, `E2E-PROF-01`, `E2E-DIAG-01..03`, `E2E-HIST-01,02`, `E2E-PROF-AGRI-01`, `E2E-CAT-01`, `E2E-ADM-01,02`.
  - P1 & P2 (27 ca): `E2E-AUTH-04..07`, `E2E-PROF-02..04`, `E2E-DIAG-05,07`, `E2E-HIST-03,06`, `E2E-PROF-AGRI-02,03`, `E2E-CAT-02..04`, `E2E-ADM-03,04,06,07`, `E2E-SYS-01,02,04`, `E2E-HOME-01..04`.
- Tích hợp 40 ID vào `tools/testcase-workflow/config/cases.json` và `groups.playwright.case_ids` trong `test-groups.json`, bổ sung test kiểm tra tính nhất quán trong `test_workflow.py`.
- Xác minh chạy pass local: P0 **13/13**, Full automated browser UI **40/40**, 8 script live hoàn tất theo runner cũ, Vitest **81 files / 575 tests**, workflow unit tests **27/27**.

### Phân tách Automated E2E & Manual E2E
- **Browser UI tự động (40 ca):** đặc tả riêng tại `docs/reports/AGRI-145/frontend_e2e_test_specification.md`, đồng bộ đúng 40 mã trong `frontend/tests/browser/e2e/`, `tools/testcase-workflow/config/cases.json` và `test-groups.json` (`run_suite.py` thực thi từng ID với ApiStub; `run_live_suite.py` báo cáo các hành trình Docker riêng).
- **Manual E2E (10 ca):** tách riêng hoàn toàn từ tài liệu đến code tại `docs/reports/AGRI-145/manual_e2e_test_cases.md` (`E2E-DIAG-04,06,08`, `E2E-HIST-04,05`, `E2E-PROF-AGRI-04,05`, `E2E-CAT-05,06`, `E2E-ADM-05`), không đưa vào code/config automation.
