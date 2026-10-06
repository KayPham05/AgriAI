# Backend: independent build and tests

Run from the root. Unit/integration tests require host .NET SDK 9; integration also requires Docker. Testcontainers uses real PostgreSQL and removes temporary containers. Prediction AI/storage dependencies are explicitly fake.

## Restore and build

~~~powershell
dotnet restore backend/AgriVision.sln
dotnet build backend/AgriVision.sln --no-restore
~~~

## Separate test suites

~~~powershell
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore
~~~

Or run both with TRX output:

~~~powershell
dotnet test backend/AgriVision.sln --no-restore --verbosity quiet --logger trx --results-directory .cache/database-verification/latest
~~~

On 2026-10-06, 33 unit and 13 integration tests passed with none skipped. These counts describe that run. Migration tests upgrade legacy data from InitialCreate, verify backfill/constraints and repeat migration. Test fixture preparation does not change production startup behavior.

## Running backend image and PostgreSQL

After migration and API health checks, run this script; no host SDK is needed:

~~~powershell
powershell -NoProfile -File .agents/commands/verify_database.ps1
~~~

Capture Write-Host and errors as well:

~~~powershell
New-Item -ItemType Directory -Force .cache/database-verification | Out-Null
& ./.agents/commands/verify_database.ps1 *>&1 | Tee-Object -FilePath .cache/database-verification/live_api_db.txt
if (-not $?) { throw 'API/database verification failed' }
~~~

The script checks auth, catalog CRUD, migration history and ownership/read/delete of history. History snapshots are SQL fixtures; it does not run inference or upload actual images. It cleans only its own uniquely marked fixtures, including on failure. Inspect [script parameters](verify_database.ps1) for different host ports.

## Coverage when needed

~~~powershell
dotnet test backend/AgriVision.sln --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --results-directory .cache/coverage/backend/local
~~~

This collects reports per test project; aggregate them to evaluate backend coverage. Branch coverage target is 80%, current CI floor is 50%. On 2026-10-07, merged coverage was 213/364 = 58.52%, with 33 unit and 13 integration tests passing locally. Passing test counts do not establish coverage. See [coverage report](../../docs/reports/AGRI-75/ci_branch_coverage.md) and [CI workflow](../../.github/workflows/ci.yml).

API/DB tests and health mocks do not validate ConvNeXt-Tiny inference. See [AGRI-79 task log](../../docs/task-logs/AGRI-79/AGRI-79-database-migrations.md).
