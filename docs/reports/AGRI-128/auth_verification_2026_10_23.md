# AGRI-128 — Auth regression verification, 2026-10-23

## Scope and baseline

- Requested baseline: `0035c15`; inspected branch: `AGRI-128-backend-improvement`.
- Actual HEAD: `ba89f19f28f4eb5486b771d0c57c85c956fb0153`. The user explicitly chose to review and supplement this commit rather than recreate the implementation from its parent.
- The three production fixes already exist in HEAD. This follow-up changes integration tests and documentation only. No commit, push, migration, dataset/checkpoint, secret, R2, or application database changes.
- Production review: `IAuthService.LogoutAsync(Guid userId, Guid sessionId, CancellationToken)` delegates to the owner/session/unrevoked conditional `ExecuteUpdateAsync`. Password, status and role changes retain all-session revocation. `AuthService` receives `IUnitOfWork`; register/login return after transaction commit. Both password and login use parameterized row-lock reads inside their transaction; password DTO validation precedes the transaction. `UnitOfWork` rolls back with `CancellationToken.None`. JWT layout/lifetime and HTTP contracts remain unchanged.

## Test corrections

Affected source: `backend/tests/AgriVision.IntegrationTests/Controllers/AuthImprovementTests.cs`.

- Resolve the scoped JWT generator inside a disposable DI scope instead of the root provider.
- Preserve the existing password-change success contract: `204`, not `200`.
- Handle EF/Npgsql reader commands in fault and cancellation interceptors; the original nonquery-only hooks never fired.
- Gate both logout requests inside the real service decorator, after authentication. Release the first, capture persisted `RevokedAt` through a fresh context, release the second and assert the timestamp is unchanged. Both responses must be `204`.
- Execute both password/login race orders through HTTP in separate request scopes/connections. Pause after the password hash update or after login acquires its row lock, before session creation. Match the exact waiter/blocker backend PIDs with `pg_blocking_pids`, rather than accepting an unrelated lock wait. Gates and lock observation have 30-second timeouts; no fixed sleeps. Gate timeout fails explicitly and release is idempotent with `finally` cleanup.
- Assert rollback removes sessions by the attempted user's captured ID, using a fresh context. Remove the cancellation test's unused, unasserted global session count and the unreachable session assertion after a missing-user assertion.

## Fresh red/green evidence

All paths below are local, ignored evidence under `.cache/verification/AGRI-128/`; historical results in the original report are not fresh evidence.

| Run | Result | Evidence |
| --- | --- | --- |
| Original HEAD auth tests | 4 pass, 5 fail, 0 skipped | `auth-baseline/auth-baseline.trx` |
| After DI/HTTP expectation corrections | 7 pass, 2 fail, 0 skipped | `auth-red/auth-red.trx` |
| After interceptor and assertion fixes | 9 pass, 0 fail, 0 skipped | `auth-green/auth-green.trx` |
| Final HTTP race + transaction group | 10 pass, 0 fail, 0 skipped | `auth-transaction/auth-transaction.trx` |

The first run exposed test setup/contract bugs, not newly demonstrated production bugs. The second run fails specifically because no `DbUpdateException`/`OperationCanceledException` was thrown: reader execution bypassed the old hooks. Production code was not reversed to obtain these results.

Additional regression sensitivity was checked in an isolated copy under `mutation/`, using the current tests with three deliberate production regressions: all-session logout, unlocked login read, and registration without its transaction. This copy has separate build output and disposable PostgreSQL containers; the branch's production files remained untouched. `mutation-results/mutation.trx` records 4 pass, 5 fail, 0 skipped:

- Scenario 1: device B `/me` returned `401`, expected `200`, proving all-session logout is caught.
- Scenarios 5/6: required row-lock command signals timed out after removing the login locking read. These are explicit synchronization-invariant failures, not observations of an unrelated lock.
- Scenarios 8/9: rollback assertions found the attempted user persisted after session-save failure/cancellation when registration's transaction was bypassed.

This is a deliberate regression-sensitivity run, not a failed final suite or a claim to reproduce the complete parent commit. The final branch tests below are green.

## Commands

Run from repository root in PowerShell; Docker Desktop must be ready. The host has SDK `10.0.401`, compiling the unchanged `net9.0` target and running .NET 9 tests.

```powershell
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --filter 'FullyQualifiedName~AuthImprovementTests|FullyQualifiedName~Transaction' --logger 'trx;LogFileName=auth-transaction.trx' --results-directory .cache/verification/AGRI-128/auth-transaction --verbosity quiet
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=unit.trx' --results-directory .cache/verification/AGRI-128/final/unit --verbosity quiet
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=integration.trx' --results-directory .cache/verification/AGRI-128/final/integration --verbosity quiet
dotnet tool install dotnet-reportgenerator-globaltool --tool-path .cache/dotnet-tools --version 5.5.4
.cache/dotnet-tools/reportgenerator.exe '-reports:.cache/verification/AGRI-128/final/**/coverage.cobertura.xml' '-targetdir:.cache/verification/AGRI-128/final/merged' '-reporttypes:Html;Cobertura'
python .github/scripts/check_dotnet_test_results.py .cache/verification/AGRI-128/final/unit
python .github/scripts/check_dotnet_test_results.py .cache/verification/AGRI-128/final/integration
python .github/scripts/check_coverage.py .cache/verification/AGRI-128/final/merged/Cobertura.xml --minimum-branches 60 --label Backend
```

The initial all-solution coverage run passed 91 unit and 140 integration tests, but its common TRX filename was overwritten by the second project. The final runs above use separate directories/files so both suites can be validated independently. Initial sandbox restore failure and unavailable Docker engine were resolved by running the authorized tests outside the sandbox and starting Docker Desktop. The scratch copy initially lacked the embedded catalog SQL resource; copying the tracked `database/` inputs resolved its build setup before the regression check.

## GitHub CI, separate from local results

Read-only GitHub connector inspection confirms PR #42 points to `ba89f19`. [CI run #67](https://github.com/KayPham05/AgriAI/actions/runs/39902453660), ID `39902453660`, is completed with **failure**: `backend-tests` failed its API/PostgreSQL integration step, coverage merge was skipped, and `ci-gate` failed. Unit and build steps passed. No remote workflow was rerun and no PR content was edited. The local uncommitted corrections do not have their own GitHub CI result.

## Final local result

| Check | Actual result | Local evidence |
| --- | --- | --- |
| Focused auth/transaction | 10/10 pass, 0 skipped | `auth-transaction/auth-transaction.trx` |
| Full backend unit | 91/91 pass, 0 skipped | `final/unit/unit.trx`, `final-unit.log` |
| Full backend integration | 140/140 pass, 0 skipped | `final/integration/integration.trx`, `final-integration.log` |
| CI TRX validators | Both exit 0; no missing/failed/skipped tests | Commands above, corresponding TRX/Cobertura files |
| Merged branch coverage | 364/552 = **65.94%**, gate 60% PASS | `final/merged/Cobertura.xml` |
| Diff whitespace | `git diff --check` exit 0 | Final repository diff |

DoD for this local auth verification is complete. Backend coverage target remains 80% and is **not reached**. Real-checkpoint tests are excluded exactly by the CI filter and are not accepted by this verification. Overall AGRI-128/remote CI acceptance is not established: the existing remote run is red, and these changes are uncommitted/unpushed. No unrelated failures were repaired and no CI settings or gates were changed.
