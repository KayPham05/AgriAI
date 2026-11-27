# AGRI-163 pre-commit verification

Date: 2026-11-27. Branch: `AGRI-163-mobile-login-otp`. Intended PR base: `AGRI-199-initial-mobile-app`.

Implementation is ready for review; device/iOS acceptance and GitHub CI remain pending. This delivery includes the user-requested CAPTCHA, persistent password lockouts and registration confirmation/terms-reading additions alongside login OTP. No dependency versions or CI gates were changed.

## Fresh local checks

| Check | Actual result |
| --- | --- |
| Backend build | Passed, zero warnings/errors |
| Backend unit tests with CI coverage settings | 233 passed, zero failed/skipped |
| PostgreSQL integration tests with CI coverage settings | 82 passed, zero failed/skipped |
| API tests with CI coverage settings, final run | 296 passed, zero failed/skipped |
| CI TRX/coverage evidence guards | Passed for all three suites |
| ReportGenerator 5.5.4 merged backend branches | 1455/1820 = 79.95%; CI floor 70% passed |
| Mobile login/OTP adapter tests | 33 passed; adapter branch coverage 84.96% |
| Mobile startup adapter tests | 13 passed |
| Mobile component tests with coverage | 31 passed across 6 suites |
| Changed mobile screens, branch coverage | LoginScreen 83.87%; LoginOtpForm 82.14%; RegistrationConsent 96.66% |
| Full Jest source scope, branch coverage | 68.02%; separate Node adapter coverage is not merged into this figure |
| Mobile typecheck and lint | Passed |
| Android/iOS Hermes exports | Passed, ignored `dist/agri163-precommit` |
| Proposed commit messages and CI commitlint regression | Passed, zero message warnings; 1 regression test passed |
| CI coverage helper regressions | 3 passed |
| Gitleaks v8.24.2 history scan | No leaks; 250 content commits scanned with the existing ignore file |
| Gitleaks candidate source/test/docs scan | No leaks |
| Whitespace/path review | Passed; no dependencies, secrets, datasets, backups or build outputs staged |

All backend integration runs use disposable PostgreSQL databases and controlled external-service doubles. They are not real Gmail or physical-device acceptance tests. Raw local evidence remains ignored under `.cache/agri163-precommit/`; the validated final TRX/Cobertura inputs are in `ci-results/`, merged coverage in `backend-merged/`, and scanner reports at that evidence root.

## Failures investigated

The first API coverage run had 295 passes and one failure in the new concurrent login test. Logs showed an Npgsql timeout in `GetByEmailForUpdateAsync`, waiting for serialized credential transactions. The lockout fixtures now use a low-cost test-only BCrypt hash in their disposable accounts so concurrency assertions test transaction ordering rather than password-hash cost under runner load. Production hash settings and lock durations are unchanged. The targeted 2-test run and the final full 296-test coverage run passed. Failed earlier evidence is retained separately; only the passing final API evidence is used for the CI guard and merged coverage.

Docker was initially stopped. It was started with the installed Docker Desktop CLI; existing volumes were preserved. One coverage command was interrupted as it moved from the completed integration suite to API tests; explicit final integration and API runs above provide the delivery evidence.

## Remaining acceptance limits

- GitHub Actions has not run for these local commits. Existing CI has no mobile job; mobile checks above ran locally. Unchanged web/Python application suites and real-checkpoint Compose smoke were not rerun for this auth change.
- Expo compatibility check previously reported version drift for expo, expo-router and jest-expo; versions remain pinned and unchanged. That result has not been recast as passing.
- User confirmed actual Gmail OTP receipt. The earlier isolated physical Android OTP/resend/Home flow passed, but the full Gmail-to-Home flow was not newly observed by the agent.
- The latest mandatory terms-reading interaction and escalating-lockout feedback still need physical-device acceptance; USB connectivity was intermittent. iOS runtime has not been tested.
- Deployment requires the additive `20261127080640_LoginLockout` migration before starting the updated API. The local project database was previously backed up and migrated; fresh pre-commit tests did not reset it.

Two logical local commits separate backend lockout enforcement from mobile OTP/form behavior. No push, PR creation, merge or self-approval is part of this request.
