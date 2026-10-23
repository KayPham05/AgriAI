# AGRI-130 — Full ASP.NET Core API test suite

**Original local acceptance: 2026-10-23; PR review follow-up: 2026-10-24.** Branch `AGRI-130-api-tests`, based on merged PR #43 (`d5310fd`). [PR #44](https://github.com/KayPham05/AgriAI/pull/44) exists and CI passed at `69c925c`; the review corrections below are delivered in follow-up commits at the user’s request. Consult PR #44 for the latest head and CI state; acceptance at `69c925c` does not establish CI success for a newer revision.

## Implementation

- Separate Unit / Integration / API projects with linked neutral support; no test-project references. Direct journal/cleanup/transaction cases stay in Integration, HTTP cases move to API, real-service opt-in tests stay separate.
- Cover all **35 controller method/route pairs**, including audit aliases, through an independent manifest with **97 behavioral case IDs**. [Matrix and manifest mechanism](api_matrix.md) distinguish mapping from actual HTTP execution.
- Use disposable PostgreSQL, synthetic users/configuration, configurable AI/R2 doubles and denied ordinary outbound HTTP. Dedicated rate-limit policies, signal-controlled concurrency and a real Kestrel host cover limits/timeout behavior.
- Add an independent CI API step and artifact; validate nonempty, fully passed TRX/coverage for all three suites before merging production coverage. Backend floor remains 70%, frontend 65%, Python 40%; target remains 80%.
- Fix demonstrated error disclosure, unused HTTP validators, catalog validation/duplicate-name handling and session revocation under clock skew. Add forward-only migration `20261023130623_SessionRevocationClockSafety`; preserve migration history and constraints.

## Original verified local results — 2026-10-23

All ordinary suites ran independently with zero failures or skipped tests. Artifacts are ignored local evidence under `.cache/qa-verification/agri130/`.

| Check | Actual result | Artifact directory |
|---|---|---|
| Clean merged-#43 baseline | Unit 117/117; Integration 147/147 | `baseline-docker/` |
| Current Unit | 137/137 | `verified/unit/` |
| Current Integration | 60/60; two real-service opt-in cases explicitly excluded | `verified-integration-fixed/` |
| API run 1, coverage | 200/200; TRX elapsed 42.45 s | `verified/api/` |
| API run 2 | 200/200; TRX elapsed 33.83 s | `api-repeat-2/` |
| API run 3 | 200/200; TRX elapsed 29.49 s | `api-repeat-3/` |
| Discovery/preservation | Unit 137, Integration 62 including opt-in, API 200; all 264 ordinary baseline cases retained, no duplicate method/theory-argument keys across suites | `discovery-audit.json` |
| CI result/coverage checker | 3 tests passed; each final suite accepted by nonempty/no-skip checker | `ci-checker.log`; final suite directories |

The three final API runs used separate processes and fresh fixture containers, without retries. API and all production assembly SHA256 values remained unchanged across repeats (`verified-api-build-hashes.json`). Test order differed between runs. Elapsed times above use TRX start/finish, including host setup/teardown, rather than runner summary duration.

Merged branch coverage: **604/746 = 80.97%**, above the 70% floor and clean baseline **528/720 = 73.33%**. `verified-merged/Cobertura.xml` merges only the three successful coverage runs; `baseline-merged/Cobertura.xml` is the clean-source baseline. Both contain only API, Application, Domain and Infrastructure; migrations remain excluded. Added production logic accounts for the 26 additional merged branches. Single-suite percentages are not the backend gate.

Build passed with zero warnings/errors. Runtime manifest and mapping guards passed within the full API runs. `git diff --check` passed. [Independent review](review.md) found no unresolved P1/P2 finding in the inspected scope after remediation.

Artifact locations and deployment limits are recorded above and below; reproduction commands are in the [backend guide](../../../.agents/commands/backend.md). This documentation update consolidates the existing runs; no new application test run is claimed.

## Shared testing standard — 2026-10-23

Added root [TESTING.md](../../../TESTING.md) as the shared testing policy: scope/classification, behavioral matrix, assertions, fixtures, API manifest, concurrency/stability, frontend/browser and AI boundaries, coverage/CI, execution commands and review/acceptance evidence. `AGENTS.md` links the standard; the historical testing strategy points to it. This is a documentation-only follow-up; existing application results above were not rerun.

## Verification history and limits

Earlier baseline attempts passed 117 unit tests but could not run PostgreSQL tests because Docker Desktop crashed on `docker-secrets-engine/engine.sock`; those attempts are not coverage evidence. The user restarted Docker without resetting/deleting data. The later clean-source baseline above supersedes that environmental block.

