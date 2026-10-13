# AGRI-57 — Supplied leaf illustration catalog

Date: 2026-10-12. Verified branch: `AGRI-57-frontend-summary`.

Latest follow-up: the user supplied the previously missing rice-blast illustration. The initial 70-file inventory and checks below are historical; the follow-up section records the new 71-file state and fresh checks.

## Scope and implementation

The user requested integration of all files supplied in `frontend/src/assets/Bệnh lá/`. Inventory: 70 photographs/illustrations across 14 crops; 56 non-healthy conditions and 14 healthy entries. Files were not renamed, edited, moved or deleted. No new/generated image, dependency, API route, migration, classifier label, model-support count or dataset change.

- `frontend/src/data/leafPhotos.ts`: explicit static imports and crop/condition IDs; typed adapters attach images to plant summaries and detailed entries. Next imports use image metadata; Vite uses URLs, handled at the existing asset boundary pattern.
- `frontend/src/data/plantData.ts`: preserves historical templates and order; enriches them immutably and adds missing illustration entries. Healthy pictures are confined to plant conditions. Existing unmatched references remain missing, including rice blast; generic rice scorch and yellowing are not asserted to be blast or Tungro.
- `frontend/src/types/index.ts`: supports “Chưa phân loại”/“Chưa xác minh” rather than inventing medical categories/severity for new drafts.
- `frontend/src/services/catalogApi.ts`: exact normalized illustration-name/canonical-key matching and selected explicit aliases, with proper Vietnamese đ normalization. Prevents blank labels matching every disease and retains the photo qualification after backend description overrides. Adds the four existing non-model crop references (pomelo, potato, banana, watermelon) to the cẩm-nang result only when absent, without backend IDs or model-support counts. Inactive backend rows stay inactive; no database changes.
- Existing ReferenceImage, catalog filters, detail pages, missing-image state and navigation are reused without visual/component/CSS/motion changes. Original banner/map/logo/film assets are unchanged.
- `DESIGN.md` records the narrow user-requested illustration exception. Coding-standards, TDD, React static-path guidance, debugging, verification and webapp-testing were applied; no redesign or new animation.

The resulting disease listing has 57 entries: 56 supplied non-healthy illustrations plus the existing unmatched rice-blast entry. New draft detail text deliberately does not invent causes, symptoms, severity, prevention or treatment; those sections remain unfilled until content is provided/approved.

## Supplied inventory

| Crop folder | Files | Healthy files |
| --- | ---: | ---: |
| Bưởi | 3 | 1 |
| Cam | 3 | 1 |
| Chuối | 3 | 1 |
| Chè | 5 | 1 |
| cà chua | 10 | 1 |
| Cà phê | 5 | 1 |
| Dưa hấu | 3 | 1 |
| Khoai tây | 3 | 1 |
| Lúa | 8 | 1 |
| Ngô | 4 | 1 |
| Nho | 4 | 1 |
| Sầu riêng | 5 | 1 |
| Xoài | 8 | 1 |
| Ớt | 6 | 1 |

All imports and mappings are in `leafPhotos.ts`. A SHA-256 duplicate-group check over the 70 files returned no identical-byte duplicates; this is not an expert authenticity or diagnostic check. Four source images were individually viewed (grape black rot, rice leaf/stem spot, orange canker, pomelo canker); browser loading tests are not expert diagnosis.

## Verification on this turn

