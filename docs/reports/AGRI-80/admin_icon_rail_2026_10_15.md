# AGRI-80 - Icon rail default and expanded text (2026-10-15)

Branch: AGRI-80-create-crm-admin-page. User clarified the intended interaction: compact means visible icons, expanded means icons with text. This supersedes the prior hide-entire-rail behavior; previous report remains historical.

## Changes

- Desktop defaults to72px icon-only rail. Expanding uses224px with full Vietnamese labels alongside icons, including brand/logout. Both states remain navigable; removed prior rail aria-hidden/inert. Buttons retain full aria-label names, collapsed title hints and44px targets.
- Retained detached surface,20px gap, sticky rail, mobile Sheet, active view/filter, calendars/charts and backend logout. Header control now says Mở rộng / Thu gọn thanh điều hướng.
- Scoped GSAP animates content translation and a separate background surface scale, with label translation/opacity on expansion. Labels/icons are not scaled. Width reflows once rather than tweening width. Finite320ms behavior, cleanup/revert, no inline motion left at rest and static reduced-motion.
- Updated DESIGN.md to make this correction authoritative, keeping previous behavior as history. Tokens: expanded14rem, compact4.5rem, control height2.75rem, label offset-8px; gap/duration unchanged.
- Paths: frontend/src/features/admin/AdminCrmPage.tsx, AdminCrmPage.test.tsx, useAdminRail.ts; frontend/src/index.css; DESIGN.md; report index/task log.

## Fresh verification

- Updated intended-behavior test RED first (missing expand control);16existing tests PASS. Then17/17admin tests PASS,9.67s. Test proves default compact labels, usable nav, expansion/full labels, current view preservation and usable compact logout.
- Full frontend185/185tests27files PASS57.76s. Typecheck and lint159files PASS. Changed-file format and git diff --check PASS; earlier unrelated whole-project format findings not claimed fixed.
- Docker frontend production build PASS; recreated local frontend with no-deps. No backend/schema/migration/dependency/palette change, no new backend/coverage/CI certification.
- Live Chromium1280/1024/768/375 PASS: default72px/full224px measured,20px gap,152px content difference, transform/label motion observed, navigation/logout usable in compact state, keyboard activation and8rapid keyboard toggles preserve filter, reduced-motion static, mobile Sheet navigates normally, no overflow/page errors. Desktop compact/expanded captures visually reviewed.
- Browser harness first used forced coordinate clicks while the header was moving and missed a subsequent target; changed the verification to rapid keyboard activation to exercise repeated state changes without bypassing hit-position stability. This is not a performance or rapid-mouse-click certification.
- Ignored evidence: .cache/admin-verification/icon_rail_review.py and icon_rail_*.png. Only the harness's own login session created/ended; no moderation mutations.

No commit/push. Physical devices, other browser engines, coverage, GitHub Actions and full inference/storage acceptance remain outside this local UI verification.
