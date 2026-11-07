# AGRI-142 — Guest diagnosis and account save

## Implementation — 2026-11-06

Branch: `AGRI-134-142-integration`. User authorized the guest diagnosis flow and explicitly prohibited writing tests. Existing no-Docker constraint remains in effect. This entry records code and static/build checks, not runtime acceptance.

- Guest navigation includes Kiểm tra lá; `/diagnose` is public in AppProvider. The diagnosis route loads active plants independently of authenticated startup.
- Guest history uses tab-scoped `sessionStorage` under `leafai_guest_history`; the previous persistent localStorage history is no longer read or written. A separate `agriai_guest_prediction` draft holds the current result and explicit save intent. Reloading/revisiting the diagnosis page restores the result; preview is fetched from temporary backend storage. Browser storage failures are surfaced without discarding the current in-memory result.
- Guest inference still performs no database or R2 write. Production DI now supplies an in-memory GuestPredictionStore. Original image bytes and a materialized, server-owned prediction snapshot are retained for at most one hour, with a 128 MiB image budget and 256-entry limit. Oldest entries can be evicted under pressure; a minute timer removes expired entries. Restarting the backend loses temporary entries. This is a single-backend-process store, not distributed/session affinity support. Closing the browser tab loses its local access token; server cleanup occurs on the bounded TTL rather than immediate tab-close notification.
- Each result receives a random 256-bit opaque guest token and expiry time. Temporary preview reads use `X-Guest-Prediction` on `GET /api/predictions/guest/image`, no token in the URL, no-store response, nosniff and existing image rate limits. Saved entries stop serving anonymous previews.
- The explicit Lưu kết quả vào tài khoản action opens the existing login/register dialog if needed. Authentication keeps the public diagnosis page mounted and triggers the pending save. Cancelling the dialog preserves the result; a new image or analysis clears the old save intent.
- Authenticated `POST /api/predictions/guest/save` accepts only the opaque token, never client-supplied labels, confidence or result content. The first save attempt binds the token to its authenticated owner. Per-entry locking and a database lookup by the original prediction ID make same-owner retries idempotent, including an uncertain first response. Other owners are rejected. Deleted saved results are not recreated on retry.
- Saving uploads the original bytes through existing image-journal/R2 cleanup behavior and persists the original snapshot/time without rerunning AI. Catalog FKs are re-resolved (nullable if a catalog record was deleted); original display content remains in the historical snapshot. A shared persistence helper is used by authenticated inference and guest saves. The saved picture uses the existing authenticated PrivateImage component. Agricultural profiles load in the background after login on diagnosis, and profile creation can use the restored/pending authenticated session.
- No schema migration, new package, Docker operation, real AI call, R2 mutation, database mutation, commit, push or PR update was performed for this change.

## Affected paths

Backend: PredictionsController.cs; PredictionDtos.cs; IPredictionService.cs; PredictionService.cs; Infrastructure/DependencyInjection.cs; new IGuestPredictionStore.cs and GuestPredictionStore.cs.

Frontend: Navbar.tsx; AppProvider.tsx; sessionProfile.ts; DiagnoseRoute.tsx; DiagnosePage.tsx; predictionApi.ts; new features/diagnosis/guestPredictionDraft.ts.

## Actual verification

- `dotnet build backend/src/AgriVision.API/AgriVision.API.csproj --no-restore --verbosity quiet -m:1 -nr:false -p:UseSharedCompilation=false`: passed, 0 warnings / 0 errors (latest run 5.54 seconds). This builds the API and its production project dependencies, not test projects.
- `corepack pnpm typecheck` in frontend: passed.
- Biome `check --error-on-warnings` on all seven frontend files above: passed. Initial unused-import/non-null assertion warnings were corrected before the final check.
- `git -c core.safecrlf=false diff --check`: passed.
- Reviewed navigation gates, restoration/save/cancel paths, ownership, retry and image cleanup in source. No test was added, changed or run in this follow-up; no browser or real inference validation is claimed.

## Remaining verification

User acceptance after rebuilding frontend/backend and enabling AI when the user chooses. Temporary cache expiry/eviction/restart and authenticated save retries need automated coverage when tests are authorized. The two new controller routes also need API case coverage and entries in the existing `api_manifest.json`; its strict runtime-inventory check will currently report those missing routes. The test manifest and tests were deliberately left untouched, not weakened or mapped to unrelated cases. Previously edited test files from older requests remain in the working tree. Current build/lint results do not establish CI success or runtime acceptance.

## Automated test follow-up — 2026-11-06

The user subsequently authorized writing tests. This entry supersedes the deferred automated-test work above; it does not change the earlier record. This follow-up changes tests, the API manifest and documentation only. Existing production changes and unrelated working-tree edits were preserved.

