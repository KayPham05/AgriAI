# AGRI-132 — Restore the existing private R2 integration

- Date: 2026-11-05 (Asia/Saigon).
- Branch: `AGRI-132-forgot-password`.
- Source: `b0f10da6b5095ecca4c4ef12e709cd151418f608`, `feat(storage): AGRI-129 migrate private images to R2 safely`.
- Scope: restore the existing prediction-image storage and authenticated display flow while retaining the branch's email/password-recovery/2FA changes. Avatar persistence is outside this restoration; the current profile UI only stores its avatar in memory.
- Delivery status: local prediction-image restoration complete; backend/frontend updated and healthy. This does not mark Jira Done or establish a repeated signed-in browser acceptance. No commit, push, database migration, bucket upload or bucket deletion was performed.

## Diagnosis and regression evidence

The main Docker project's database contained three live prediction images with private API paths and owner-scoped R2 object keys. The active branch did not include the AGRI-129 storage commit. Its backend registered `CloudinaryImageStorage`, Compose passed no R2 variables, its controller lacked the private-image route, and the history view used an unauthenticated image element. The private API path returned HTTP 404 through both ports 3000 and 5080.

Before restoring production code, `PredictionsControllerTests.ReadPrivateImage_ShouldRequireAuthentication` failed with HTTP 404 instead of HTTP 401 against disposable PostgreSQL. This catches the missing protected route.

## Restored code and compatibility merges

Twenty-nine files were checked against the Git source after normalizing line endings: all 29 matched, with zero mismatches. The local evidence is `.cache/r2-restore/source_verification.json`; source recovery and pre-edit backups are under `.cache/r2-restore/`. This comparison covers the adapter, storage interfaces/key validation, journal/entity/configuration/migration, prediction service/controller/repositories/DTOs, original storage unit tests, frontend `PrivateImage`, its history/dialog consumers and tests, backend Dockerfile and Next.js configuration.

- `backend/src/AgriVision.Infrastructure/Services/R2ImageStorage.cs` restores the original AWSSDK.S3 adapter and key validation. `CloudinaryImageStorage.cs` is removed from active source as in the source commit. The SDK version is the original `4.0.104.5`.
- `backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs` restores owner-checked reads, expiry/deletion handling, private API paths, durable upload reservations and cleanup. The original agricultural-profile repository/filter DTO dependencies are restored so the service is compatible without rewriting its behavior.
- `backend/src/AgriVision.API/Controllers/PredictionsController.cs` restores authenticated image streaming with ownership checks and no-store response caching, plus the original request limits.
- `frontend/src/components/common/PrivateImage.tsx` fetches protected paths using the session JWT and displays a temporary blob URL. It aborts unfinished requests and revokes that URL on cleanup. History cards, details, reports and the existing viewer use this original component.
- Compatibility merges were limited to infrastructure registration/package references, `AppDbContext`, the current EF snapshot, application middleware, test storage fakes, `.env.example` and Compose. Existing Google authentication, SMTP settings, password recovery, email 2FA and the 30-second SMTP timeout were retained. R2 credentials remain in the ignored `.env` and backend runtime only.
- The original `20261023080635_PrivateImageUploadJournal` migration and its designer were restored without modifying its history. The current database already listed that migration and already contained `pending_image_uploads`, so no migration was run. Other applied migration history and all data/volumes were preserved.

## Fresh verification

- `dotnet test backend/AgriVision.sln --no-restore --verbosity minimal --logger trx --results-directory .cache/r2-restore/tests/final`: **70 unit passed; 92 integration passed; zero failed; one existing gated real-checkpoint test skipped**. TRX files from this run are `ASUS_DESKTOP-60AI9UR_2026-11-05_14_12_42_net9.0.trx` and `ASUS_DESKTOP-60AI9UR_2026-11-05_14_12_47_net9.0.trx` in that directory. PostgreSQL and storage doubles cover image ownership, expiry, unavailable storage, cleanup and the existing email flows. These tests do not establish real AI inference.
- The first solution attempt passed all 70 unit tests but failed integration compilation because the old deletion fake still used the former storage interface. Restoring the matching original prediction controller tests fixed that compatibility issue; the final run above passed.
- `pnpm exec vitest run tests/component/views/PrivateHistoryImage.test.tsx`: **3 passed**. `pnpm typecheck` passed. Biome lint passed for the six restored frontend source/test files. Host checks used the available Node 24 runtime and the project's pnpm runner; initial sandbox/corepack attempts failed before tests started.
- The first full frontend run with one worker produced no completion result and was interrupted. The final run, `pnpm test --maxWorkers=2 --reporter=verbose --testTimeout=15000 --hookTimeout=15000`, passed **all 55 files and 366 tests**, with zero failures, in 129.28 seconds. Detailed output is kept locally in `.cache/r2-restore/frontend-tests.txt` (run started at 14:25:24 Asia/Saigon).
- A temporary read-only smoke harness under `.cache/r2-restore/` resolved the restored production `IImageStorage` registration and read one existing object using local R2 configuration. Result: `Found=true`, `Bytes=43519`, `ContentType=image/jpeg`, `Provider=R2ImageStorage`. No credential or image bytes were printed or saved; no bucket object was written or deleted. An initial automatic approval review timed out; the retried check was allowed. The first harness run then failed because its standalone DI container omitted `IConfiguration`; the corrected harness produced the successful result above.
- `docker compose config --quiet`, `git diff --check` and `docker compose build backend frontend` passed. Git emitted line-ending conversion warnings only. The Docker build includes the Next.js production build.
- `docker compose up -d --no-deps --wait --wait-timeout 45 backend frontend` succeeded. Both containers are healthy, backend runtime contains all four R2 settings, and `Smtp__TimeoutSeconds=30` is preserved.
- After recreation, the same private image path returns **401 without JWT** through ports 3000 and 5080, replacing the previous 404. Authenticated route behavior is exercised by the integration suite; actual object access is independently established by the read-only R2 check above. A signed-in live browser image render has not been repeated in this session.

## Remaining limits

Actual bucket upload/delete was not repeated; those operations retain the Git implementation and are covered with controlled SDK/storage doubles. Avatar persistence needs its own restored or implemented user-profile flow and is not supplied by restoring prediction storage alone. Real checkpoint inference and GitHub Actions results are not claimed.
