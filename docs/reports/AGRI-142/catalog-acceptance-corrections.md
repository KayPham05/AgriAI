# Catalog acceptance corrections — 2026-11-05

Status: implementation and local verification complete. Live deployment and R2 migration have not been performed.

## Scope and decisions

- Public plant detail reads linked active diseases and their current uploaded images, including newly created plants. Static leaf pictures are only a matching fallback when no uploaded image exists.
- Guest catalog navigation hides notifications, history, agricultural profiles and account actions; home returns to `/`. The authenticated mobile bottom bar is not rendered for guests.
- Admin plant disease labels replace underscores with spaces while AI mapping keys remain unchanged.
- Admin can permanently delete plants, diseases or medicines through a separate confirmation and `DELETE /api/admin/catalog/{kind}/{id}`. Existing deactivate/reactivate actions remain available.
- Plant/disease deletion removes related plant–disease pairs, medicine uses and extraction joins. Shared diseases/plants, medicines and extraction documents remain. Prediction history and user image metadata remain.
- Before removing links, legacy predictions receive a content snapshot explicitly marked as captured before catalog deletion; they are not presented as snapshots captured at prediction time. Existing snapshots are never replaced. Optional foreign keys use `ON DELETE SET NULL`.

## Storage and migration

New image keys in the existing configured bucket:

```text
users/{userId}/avatars/...
users/{userId}/predictions/...
category/plant/{plantId}/{adminId}/{imageId}.png
category/disease/{diseaseId}/{adminId}/{imageId}.png
```

JPG/JPEG are also supported. Bucket settings and credentials are unchanged. Existing `users/{adminId}/catalog/...` photos remain readable. Quotas and pending-upload cleanup recognize both layouts.

New forward-only schema migration: `20261105155108_CatalogPermanentDeletion`. It makes prediction catalog references nullable without deleting prediction rows. Downgrade is rejected because removed catalog IDs cannot be reconstructed safely.

The explicit `--migrate-catalog-images` maintenance command moves referenced old catalog images, including inactive records. It locks each catalog record, commits a durable upload intent, copies to a fresh destination, reads the copy and compares bytes, changes the database reference transactionally, then deletes the old object. Each item has a two-minute timeout. Failed copies retain the original reference; retries skip already migrated records. Failed old-object deletion stays in the existing cleanup journal. The `--expire-images` command processes stale intents after one hour; that command also removes expired user photos, so it is not a harmless migration check.

No bucket-wide scan or user photo deletion occurs during catalog migration. Old unreferenced catalog objects outside the database/journal are not discoverable by this command.

## Affected source and tests

- Frontend: `src/components/layout/{Navbar,AppShell}.tsx`, `src/features/knowledge/{PublicCatalog,PublicCatalogCard,KnowledgeAdmin,PlantDiseaseManager}.tsx` and their component/integration tests.
- Backend: `CatalogDeletionController`, `ICatalogDeletionService`, `CatalogDeletionService`, `PredictionService`, prediction entities/configurations, new schema migration and snapshot.
- Storage: `ImageStorageKey`, `ImageUploadJournal`, `ImageExpiryCleanup`, `CatalogImageMigration`, `Program.cs` maintenance switch.
- Tests: `CatalogDeletionTests`, `CatalogImageMigrationTests`, `CatalogHistoryPreservationTests`, image/key tests, migration count/downgrade fixtures and API manifest.

## Verification record

Initial key regression: 3 failed / 25 passed before implementation, then 28/28 passed. Host backend build passed using SDK 9.0.123 with `-p:LangVersion=12.0`, `-p:UseSharedCompilation=false`; this retains the previously documented host compiler workaround and does not prove the default-language CI build.

Initial UI runner was blocked by sandbox `spawn EPERM`; an authorized run outside the sandbox succeeded in starting. One test expected a relative image URL while the shared image adapter emitted an absolute URL. After correcting that assertion and adding a new-plant case, **35/35 tests in four files passed** (`.cache/catalog-acceptance-ui.log`). Frontend typecheck passed. Formatting and Biome lint of the ten changed frontend files passed using the already-installed Biome executable because its pnpm command shim was unavailable.

Initial selected API checks: **17/17 passed**, including route inventory and unique manifest mappings. Initial selected integration checks: **27 passed / 3 failed**. The failures came from old downgrade fixtures trying to cross the new forward-only migration before their expected rejection assertion. Fixtures now assert rejection from the current schema. Historical migration files are unchanged.

The first full API run passed 274/275 and exposed an older randomized boundary test: a GUID starting with `f` was expected unchanged even though catalog names intentionally capitalize their first letter. `CatalogContractTests.Create_EnforcesNameBoundary` now uses a fixed lowercase `boundary_` prefix and explicitly expects `Boundary_`, preserving the 100/101-character boundary checks. No production normalization change was needed.

