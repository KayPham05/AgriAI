# AGRI-57 — Next.js URL navigation

Date: 2026-10-09. Verified branch: `AGRI-57-frontend-summary`.

## Scope

User requested real URLs for the existing screens. No redesign, dependency changes, backend/database changes, inference, commit or push.

- `frontend/src/app/(website)/layout.tsx` keeps App mounted across Next route transitions, preserving session/catalog/history state.
- Ten page entries render the shared client `AppRouteView`: introduction, home, diagnose, plant list/detail, disease list/detail, history, about and profile. The existing views still live in App's route-content context; this is an incremental migration, not a complete per-page bundle/data-loading refactor.
- `frontend/src/lib/appRoutes.ts` maps the URL to a tab/detail identity and encodes outgoing detail IDs. App derives selection rather than maintaining competing tab/detail state.
- Existing action buttons call `router.push`; back-to-catalog controls use the catalog URL. Browser history changes are read by `usePathname`. Detail resolution accepts local IDs and corresponding backend IDs; an unknown ID displays an explicit missing-item state rather than a list.
- Session restore preserves direct links. Guests are sent to introduction; the shared shell retains the requested path for the next login. Successful root login/restore defaults to `/home`; logout replaces the route with `/`. UI gating is not a replacement for backend authorization.
- Authentication and history-detail dialogs remain overlays. API rewrites, storage keys, startup requests, CSS tokens and GSAP behavior are unchanged. DESIGN.md records the approved URL migration.

## Verification

- TDD: initial App routing run failed three cases because the old App ignored the pathname. The initial detail assertion was tightened to level-1 heading to avoid matching a home card heading.
- Focused routing: 4/4 PASS before adding two auth-route cases.
- Full suite: 107/107 PASS, 19 files (`vitest run --maxWorkers=2 --testTimeout=20000`). API/network/Next navigation are controlled test doubles; not real inference.
- TypeScript PASS after regenerating route types with `next typegen`. Initial check exposed a stale validator referencing the relocated root page and unsupported test-query options; both resolved.
- Biome lint on App, routing/startup tests and route helper PASS without warnings. Format command completed; Windows shim briefly reported a quoted route-group path error before retrying successfully. No mass formatting outside affected source.
- Chromium on the running development server: authenticated direct navigation, reload, Back/Forward, plant/disease details, missing IDs and all app screens PASS at 375/768/1280px with reduced motion and 1280px with normal motion. No page errors or horizontal overflow in these checks. Unknown page URL returns Next's 404.
- Guest deep-link login initially failed in the browser: the requested `/diagnose` was overwritten by `/home` while Next's asynchronous replace was still pending. Keep the return-path ref until the new pathname commits; rerun PASS for guest redirect, actual login dialog with intercepted fixture API and return to `/diagnose`. Unit router mocks update synchronously and did not reproduce this race. Earlier browser attempts also corrected heading/hidden-menu selectors in the QA script.
- Production `corepack pnpm build` PASS: generation step reports 10/10 pages; route output lists introduction, seven app-screen URLs, two dynamic detail routes and Next's not-found page. Restored the existing Next dev-type references after build; final `corepack pnpm typecheck` PASS. Final full test rerun after the asynchronous navigation fix remains 107/107 across 19 files, and targeted Biome lint PASS. Targeted Git diff whitespace check PASS (only LF/CRLF warnings).

## Boundaries

No real backend/model E2E, CI, coverage measurement, review approval or multi-device certification. Browser fixtures do not authenticate real accounts or write user data. Missing catalog IDs show an in-app missing-item message; unknown page paths are handled by Next's 404. Shared client bundle splitting, per-page SEO and URL-based catalog filters are not part of this change.

## Subsequent architecture refactor — 2026-10-09

This report preserves the initial URL migration evidence. The user subsequently approved route-owned pages, domain feature adapters, a shared provider/shell, native links and metadata/loading/error boundaries. Current structure and fresh 114-test evidence are in [the routing architecture report](agri_57_routing_architecture.md); do not treat the initial App screen switch described above as the current architecture.
