# AGRI-130 — Full ASP.NET Core API test suite

**Local acceptance complete, 2026-10-23.** Branch `AGRI-130-api-tests`, based on merged PR #43 (`d5310fd`). Implementation is split into Conventional Commits at the user’s request. No push or PR created for this task. GitHub Actions has not run for these changes.

## Implementation

- Separate Unit / Integration / API projects with linked neutral support; no test-project references. Direct journal/cleanup/transaction cases stay in Integration, HTTP cases move to API, real-service opt-in tests stay separate.
- Cover all **35 controller method/route pairs**, including audit aliases, through an independent manifest with **97 behavioral case IDs**. [Matrix and manifest mechanism](api_matrix.md) distinguish mapping from actual HTTP execution.
- Use disposable PostgreSQL, synthetic users/configuration, configurable AI/R2 doubles and denied ordinary outbound HTTP. Dedicated rate-limit policies, signal-controlled concurrency and a real Kestrel host cover limits/timeout behavior.
- Add an independent CI API step and artifact; validate nonempty, fully passed TRX/coverage for all three suites before merging production coverage. Backend floor remains 70%, frontend 65%, Python 40%; target remains 80%.
- Fix demonstrated error disclosure, unused HTTP validators, catalog validation/duplicate-name handling and session revocation under clock skew. Add forward-only migration `20261023130623_SessionRevocationClockSafety`; preserve migration history and constraints.

## Verified local results

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

Frontend/Python suites, real checkpoint inference, real R2 acceptance, load/mutation testing and security scanners were not run for this task. Existing opt-in coverage stays separate; excluded/skipped real-service cases are not claimed as passes.

Run instructions: [backend guide](../../../.agents/commands/backend.md). Sources: [API tests](../../../backend/tests/AgriVision.ApiTests/), [shared support](../../../backend/tests/Shared/), [validation filter](../../../backend/src/AgriVision.API/Middleware/RequestValidationFilter.cs), [middleware](../../../backend/src/AgriVision.API/Middleware/GlobalExceptionMiddleware.cs), [CI](../../../.github/workflows/ci.yml).