### Added coverage

- `backend/tests/AgriVision.UnitTests/Services/PredictionServiceGuestTests.cs`: original result/image preservation without repeating inference, saving after catalog deletion, concurrent idempotent saves, failed persistence cleanup and same-owner retry, refusing another owner, refusing resurrection of deleted history, expired entries, capacity eviction, and starting image retention at save time while preserving diagnosis time. The existing service fixture now uses and disposes a real temporary store.
- `backend/tests/AgriVision.ApiTests/Controllers/GuestPredictionSaveTests.cs`: anonymous preview bytes/headers, login requirement, token validation, save/history/private-image round trip, database row uniqueness, retry, cross-account denial and disabling the anonymous preview after save. AI and persistent image storage remain test doubles; PostgreSQL is a disposable Testcontainers database.
- `api_manifest.json`: mapped both new routes to their actual unique `ApiCase` traits. The runtime route inventory and discoverability checks pass.
- `frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx`: guest inference, tab result, explicit login/save, reload, failed-save retry, expired preview and a stale-preview response arriving after selecting a new image.
- `frontend/tests/unit/features/guestPredictionDraft.test.ts`: tab-only storage, clear, corrupt data and denied/quota-exhausted storage.
- Updated `predictionApi.test.ts`, `Navbar.test.tsx` and `App.routing.test.tsx`: HTTP body/auth/header/cache contracts, guest desktop/mobile diagnosis links, public diagnosis/about navigation and the actual AppProvider/login dialog saving the guest result without redirecting or fetching private history.

### Failures found while building the tests

- Initial frontend run: 554/557 passed. New about-route assertion matched both footer and header; the profile navigation test retained a detached DOM node across private startup; a jsdom Blob passed to Node Response serialized as `[object Blob]`. Corrected test scope, re-queried current navigation and used a byte-equivalent Response fixture. A subsequent run exposed that the now-public diagnosis heading appears before auth restoration; the test now waits for the authenticated navigation link.
- Initial full API run: 278/280 passed. `HistoryPersistenceTests.PredictionWithoutProfile_ShouldPersistCompleteHistory_AndReloadInANewSession` and `AgriculturalProfilesControllerTests.Diagnosis_CanSelectOwnedProfile_AndDeletionPreservesHistorySnapshotAndImages` assumed upload time equals diagnosis time exactly. The implemented guest flow retains the original diagnosis time and starts 30-day image retention when saving. Updated assertions check upload time bounds and expiry exactly 30 days after upload; a new delayed-save unit case protects that distinction. No production behavior was changed to accommodate tests.
- The full frontend run with concurrent backend workloads timed out the new real-login form case at the default 5 seconds (557/558 passed). It passed independently. The case now uses the same bounded 10-second timeout as existing login-form tests; final frontend verification uses two workers to reduce local contention.
- Initial sandbox Vitest startup was blocked by `spawn EPERM`; reran with approved process access. Docker test access was similarly approved. No live app containers were rebuilt or started, no application data/R2 objects were mutated, and no AI service/checkpoint was used.

### Verification commands and limits

Build: `dotnet build backend/AgriVision.sln --no-restore --verbosity quiet -m:1 -nr:false -p:UseSharedCompilation=false -p:LangVersion=12.0` — passed, zero warnings/errors. The C# 12 override is the previously documented local test-project compatibility workaround; this does not prove a default-language CI build.

Unit: `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --verbosity quiet` — **223/223 passed**, zero skipped. API: corresponding `AgriVision.ApiTests` command — **280/280 passed**, zero skipped. Evidence: ignored `.cache/guest-tests-build-final.log`, `.cache/guest-unit-final.log`, `.cache/guest-api-full-final.log`. Earlier failing-run logs remain available under `.cache/guest-*`.

Frontend typecheck and Biome checks for the five changed frontend test files passed. Runtime acceptance with real AI/R2, a real browser, multi-instance storage and coverage percentages are not established by these tests. No commit, push or PR update was performed.

Integration: `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2' --verbosity quiet` — **76/76 passed**, zero skipped among selected cases; real-checkpoint/R2 categories explicitly excluded. Evidence: `.cache/guest-integration-final.log`.

Final frontend: `corepack pnpm test --maxWorkers=2` — **558/558 passed across 77 files**; evidence `.cache/guest-frontend-verified.log`. `git -c core.safecrlf=false diff --check` passed. In total, this follow-up adds 29 executed cases (17 frontend, 7 unit, 5 API), alongside the existing tests. All final results above are fresh runs for this follow-up, not the earlier catalog validation.