Final runs are recorded below. Earlier report results do not verify this follow-up. Ordinary tests use disposable PostgreSQL and fake storage/AI. Real R2, browser layout, deployment and GitHub Actions are not established by these results.

## Applying after review

From this worktree, use the same Compose project name/environment file as the existing installation; back up its database first. Build only frontend/backend. Run backend `--migrate`, then run backend `--migrate-catalog-images` with the existing R2 configuration, and recreate frontend/backend. Each command must exit successfully before the next. Keep the database volume and AI service intact.

The migration command is not executed by HTTP startup. These changes are local and are not yet committed/pushed to Draft PR #60.


## Backend verification completed — 2026-11-05

All runs used the local SDK 9.0.123 / C# 12 build noted above. PostgreSQL containers were disposable; R2 and AI were doubles. No tests skipped in these ordinary suites.

| Suite | Passed / total | TRX elapsed (start to finish) | Evidence below `.cache/catalog-validation/` |
| --- | --- | --- | --- |
| Unit | 216 / 216 | 2.49 s | `unit/unit.trx` |
| Integration, fresh process 1 | 76 / 76 | 113.12 s | `integration-1/integration.trx` |
| Integration, fresh process 2 | 76 / 76 | 157.38 s | `integration-2/integration.trx` |
| Integration, fresh process 3 | 76 / 76 | 164.35 s | `integration-3/integration.trx` |
| API, corrected boundary fixture | 275 / 275 | 76.96 s | `api-corrected/api.trx` |

Integration stability runs share production code and configuration; later compilation added unit/API test assertions only. Later integration runs overlapped the separate API process, so these durations are observations, not a performance comparison or SLA.

Commands, from the worktree root:

```powershell
dotnet build backend/AgriVision.sln --no-restore --verbosity quiet -m:1 -nr:false -p:UseSharedCompilation=false -p:LangVersion=12.0
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2'
dotnet test backend/tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj --no-build --no-restore
```

Actual evidence runs additionally used TRX logging and the distinct results directories above. New coverage percentages were not measured. Existing PR conflicts/default-language build limitations remain outside this follow-up; no new CI success is claimed.


## Frontend full-suite follow-up — 2026-11-06

The first full frontend run reported 518 passed / 23 failed across 75 files, with one unhandled error (`.cache/catalog-frontend-full.log`). Investigation identified stale test fixtures rather than a reason to alter production auth/category behavior:

- Three HTTP/session cases used plain objects without `Response.clone()`; they now use real synthetic `Response` instances for 401/204.
- Fresh-login entrance fixtures omitted the public landing page's asynchronous plant request and incorrectly expected no such request. They now supply that request and still assert no extra Admin startup catalog/history requests.
- Direct plant navigation composed an obsolete detail component in the test harness. The affected case now supplies the current public catalog component and the array/detail responses needed for legacy URL resolution.
- Pair filtering fixtures returned a paginated object for the disease-array endpoint. They now return each endpoint's actual DTO. The pagination case uses a unique search term, since approximate matching intentionally matches `Bệnh 0` to `Bệnh 10` / `Bệnh 20` as well.
- Fifteen photograph-matching cases expected inferred plant categories even though the backend now owns that field. They now assert the unspecified category remains `Khác`; photograph identity assertions remain unchanged.

These fixture changes affect `App.adminEntrance`, `App.startup`, `App.routing`, `CatalogDebounce`, `UserProfilePage` and the `authApi`, `userApi`, `catalogApi` test files. No additional production auth/category changes were made. Initial targeted verification passed 75/77; after diagnosing the array response and fuzzy-match expectation, the two affected files passed 23/23 (`.cache/catalog-routing-debounce.log`). Temporary diagnostic instrumentation was removed. Final full-suite results follow below.


## Final frontend verification — 2026-11-06

`corepack pnpm --dir frontend test` passed **541/541 tests across 75 files**, no failures or skipped cases, duration 76.05 seconds (`.cache/catalog-frontend-final.log`). Typecheck passed again (`.cache/catalog-typecheck.log`). Biome formatting/lint passed for the 18 changed frontend files; `git diff --check` passed. Full frontend production build, browser visual checks and coverage were not rerun.

Implementation is ready for local user acceptance after deployment. Required runtime steps remain: back up the existing database, rebuild frontend/backend from this checkout, apply `--migrate`, execute `--migrate-catalog-images` with the existing R2 configuration, then recreate frontend/backend. No live schema migration, cloud image move, Docker rebuild, commit, push or PR update was performed in this follow-up.

