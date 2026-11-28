# AGRI-165 - Verify password reset code

2026-11-28: implemented on `AGRI-164-mobile-forgot-password` at the user's explicit request, alongside AGRI-164/166.

`reactNative/src/features/auth/screens/PasswordRecoverySteps.tsx` maps Figma CodeField `6:66` to one accessible eight-digit native field, supporting formatted paste/autofill. `submitLogin.ts` posts only `{code}` to the existing recovery verification endpoint; only HTTP 204 opens password entry. Resend reuses the neutral request endpoint, clears the entered code on acceptance, and never implies confirmed delivery. Invalid/expired codes, network failures and pending requests keep retry/back available without token persistence or invented timers. Route wiring is in `src/app/login.tsx`; corresponding unit/component/integration tests are under `reactNative/tests`.

Fresh evidence: 58 combined Node tests and 42 component tests passed; recovery-step branch coverage 83.15%, shared adapter 86.47%; typecheck/lint and Android/iOS exports passed. The isolated real API/PostgreSQL/STARTTLS test passed verification using a delivered code and rejected the consumed code after reset. Complete commands, historical runs, fixture setup and limits are in the [AGRI-164 report](../AGRI-164/README.md) and [mobile guide](../../../reactNative/docs/agri164-forgot-password.md).

Open acceptance: real Gmail/device full-flow run, keyboard/large fonts and iOS runtime. Existing Expo dependency drift remains. No commit/push or GitHub Actions result.

## User acceptance follow-up - 2026-11-28

After restarting Metro from the AGRI-164 worktree with a cleared cache and reopening the USB Android preview, the user confirmed that the recovery flow works. Recorded as user-reported physical-device flow acceptance; the agent did not observe each submitted code/password or independently verify mailbox delivery in this run. This supersedes the earlier pending full-flow user acceptance note. Large-font/accessibility variants and iOS runtime remain unrun; existing Expo version drift remains. No new automated tests ran for this documentation-only update; earlier results retain their original scope. No commit or push.

## Hardening follow-up - 2026-11-28

Aligned the three flagged Expo packages and lockfile, added native alert semantics for recovery errors and improved alert/masking assertions, and fixed the Windows SMTP-capture overwrite race. Fresh checks: 58 Node tests, 42 component tests, three isolated real API/DB/SMTP recovery runs, typecheck/lint, frozen install, Expo compatibility and Android/iOS exports passed. Initial fixture and concurrent-test failures are preserved in the [main follow-up evidence](../AGRI-164/README.md). Android request/code controls were checked at font 1.3 and the original setting restored. Large-font password entry, actual iOS runtime and spoken screen-reader acceptance remain unrun; no commit/push.

Android font follow-up: the same request/code checks also passed at font scale 2.0. Captures showed wrapping labels/buttons and scrollable controls without overlapping text; the original 1.0 setting was restored. An initial 2.0 helper attempt stopped on Welcome because its Login button was below the viewport; the local helper was corrected to scroll before selecting it, with no production layout change. These checks cover request/code screens, not large-font password entry or spoken screen-reader output. Captures/local helper remain ignored.
