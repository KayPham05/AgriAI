# AGRI-57: Two-row catalog pagination, 2026-10-21

Completed the requested two-row pagination for the public Plants and Diseases pages.
Both already use `frontend/src/hooks/useCatalogPagination.ts` and a1/2/3-column grid.
The hook now subscribes to the existing768px/1024px breakpoints using useSyncExternalStore:
two items on phones, four on tablets, six on desktops. Server rendering and environments
without matchMedia use six; hydration subscribes to the real viewport without a server/client
markup mismatch. Media listeners clean up on unmount. Clamping, filtered totals, page reset
on filter changes, focus and scrolling behavior remain intact. No global CSS, APIs,
view markup or data changed. No pagination was added to History, and the separate admin
record-list pagination was outside this public catalog adjustment.

Changed tests: `frontend/tests/component/views/CatalogPagination.test.tsx` retains keyboard,
last-page, search, category reset, data-shrink, bounded page controls and plant selection
coverage, plus a live responsive breakpoint test. Five tests failed first against the old
nine-item implementation; focused7/7 passed after implementation (raw runner12:12:28,5.05s).
Biome initially rejected a test forEach callback return; changed it to for-of. Final Biome
and TypeScript checks passed, with no lint-rule/config changes.

Full `corepack pnpm test:coverage --maxWorkers=2`: **309/309,46 files**,58.69s,
raw start12:12:47. Branches1213/1822=66.57% (current floor60%); pagination hook100%.
Evidence: ignored `.cache/two-rows-tests.log` and coverage JSON. Docker frontend build passed
(compile4.9s, TypeScript808ms), only frontend recreated on localhost3000.

New `frontend/tests/browser/catalog/two_rows.py` passed both routes at320/375/767/768/1024/1280px:
exactly two rendered rows on full pages, correct item counts, next/previous without duplicated
items and no horizontal overflow or page errors. The first browser fixture returned an empty
backend plant list, leaving only four reference entries and correctly failing the six-item
expectation. Added complete PlantDto fixtures to exercise actual multi-page datasets;
no production change was needed. API fixtures are not real backend/model acceptance.
No real-device/GitHub CI run, commit or push.
