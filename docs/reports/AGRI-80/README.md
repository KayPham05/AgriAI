# AGRI-80 - Create CRM Admin Page

## Generated Next.js type imports - 2026-10-15

User explicitly requested committing the previously excluded `frontend/next-env.d.ts`. Its two generated imports now reference `.next/types/` instead of `.next/dev/types/`. The installed Next.js generator (`frontend/node_modules/next/dist/lib/typescript/writeAppTypeDeclarations.js`) derives these imports from `distDir`; `frontend/tsconfig.json` already includes both locations. No application runtime, API or database behavior changes. Next dev/build may regenerate this tracked file and create working-tree noise for collaborators.

Fresh checks for this follow-up: `corepack pnpm --dir frontend typecheck` and `git diff --check` passed. No new build, application tests, coverage or GitHub Actions run; preceding evidence remains historical. Commit scope includes this file and the required report/task-log update. No push. Overall AGRI-80 DoD remains incomplete.

## Main synchronization — 2026-10-15

Merged remote main `5eecebf` into local AGRI-80 without conflicts. Kept upstream CI smoke path fix and dataset v1.4 ignores; aligned the Docker command guide. Fresh Compose base/CI validation, actionlint, CI helper tests, real FastAPI smoke and existing-stack web/API/proxy/DB/AI checks pass. Application source is unchanged; broader mapping/CI acceptance remains incomplete. Generated next-env.d.ts preserved unstaged; no push. See [ongoing main merge report](main_merge_2026_10_13.md) and [sync task log](../../task-logs/AGRI-80-main-sync.md).


## Commit preparation — 2026-10-15

Feature commit: `b9244c5` (`feat(admin): AGRI-80 add account and image administration`). Fresh pre-commit checks: frontend 188/188, backend 33 unit + 40 PostgreSQL integration; full frontend lint/format/typecheck pass. The two formatting failures below were resolved during commit preparation. Report and task log retain the earlier audit snapshots and remaining mapping/CI limits. Generated `frontend/next-env.d.ts` is intentionally excluded and preserved unstaged. No push or new remote CI result.


## Mapping/test/CI audit — 2026-10-15 (fresh evidence)

DoD remains incomplete. [Full audit](frontend_backend_ci_audit_2026_10_15.md): frontend 188/188 with 2 workers, branch 58.97%; backend 33 unit + 40 PostgreSQL integration, merged 61.43%; Python 65/65 in Docker. Build/typecheck/lint/actionlint pass; format fails on 2 existing files. Python coverage unavailable; no GitHub run found for this branch. Prediction DTO/guest/history gaps and missing CI format/browser E2E gates remain. This updates test evidence only; prior implementation snapshots below remain historical.


## Tổng hợp hiện trạng để bàn giao — 15/10/2026

**Nhánh đã đối chiếu:** `AGRI-80-create-crm-admin-page`. **Trạng thái:** đã triển khai và kiểm chứng trên môi trường Docker local; chưa xác nhận hoàn thành DoD/Jira, GitHub Actions hoặc nghiệm thu production. Bản tổng hợp này mô tả kết quả cuối cùng; các mục lịch sử bên dưới giữ lại tiến trình và có thể mô tả hành vi đã bị thay thế.

### Đã làm được

