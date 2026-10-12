# AGRI-57: Real crop photographs across the frontend

Date: 2026-10-10. Verified branch: `AGRI-57-frontend-summary`.

## Scope and status

The requested asset replacement and cleanup are complete locally. This is not a declaration that AGRI-57, real inference, or CI acceptance is complete.

The user initially requested removal of all generated imagery, then explicitly clarified: retain the existing logo and map appearance/texture; replace crop information photographs on map selection and generated banner/crop photographs elsewhere. That clarification governs the final scope. `CropMapCanvas.tsx`, geographic paths, islands, map shadows and motion were not edited. Pin thumbnails inherit the same real crop photographs as the information panel.

## Changes

- `frontend/src/data/cropPhotos.ts` centralizes the thirteen supplied JPEG imports, existing Vietnamese alternatives and banner focal positions. Its URL helper handles Next static-image metadata and Vite's URL imports without creating a circular data dependency.
- `bannerData.ts` preserves the thirteen-scene order and reads the shared registry. `plantData.ts` uses the matching real photo for every crop, so catalog cards, details, home preview, map information and pin thumbnails share the same assets.
- `IntroPage.tsx`, `HistoryPage.tsx` and `AboutAiPage.tsx` replace their remaining generated rice photographs; alternatives describe the actual supplied photograph.
- `PlantsPage.tsx`, `PlantDetailPage.tsx`, `HomePage.tsx` and `AboutAiPage.tsx` use Next Image with responsive sizes, avoiding direct delivery of the large original JPEGs. Existing banner/film movement, layouts, actions, routing and authentication remain unchanged. Taste preserves the incumbent green/cream photographic composition and 5/3/5 dials; React guidance favors explicit imports and optimized delivery, not additional effects.
- Removed the eight generated general-plant photographs previously presented as healthy-leaf references. No verified condition-reference replacement was supplied; the existing honest missing-image UI remains, including for diseased leaves. Crop stock photographs are not diagnosis evidence.
- `DESIGN.md` records the clarified scope and exclusions, superseding the earlier banner-only limit without rewriting historical task records.

## Removed assets and recovery

Removed **28 tracked PNGs** from `frontend/public/images/`: fourteen former crop/farm illustrations and fourteen foliage/rice cutouts. The read-only `git ls-files frontend/public/images` inventory excluded `logo.png`; every resolved deletion target was checked to be a PNG inside that exact image directory before native PowerShell deletion. No recursive deletion or destructive Git command was used. These tracked files can be recovered from Git; Git history was not rewritten.

The remaining public images are exactly `logo.png` and `vietnam-canopy-texture.webp`, retained by explicit user direction. The thirteen supplied source JPEGs were not modified. Datasets, checkpoints, backend uploads and user history images were outside scope and untouched. The source search for the removed crop/cutout path families returned no matches; historical documentation is retained as evidence, not treated as live asset references.

## Fresh verification

- TDD: the updated `bannerData.test.ts` failed **14 tests / 1 passed** before implementation because catalog crops still used generated URLs and eight condition references still used decorative photographs. After implementation, **15/15** passed, including all thirteen hand-listed crop-to-JPEG mappings and the absence of unverified condition photos.
- Final full frontend run: `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` passed **115/115 tests across 21 files**.
- `corepack pnpm typecheck` passed, including after the production build and restoration of the pre-existing `.next/dev/types` imports in `next-env.d.ts`.
- Final `corepack pnpm build` passed: compilation, TypeScript and **10/10 static pages**, with two dynamic detail routes. An earlier build also passed; the final run includes responsive Next Image changes.
- Biome format check passed for nine touched data/view files. Strict lint of seven relevant data/view files exited 0 with one existing informational string-concatenation suggestion in `PlantsPage.tsx`, not an error/warning. This was not a repository-wide lint run. Scoped tracked diff whitespace check passed with LF/CRLF notices only.
- Impeccable read-only detector returned `[]` for IntroPage, PlantsPage and AboutAiPage. No editing command or agent delegation was used. This is not a comprehensive accessibility/performance certification.
- Production Chromium QA in ignored `tmp/ui-review/real_catalog_photos_check.py` passed **four cases**: 375/768/1280px normal motion and 1280px reduced motion. Each exercised all six map markers, decoded the real information photos, retained the original map DOM/texture and logo, closed exploration to restore the heading, loaded all thirteen catalog photos plus coffee detail/about/empty-history photographs, and found no document horizontal overflow or page errors. Desktop/mobile screenshots were inspected.
- The first browser attempt failed at the catalog photo count because it inspected the page during the existing authenticated entrance. The confirmation waited for each actual page heading, then all four cases passed without changing application authentication/loading code.

Browser QA used API/session fixtures on an isolated test server at port 3100, not a real account, backend/model, or end-to-end inference. `next start` reported the existing standalone-output warning; deployment was not modified. The owned test server was stopped after verification.

## Remaining limits

Photo source pages, usage licenses, exact locality/variety and non-generated provenance have not been independently verified. The supplied small potato/durian/pomelo photos retain their original resolution limitations. General crop photos are not verified leaf-condition references; those need appropriate real photographs. Existing user-approved removal of manual autoplay pause controls remains an accessibility trade-off. No fresh Docker/backend/AI/migration/CI/coverage/Lighthouse/physical-device/screen-reader/FPS acceptance was performed. No dependencies, secrets, stage/commit/push/PR/Jira status, or stash were changed.
