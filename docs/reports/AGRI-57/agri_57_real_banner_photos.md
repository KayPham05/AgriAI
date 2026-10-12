# AGRI-57: User-provided banner photographs

## Scope and implementation (2026-10-10)

Branch verified: `AGRI-57-frontend-summary`. The user supplied thirteen JPEGs in `frontend/src/assets/` and requested replacement of the banner images with appropriate synchronized motion. Preserve the existing dirty worktree; no staging, commit, push, dependency changes or backend/AI/data migration.

- `frontend/src/data/bannerData.ts`: explicit static imports of all thirteen supplied photographs, original crop identity/order, descriptive Vietnamese alternatives and crop-specific focal positions. No guessed photographer, location, cultivar or license claims.
- `frontend/src/components/common/BotanicalBanner.tsx`: replace artificial foliage/rice-leaf overlays with photograph-only motion. One gentle 1.03 scale tween over 12 seconds, existing 6.5-second scene interval and 0.65-second crossfade. Only active/next images mount. Wait for the prepared photo before fading; retain the working photo on load failure. Preserve visibility/offscreen pause, preference changes and lifecycle cleanup.
- `frontend/src/components/common/CropFilmStrip.tsx`: reuse the same photographs/focal positions. Preserve four desktop/two mobile frames, existing 16px/second autoplay, mouse/native scrolling/keyboard navigation, bounded seamless copies, focus/hover/inert/offscreen/hidden-tab pause and reduced-motion behavior.
- `frontend/src/index.css` and `DESIGN.md`: replace obsolete foliage motion tokens with photo-scale/duration tokens and document the explicit real-photo override. Keep brand, copy, controls, layouts and map behavior.
- Existing banner/data regression tests updated to exercise the replacement photographs and photograph-only playback. No generated image assets. The supplied originals and old public assets were not deleted or rewritten; Next image optimization generates delivery variants during normal build/runtime.

This is a banner/film-only replacement. Catalog/map-detail photos, the map canopy texture, disease-reference images, logo, model data and geography remain outside this change.

## Asset mapping

Dimensions were read from the supplied files using `System.Drawing.Image`; each file is also checked for JPEG signature in the data tests. Files are under `frontend/src/assets/`.

| Crop ID | Supplied file | Dimensions |
| --- | --- | --- |
| rice | lúa banner.jpg | 6257 × 3902 |
| tomato | cà chua banner.jpg | 3960 × 2640 |
| corn | ngô banner.jpg | 7360 × 4912 |
| potato | khoai banner.jpg | 735 × 490 |
| chili | ớt banner.jpg | 5184 × 3456 |
| coffee | cà phề banner.jpg | 4020 × 2680 |
| tea | chè banner.jpg | 5760 × 3840 |
| banana | chuối banner.jpg | 8736 × 4896 |
| watermelon | dưa hấu.jpg | 6240 × 4160 |
| orange | cam banner.jpg | 5600 × 3737 |
| mango | xoài banner.jpg | 5000 × 3333 |
| durian | sầu riêng.jpg | 735 × 487 |
| pomelo | bưởi banner.jpg | 736 × 552 |

Provenance: user-provided downloads. Source pages, photographer credit and usage rights have not been supplied/verified. Visual inspection does not independently establish non-AI provenance. Potato/durian/pomelo are adequate for small film frames but may soften when enlarged in a desktop banner; no artificial upscaling applied.

## Fresh verification

- TDD: all thirteen asset-mapping cases failed against the old PNG paths. Narrow banner rerun confirmed two expected failures against old rice imagery/leaf drift before implementation. Initial wider red run also encountered old-token setup errors; restore old timing tokens in the test double for the narrow reproduction, then remove them after production uses new photo tokens. First green attempt had one test-only URI-encoding mismatch; decode the rendered source for the filename assertion.
- `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`: **114/114 tests, 21/21 files PASS**.
- `corepack pnpm typecheck`: PASS before build and after restoring existing Next dev-type imports.
- `corepack pnpm build`: PASS; compile, TypeScript and **10/10 static pages**, two existing dynamic detail routes. No route changes.
- Biome formatting: six changed frontend files PASS. Strict lint for five changed TS/TSX files PASS. Including CSS with `--error-on-warnings` fails on **11 pre-existing print `!important` warnings**; no new banner/film warning and no unrelated print-style edits.
- Impeccable detector, review-only: `detect --json` on banner/film/CSS returned `[]`. No delegated critique or Impeccable UI editing.
- Chromium headless production QA at **375, 768, 1280px normal motion and 1280px reduced motion**, both `/` and `/home`: **8/8 cases PASS**. All thirteen central film photographs loaded; optimized static-media image URLs, expected scene count, no foliage overlays, no horizontal page overflow or page errors. Film autoplay/focus pause/ArrowRight/Home and banner real crossfade/zoom/reduced static behavior verified. Desktop/mobile banner and film screenshots inspected.
- Additional Chromium check PASS: real mouse drag, hover pause, keyboard wrap in both directions and offscreen pause.
- Evidence/scripts/screenshots remain ignored under `tmp/ui-review/real_*` and `tmp/ui-review/real-*`; generated build/runtime artifacts remain outside Git.

Initial sandbox dev attempt stalled on route compilation and browser navigation exceeded 120 seconds. The task's dev process was stopped; the explicit production build and local production browser checks then passed outside the sandbox. This does not establish a root cause or claim that dev startup was retested. Production smoke used `pnpm start`, which emitted the existing standalone-output warning; no deployment configuration was changed and Docker runtime was not retested.

## Limits and remaining work

- API responses were controlled fixtures, not live backend/real inference acceptance. No backend, AI, migration, CI, coverage, Lighthouse, FPS benchmark, screen reader, physical touch device, Safari or Firefox run.
- Existing user-approved removal of visible pause buttons is preserved. Reduced motion and automatic interaction/visibility pausing remain available, but no persistent on-page pause control is provided; this remains an accessibility trade-off, not a WCAG-conformance claim.
- Confirm stock-photo rights/required credit before public publication. Higher-resolution originals are preferable for the three smaller photos.
- No commit/push/PR/Jira changes; unrelated local work and stored Git backup are preserved.