| Hạng mục | Hành vi hiện tại | Report chi tiết |
| --- | --- | --- |
| Đăng nhập và phân quyền | Admin vào `/admin`, User vào `/home`; API quản trị kiểm tra quyền ở backend. Admin chờ hiệu ứng logo/lời chào hoàn tất rồi chuyển trang. | [Mapping đăng nhập](admin_login_mapping_2026_10_14.md), [sửa hiệu ứng thành công](admin_login_entrance_2026_10_15.md) |
| Quản lý người dùng | Danh sách thật, tìm kiếm/phân trang; khóa, khôi phục, cảnh báo trong ứng dụng, cưỡng chế đăng xuất toàn bộ phiên. Tài khoản Admin được bảo vệ khỏi các thao tác quản lý tài khoản này. | [Quản lý tài khoản và ảnh](admin_moderation_2026_10_15.md) |
| Quản lý ảnh | Xem ảnh/thông tin người đăng, gửi cảnh báo cho chủ ảnh, xóa qua storage sau xác nhận; giữ kết quả/lịch sử dự đoán. Có trạng thái ảnh hết hạn/đã xóa. | [Quản lý tài khoản và ảnh](admin_moderation_2026_10_15.md) |
| Phiên và thông báo | Thu hồi phiên được kiểm tra ở backend; cảnh báo có trạng thái đọc/ẩn lưu trong DB. Web kiểm tra mỗi15giây và khi focus, không phải websocket thời gian thực. | [Luồng phiên và thông báo](admin_moderation_2026_10_15.md) |
| Tổng quan | Tổng số thật; ba biểu đồ hoạt động7ngày theo UTC+7, bảng số liệu chi tiết, lịch tháng có điều hướng, ảnh/phiên gần đây. Không suy ra tổng số từ một trang danh sách. | [Lịch và biểu đồ](admin_calendar_charts_2026_10_15.md), [dashboard](admin_dashboard_2026_10_15.md) |
| Thanh điều hướng cuối cùng | Tách riêng20px; mặc định72px chỉ icon, hover/focus mở224px có chữ; rời cả chuột và focus thì thu gọn. Đã bỏ nút mở/đóng ở header; mobile dùng Sheet. | [Hover/focus](admin_hover_rail_2026_10_15.md) |
| Mật độ giao diện | Thu gọn khoảng đệm, thẻ và lịch; giữ nút tối thiểu44px. Tại1280x900: thẻ388→276px, lịch441→297px. Giữ màu/font và cập nhật DESIGN.md. | [Bố cục gọn](admin_compact_density_2026_10_15.md) |
| Runtime local | Đã sửa checkpoint bind mount của Docker Desktop, áp dụng migration riêng sau backup; đổi mật khẩu Admin hiện có từ cấu hình theo yêu cầu. Sửa `.env` không tự đồng bộ mật khẩu trong DB. | [Runtime và mật khẩu](runtime_startup_2026_10_14.md) |

### Kiểm chứng đã ghi nhận, không phải chạy lại khi viết tổng hợp

| Phạm vi | Kết quả và nguồn |
| --- | --- |
| Frontend gần nhất |188/188tests,28files; typecheck, lint160files và production build đạt trong lần sửa hiệu ứng đăng nhập. [Nguồn](admin_login_entrance_2026_10_15.md) |
| Backend gần nhất |33unit +40integration PostgreSQL đạt ở lần bổ sung API hoạt động theo ngày. Không chạy lại backend ở các thay đổi UI sau đó. [Nguồn](admin_calendar_charts_2026_10_15.md) |
| Thao tác quản trị | Đã thử trên tài khoản/ảnh fixture riêng: cảnh báo, khóa/khôi phục, cưỡng chế đăng xuất, xóa ảnh vật lý local và giữ lịch sử; đã dọn fixture. [Nguồn](admin_moderation_2026_10_15.md) |
| Trình duyệt | Chromium local kiểm tra desktop/tablet/mobile, hover/focus, giảm chuyển động; đăng nhập Admin thật ở1280px và khôi phục ở375px đã thấy hiệu ứng trước khi vào admin. Chi tiết theo từng report, không gộp thành chứng nhận thiết bị thật. [Nguồn](admin_hover_rail_2026_10_15.md), [nguồn đăng nhập](admin_login_entrance_2026_10_15.md) |

### Phần còn lại và giới hạn bàn giao

- Chưa có kết quả CI mới hoặc số đo coverage mới; các số coverage cũ không đại diện cho trạng thái hiện tại.
- Whole-project format từng còn2file WIP ngoài phạm vi: `frontend/src/App.routing.test.tsx`, `frontend/src/services/authApi.test.ts`. Chỉ khẳng định format các file đã sửa đạt.
- Chưa nghiệm thu suy luận checkpoint thật toàn luồng, chất lượng mô hình, Cloudinary private access/xóa ảnh private hoặc nhiều trình duyệt/thiết bị vật lý. Xem giới hạn theo từng report.
- Chưa kiểm tra độ bền của E: mount sau khi khởi động lại Docker/Windows; backup đã kiểm tra danh mục nhưng chưa diễn tập restore.
- Không chứa mật khẩu/token/hash trong báo cáo. File QA, screenshot và backup nằm trong `.cache/` bị Git bỏ qua; nguồn kiểm chứng cục bộ được ghi đường dẫn trong report.
- Đợt chỉnh sửa local này chưa staging/commit/push/PR; không tự đánh dấu Jira Done. Owner/reviewer/PR không được suy đoán từ hội thoại.

