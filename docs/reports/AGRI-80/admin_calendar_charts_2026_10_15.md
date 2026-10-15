# AGRI-80 - Visible calendar and daily metric charts (2026-10-15)

Branch: AGRI-80-create-crm-admin-page. The user requested an expanded calendar and charts for the three overview metrics. Implemented and deployed locally, preserving palette and typography. This entry supersedes the static-date/no-chart limitation of the preceding dashboard report for this scope.

## Behavior and contracts

- The right context column now starts with an always-visible monthly calendar. Monday-first headings, complete month, leap-year/year-boundary handling, previous/next and today controls, politely announced month heading, and semantic today marker. Day cells are a read-only month reference. Removed the former date-only account footer; no appointment storage or activity-date filtering is implied.
- The three cards retain lifetime totals and add seven-day column plots for new accounts, images uploaded by accounts and login sessions created. Each chart has a visible daily maximum, first/last date, independent zero-based scale, explicit no-activity state and an expandable keyboard-accessible table of all seven exact counts. No fake trends, percentages or minimum-height bars. Failed activity loading does not replace totals with zeros; a retry recovers the shared request.
- GET /api/admin/activity uses the existing CurrentAdmin policy and no-store controller behavior. Returns timeZone=Asia/Ho_Chi_Minh and exactly seven ordered date/userCount/imageCount/sessionCount records: today plus six previous Vietnam days. UTC+7 boundaries are shared with the calendar regardless of browser timezone.
- PostgreSQL aggregates bounded timestamp projections in three grouped queries, not paged directory responses or downloaded event rows. Retained deleted/expired account-owned images and ended sessions count as events; anonymous prediction images are excluded consistently with existing summary semantics. Missing days are filled with0. Totals and daily events are separate measures; sessions do not mean concurrent online users.
- No database schema/migration, seed, AI/model, public route, dependency or palette change. Uses installed Card/Button primitives and native table/details display. Calendar dates are non-interactive; month controls retain44px targets. Chart bars are static; existing scoped entrance/reduced-motion behavior remains.
- DESIGN.md records the calendar/chart contract and six chart tokens. Geometry from data is expressed as relative bar heights; fixed visual values live in the token layer.

## Affected paths

- backend/src/AgriVision.API/Controllers/AdminController.cs
- backend/src/AgriVision.Application/Common/Interfaces/Persistence/IAdminRepository.cs
- backend/src/AgriVision.Application/DTOs/Admin/AdminDtos.cs
- backend/src/AgriVision.Infrastructure/Persistence/Repositories/AdminRepository.cs
- backend/tests/AgriVision.IntegrationTests/Controllers/AdminControllerTests.cs
- frontend/src/services/adminApi.ts
- frontend/src/features/admin/AdminCalendar.tsx and AdminCalendar.test.tsx
- frontend/src/features/admin/AdminMetricChart.tsx
- frontend/src/features/admin/AdminOverview.tsx, AdminOverviewPanels.tsx, AdminCrmPage.test.tsx
- frontend/src/index.css, DESIGN.md, report index and AGRI-80 task log.

## Fresh checks and evidence

- Observed RED before adding the activity endpoint/three charts/calendar, followed by GREEN. New frontend checks cover full leap month, previous/next/year rollover/today, authenticated daily chart data and loading-error retry with lifetime totals retained.
- A PostgreSQL fixture initially violated the existing expires_at > uploaded_at check; fixed fixture expiry and unique image positions, without weakening constraints or changing application behavior.
- Filtered admin integration:7/7 PASS, including seven Vietnam-day boundaries, out-of-window timestamps,12 image events beyond one page, retained deleted images, anonymous exclusion, ended sessions and401/403 access checks.
- Complete backend solution:33/33unit and40/40integration PASS,0skipped. TRX evidence: .cache/admin-verification/calendar-charts/GIGABYTE_THONGDZ_2026-10-15_00_40_47.trx (unit) and ..._00_40_46.trx (integration). Integration duration1m15s.
- Complete frontend final run:184/184tests,27files PASS,59.19s. An earlier concurrent build/backend/frontend run had one existing notification startup wait timeout (183pass/1fail). The unchanged startup file then passed separately7/7 and the entire final suite passed; no timeout increase or unrelated test edit.
- Final typecheck PASS; strict lint158files PASS; changed admin/API/CSS format16files PASS; git diff --check PASS (existing line-ending notices only). Whole-project format was not rerun here; prior two unrelated WIP formatting findings are not claimed fixed.
- Docker backend/frontend production builds PASS. Recreated locally with no-deps; all four Compose services healthy after deployment. Database volumes/history preserved.
- Chromium checks1280/768/375 PASS: visible complete calendar, month navigation/today via keyboard, exact seven-day chart tables matched live API, zero bars physically0px, no horizontal overflow/page errors. Browser timezone deliberately America/Los_Angeles while calendar/API remained Vietnam. Intercepted503 for the activity request verified totals remain and retry recovers; no database mutation for that simulation. Reduced-motion loaded without entry transform.
- Visual desktop/tablet/mobile review completed. Ignored evidence: .cache/admin-verification/calendar_charts_review.py and calendar_charts_{1280,768,375}.png. Browser harness creates/ends only its own admin login session; no real account/image moderation was performed.

The server-side time-zone translation was checked against the [official Npgsql translation reference](https://www.npgsql.org/efcore/mapping/translations.html); actual PostgreSQL integration tests establish the implementation behavior here.

## Remaining limits

No new coverage measurement, GitHub Actions result, physical-device/cross-browser acceptance, model-quality or Cloudinary private-storage certification. Charts are seven-day summaries and the calendar is a monthly reference; no scheduler, date-linked query, appointments or real-time stream is added. Existing unrelated WIP is retained. No staging, commit or push.
