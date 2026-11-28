# AGRI-163 · Native login OTP

Current delivery: implementation ready for review; remaining manual acceptance and CI limits are listed in the [pre-commit verification record](precommit_verification.md).

2026-11-26 · `AGRI-163-mobile-login-otp` was created from `AGRI-199-initial-mobile-app` and fast-forwarded to the published login commit `6e1b892`. [PR #70](https://github.com/KayPham05/AgriAI/pull/70) was open. The branch therefore includes the existing login dependency until it lands.

## Acceptance review · 2026-11-27

The branch now includes the merged mobile base `7beb3c3`. The implementation covers the S06 login OTP step, preserving the existing login and registration flows. Account 2FA must already be enabled on the server. An account with 2FA disabled receives a normal 200 login response and proceeds directly to Home.

| Requirement | Verification |
| --- | --- |
| 202 opens OTP without creating a session | LoginScreen component tests, adapter tests, physical Android |
| Single 8-digit field, formatted paste, numeric keyboard and autofill hint | Figma CodeField mapping, component test and Android visual review |
| Verify the login challenge and await SecureStore before entering Home | Adapter storage tests and physical Android flow |
| Reject wrong-purpose, expired, superseded and replayed codes | Live ASP.NET/PostgreSQL/SMTP integration |
| Resend replaces challenge and clears input | Adapter/component tests and physical Android resend |
| Guard concurrent verify/resend and cancel on Back | Native component tests |
| Network retry, timeout, rate limit and persistence failure | Adapter tests |
| Only User responses can authenticate on mobile | Adapter tests for rejected Admin responses |

The project's existing backend is configured for `agrivision_db` on port 5080 and the phone's project preview uses that endpoint over USB. The complete OTP test uses a separate database and SMTP inbox. Gmail delivery through the project's configured SMTP service and iOS runtime remain unverified. GitHub Actions has not run for these local changes.

Final local checks passed 31 adapter tests, 21 component tests, TypeScript, ESLint, offline Expo dependency validation and Android/iOS Hermes exports. The expanded live integration passed after waiting for the backend's actual code expiry. It verified wrong-purpose rejection, expiry, replacement, replay prevention, and the resulting User session. Adapter branch coverage was 85.37%. Physical Android evidence is recorded below. These checks complete the implementation and local QA scope. External Gmail delivery and iOS runtime acceptance remain separately unverified.

## Implementation

- The login route renders the OTP form on HTTP 202. The single 8-digit field supports formatted paste and OS one-time-code autofill. It adapts the supplied [Figma F02 CodeField](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S/AgriVision-Mobile-%C2%B7-AGRI-196-F02?node-id=6-65), including empty and invalid states, and reuses the login panel, navigation, and actions. No new visual asset was needed.
- The mobile adapter posts `{challengeId, code}` to `/api/auth/two-factor/login` and `{challengeId}` to `/api/auth/two-factor/login/resend`. Successful resend replaces the in-memory challenge and clears the input. The server owns expiry, resend delays and rate limits.
- Verify and resend cannot run concurrently. Back clears the step and aborts the pending operation. The app stores only a validated User session after successful verification and uses the existing protected Home flow. It keeps the code and challenge out of storage and navigation parameters.

## Verification

- 28 adapter unit tests passed, including five new OTP cases. The initial run reproduced the missing verify/resend implementation.
- 21 native component tests passed, including code entry, successful replacement, rejection of an invalid code, and cancelling a pending verify when leaving OTP. The original 202 view reproduced the missing input before the change.
- Two existing ASP.NET OTP tests passed against PostgreSQL Testcontainers with a test inbox.
- The mobile adapter integration passed against disposable ASP.NET Core, PostgreSQL and a local SMTP/TLS fixture. It enabled 2FA for an isolated test account, received a 202 without a session, rejected an invalid code, received a replacement by email, rejected the old challenge, verified the replacement, checked the resulting token at `GET /api/auth/me`, and rejected replay.
- TypeScript, ESLint, Expo offline dependency validation, and Android/iOS Hermes exports passed. GitHub Actions, iOS runtime and production email delivery were not run.
- Android device smoke was blocked in this environment. After a System UI stall and reinstall, Metro served the dev bundle, but Expo Go stayed on its loading screen during the retries. The OTP form was verified through native component tests.

## Follow-up verification · 2026-11-27

- Retested after fast-forwarding to the merged mobile base at `7beb3c3`. All 28 adapter tests and 21 native component tests passed again, as did TypeScript, ESLint, and the live PostgreSQL/SMTP OTP integration.
- The phone's QA build uses a distinct Expo Go scope and a loopback QA API. The project preview remains connected separately to the existing backend and `agrivision_db`.
- Physical Android USB smoke passed with the isolated QA build. Submitting email and password opened the OTP form, resend delivered a replacement through SMTP, and verifying that replacement opened protected Home for the QA user. The empty OTP screen was visually checked against the Figma CodeField. Delivery via the project's configured mailbox was not tested.

## Requested login CAPTCHA

The user requested adding the web login CAPTCHA to this worktree before the separate password-recovery tasks. The mobile form now generates five characters from the web's character set, displays them with a refresh action and a labelled input, and checks the answer locally before calling the login API. The CAPTCHA resets on refresh, mode change, return from OTP and failed login. Controls lock while a request is pending. Registration omits the CAPTCHA. It follows the web's client-side behavior and does not introduce server-side anti-bot verification.

The new regression tests first failed because the CAPTCHA controls were missing. All 23 component tests then passed, including incorrect-answer blocking, case-insensitive matching, refreshed input clearing, unchanged credential payload and registration/OTP behavior. TypeScript, ESLint and Android/iOS Hermes exports passed.

Follow-up on 2026-11-27: opened Login on the connected physical Android after clearing only the saved app session. UIAutomator confirmed the email/password fields, five-character CAPTCHA, refresh action, answer input and Login button are visible. Interactive CAPTCHA submission on this device remains unverified.

2026-11-27 UI follow-up: replaced the visible CAPTCHA refresh label with a reload icon in `reactNative/src/features/auth/screens/LoginScreen.tsx`, retaining the accessible button name and minimum touch target. Fresh verification: 23 component tests, typecheck and lint passed. Physical Android UIAutomator confirmed the reload symbol is visible and the old label is absent.

## Requested escalating password-login lockout

Implemented the user-confirmed five-failure batches with 5/10/20-minute doubling, persistent PostgreSQL state and mobile duration feedback. See [behavior, affected paths, test evidence and local migration](login_lockout.md). Local project API smoke passed using a temporary fixture, which was removed.

## Requested registration confirmation and consent (2026-11-27)

Added a masked confirmation field with independent visibility control and an initially unchecked terms checkbox to mobile registration. Exact password comparison and explicit consent are required before calling the registration handler; confirmation and consent remain client-only and do not change the API payload or imply persisted consent auditing. Switching tabs resets these values. Confirmation, checkbox and visibility controls lock during a pending request. The terms disclosure reuses the three existing sections from the web `LoginModal.tsx`; no new legal text or external URL was invented.

Affected paths: `reactNative/src/features/auth/screens/LoginScreen.tsx`, new `RegistrationConsent.tsx`, and `reactNative/tests/component/LoginScreen.test.tsx`. New tests first failed on the missing confirmation/checkbox. Fresh results: all 27 component tests passed; typecheck and lint passed; Android/iOS Hermes export to ignored `dist/agri163-registration-confirmation` passed. Coverage includes missing/mismatched confirmation (including significant whitespace), consent checked/un-checked, unchanged registration payload, read-without-consent, tab reset, independent masking and pending-request controls.

Expo dependency check executed with network access and failed on existing version drift: expo 58.0.26 versus ~58.1.0, expo-router 58.0.32 versus ~58.0.33, jest-expo 58.0.15 versus ~58.0.16. No dependencies were changed for this UI request. `adb devices` returned no connected devices, so physical rendering of the new registration controls was not checked. No new backend/DB or CI run was needed/performed for this client-only change; no commit/push.

The user separately confirmed receiving the login OTP in their real Gmail inbox. This is user-reported delivery evidence; completion of the full Gmail-to-Home flow was not newly observed by the agent.

2026-11-27 physical-device follow-up: user reconnected the Android phone. ADB detected the device; USB forwarding for Metro 8090 and API 5080 was present. Relaunched Expo Go and opened Registration. Screenshot review confirmed the confirmation field, independent eye control, consent checkbox and terms disclosure render without clipped labels. A scroll and fresh UIAutomator tree confirmed the enabled Create account button is reachable within the visible viewport. Artifacts are ignored under `reactNative/dist/agri163-registration-device*`. No credentials were entered and no account was created during this layout check; device submission validation remains separate from the passing component tests.

2026-11-27 inline-terms correction: removed the separate read-terms action in `RegistrationConsent.tsx`. The underlined terms text inside the consent sentence now toggles the same content, independently of the sibling checkbox. The checkbox retains a 48dp touch target. Updated the regression test to open/collapse through the inline text and verify consent remains unchecked. Red: one test failed on the missing inline action; green: all 27 component tests, typecheck, lint and Android/iOS exports passed. New export: ignored `reactNative/dist/agri163-inline-terms`. ADB reported no devices during this follow-up, so this specific inline interaction has not been checked on physical Android. Existing Expo dependency drift from the previous check was not changed or rechecked; no dependencies added, commit or push.

## Mandatory terms reading before registration (2026-11-27)

The user now requires opening the inline terms text and reaching the end before consent can be checked. `RegistrationConsent.tsx` opens the existing terms in a full-screen native Modal with its own ScrollView and close control. The checkbox starts disabled, remains disabled after closing early, and unlocks after the bottom is reached. If all content fits in the measured viewport, viewing it unlocks consent without an unnecessary scroll. Unlocking does not check the box. Closing with the Android back action is allowed and does not bypass reading. The form separately checks both completion and explicit consent before calling the existing registration API. Switching tabs resets reading/consent state. No API contract, persisted acceptance audit, dependency or backend change was introduced for this UI requirement.

Changed: `reactNative/src/features/auth/screens/{LoginScreen,RegistrationConsent}.tsx`; component tests plus `readRegistrationTerms.ts`; test setup eagerly resolves native lazy exports before interaction timers. The new checkbox-lock test first failed against the prior enabled checkbox. Full-suite attempts initially timed out in the existing first animation test during lazy native initialization. After preloading those exports without changing timeout defaults or mocking animation behavior, the fresh default suite passed all 30 tests in 6 suites. Fresh typecheck and lint also passed. Tests cover closing early, bottom scroll, short content, no automatic consent, both form conditions, pending controls and registration reset. Test fixtures supply native geometry events because the component runner has no layout engine.

ADB briefly detected the phone, but the subsequent launch command returned no devices; this exact native reading flow remains unverified. Metro was restarted at localhost:8090 for preview. Existing Expo compatibility drift remains as previously recorded; GitHub Actions was not run, and no commit/push occurred.

Final bundle verification for mandatory terms reading: Android and iOS Hermes exports passed to ignored `reactNative/dist/agri163-terms-reading` (log: `dist/terms-reading-export.log`).

Pre-commit follow-up: added a regression for adapter field errors and clearing only the edited field. Fresh component coverage run passed 31 tests; current build/test/scanner evidence is consolidated in [pre-commit verification](precommit_verification.md). Historical results below/above remain dated records, not claims of a new run.
