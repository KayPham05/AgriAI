# AGRI-163 requested password-login lockout

Date: 2026-11-27. User-requested extension on `AGRI-163-mobile-login-otp`.

## Behavior

- For an existing active password account, failures 1-4 return 401; failure 5 returns 429 and locks password login for 5 minutes.
- After expiry, another batch of five incorrect passwords locks for 10 minutes, then 20, 40, etc. Attempts during an active lock neither count nor extend its deadline; correct passwords are also rejected during that lock.
- A completed successful login resets the batch count, escalation level and deadline. A 202 OTP challenge alone does not reset them; OTP completion checks the current account lock before creating a session.
- State persists per account in PostgreSQL. Case changes in the email do not bypass it. Existing row locking serializes concurrent attempts. Failure responses are raised after committing the counter changes.
- Incorrect CAPTCHA answers are rejected on mobile before reaching the API and do not count as password failures. Unknown accounts, inactive accounts and provider-only accounts retain credential rejection behavior. The separate IP request limiter still applies.
- The API returns `code: LOGIN_LOCKED`, integer `retryAfterSeconds`, and the `Retry-After` header. Mobile displays the supplied duration rounded up to minutes and permits editing the form to use another account. This is an error message, not a live countdown.
- Growth has no business cap. Integer arithmetic saturates only at the latest representable UTC timestamp to prevent overflow.

## Affected paths

- `backend/src/AgriVision.Domain/Entities/User.cs`: failed batch count, escalation level and UTC deadline.
- `backend/src/AgriVision.Application/Services/Implementations/AuthService.cs`: transactional enforcement, injectable clock and success reset.
- `backend/src/AgriVision.Application/Common/Interfaces/Authentication/LoginLockedException.cs` and API `Middleware/GlobalExceptionMiddleware.cs`: HTTP lock response.
- Infrastructure user mapping, `20261127080640_LoginLockout` migration/designer and model snapshot: three additive columns with zero/null defaults for existing accounts.
- `reactNative/src/features/auth/submitLogin.ts` and login/OTP forms: typed error mapping and user feedback.
- Backend `LoginLockoutTests.cs`, `LoginLockoutServiceTests.cs`, API manifest; mobile login adapter and component tests.

## Actual verification

- Red: the two new PostgreSQL HTTP tests failed because all five failures returned 401. The mobile duration test failed because lock responses were reduced to generic throttling. The new form test failed because no duration was shown.
- `dotnet test backend/AgriVision.sln --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2'`: 296 API tests passed, zero failures/skips. Unit/integration assets were initially absent, so they were restored and explicitly executed below; the initial command alone did not establish their execution.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore`: final 233 passed, zero failures/skips. Covers partial-batch success reset, no extension during lock, extreme escalation, OTP completion and disabled-account credential behavior. Boundary tests caught and corrected floating-point timestamp overflow and preservation of the generic inactive-account wrong-password error.
- `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2'`: 82 passed, zero failures/skips, on disposable PostgreSQL.
- Mobile `pnpm.ps1 test:login`: 33 passed; adapter branch coverage 84.96%. `pnpm.ps1 test`: 24 component tests passed. Typecheck and lint passed. Android and iOS Hermes export to ignored `dist/agri163-lockout` passed.
- PostgreSQL HTTP tests cover 5/10/20-minute escalation with an injected clock, exact expiry, correct-password rejection while locked, full reset, independent accounts and five concurrent failures. No real waiting or production mailbox is used.
- Live local project API smoke at port 5080: a uniquely named temporary account returned 401 four times, then 429 with 300 seconds; its correct password was blocked during the lock. Project PostgreSQL contained batch 0, level 1 and a deadline. Only that fixture and its registration session were deleted afterward.
- Final authentication/API manifest regression run after the last correction: 34 passed, zero failures/skips (`auth-final.trx`). The final Docker image was rebuilt, applied to only the local backend, and `/api/health` returned `Healthy`.
- Local evidence: ignored `.cache/lockout-tests/` contains red/green TRX, full suite TRX and reviewed SQL. The SQL adds only three columns and the EF migration-history row.

## Local runtime and remaining limits

Backed up the existing `agrivision_db` with `pg_dump -Fc` and checked the archive listing before applying the additive migration. The backup is ignored at `.cache/lockout-backup/before-login-lockout.dump`. Existing data and `agriai_postgres_data` were retained. Migrated explicitly with the tested backend image and restarted only the local backend; it returned healthy.

The runtime uses the ignored `.cache/lockout-backend.override.yml` with image `agriai-backend:agri163-lockout`, on the existing `agriai` Compose project and root environment settings. No tracked Compose settings changed. Real Gmail delivery, a physical-device lockout submission, iOS runtime and GitHub Actions were not verified by these lockout checks. Prior OTP/device evidence remains separate.

Pre-commit follow-up: CI-settings runs passed 233 unit, 82 integration and 296 API tests; merged backend branch coverage was 79.95% against the 70% CI floor. A concurrency-fixture timeout under coverage was resolved using a fast BCrypt hash only for disposable test accounts, with unchanged production hash settings; the targeted and full API runs passed. Raw current evidence is ignored under `.cache/agri163-precommit/`.
