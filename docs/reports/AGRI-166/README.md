# AGRI-166 - Set a new password

2026-11-28: implemented on `AGRI-164-mobile-forgot-password` at the user's explicit request, alongside AGRI-164/165.

`reactNative/src/features/auth/screens/PasswordRecoverySteps.tsx` opens new-password and confirmation fields after server code verification. Each has a visibility control; validation checks minimum six characters, maximum 72 UTF-8 bytes and exact confirmation without trimming the password. `submitLogin.ts` sends only `{code,password}` to the existing reset endpoint. Only HTTP 204 shows success. Expiry returns to code entry, clears passwords and offers resend; completion clears secrets and offers Login without automatic authentication. Route wiring and unit/component/integration coverage are in `reactNative/src/app/login.tsx` and `reactNative/tests`.

Fresh evidence: 58 combined Node tests and 42 component tests passed; recovery-step branch coverage 83.15%, shared adapter 86.47%; typecheck/lint and Android/iOS exports passed. A real API/PostgreSQL/STARTTLS test proved password replacement, old-password rejection, single-use consumption, old-session revocation, explicit login with the new password and logout. Only isolated synthetic accounts were modified; the project database was not reset or migrated. See [full evidence](../AGRI-164/README.md) and [reproduction](../../../reactNative/docs/agri164-forgot-password.md).

Open acceptance: real Gmail/device full-flow run, keyboard/large fonts and iOS runtime. Existing Expo dependency drift remains. No commit/push or GitHub Actions result.

## User acceptance follow-up - 2026-11-28

After restarting Metro from the AGRI-164 worktree with a cleared cache and reopening the USB Android preview, the user confirmed that the recovery flow works. Recorded as user-reported physical-device flow acceptance; the agent did not observe each submitted code/password or independently verify mailbox delivery in this run. This supersedes the earlier pending full-flow user acceptance note. Large-font/accessibility variants and iOS runtime remain unrun; existing Expo version drift remains. No new automated tests ran for this documentation-only update; earlier results retain their original scope. No commit or push.

## Hardening follow-up - 2026-11-28

Aligned the three flagged Expo packages and lockfile, added native alert semantics for recovery errors and improved alert/masking assertions, and fixed the Windows SMTP-capture overwrite race. Fresh checks: 58 Node tests, 42 component tests, three isolated real API/DB/SMTP recovery runs, typecheck/lint, frozen install, Expo compatibility and Android/iOS exports passed. Initial fixture and concurrent-test failures are preserved in the [main follow-up evidence](../AGRI-164/README.md). Android request/code controls were checked at font 1.3 and the original setting restored. Large-font password entry, actual iOS runtime and spoken screen-reader acceptance remain unrun; no commit/push.

Android font follow-up: the same request/code checks also passed at font scale 2.0. Captures showed wrapping labels/buttons and scrollable controls without overlapping text; the original 1.0 setting was restored. An initial 2.0 helper attempt stopped on Welcome because its Login button was below the viewport; the local helper was corrected to scroll before selecting it, with no production layout change. These checks cover request/code screens, not large-font password entry or spoken screen-reader output. Captures/local helper remain ignored.
