# AGRI-57 - Backend catalog photo aliases

Ngày2026-10-12; branch verified `AGRI-57-frontend-summary`.

## Root cause and scope

User screenshot shows Cam using logo rather than real crop photo. `frontend/src/services/catalogApi.ts:getPlants` previously matched backend name only against frontend English ID or full display name. Canonical `Cam`, `Che`, `Lua`, `Ngo`, `Ot` do not equal `orange`, `tea`, `rice`, `corn`, `chili` or longer local display names; unknown-template branch supplied logo and category Khác.

Confirmed catalog aliases in `backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261007032722_DatasetV14Catalog.cs` match canonical Vietnamese keys and legacy English names. Frontend service now uses an explicit normalized name→local ID alias table before exact template matching, including legacy Pepper and the additional crops that have existing photographs. No substring/fuzzy image assignment. Preserves backend ID, display name/scientific name/description overrides, active filtering and disease API behavior. Uses existing SUPPORTED_PLANTS/getCropPhotoUrl/CROP_PHOTOS registry with thirteen JPEGs in assets/banner, not generated leaves or disease-reference artwork.

Affected paths: `frontend/src/services/catalogApi.ts`, new `catalogApi.test.ts`. No component/CSS/motion/asset/Docker/backend/DB/route/dependency changes; coding-standards, systematic-debugging and TDD govern narrow correction. Existing dirty worktree preserved.

## Fresh evidence

- Regression 14 backend/legacy names RED7 fail/7 pass: Cam,Che,Lua,Ngo,Ot,Pepper,Buoi incorrectly resolved before fix.
- Final full Vitest PASS132/132 tests,22 files,29.50s, via `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`. Checks exact real JPEG path, frontend ID/category, retained backend ID/Vietnamese display name.
- Typecheck PASS; scoped Biome2 files exit0 with one pre-existing useImportType warning in catalogApi.ts. Format2 files PASS. No claim full-repo lint clean.
- Fresh production build PASS10/10 static pages/two dynamic routes with network permission for existing Google font loading; restore prior Next dev imports then typecheck PASS. Chromium production/API-session fixtures PASS3/3 at375/768/1280 reduced-motion: nine canonical backend crops render the matching loaded real JPEG, not logo, with no horizontal overflow/page errors. Reviewed desktop/mobile screenshots in one batch; no visual edits. Script/screenshots in ignored tmp/ui-review/catalog_real_photo_mapping_check.py and catalog-real-photo-mapping-*.png. Private QA server3100 stopped afterward; existing standalone warning unchanged.

## Remaining limits

The v1.4 catalog includes Nho/Grape; assets/banner has no grape photograph. This change does not invent an image, substitute another species, add inactive potato back to backend, or change labels/dataset scope. Unknown-template branch still uses its existing logo fallback; a correct real grape photo is needed to replace that remaining card. Do not describe all ten backend crops as covered.

No real backend/model inference E2E, CI, coverage, Lighthouse, asset-license/provenance verification or screen-reader/device testing. Browser fixtures, when run, do not establish live API acceptance. No commit/push/PR/Jira/stash/volume/migration operations.