Earlier static checkpoints recorded 136 unit passes, 5 mapping-guard passes and a 264-case preservation audit; those were not full API acceptance. Subsequent runtime failures exposed an incorrect Disease duplicate-name oracle, actual Kestrel model-binding behavior, clock-skew revocation failures and two stale migration-count assertions. Each was corrected and the final suites rerun; failed/stale artifacts are excluded from final coverage.

Deployment requires a backup and a separate `--migrate` run for migration 7 before starting the updated API. It was verified only against disposable test databases; the application DB/volumes were not migrated or reset. HTTP startup still only checks schema.

During the original local acceptance, frontend/Python suites, real checkpoint inference, real R2 acceptance, load/mutation testing and security scanners were not run. Real R2 was subsequently verified in the dated follow-up below; the other limits remain. Existing opt-in coverage stays separate; excluded/skipped real-service cases are not claimed as passes.

Run instructions: [backend guide](../../../.agents/commands/backend.md). Sources: [API tests](../../../backend/tests/AgriVision.ApiTests/), [shared support](../../../backend/tests/Shared/), [validation filter](../../../backend/src/AgriVision.API/Middleware/RequestValidationFilter.cs), [middleware](../../../backend/src/AgriVision.API/Middleware/GlobalExceptionMiddleware.cs), [CI](../../../.github/workflows/ci.yml).

## PR #44 review follow-up — 2026-10-24

The reviewer identified a valid P2: shared synthetic R2 settings overrode the opt-in suite’s endpoint, bucket and credentials. Ordinary CI excluded RealR2, so its green result did not detect this regression.

- Add a protected storage-configuration hook to shared support. Ordinary fixtures keep synthetic R2 settings. `RealR2Factory` loads explicitly supplied `R2__ServiceUrl`, `R2__BucketName`, `R2__AccessKeyId`, `R2__SecretAccessKey` from the test process environment, rejects missing settings and restricts the bucket to `agrivision-images-dev`. AI remains fake and PostgreSQL disposable.
- Add ordinary configuration regressions with synthetic values, including SDK registration without cloud requests, missing credential and rejected bucket. A deliberately uncorrected fixture produced one expected failure/one pass in `pr44-red-confirmed/`; the corrected pair passed in `pr44-green/`, then all four cases passed in the complete Integration run. An earlier compilation error was corrected before obtaining the valid red evidence.
- Add exact **15 MiB** HTTP acceptance for Guest and User, asserting successful business result, User storage byte length/hash and Location/read-back, and Guest absence of storage/history effects. Retain **15 MiB + 1 byte** rejection with zero AI/storage. An initial test assumed a relative lowercase Location; it was corrected to check the existing absolute same-origin route and successful follow-up HTTP, without changing production behavior. Payloads are synthetic bytes; this does not validate real image decoding.
- Full local results: Unit **137/137**, Integration **64/64**, API **202/202**, all zero skips/failures. Reports: `pr44-verified/{unit,integration,api}/`. Merged production coverage remains **604/746 = 80.97%**, artifact `pr44-merged/Cobertura.xml`; all suite result checkers and the backend70% gate pass. Build has zero warnings/errors.
- Real R2 opt-in **1/1 passed**, zero skips: `pr44-real-r2/real-r2.trx`. Test-process-only credentials were loaded from local configuration without printing them; the test checked upload/read/owner isolation/expiry/delete against the agreed private dev bucket and cleaned its synthetic object keys. No application DB migration or volume reset was performed.
- Baseline preservation: `pr44-discovery-audit.json` confirms all **264** baseline cases retained and no duplicate keys across **403** ordinary executed cases. The manifest now has **98** behavioral IDs for the same **35** method/route pairs.

Actual remote evidence: [CI run 39965059599](https://github.com/KayPham05/AgriAI/actions/runs/39965059599) at `69c925c` passed every required job. Backend log confirms build, Unit137, Integration60, API200, no skips, coverage80.97% (`pr44-ci-backend.log`). These are the original PR revision’s results, not a remote run of this local follow-up.

API stability after the fixture change: **202/202 in three consecutive runs**, without retries, separate processes/fresh databases and unchanged binaries. Artifacts: `pr44-verified/api/`, `pr44-api-repeat-2/`, `pr44-api-repeat-3/`; TRX elapsed times and all counters are summarized in `pr44-acceptance.json`.

Delivery update, 2026-10-24: follow-up changes are grouped as fixture fix/regression, exact-size API tests and documentation. Updated-revision CI must be verified through PR #44; no merge or deployment is included.
