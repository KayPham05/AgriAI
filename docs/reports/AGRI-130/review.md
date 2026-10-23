# AGRI-130 — Test quality review

Final review on 2026-10-23 covered source/configuration and actual local artifacts. No unresolved P1/P2 finding remains in the inspected scope. This does not establish GitHub Actions success, production acceptance, a security-scan result, load capacity, mutation score or AI accuracy.

## Independent review

A separate subagent reviewed fixtures, helpers, contract tests, manifest, moved persistence tests, production fixes, migration, project/coverage settings and CI. The parent inspected findings and applied fixes; the reviewer then independently parsed the final TRX/coverage and baseline preservation results.

| Dimension | Review and final evidence |
|---|---|
| Readability | Descriptive methods, stable case IDs, unused copied helpers removed; generated matrix agrees with authored JSON. |
| Reliability | Async host/container disposal and Kestrel stop/dispose use cleanup paths; concurrency uses signals, not sleep; history timestamps are distinct. API passes three separate fresh-container runs without retry. |
| Diagnostics | Status, body, fields, headers and side effects are asserted. Manifest guards report missing/extra routes and missing/duplicate/unmapped/non-test cases. Unknown 500 messages are redacted. |
| Fixture/mock design | Only external AI/storage boundaries are fake; PostgreSQL is real and disposable. Synthetic configuration and outbound denial isolate tests; dedicated policies test limits. Real-service opt-in remains separate. |
| Independent assertions | Literal expected roles/actions/status/values and original upload bytes; subsequent HTTP checks verify visible effects, DB/doubles verify hidden invariants. Fakes do not prove decoding/model/R2 correctness. |
| Behavioral coverage | All 35 controller method/route pairs mapped and runtime inventory passed. All 264 ordinary baseline cases retained, no duplicates across 397 final executed cases. Coverage and test counts supplement HTTP assertions. |

## Remediation and regression evidence

Artifacts below are under `.cache/qa-verification/agri130/`; final results are in the [acceptance report](README.md).

| Severity | Finding and correction | Red → green evidence |
|---|---|---|
| P2 | Unknown HTTP 500 exception details exposed; use safe generic message for every status 500, including AI 500. Preserve tested AI 502/503 and storage 503 contracts. | `red-error-leak` → 4 middleware regressions in `green-error-leak`; final Unit/API pass. |
| P2 | Validators were DI-registered but not invoked by HTTP; add async MVC validation filter with request cancellation. | `red-validation` → 2 filter tests in `green-validation`; final HTTP boundary tests pass. |
| P2 | Missing catalog update/name/optional-field bounds; targeted duplicate-name constraint failures reached 500. Validate current schema bounds and map only Plant/Disease name 23505 to safe 400. | `red-catalog` (7 failed/1 passed), `red-optional-bounds` (3 failed/6 passed), `red-disease-unique` (1 failed/2 passed) → final 137 Unit and 200 API pass. |
| P2 | App-created session timestamp could exceed PostgreSQL time, violating revocation constraint and failing role/status/logout/password changes. Clamp revocation to created time in repository and a new forward-only trigger migration. | `red-clock-confirmed` (2 failed), `red-repository-clock` (3 failed) → `green-clock-all` (5 passed), final Integration/API including future-clock logout/password pass. |
| P2, test quality | Host lifecycle, configuration isolation, history order and eight-permit timeout recovery had weak coverage/cleanup. Correct fixture lifecycle, deny unconfigured HTTP, set deterministic dates, probe all eight recovered permits. | Source review followed by all three final API runs; no skipped/failed/timeout/aborted results. |

The initial review incorrectly assumed duplicate Disease names were allowed. Schema inspection and a failing HTTP test confirmed `ix_diseases_name` uniqueness; the oracle and targeted error mapping were corrected without changing uniqueness/schema semantics. Kestrel's actual multipart/model-binding response for the 16 MiB request limit is 400: its test asserts the specific limit diagnostic, zero AI/storage and a valid positive probe. It does not silently relax an expected 413 to any 4xx. Two migration assertions were updated from 6 to 7 while retaining idempotency, legacy-data and rollback checks.

## Final cross-check

- Independent reviewer parsed Unit 137/137, Integration 60/60 and API 200/200 on each of three runs; all error/timeout/aborted/notExecuted counters zero. Baseline method/theory arguments are preserved with no duplicate current keys.
- Merged coverage 604/746 (80.97%) versus baseline 528/720 (73.33%), with the same four production modules. Branch denominator rises by 24 in API and 2 in Infrastructure; no test assembly or production module was omitted to raise the percentage.
- CI Integration/API steps execute after a successful build even if another suite fails; final merge requires all three successful, nonempty/no-skip results. Backend floor 70%, frontend 65%, Python 40% unchanged. No remote CI run is claimed.
- Migration 7 was tested on disposable PostgreSQL only. Deployment must use backup plus the separate migration command; application DB/volumes were preserved.