- TDD initial new data tests: 9 fail/1 pass because references were absent. Initial implementation repeated 9 failures due assuming Next image metadata in Vite; reused the URL-or-metadata boundary, then 10/10 passed.
- Service regression RED: 2 failures demonstrated lost qualification and unrelated empty-label matching. Reference-crop RED: 1 failure demonstrated missing four reference crops. Missing-plant guard RED: 1 failure demonstrated an undefined plant dereference.
- First full suite: 147/148 passed; the prior banner-photo test prohibited every reference image. Updated it to enforce its actual boundary: no banner/decorative assets may substitute for supplied leaf images.
- Full subsequent suite: 149/149 then 150/150 passed across 23 files. Final verification results are recorded below after the import-name readability pass.
- Final post-readability full suite: 150/150 tests, 23/23 files PASS, 18.49s. Final production build PASS (compile13.7s, TypeScript415ms, static10/10); source/test changes finished before both final commands. Browser QA preceded only the import-variable renaming, not a visual or behavior change.
- Scoped Biome check over six changed data/service/type/test files passed without errors or warnings.
- Production build passed, including 10 static pages and 2 dynamic detail routes. Post-build TypeScript passed after restoring the existing user-owned Next dev-type references. Final rerun results recorded below.
- Chromium production UI fixture test `tmp/ui-review/leaf_photos_check.py`: 3/3 viewports (375, 768, 1280) passed. Disease catalog has 56 loadable leaf pictures plus the expected rice-blast fallback. Desktop iterated/decoded all 56 list pictures and all 70 plant-condition pictures across 14 plant routes. Mobile/tablet verified grape and reference-only potato details. Esca detail and qualification were visible, no horizontal overflow in tested plant pages, no page errors. Reviewed desktop catalog and desktop/mobile Esca screenshots. Existing detail sections with missing content remain empty, not fabricated.
- Browser used intercepted authentication/API fixtures and reduced motion; it is not real backend/model E2E. QA files/screenshots remain ignored under tmp. QA server on port3100 stopped after testing; existing standalone-start warning noted, no deployment change.
- Scoped whitespace check passed with Git LF/CRLF notices.

## Remaining limits

Filename mapping is the user's asserted identity, not professional disease confirmation. Original source URLs, photographer attribution, licenses and expert approval were not supplied/verified. Some files may depict whole plants, insects or branches; do not imply all are single-leaf closeups. No stock/AI authenticity claim from appearance alone. Missing specific references (including rice blast) stay missing rather than relabelling unrelated images. New draft entries are not complete agronomic articles and are not accepted model classes.

No real backend/AI/Cloudinary E2E, CI, coverage measurement, FPS/Lighthouse, physical device, Safari/Firefox or screen-reader verification. No Docker rebuild/deployment, migration/volume operation, staging, commit, push, PR or Jira update. Extensive unrelated WIP was preserved.

## Follow-up: rice-blast illustration — 2026-10-12

- Source: `frontend/src/assets/Bệnh lá/Lúa/bệnh đạo ôn lúa.png`, 578818 bytes. Viewed the supplied image; original untouched. SHA-256 `EF5E76627F4FE23600B153EA45FAFC973811353CBBF83157EFD59B117D6D36C2` before/after implementation.
- Added one static import and a `rice-blast` registry entry in `frontend/src/data/leafPhotos.ts`. Existing adapters supply the same photograph to the rice condition, disease catalog and existing detailed rice-blast page. No duplicate article, new disease identity, model label, backend/DB change, content rewrite, CSS or motion change. Existing qualification remains: filenames are illustration labels, not expert-confirmed diagnoses.
- Updated `frontend/src/data/leafPhotos.test.ts` to exercise the new source at both consumers and prevent duplicate disease entries. Kept the Tungro missing-image guard; no longer assert that the now-supplied blast illustration must be missing.
- TDD RED 2/12 tests failed as expected for missing new source; full GREEN 151/151 tests across23 files,82.64s. Scoped Biome2 files clean; final production build PASS (compile2min, TypeScript7.3s,10/10 static pages and2 dynamic routes). Restored the pre-existing Next dev-type imports, then fresh `tsc --noEmit` PASS. Scoped whitespace PASS.
- Chromium production fixture smoke at375/768/1280:3/3 PASS. `/diseases/rice-blast` and `/plants/rice` display/decode the new image, served image bytes hash-match the user PNG, no tested horizontal overflow/page errors. Viewed desktop/mobile screenshots. Script/screenshots ignored in tmp; own port3100 QA server stopped. Existing standalone-start warning was not changed.
- Current inventory71 illustrations =57 non-healthy +14 healthy; the disease listing remains57 entries, now all with supplied images. Missing other specific references (such as Tungro) remain missing. Source attribution/license/expert verification and real backend/model E2E/CI/coverage remain unverified. No Docker rebuild, commit, push or deployment performed.

