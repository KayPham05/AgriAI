# AGRI-80 - Compact admin overview density (2026-10-15)

Branch: AGRI-80-create-crm-admin-page. User found the admin overview too large/tall. Applied a scoped density adjustment; preserved data, actions, palette, Manrope, hover navigation and reduced-motion behavior.

## Changes

- Reduced header vertical padding20→12px, main heading30→24px, heading separation32→20px, main gutters32→24px, overview group gaps24→16px and panel inset20→16px.
- Metrics use30px totals instead of36px, tighter margins and a shorter total caption. Chart bars80→40px; seven-day labels, exact expandable tables, zero/error/retry states retained. Details/other buttons remain at least44px.
- Calendar combines month/icon in a single header row, retains44px previous/next/today, uses28px non-interactive day cells without extra row padding and compact footer padding/date line. Full month and UTC+7 semantics unchanged.
- Account avatar56→40px, title20→18px, compact header/role spacing. Management/session row padding16→12px. No global font scaling, zoom, shared primitive edits, new dependency or backend changes.
- DESIGN.md records the admin-specific density override and updates --admin-panel-inset to1rem / --admin-chart-height to2.5rem.

Paths: frontend/src/features/admin/AdminCrmPage.tsx, AdminOverview.tsx, AdminOverviewPanels.tsx, AdminCalendar.tsx, AdminMetricChart.tsx; frontend/src/index.css; DESIGN.md; report index/task log.

## Fresh verification

- Before/after live Chromium at1280x900, October2026 calendar: metric card388→276px (112px/28.9% shorter); calendar441→297px (144px/32.7%); header87→71px; account card240→192px. These are measured element heights for this viewport/content, not universal proportions.
- Existing relevant admin/calendar suite20/20tests across2files PASS12.37s. No new tests for pure spacing changes. Typecheck PASS; strict lint159files PASS; changed-file format6files PASS; git diff --check PASS with existing line-ending notices.
- Docker frontend production build PASS and local recreation via no-deps PASS.
- Chromium1280/768/375 PASS: no horizontal overflow, visible calendar/month navigation/today, exact chart table retains7rows, all visible buttons at least44px, hover rail opens/closes and no page errors. Desktop/mobile screenshots reviewed.
- Ignored evidence: .cache/admin-verification/density_before.json, density_review.py, compact_dashboard_{1280,768,375}.png. Harness uses and ends only its own admin session; no real moderation.

Full frontend suite/backend suites/coverage/CI were not rerun for this visual-only follow-up. Earlier whole-project formatting findings not claimed fixed. Physical devices/cross-browser acceptance remain unverified. No database/model/storage changes, staging, commit or push.