### Điểm vào mã nguồn

- UI: `frontend/src/features/admin/`, `frontend/src/app/(admin)/admin/`; xác thực/hiệu ứng ở `frontend/src/providers/AppProvider.tsx`, `frontend/src/components/common/LoginSuccessScreen.tsx`.
- API: `backend/src/AgriVision.API/Controllers/AdminController.cs`, `NotificationsController.cs`; persistence ở `backend/src/AgriVision.Infrastructure/Persistence/Repositories/AdminRepository.cs` và các repository phiên/thông báo.
- Migration đã thêm trong đợt tích hợp: `20261013063941_LoginSessions`, `20261014164729_AdminModeration`. Chạy migration riêng bằng `--migrate`; không xóa volume hoặc sửa lịch sử migration.
- Quy tắc giao diện: [DESIGN.md](../../../DESIGN.md). Nhật ký thực hiện: [task log AGRI-80](../../task-logs/AGRI-80-create-crm-admin-page.md).

## Nhật ký report theo từng đợt (giữ nguyên lịch sử)


Latest login fix2026-10-15: Admin now waits for the existing success entrance callback before /admin; catalog/history still skipped for Admin. Fresh/restored tests RED then GREEN; full188/188frontend, typecheck/lint/build PASS; real Chromium login1280/restored375/reduced-motion768 PASS. See [Admin login entrance evidence](admin_login_entrance_2026_10_15.md). DESIGN.md updated.

Latest density follow-up2026-10-15: compact overview spacing/type/chart/calendar/account sizing. Measured1280x900 metric388→276px and calendar441→297px; controls retain44px. Relevant20/20admin/calendar tests, typecheck/lint/changed format/build PASS; Chromium1280/768/375 PASS. See [compact density evidence](admin_compact_density_2026_10_15.md). DESIGN.md updated; no new full-suite/backend/coverage/CI claim.

Latest interaction follow-up2026-10-15: removed header toggle; rail expands on mouse/pen hover or keyboard focus, compacts when both leave, retaining mobile Sheet. Frontend186/186/typecheck/lint/changed format/build PASS; Chromium1280/1024/768/375, hover/focus/8rapid pointer cycles/reduced-motion PASS. See [hover/focus rail](admin_hover_rail_2026_10_15.md). DESIGN.md updated; earlier button behavior is historical.

Latest user correction2026-10-15: desktop now defaults to72px usable icons and expands to224px with full icon/text rows, rather than hiding the whole rail. Detached gap/motion, mobile Sheet and current view/filter retained; DESIGN.md corrected. Frontend185/185/typecheck/lint/build PASS; live Chromium1280/1024/768/375, keyboard/rapid keyboard toggles/reduced-motion PASS. See [icon rail correction](admin_icon_rail_2026_10_15.md). Earlier hide-entire-rail entry is historical.

Latest navigation follow-up2026-10-15: detached112px floating rail with20px gap and animated close/open, reclaiming132px while preserving current view/filter and accessible focus; mobile Sheet retained. DESIGN.md updated. Frontend185/185, typecheck/lint/changed format/build PASS; live Chromium1280/1024/768/375, rapid toggles, inert/keyboard/sticky and reduced-motion PASS. See [detached rail implementation and evidence](admin_detached_rail_2026_10_15.md). No new backend/coverage/CI certification.

Latest calendar/chart follow-up2026-10-15: visible monthly calendar with previous/next/today and three real seven-day activity charts (UTC+7), lifetime totals retained, exact daily tables, empty/error/retry states; palette preserved and DESIGN.md updated. Frontend184/184, backend33unit/40integration, typecheck/lint/changed-file format and production builds PASS; live Chromium1280/768/375 with US timezone, keyboard, API comparison and503retry PASS. See [calendar/chart implementation and evidence](admin_calendar_charts_2026_10_15.md). Coverage/CI and earlier unrelated formatting findings are not newly certified.

