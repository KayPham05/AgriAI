# AGRI-57 - Automatic catalog search (2026-10-21)

## Scope

Verified branch `AGRI-57-frontend-summary`. User requested on-change search after 0.5 seconds on Plants, Common diseases and Saved samples.

`frontend/src/components/common/CatalogControls.tsx` now keeps the typed input responsive while committing the search after 500 ms of inactivity. Each edit cancels the previous timer. Enter applies immediately except during IME composition. Clearing applies immediately. External resets synchronize the input and cancel pending work; unmount cleans up timers. The same SearchField is used by all three pages, so no new dependency or duplicated debounce logic was needed.

Existing page callbacks still perform filtering and reset plant/disease pagination when the search is applied. Existing filters, case-insensitive matching, history actions and data APIs are preserved. This remains local filtering of already loaded records.

## Verification

- New `frontend/tests/component/views/CatalogSearch.test.tsx` exercises all three real page components: last-edit 499/500 ms boundary, Enter, IME and immediate clear/cancellation. Observed six failures before implementation.
- Adapted existing catalog pagination and history search tests to wait for committed results. Initial regression runs caught old immediate-search expectations; updated assertions preserve their existing behavior checks.
- Targeted search/pagination run: 13/13 tests passed, two files, 4.92 seconds.
- Final full frontend Vitest run: **346/346 tests, 52/52 files passed**, 61.30 seconds. No new coverage or GitHub Actions claim.
- Scoped Biome: four affected source/test files passed. Whitespace check passed.
- Docker frontend production build passed and only frontend was recreated.
- Existing Chromium catalog check passed: plant/disease search, external reset and four responsive widths. Saved samples timing is covered by the component tests; no new real backend E2E claim.

No commit/push, database mutation or admin search changes. Prior work remains in place. Local logs: ignored `.cache/catalog-search-*.log`.