## Live Docker and R2 deployment — 2026-11-06

The user explicitly authorized Docker rebuild, schema migration and moving existing R2 catalog images. A later instruction required leaving AI stopped; AI was not started, rebuilt or recreated.

- Existing Compose project: `agriai`; database: `agrivision_db`; preserved volume: `agriai_postgres_data`. Existing root Compose files and `.env` were retained. An ignored override at `.cache/deployment-20261106/compose.build.yml` points only backend/frontend build contexts to this worktree. R2, database and JWT configuration matched the previous backend container; secrets were not printed.
- Frontend/backend production Docker builds completed successfully (exit 0). Backend was published in Release and frontend built with Next.js. No automated test suites were rerun for this deployment.
- Pre-migration PostgreSQL custom archive: `.cache/backups/agrivision-before-catalog-20261106-051254.dump` (91,688 bytes), readable by `pg_restore --list`; SHA-256 `EF3752A0F6E5E75C0C58DB89A4DEBC57B24DBBBD04A94D6DC872EDC1007D5B39`.
- Explicit `--migrate` completed (exit 0), applying `20261105155108_CatalogPermanentDeletion`; migration count increased from 15 to 16.
- Explicit `--migrate-catalog-images` completed against real configured R2 (exit 0). All three referenced legacy catalog images moved: two plants, one disease, including one inactive plant. Each target was read back and byte-compared before updating its reference and deleting the source. Legacy catalog reference count is now zero; category references are 2 plants / 1 disease; pending upload journal is empty.
- Catalog counts remain 13 plants / 44 diseases. Prediction count and prediction-image count both remain 39. No expiry cleanup, database-volume deletion or user-image move was performed.
- `up -d --no-deps --no-build --wait --wait-timeout 60 backend frontend` completed (exit 0); frontend/backend and the existing PostgreSQL container are healthy. AI remains in its prior stopped state. Prediction inference is unavailable while AI is stopped.
- Live HTTP checks: backend `/api/health` reports Healthy/database Healthy; frontend `/` and proxied `/api/plants` return 200. Migrated active plant image returns JPEG 200 (165,504 bytes), disease image returns JPEG 200 (110,097 bytes). The inactive plant image returns 404 to anonymous clients as designed; its stored object was verified during migration. No authenticated browser/visual acceptance is claimed.
- A post-migration custom archive, `.cache/backups/agrivision-after-catalog-20261106.dump` (91,677 bytes), is also readable by `pg_restore --list`. It contains the new R2 keys. Restoring only the pre-migration database archive would restore obsolete image references; it is not a complete R2 rollback.

Local ignored evidence: `.cache/deployment-20261106/` contains build/migration/start logs, before/after counts, archive manifests and HTTP check JSON. An initial diagnostic query used the nonexistent table `uploaded_images`; the corrected query used `prediction_images` and confirmed 39 rows before and after. No application change was needed. No commit, push or PR update was performed. Remaining: user acceptance; previously documented PR conflicts and CI verification are separate from this successful local deployment.

## Admin action row follow-up — 2026-11-06

User requested code changes only, with navigation deferred and no tests or Docker operations. In `frontend/src/features/knowledge/KnowledgeAdmin.tsx`, permanent deletion now shares the existing wrapping horizontal action row with status controls for plants, diseases and medicines. Active medicines no longer show the deactivate button; publication/hide and permanent deletion remain. Restoration remains available for previously inactive records. Existing confirmation and disabled-state guards are preserved.

Verification for this follow-up: Biome check of the changed component passed; focused `git diff --check` passed. No tests were added, changed or run; no build, Docker operation or browser acceptance was performed. The running Docker app has not received this code-only follow-up. Navigation and backend behavior remain unchanged in this follow-up.

## Guest navigation follow-up — 2026-11-06

Code-only change requested; no tests or Docker operations authorized for this follow-up. `frontend/src/views/IntroPage.tsx` now sends the guest Tra cứu entry to `/plants`, selecting the existing Cây trồng navigation tab instead of Trích xuất. The `/about` route already exists; `frontend/src/providers/AppProvider.tsx` now treats it as a public page throughout the redirect, rendering and session-restoration gates so guests can reach the existing project page instead of being redirected to `/`. Other private paths remain gated.

Reviewed the route/page/component chain and focused diff. Initial Biome check found CRLF formatting in IntroPage; normalized that file using the existing formatter. Final Biome check passed for both changed files and focused `git diff --check` passed. No tests were written, modified or run; no browser/runtime validation, build, Docker operations or Git commit/push. Running Docker containers still use the previously deployed code.