Latest dashboard follow-up2026-10-15: user reference interpreted as a floating frame/compact rail, real summary/recent-image/session panels and scoped reduced-motion-aware entry/hover effects, preserving colors and moderation. DESIGN.md updated with admin rules/tokens. Frontend180/180tests, final14/14admin tests, typecheck/lint/changed-file format and Docker build PASS; live Chromium1280/768/375 and full fixture moderation regression PASS. See [dashboard implementation and evidence](admin_dashboard_2026_10_15.md). Two unrelated whole-project format findings remain; coverage/CI not rerun.

Latest management scope (work started2026-10-14, verified2026-10-15): implemented account lock/restore, all-session revocation, persisted in-app warnings, image warnings/deletion with retained prediction history, and removed visible CRM branding. Deployed locally after backup/migration. Frontend178/178, backend33unit/39integration PASS; live Chromium exercised all moderation actions against an isolated fixture and checked1280/768/375 layouts. See [management implementation and evidence](admin_moderation_2026_10_15.md). Earlier read-only/shell limits below are historical. Coverage/CI/cloud deletion are not newly certified; two unrelated frontend files still fail whole-project format.

Latest UI follow-up2026-10-14: desktop/mobile `Về ứng dụng` replaced with backend-connected `Đăng xuất`; API session revocation, browser storage cleanup and return to login verified at1280/768/375. Frontend173/173 tests/typecheck/lint/changed-file format/Docker build PASS. See [logout follow-up](admin_login_mapping_2026_10_14.md).

Latest verification 2026-10-14: Admin login/restoration at `/` now opens `/admin`; User login opens `/home`. Existing authenticated CRM APIs supply summary/users/images/sessions. All 170 frontend tests, typecheck, lint and Docker frontend build passed. Live Chromium confirmed both roles, CRM API lists, reload and mobile navigation; anonymous/admin API access returned 401 and regular User returned 403. See [admin login mapping](admin_login_mapping_2026_10_14.md). Whole-project format still flags 13 pre-existing WIP files; changed-file format passed. Earlier incomplete-shell entries below are historical.

Admin password follow-up 2026-10-14: after fresh backup, reset the existing admin password from the newly saved `.env` value; web-proxy login, current-user Admin role and protected summary passed. `.env` edits do not automatically reset database passwords. See [follow-up evidence](runtime_startup_2026_10_14.md).

Runtime repair 2026-10-14: restored Docker Desktop WSL's missing E: mount, recreated AI and applied LoginSessions after database backup. All four Compose services healthy; real AI HTTP smoke and web HTTP 200 passed. See [runtime repair evidence](runtime_startup_2026_10_14.md). Full CRM/model-quality acceptance remains separate.

Branch: `AGRI-80-create-crm-admin-page`.

Latest scope correction2026-10-13: support requests were removed. The frontend now contains only user accounts, uploaded images and account login sessions, with overview links and unconnected empty states. Private admin API integration and server authorization remain pending; this is not yet working database-backed management. Latest verification is recorded in the scope-correction section of [the technical report](admin_crm_ui.md); earlier runs below are historical.

Latest scope-correction checks:165/165 frontend tests26files PASS; typecheck, strict lint147files, format147files and production build PASS. Chromium375/768/1280 navigation/empty states PASS, no API calls or document horizontal overflow. Coverage was not rerun; do not treat earlier percentages as current measurements.

Current state after user correction2026-10-13: clean CRM shell with no synthetic records or local save simulation, waiting for real API integration. Metrics show unavailable values rather than invented counts. Production CRM acceptance remains incomplete. See [implementation and verification](admin_crm_ui.md). No real CRM API, private account access or admin authorization is claimed.

Historical preview verification2026-10-13 before records were removed: strict lint/format/typecheck and production build PASS;167/167 tests26files PASS, branch703/1252=56.15% above25% floor; Chromium375/768/1280 PASS. Current cleanup checks are recorded separately in the report. The80% per-component target and full CI/CD are not certified. Changes remain uncommitted.

Current clean-shell verification:164/164tests26files, branch664/1205=55.10%>=25%, lint/format/typecheck/build and production Chromium375/768/1280 PASS. No real CRM API/database access or automatic population is implemented.

Related source: `frontend/src/app/(admin)/admin/page.tsx`, `frontend/src/features/admin/`. Task log: [AGRI-80](../../task-logs/AGRI-80-create-crm-admin-page.md).
