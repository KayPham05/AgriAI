# AGRI-80 - Admin login and backend mapping - 2026-10-14

## Follow-up: replace website link with logout

User requested replacing the sidebar's `Về ứng dụng` action with `Đăng xuất`. Updated `AdminCrmPage.tsx` in desktop sidebar and mobile Sheet, reusing Button styling and a LogOut icon. Both call existing `POST /api/auth/logout`, disable while pending, clear local/session storage on success and replace the route with `/`. Failed logout keeps the session and shows a retryable error instead of claiming the server session ended. No backend/schema/credential changes.

Three regression cases (desktop, mobile, API failure/retry) failed before implementation because no logout button existed. Final full frontend suite: 173/173 tests, 26 files, 58.54s PASS; typecheck, strict lint150files and changed-file format PASS. Docker frontend production build PASS and deployed to localhost:3000. Whole-project format was not rerun; earlier unrelated formatting findings below remain outstanding.

Live Chromium at1280/768/375: logout button visible, old website link absent, no horizontal overflow; API204, both browser auth stores cleared, returned to login, old token rejected by `/api/auth/me` with401, no page errors. Desktop/mobile captures inspected. Harness: ignored `.cache/admin-verification/admin_logout.py`; captures `admin_logout_<width>.png` in the same directory. Early harness runs raced page initialization or timed out on an additional hard navigation after logout; final harness waits for anonymous initialization and Sheet animation, and validates actual logout by login UI, empty storage and revoked token. Additional post-logout hard navigation is not certified by the final run. No timeout weakening or product workaround. No new coverage, backend-suite or GitHub CI claim. No staging/commit/push.

Branch: `AGRI-80-create-crm-admin-page`. User requested backend-connected admin pages and automatic entry after admin login. This login/read-only mapping scope is verified locally; full CRM management, full accessibility, model quality and GitHub CI acceptance are not established.

## Behavior and affected paths

`frontend/src/providers/AppProvider.tsx` previously started catalog/history loading for every authenticated account, then defaulted to `/home`. It now checks the backend-provided role before those user startup requests: Admin login or restored Admin session at `/` redirects to `/admin`. User login remains `/home`; existing user deep links and Admin's explicit return to `/home` remain available. There is no frontend role promotion or authorization bypass.

The existing WIP already connected `frontend/src/features/admin/` through `frontend/src/services/adminApi.ts` to `/api/admin/summary`, `/users`, `/images` and `/sessions`, using the bearer token. `AdminAccess` restores the session against `/api/auth/me`; `backend/src/AgriVision.API/Controllers/AdminController.cs` enforces `CurrentAdmin`. Reused these paths without rewriting them. No backend/schema/password changes in this follow-up.

`frontend/src/App.startup.test.tsx` adds regression coverage for restored Admin, fresh Admin and fresh User login, including skipping user catalog/history requests for the Admin landing. Tests use the actual form and CAPTCHA with authentication/network boundaries mocked.

## Fresh verification

- RED: two Admin cases failed before implementation because `/admin` was never requested; fresh User and existing startup cases passed.
- GREEN: `corepack pnpm test --maxWorkers=1`: 170/170 tests, 26/26 files passed, 42.33 seconds. Includes existing admin records, denied role, paging, session and API-error tests.
- `corepack pnpm typecheck` passed. `corepack pnpm lint` passed for 150 files. Biome format passed for both changed source/test files.
- Whole-project format is not passing: 13 pre-existing WIP files have formatting/line-ending findings: `src/App.routing.test.tsx`, `src/app/(admin)/admin/page.tsx`, the nine admin feature/service paths listed below, and `src/services/authApi.test.ts`/`authApi.ts`. Exact admin paths: `AdminAccess.tsx`, `AdminCrmPage.test.tsx`, `AdminCrmPage.tsx`, `AdminImages.tsx`, `AdminOverview.tsx`, `AdminRecordList.tsx`, `AdminSessions.tsx`, `AdminUsers.tsx` under `src/features/admin/`, plus `src/services/adminApi.ts`. Left their existing contents intact.
- Initial full-suite run had one existing lint-rule test exceed its 5000ms timeout during concurrent lint execution; the lint process also saw the test's transient probe file. Sequential full rerun passed without weakening timeouts/rules or editing the probe test. Own test lint findings (conditional hook naming/non-null assertion) were corrected before the final run.
- `docker compose build frontend` passed (production compilation, TypeScript, 11 static pages and two dynamic routes). `docker compose up -d --no-deps frontend` deployed it to localhost:3000; all four services healthy. No local Next build changed `next-env.d.ts` in this follow-up.
- Real headless Chromium against localhost:3000: form login with configured admin password redirected to `/admin`; summary and all three lists returned real backend data successfully; reload, explicit return to website and restored Admin landing passed. 375px CRM navigation passed without horizontal document overflow; no page errors. Anonymous API request returned 401.
- A temporary User fixture registered through the real API, logged in through the real form and reached `/home`. Its admin API request returned 403; `/admin` displayed denied access. Logged out verification sessions and deleted only that newly created fixture by exact UUID/email; cleanup returned DELETE 1. Existing accounts/roles/passwords were preserved.
- First browser run used a menu button hidden on desktop and timed out after the admin list/reload steps. Corrected only the harness to use visible desktop navigation; full rerun passed.
- Ignored harness: `.cache/admin-verification/admin_login_mapping.py`; mobile capture: `.cache/admin-verification/admin_mapping_mobile.png`. No credentials/tokens were written to artifacts or output. No coverage measurement, backend suite rerun or CI result is claimed. `git diff --check` passed before handoff.

## Remaining scope

CRM currently reads accounts, uploaded-image metadata and login sessions; this work does not add account editing/deletion, image retention scheduling or extra management actions. Historical reports about the earlier public shell remain historical. No staging, commit or push.
