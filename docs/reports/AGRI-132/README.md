# AGRI-132 Account email and authentication

Latest profile correction: [Preserve the Backend Improvement profile when adding email 2FA — 2026-11-05](profile_restoration_2026_11_05.md). This restores the original signed-in profile and persisted avatar flow, correcting the branch-only avatar assessment in the earlier investigation.

Latest storage follow-up: [Restore the existing private R2 integration — 2026-11-05](r2_restoration_2026_11_05.md). This records the Git source, compatibility merges, current checks and remaining limits independently of the historical mail acceptance entries below.

## Implementation

- `docker-compose.mail.yml` adds Docker Mailserver and authenticated SMTP submission over STARTTLS on port 587. The SMTP submission port is reachable on the Compose network. Mail data, configuration and state use dedicated volumes.
- `backend/src/AgriVision.Infrastructure/Authentication/` handles SMTP, password recovery, Google ID token verification and email challenges. The backend sends a notice after a successful sign-in. A notice failure is logged and the login still succeeds. A failed OTP send leaves sign-in incomplete.
- Password recovery returns HTTP 202 for a syntactically valid email regardless of whether it has a password account. It emails a 128-bit code, stores its hash for 15 minutes, and consumes active reset codes and outstanding login challenges in the password update transaction.
- Google Identity Services supplies an ID token. The backend validates it using Google's library and identifies returning users by the Google subject. New accounts require a verified Gmail or Workspace address. Existing password accounts with the same email continue to use password sign-in until an explicit linking flow is added.
- The profile option sends an eight-digit code before enabling or disabling email verification. With the option enabled, password and Google sign-in return HTTP 202 with a challenge ID. The session and login notice follow successful verification. Codes expire after five minutes and allow five failed attempts.
- The EF migration adds the user's email verification preference, challenge attempt count and the additional token purposes. Existing accounts start with the option disabled.

## Configuration

Copy the relevant keys from `.env.example` into the local `.env`. Set `MAIL_HOSTNAME` to the SMTP certificate hostname and `MAIL_TLS_DIR` to the directory containing `fullchain.pem` and `privkey.pem`. The backend must trust the certificate chain. Set `MAIL_SENDER` to the mailbox address and `MAIL_PASSWORD` to its submission password. Keep the certificate private key and credentials outside version control.

