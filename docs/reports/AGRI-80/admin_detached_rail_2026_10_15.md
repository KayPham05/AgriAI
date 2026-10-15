# AGRI-80 - Detached collapsible admin rail (2026-10-15)

Branch: AGRI-80-create-crm-admin-page. User requested the sidebar as a separate surface matching the supplied reference, with opening/closing effects. Implemented and deployed to local Compose.

## Changes

- Separated the112px desktop rail from the main rounded content frame by20px, with its own existing surface color/radius/shadow. Removed the attached divider. Preserved logo, active nav and backend logout. Rail remains sticky at24px and scrolls internally on short viewports.
- Header control toggles the entire rail, with open/close accessible names, aria-expanded and aria-controls. Hidden rail is inert/aria-hidden immediately. Reopening remains available outside the rail. Current view, search filters, calendar, charts and authenticated data remain mounted.
- CSS animates rail translate/opacity; useAdminRail uses scoped useGSAP, a single layout measurement/reflow and transform-only content repositioning. Closing reclaims132px, confirmed in browser. Repeated toggles clean up/replace previous animation, completed transforms are cleared, and reduced-motion/breakpoint changes revert scoped motion. No animated width/margin/grid properties or perpetual animation.
- Existing mobile Sheet remains below1024px. Updated DESIGN.md with the detached/collapsible rail contract and three tokens. No dependency, palette, backend, schema, data/model or authentication change.

Affected paths: frontend/src/features/admin/AdminCrmPage.tsx, AdminCrmPage.test.tsx, useAdminRail.ts; frontend/src/index.css; DESIGN.md; this report, report index and AGRI-80 task log.

## Fresh verification

- New behavioral test RED first: close-navigation control absent,16existing tests PASS. After implementation17/17admin tests PASS,5.53s. Covers close/reopen, aria-expanded, hidden navigation, current view/active item preservation and restored logout.
- Full frontend185/185tests across27files PASS,51.19s. Typecheck PASS; strict lint159files PASS; changed-file format4files PASS. git diff --check PASS with existing line-ending notices only. Earlier unrelated whole-project formatting findings were not claimed fixed.
- Docker frontend production build PASS and recreated via docker compose up -d --no-deps frontend. Backend/database untouched for this follow-up; backend suites/coverage/CI were not rerun or newly certified.
- Live Chromium1280/1024/768/375 PASS. Measured detached gap20px and content expansion132px. Observed finite closing transition; open/closed states fit viewport with no document horizontal overflow. Keyboard activation retains toggle focus; closed subtree is inert and skipped by Tab. Eight rapid toggles preserve account filter/active view. Sticky rail position24px confirmed after page scroll.
- Reduced-motion switches immediately: rail transition0s, no content transform; open/close still works. Mobile Sheet opens and navigates images/overview. No page errors. Screenshots of desktop open/closed and responsive views reviewed.
- Ignored harness/evidence: .cache/admin-verification/detached_rail_review.py and detached_rail_*.png. Harness opens/ends only its own admin session, with no account/image moderation.

## Limits

Local Chromium and viewport emulation, not physical devices or cross-browser/performance certification. No new coverage percentage, GitHub CI, backend-test, model-quality or Cloudinary acceptance claim. Existing unrelated work retained; no staging, commit or push.
