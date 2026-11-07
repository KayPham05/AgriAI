# Backend test execution — 2026-11-05

## Scope and environment

The user authorized the three backend test suites: Unit, Integration and API. This record belongs to the existing `AGRI-134-142-integration` checkout at `c029423`, with its uncommitted Admin/catalog changes. Host: Windows, .NET SDK 9.0.123. PostgreSQL tests use disposable Testcontainers databases, with fake AI/storage dependencies. `RealCheckpoint` and `RealR2` are excluded from the ordinary Integration run.

## Build limitation

The default-language solution build failed with 55 CS0453 errors at FluentAssertions `Should()` calls, including existing tests. The compiler selected enum-constrained overloads for reference values. A diagnostic build using C# 12 succeeded with zero warnings/errors:

```powershell
dotnet build backend/AgriVision.sln --no-restore --verbosity minimal -m:1 -nr:false -p:UseSharedCompilation=false -p:LangVersion=12.0
```

All test executions below use that build with `--no-build --no-restore`. No project language setting, SDK, package version or CI configuration was changed. These results do not establish that the default build or GitHub Actions passes; compiler/package compatibility remains a follow-up before PR readiness.

## Initial execution and fixes

Evidence root: `.cache/test-runs/backend-20261105-csharp12/`. Each suite has its own TRX and Cobertura report.

| Suite | Passed | Failed | Skipped | Reported test duration |
|---|---:|---:|---:|---|
| Unit | 213 | 0 | 0 | 3 s |
| Integration | 59 | 14 | 0 | 2 min 57 s |
| API | 264 | 8 | 0 | 1 min 3 s |

Two test files were corrected after reading the failures:

- `backend/tests/AgriVision.ApiTests/Controllers/CatalogContractTests.cs`: eight cases expected lower-case names even though the approved behavior capitalizes the first character. Expected names now use independent literals with the generated suffix; scientific-name expectations remain unchanged. Duplicate checks and HTTP assertions remain in place.
- `backend/tests/AgriVision.IntegrationTests/Persistence/CatalogImportTests.cs`: fourteen cases failed while preparing the pre-catalog database because current EF entities include `image_key`/`category`, absent from that historical schema. Added parameterized inserts limited to historical columns and projections for historical reads. The import, rollback, identity preservation and repeatability assertions remain intact; no historical migration was changed or bypassed.

No production source was edited during this test-execution follow-up. Initial failure artifacts are preserved separately from subsequent runs.

## Commands and evidence

Each suite uses these shared arguments, with its project, logger and results directory:

```powershell
--no-build --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=<suite>.trx' --results-directory <directory> --verbosity quiet
```

Integration also uses `--filter 'Category!=RealCheckpoint&Category!=RealR2'`.

- Unit: `backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`; results `backend-20261105-csharp12/unit/unit.trx` under `.cache/test-runs/`.
- Integration rerun: `backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj`; results `backend-20261105-csharp12-fixed/integration/integration.trx`.
- API rerun: `backend/tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj`; results `backend-20261105-csharp12-fixed/api/api.trx`.

The corrected API suite passed 272/272, zero skipped, in 1 min 28 s. The corrected Integration suite passed 73/73, zero skipped, in 2 min 54 s. Unit remained 213/213; it was not repeated because only Integration/API test source changed. Total distinct cases across the three suites: **558/558 passed**.

`.github/scripts/check_dotnet_test_results.py` accepted all three final suite directories. Per-suite branch coverage: Unit 640/1502 (42.61%), Integration 384/1502 (25.57%), API 1081/1502 (71.97%). These percentages are not added or averaged.

Merged only the passing Unit report and corrected Integration/API reports using the existing ReportGenerator executable at `D:/AgriAI/.cache/dotnet-tools/reportgenerator.exe`:

```powershell
& D:/AgriAI/.cache/dotnet-tools/reportgenerator.exe '-reports:.cache/test-runs/backend-20261105-csharp12/unit/**/coverage.cobertura.xml;.cache/test-runs/backend-20261105-csharp12-fixed/integration/**/coverage.cobertura.xml;.cache/test-runs/backend-20261105-csharp12-fixed/api/**/coverage.cobertura.xml' '-targetdir:.cache/test-runs/backend-20261105-csharp12-fixed/merged' '-reporttypes:Cobertura' '-verbosity:Warning'
& D:/python/python.exe .github/scripts/check_coverage.py .cache/test-runs/backend-20261105-csharp12-fixed/merged/Cobertura.xml --minimum-branches 70 --label Backend
```

Merged branch coverage: **1179/1436 = 82.10%**, above the current 70% CI floor and 80% target. The repository coverage checker exited 0. ReportGenerator's merged denominator differs from individual Coverlet denominators; the figure above is taken from the merged artifact, not arithmetic over suite totals.

Passing feature checks include 9 catalog-image API cases, 8 catalog-image persistence cases, 13 text-normalization unit cases and 5 API manifest-mapping cases. Counts come from the corresponding TRX test names. These do not establish real R2 or browser acceptance.

## Integration stability

`TESTING.md` requires three independent runs when refactoring fixture preparation. The full corrected Integration run above is run 1. Two additional runs used new processes and disposable PostgreSQL resources, without changing code between runs. No test retry or shared application database was used.

| Run | Passed / total | Failed / skipped | VSTest-reported duration | Artifact directory under `.cache/test-runs/` |
|---|---:|---|---|---|
| 1 | 73/73 | 0 / 0 | 2 min 54 s | `backend-20261105-csharp12-fixed/integration` |
| 2 | 73/73 | 0 / 0 | 1 min 59 s | `backend-20261105-csharp12-stability2/integration` |
| 3 | 73/73 | 0 / 0 | 2 min 2 s | `backend-20261105-csharp12-stability3/integration` |

All three TRX/Cobertura directories passed the repository result checker. There was no observed state-leakage failure across the fresh runs. Run 1 overlapped the API suite; runs 2 and 3 ran without API work, so the durations are execution evidence, not a performance comparison. Coverage aggregation uses only the original three passing suite reports, not repeated stability samples.

`git diff --check` passed. No paths were staged. The test-execution request is complete, with the build and acceptance limits below still open.

## Remaining limits

This execution does not cover frontend/browser tests, live R2, real checkpoint inference or deployed-app acceptance. No application migration, deployment, commit, push or PR was performed. Default-language compilation remains unresolved; do not label this run as a successful default CI build.
