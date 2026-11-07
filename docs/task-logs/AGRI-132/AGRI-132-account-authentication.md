# AGRI-132 Account email and authentication

- Added Docker Mailserver submission, sign-in notices, one-time password reset, Google sign-in, and optional email verification for sign-in.
- Added a forward-only migration and regression coverage for the authentication API and UI.
- Backend solution checks passed 34 unit and 87 integration tests, with one live AI test skipped. Focused frontend checks passed 24 tests.
- Recovered the missing frontend API module from AGRI-128. Typecheck, production build, 13 focused frontend tests and eight PostgreSQL authentication and migration tests passed on follow-up.
- The existing local database has four migrations from AGRI-128. The follow-up used disposable PostgreSQL.
- Built and started an isolated Docker stack, ran the migration and verified notification, password reset and 2FA against Docker Mailserver over SMTP. External mail delivery and real Google sign-in still require deployment configuration.
- See the [technical report](../../reports/AGRI-132/README.md) for configuration and verification.

## Follow-up — 2026-11-05 SMTP delivery investigation

- Verified the current branch is `AGRI-132-forgot-password`; preserved the existing dirty worktree.
- Found a real password reset SMTP cancellation at approximately five seconds in the running backend logs. Increased the default send budget to 30 seconds and exposed `MAIL_TIMEOUT_SECONDS` through Compose. The existing two-minute reset throttle remains in effect, including after a failed submission.
- Distinguished enable, disable and sign-in code email subjects/bodies so separate requests are easier to identify. Logs show disable and sign-in SMTP submission completed; actual Gmail Inbox delivery remains unverified.
- Added a slow-loopback-SMTP regression and extended the PostgreSQL auth/inbox test through disabling 2FA. The regression reproduced the original cancellation before the fix. 35 unit tests passed. The first full integration run exposed a response-stream reuse error in the extended test (87 passed, one failed, one skipped); corrected that test and started a full integration rerun. Final result follows below.
- Compose validation, whitespace checks and backend Docker build passed. Recreated only `agriai-backend-1`, confirmed it healthy and verified its 30-second SMTP setting. No migration or external email was performed.
- Affected paths: SMTP sender, email 2FA service, backend unit/integration tests, `.env.example`, `docker-compose.yml`, this log and the [ongoing technical report](../../reports/AGRI-132/README.md#gmail-smtp-investigation--2026-11-05).
- Remaining: owner verification of password reset, sign-in code and disable code in the real mailbox, using a new code for the corresponding action. No commit or push performed.
- Final full integration rerun: 88 passed, zero failed, one existing real-checkpoint test skipped. TRX evidence is under `.cache/agri132-mail-verification/final/`; all 35 unit tests passed in the solution run above.

## Follow-up — 2026-11-05 private R2 restoration

- Restored the prediction-image integration from Git commit `b0f10da` (AGRI-129), as requested, on the current `AGRI-132-forgot-password` branch. Twenty-nine recovered files match that source after normalizing line endings. Kept current password recovery, Google, email 2FA and SMTP settings through focused registration/configuration merges.
- Restored the R2 SDK adapter, owner-protected image API, durable upload journal, original migration/history, history filters/dependencies, frontend JWT image loading and original regression coverage. No change to labels, model versions or inference scope.
- Reproduced the missing endpoint with a failing 404-versus-401 test before restoration. Final backend checks: 70 unit and 92 integration tests passed; one existing real-checkpoint test skipped. Focused private-image frontend checks: three passed; TypeScript and changed-file Biome lint passed. Final full frontend run passed all 55 files and 366 tests; the earlier one-worker run was interrupted without a result. Evidence: `.cache/r2-restore/frontend-tests.txt`.
- Built and recreated only backend/frontend; both healthy. The existing database already had the R2 migration and journal table, so no migration or data change was needed. A read-only call through the restored adapter successfully read an existing 43,519-byte JPEG from R2. No bucket upload/delete, commit or push was performed.
- Affected source groups: prediction/storage interfaces, services, repositories, controller, SDK/DI/middleware, journal entity/configuration/migration/snapshot, frontend private-image consumers, Compose/env example and matching tests. See the [technical evidence](../../reports/AGRI-132/r2_restoration_2026_11_05.md) for source checks, commands and limits.
- Remaining: signed-in browser confirmation after refresh; avatar persistence is outside this prediction-storage restoration. The user also confirmed the previously missing password-reset email had arrived in Spam.

## Follow-up — 2026-11-05 profile baseline correction

- Compared `/profile` with `AGRI-128-backend-improvement` (`c39a262`). The current route incorrectly used the legacy profile instead of that branch's signed-in `UserProfilePage`; the earlier avatar assessment had not accounted for the original persisted implementation.
- Restored the original profile route, views, form/avatar controls, API client and profile/avatar backend dependencies from that branch. Kept the existing layout unchanged and inserted only the email-2FA control inside the original security section. Retained current email/password-recovery/Google/2FA code and unrelated work.
- Five profile source files match the baseline exactly after line-ending normalization; `UserProfilePage` matches after removing only the 2FA import and inserted separator/control. Evidence: `.cache/profile-restore/source_verification.json`.
- The route regression reproduced the wrong screen before restoration. Final checks passed 383 frontend tests across 58 files, TypeScript, changed-file Biome checks, 83 backend unit tests and 98 PostgreSQL integration tests. One existing AI checkpoint test was skipped. Backend/frontend Docker builds passed. Test artifacts are under `.cache/profile-restore/`.
- Avatar tests cover persisted profile/auth responses, private ownership checks, replacement, invalid input and failure/retry using controlled storage and disposable PostgreSQL. The original avatar migration was already applied locally; no migration, data reset or bucket mutation was performed.
- Interactive visual verification was unavailable because local browser access is disabled in Work settings. No Figma edit or pixel-level acceptance is claimed. See the [technical report](../../reports/AGRI-132/profile_restoration_2026_11_05.md) for affected paths, evidence and limits.
- `docker compose up -d --no-deps --wait --wait-timeout 45 backend frontend` completed successfully; both containers reached healthy status with the restored profile implementation. No commit or push performed.

## Follow-up — 2026-11-05 Backend Improvement merge

- Fast-forwarded `AGRI-132-forgot-password` to fetched `origin/AGRI-128-backend-improvement` (`c029423`), then restored local work and resolved overlapping changes. Local work remains unstaged/uncommitted; original stash retained. No push.
- Kept upstream sessions/catalog/profile flows and current email-2FA/reset/Google, private images, landing prediction and draft protection. Updated API mappings, shared test fixtures and migration model metadata. No application DB migration.
- Verification and remaining limits: [merge evidence](../../reports/AGRI-132/backend_merge_2026_11_05.md).
- Final full backend run: 182 unit + 262 API + 71 integration passed; two real-service gates skipped. Frontend build/typecheck/changed-file lint passed. Full frontend: 504 passed, one AdminOverview timeout; isolated rerun passed both tests. See linked evidence for commands and final focused checks.

## PR branch preparation — 2026-11-05

- Owner authorized commit/push of integrated code to `origin/AGRI-132-forgot-password`; prepare authentication/config/tests and related reports, with landing/draft changes in a separate AGRI-128 commit. Keep unrelated notes/artifacts and the pre-merge stash local.
- Recheck build/typecheck and staged diff before commit; retain the full-suite frontend timeout limitation documented in the merge evidence. User will create the PR.

## Follow-up — 2026-11-07 password recovery and security email UX

- Changed password recovery codes to eight digits and added a non-consuming code verification endpoint. The frontend now requires email, code verification, new password and confirmation as separate steps; the recovery title and login link are centered.
- Added styled HTML email templates for reset and two-factor codes, an enable-two-factor success notice, and a successful password-change notice. SMTP messages are marked as HTML while preserving the existing sender configuration.
- Verification: `dotnet build backend/AgriVision.sln --no-restore` passed with 0 warnings and 0 errors; `git diff --check` passed. API Testcontainers could not start because the Docker daemon was unavailable. Frontend local runners could not execute because the installed Node runtime is older than the repository requirement.
- Docker rebuild was attempted with `docker compose build backend frontend`, but the local Docker credential/daemon access failed before image build (`permission denied` / terminated logon session). No images or containers were changed.

## Follow-up — 2026-11-07 resend codes and profile password verification

- Added resend endpoints for login 2FA, setup/disable 2FA and profile password-change codes. Each code expires after 60 seconds; the UI shows a 60-second countdown and enables resend when it reaches zero.
- Profile password changes now request an eight-digit email code first and include the verified challenge in the final password update request. Existing password validation and session revocation remain in place.
- Verification: backend build passed with 0 warnings and 0 errors; 182 backend unit tests passed; changed frontend files passed Biome formatting and lint. Full API/browser/Docker verification remains blocked by the unavailable Docker daemon and older local Node runtime.