Create the sending mailbox before starting the mail service. Enter the same password interactively when prompted. Set `$env:MAIL_SENDER` in the calling PowerShell session for the command below. For external delivery, provision the sending domain, SPF, DKIM, DMARC and the appropriate outbound SMTP route. [Docker Mailserver installation guide](https://docker-mailserver.github.io/docker-mailserver/latest/examples/tutorials/basic-installation/)

```powershell
docker compose -f docker-compose.yml -f docker-compose.mail.yml run --rm --no-deps mailserver setup email add "$env:MAIL_SENDER"
docker compose -f docker-compose.yml -f docker-compose.mail.yml up -d postgres mailserver
docker compose -f docker-compose.yml -f docker-compose.mail.yml build backend frontend
docker compose -f docker-compose.yml -f docker-compose.mail.yml run --rm --no-deps backend --migrate
docker compose -f docker-compose.yml -f docker-compose.mail.yml up -d
```

For Google sign-in, set `GOOGLE_CLIENT_ID` to the OAuth web client ID and add the frontend origin to its authorized JavaScript origins. Rebuild the frontend so Next.js embeds the public client ID. The local backend setting is `Google__ClientId` and the local frontend setting is `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

The rate limiter groups requests by the IP visible to the API. Behind the Next.js rewrite, multiple users may share that address. Configure trusted client IP forwarding or gateway limits before a shared rollout.

## Verification

- On 2026-11-04, the backend solution run passed 34 unit tests and 87 PostgreSQL integration tests. The live AI checkpoint test was skipped by its existing gate. The subsequent auth-specific run passed all six tests, including rejection of a malformed Google credential.
- Biome passed for the nine changed frontend files. The four focused frontend suites passed 24 tests. The full frontend run passed 361 and timed out in `AdminOverview.test.tsx` and `AdminCrmPage.integration.test.tsx`. Both suites passed when rerun with one worker.
- Next.js route type generation passed. Project-wide TypeScript checking still reports two missing `@/services/agriculturalProfileApi` imports in the agricultural profile files carried into the branch. The production build and browser viewport checks remain unverified.
- The merged Compose file passed configuration validation and the pinned Docker Mailserver image manifest resolved. PostgreSQL integration tests used a synthetic inbox. Live SMTP delivery and Google sign-in await the mailbox, trusted certificate, sending domain and authorized Google OAuth client.

### Local follow-up

- Recovered `frontend/src/services/agriculturalProfileApi.ts` from `AGRI-128-backend-improvement` for the carried profile components. TypeScript, the Next.js production build and 13 focused frontend tests passed. The agricultural profile API itself belongs to AGRI-128.
- Eight authentication and migration tests passed on disposable PostgreSQL. The existing local database lists four AGRI-128 migrations absent from AGRI-132. Its schema was left intact.
- The local `.env` has no configured SMTP hostname, sender, password, TLS directory or Google client ID. Live provider verification remains pending.

### Local Docker acceptance

- Built the backend and frontend images for the isolated `agri132-local` Compose project. Ran `--migrate` against its dedicated PostgreSQL volume and confirmed healthy backend and frontend containers.
- Verified through the frontend API proxy that password login delivered a notice to the Docker Mailserver mailbox, that the emailed reset code changed the password, and that email 2FA enrollment and subsequent login required a delivered code before issuing a session.
- Frontend listens at `http://127.0.0.1:13000`. The smoke script and generated local settings are under ignored `.cache/agri132-local/`. The stack uses a synthetic mailbox and self-signed TLS certificate. External delivery requires a real sending domain and Google sign-in requires the owner's OAuth web client.

### Gmail SMTP investigation — 2026-11-05

- **DoD: incomplete for real inbox delivery.** The owner reported receiving the enable-2FA email but not password reset, sign-in codes or disable-2FA mail on the same account. Earlier local Mailserver acceptance above is historical and does not establish Gmail delivery.
- Fresh, filtered `docker compose logs --since 45m --no-color backend` showed `Password reset email failed ... (TaskCanceledException)` followed by HTTP 202 at 5051 ms. `SmtpAccountEmailSender.SendAsync` cancelled after five seconds. The next reset request returned HTTP 202 in 10 ms; the existing two-minute reset throttle can suppress another attempt after a failed send because the token is saved before SMTP.
- The same log showed enable-2FA submission returning HTTP 200 at 4766 ms, disable-2FA submission returning HTTP 200 at 3783 ms, and password login returning its HTTP 202 challenge at 3275 ms. These paths await SMTP without swallowing send exceptions. This is evidence of SMTP submission completing, not Inbox delivery. Subsequent challenge verification returned HTTP 400 twice; logs do not establish whether the entered code was stale, incorrect or expired.
- `backend/src/AgriVision.Infrastructure/Authentication/SmtpAccountEmailSender.cs` now allows 30 seconds by default, configurable using `Smtp:TimeoutSeconds`. `docker-compose.yml` maps `MAIL_TIMEOUT_SECONDS` with a default of 30; `.env.example` documents external SMTP separately from self-hosted TLS configuration. Sender credentials, STARTTLS and caller cancellation are preserved.
- `backend/src/AgriVision.Infrastructure/Authentication/EmailTwoFactor.cs` now distinguishes setup, disable and sign-in subjects and explains the code's purpose in its body. The previous shared subject/body made separate requests difficult to distinguish in an email conversation. Whether Gmail actually grouped the owner's messages was not verified.
- `backend/tests/AgriVision.UnitTests/Services/SmtpAccountEmailSenderTests.cs` reproduced the five-second cancellation using a loopback SMTP server delaying EHLO by six seconds. After the fix, the sender waits for that response and still rejects a server without STARTTLS. No external email or credentials are used in the test.
- `backend/tests/AgriVision.IntegrationTests/Controllers/AuthControllerTests.cs` extends the existing PostgreSQL/synthetic-inbox flow through enable, sign-in, disable and subsequent password-only sign-in, checking distinct email subjects and session issuance. Password reset and sign-in notice coverage remain in this suite.

#### Fresh verification

- The SMTP regression failed before the fix with `TaskCanceledException` as expected; the distinct-purpose email test failed before the change because its inbox entry was absent.
- The backend solution run passed 35 unit tests. Its first integration run passed 87, failed the extended 2FA test because the test read the same response stream twice, and skipped the gated real-checkpoint test. The test now reads that response once.
- Final full integration rerun passed 88 tests, failed none and skipped the existing gated real-checkpoint test. Evidence: `.cache/agri132-mail-verification/final/ASUS_DESKTOP-60AI9UR_2026-11-05_13_39_40_net9.0.trx`. The extended enable/sign-in/disable flow passed; these are synthetic-inbox checks, not Gmail delivery evidence.
- `docker compose config --quiet` and `git diff --check` passed (Git reported existing line-ending conversion warnings).
- `docker compose build backend` passed. `docker compose up -d --no-deps --wait --wait-timeout 45 backend` recreated only the main project's backend and reached healthy status. Container inspection confirmed `Smtp__TimeoutSeconds=30`. Existing database schema, volumes and other services were preserved.
- TRX artifacts are local and ignored under `.cache/agri132-mail-verification/`. No external mail was sent during this investigation, and Gmail authentication/inbox acceptance was not repeated. The owner should retry password reset after two minutes, then use the fresh code from each purpose-specific email; inspect Spam and grouped conversations if SMTP completes without a visible new Inbox item.

### Backend Improvement merge — 2026-11-05

See [integration evidence and verification](backend_merge_2026_11_05.md).
