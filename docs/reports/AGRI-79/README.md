# AGRI-79 — Database integration merge readiness

Review date: 2026-10-07. Source reviewed: `85f0bd9` on
`AGRI-79-database-integration`. The pre-existing change to `docs/README.md`
was preserved. This review does not merge, commit or push code.

Follow-up on 2026-10-07: [dataset v1.4 catalog import](dataset_v1_4_catalog.md)
is complete in the local application DB: 59 active classes, 10 plants,
44 conditions. The 11-class counts below describe the earlier review, before
this import. Real inference and frontend acceptance remain incomplete.

Earlier verification: [SQL organization, Docker guide and database tests](database_guide_testing.md),
with **33 unit + 22 PostgreSQL integration tests passed**, including 9 catalog cases,
before DatasetV14Catalog was added.

Current implementation: [backend catalog migration applied with dotnet](catalog_ef_migration.md).
Latest verification after the missing-public-ID cleanup fix is
**33 unit + 33 PostgreSQL integration tests passed**, with no failures or skips.
See the [task log and TRX evidence](../../task-logs/AGRI-79/AGRI-79-database-migrations.md).
The application DB now has **3 applied migrations**. New databases receive
the 59-class catalog from DatasetV14Catalog; a separate SQL import is optional.

## Conclusion

Database/API persistence is ready for backend review and frontend integration
for authentication, catalog reads and authenticated prediction history.
Full frontend diagnosis acceptance remains incomplete. Backend review, CI on
the proposed PR and migration deployment are still required before merge.
The local checkout has no `develop` or `origin/develop` ref, so this review
does not establish conflict-free mergeability against the intended target.

## Historical verification before the catalog update

| Check | Result | Scope |
|---|---|---|
| Backend unit tests | 33 passed, 0 failed, 0 skipped | Current source; `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore --verbosity quiet` |
| Backend integration tests | 13 passed, 0 failed, 0 skipped | Current source, real PostgreSQL Testcontainers; AI and storage fakes |
| Frontend TypeScript | Passed | `npm run lint` (`tsc --noEmit`) |
| Frontend tests | 31 passed across 7 files | `npm test -- --reporter=dot`; mocked HTTP/XHR, not browser E2E |
| Existing backend image → PostgreSQL | Passed, cleanup passed | `.agents/commands/verify_database.ps1`; auth, catalog CRUD, migration history, synthetic history, snapshot, expiry and ownership |
| Next.js proxy → backend → PostgreSQL | Passed, cleanup passed | Same live script with `-BaseUrl http://127.0.0.1:3000`; synthetic history, no model inference |
| Existing Compose services | PostgreSQL, backend and frontend healthy | Docker Desktop and existing stopped API/web containers were started; no rebuild or migration was performed |
| Catalog completeness | 5 active plants, 5 active diseases, 11 active classes | Direct SQL counts excluding this review's `dbcheck_` fixtures; not a complete v1.4 mapping |
| AI dependency health | HTTP 503 | `/api/health/deps`; real inference not accepted |

No DB volume, migration history or normal application data was removed.
GitHub Actions, production restore and real checkpoint inference were not run.

Proxy verification log (local, ignored):
`.cache/database-verification/merge-readiness-20261007/frontend-proxy-api-db.txt`.
It records all five PASS checks and `CLEANUP PASS`. The source tests and
the existing deployed images were checked separately; images were not rebuilt
from HEAD in this review.

## Findings that limit frontend acceptance

1. **Guest diagnosis response is rejected by the frontend.**
   [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs)
   returns an empty image path for guests because their images/history are not
   stored. [predictionApi.ts](../../../frontend/src/services/predictionApi.ts)
   requires a truthy `dto.imagePath` in the successful POST response. A valid
   guest prediction therefore triggers a contract error. Allow this response
   and display the locally selected image without persisting a guest image.
   The backend guest integration test passes, but the frontend tests use a
   non-empty path; neither existing suite covers this combined contract.

2. **Disease catalog is partly static and hides new DB records.**
   [catalogApi.ts](../../../frontend/src/services/catalogApi.ts) maps
   `ALL_DISEASES`, then overlays matching database records. Diseases absent
   from the database remain visible; database-only diseases are omitted.
   [App.tsx](../../../frontend/src/App.tsx) also retains its initial static
   catalog when the requests fail without showing a load error. Use database
   records as the catalog source and display loading/error/empty states before
   calling the catalog UI fully integrated.

3. **Frontend has not adopted the expiry and result-policy fields.**
   [PredictionDtos.cs](../../../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs)
   exposes `images`, expiry, `warning`, `informationPending` and `medication`.
   The frontend prediction adapter ignores these fields; the history modal
   renders an image even when the backend hides an expired image URL.
   Implement the expired-image state and the relevant result-policy display.

These findings were reviewed without changing application code.

## Delivery requirements

- Apply the reviewed migration with the explicit `--migrate` job before HTTP
  startup; retain existing DB volumes/history and follow the backup guide.
- DatasetV14Catalog loads the 59-class v1.4 catalog in every environment during
  the explicit migration job. A separate SQL import is optional; new databases
  do not require it. New catalog content remains unapproved.
- The v1.4 catalog mapping is now complete locally; validate real
  FastAPI/checkpoint and storage integration before claiming real end-to-end diagnosis.
- Obtain the backend reviewer required by project rules and run PR CI.

Related completion log:
[AGRI-79 database migrations](../../task-logs/AGRI-79/AGRI-79-database-migrations.md).
