# AGRI-164 ? Mobile Forgot Password

Date: 2026-11-28. Branch: `AGRI-164-mobile-forgot-password`. Worktree: `E:/AgriAI/.cache/AGRI-164`.

## Status and scope

Email-request implementation is complete and automated checks passed; native-device and real-mailbox recovery acceptance remain pending. AGRI-164 covers requesting recovery by email, not code verification (AGRI-165) or changing the password (AGRI-166).

The worktree was created from fetched `origin/AGRI-199-initial-mobile-app` (`7beb3c3`) and fast-forwarded to existing AGRI-163 dependency commits through `25bf844`, since AGRI-163 has not merged into the mobile base. No new commit was created by that fast-forward. Its upstream push target was unset. Root workspace dirty files and all other branches were preserved. A future integration PR should target `AGRI-199-initial-mobile-app`; until AGRI-163 merges, its existing dependency commits also appear in the comparison.

## Implemented behavior

- The Guest login screen exposes a pending-aware Forgot Password action and prefills the typed email. Opening recovery clears the password; returning keeps the user on Login.
- The recovery screen validates email through the shared adapter, sends only `{email}` to `POST /api/auth/forgot-password`, and treats an empty HTTP 202 as accepted. It does not parse a missing JSON body or infer whether an account exists or email was delivered.
- The accepted state uses neutral copy, allows changing email, and provides Back to Login. It does not show a fake code-validation or password-change screen.
- Pending submission disables the email/submit controls and prevents duplicate requests. Validation, network, timeout, rate-limit and service errors leave retry available.
- Toolbar Back, Back to Login, hardware Back and unmount cancel pending work; late responses cannot navigate to an accepted/authenticated state. No token or session is created or stored by the request.
- Email/accepted state stay in memory within the Guest login flow. No recovery email/code is placed in route URLs or persistent storage. No fixed resend cooldown or code TTL is invented in the mobile UI.

## Design and affected paths

There is no standalone Forgot Password frame in the inspected Figma App Shell or notebook pages. The implementation follows the agreed web recovery form direction and existing mobile auth layout. Figma session inspected the file pages and high-fidelity [TextField states](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=6-35) and [primary Button](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=6-3), including their screenshots. Native mapping preserves a visible label/helper, 52dp field minimum, error state, focus outline and 48dp action minimum. Existing theme, ActionButton, motion/reduced-motion hook, leaf mark and Back asset are reused; no temporary Figma asset URLs or new dependencies are included.

Changed/new paths:

- `reactNative/src/features/auth/screens/ForgotPasswordScreen.tsx`: email and neutral acceptance UI.
- `reactNative/src/features/auth/screens/LoginScreen.tsx`, `reactNative/src/app/login.tsx`: entry and real API wiring inside the existing Guest login route.
- `reactNative/src/features/auth/submitLogin.ts`: request adapter reusing the existing transport, cancellation and deadline behavior.
- `reactNative/src/theme/tokens.ts`: Figma focus-color token.
- `reactNative/tests/{unit,component,integration}`: adapter, form, native Back, actual route and live-local HTTP regressions; package scripts and mobile test/handoff docs.

## Actual verification

- Red: all seven new adapter tests failed because the request function was absent; the form suite initially could not resolve the new screen. After implementation, the tests passed. A test passed a missing hardware Back event argument; this was corrected to the installed native event contract without weakening its assertions.
- Combined Node unit command: 53 passed, zero failures/skips. Includes 7 reset-request tests and existing login/OTP/startup regressions. Shared auth adapter branch coverage: 86.30%; restore-session adapter: 87.76%.
- `pnpm.ps1 test:coverage`: 37 passed in 7 suites, zero failures. ForgotPasswordScreen branch coverage: 87.17%; LoginScreen: 84.56%. Whole Jest source scope: 70.03%; separate Node adapter coverage is not merged into that figure.
- `pnpm.ps1 typecheck` and `pnpm.ps1 lint`: passed.
- Existing backend API tests filtered by `FullyQualifiedName~ForgotPassword|FullyQualifiedName~ResetPassword`: 5 passed, zero failures/skips, against disposable real PostgreSQL with a controlled inbox. Covers known/unknown email, captured recovery code, failures and reset contracts. TRX: ignored `.cache/agri164/api/password-recovery.trx`.
- `pnpm.ps1 test:password-reset:integration`: 1 passed against the actual local project backend at port 5080. Checked real database health and the neutral 202 contract for a randomly generated unknown address. No real-user email was sent, no account created, and no database reset/migration performed for this task.
- API source and database contracts are unchanged. Existing project backend was started with its previously tested image/settings; no real-account password or session was modified.

## Remaining checks and follow-up

The read-only Expo compatibility check fails on pre-existing pinned-version drift: expo 58.0.26 versus ~58.1.0; expo-router 58.0.32 versus ~58.0.33; jest-expo 58.0.15 versus ~58.0.16. These were left unchanged. ADB listed no physical device, so keyboard, large-font and screen rendering on hardware remain unverified; iOS runtime is also unrun. No GitHub Actions run, commit or push was requested/performed for AGRI-164.

The accepted email is the in-memory handoff for AGRI-165. Continue the code-verification/new-password flow in its respective tasks. Generic 202 acknowledgement is not evidence of actual delivery to Gmail; that needs an explicit real-mailbox/device acceptance run.

Final bundle check: Android and iOS Hermes exports passed with `pnpm.ps1 exec expo export --platform android --platform ios --output-dir dist/agri164-export`. Outputs and the export log remain ignored.

## Physical Android follow-up ? 2026-11-28

After the user reconnected the phone, ADB eventually detected it. Started the AGRI-164 Metro preview at localhost:8091 with the existing real local API at 5080, restored USB forwarding for both, and navigated Welcome ? Login ? Forgot Password. A fresh UIAutomator tree and screenshot confirmed the email field, Send code and Back to Login actions are visible and accessible without clipped labels at the current device scale. The form was left open for the user. No credentials were entered and no recovery email request was submitted during this visual check. The screenshot/XML remain ignored under `reactNative/dist/agri164-*`. Keyboard, actual mailbox delivery and completion through later recovery tasks remain separate acceptance checks.
# Continuation on the same branch - 2026-11-28

The user explicitly authorized implementing AGRI-165 and AGRI-166 on `AGRI-164-mobile-forgot-password`. This entry supersedes the earlier statement that verification/password entry were future work; the earlier verification remains a historical record.

- The accepted request now opens the eight-digit code field, followed by server verification, new-password/confirmation fields, and a success state with Back to Login. Recovery data remains in component memory. The existing real project API configuration is used by the app; no backend contract or project DB schema was changed.
- Inspected Figma CodeField `6:66` for accessible single-field input, paste/autofill, helper, typography and native touch sizing; reused the existing auth layout, password field and eye asset. No new dependencies were installed.
- Added `PasswordRecoverySteps.tsx`, recovery adapter methods and route wiring. Payloads are exactly `{code}` for verification and `{code,password}` for reset. Only HTTP 204 advances those operations. Confirmation is client-only; minimum six characters and maximum 72 UTF-8 bytes are enforced. Failure/expiry/resend/pending/cancel paths do not create a session or automatically repeat requests.
- Fresh combined Node run: **58 passed**, zero failures/skips; auth adapter branch coverage **86.47%**, session adapter **87.76%**. Fresh Jest coverage: **42 passed in 8 suites**; recovery steps branch coverage **83.15%**, request screen **89.36%**. The route test now exercises request -> verify -> reset -> Login and asserts no SecureStore write. Whole Jest branch coverage **71.46%**, with separate Node coverage not merged.
- Typecheck and lint passed. Android/iOS Hermes exports passed. Expo compatibility check still fails on the same three pre-existing version mismatches recorded above; no packages were changed.
- `pnpm.ps1 test:password-recovery:integration`: **1 passed** against the real source-matching backend image, disposable PostgreSQL and STARTTLS SMTP inbox. Verified SMTP code delivery to the controlled inbox, verification, password replacement, consumed-code rejection, old-session revocation, old-password rejection, explicit new-password login and logout. The final tracked fixture refuses an occupied port and checks ownership of loopback-only port 15066. It separately migrates only its new QA database and removes its containers/network and generated keys/certificate. Initial fixture attempts exposed Windows bind-mount and internal-network port-publishing issues; the final runner uses docker cp and a dedicated bridge. A final docker listing confirmed no recovery QA containers remained.
- Phone remained connected and the current branch's Login preview was observed after launch. Full code/password screens, keyboard/large-font behavior, real recovery delivery to Gmail and completion on hardware are **not yet accepted**. iOS runtime is unrun. The earlier Android email-form visual check remains valid only for that form. No real user password was reset by the agent.
- No commit, push, PR creation, merge or GitHub Actions success is claimed. Unmerged AGRI-163 dependency and root-workspace dirty files remain preserved. See the [AGRI-165 report](../AGRI-165/README.md), [AGRI-166 report](../AGRI-166/README.md) and [mobile reproduction guide](../../../reactNative/docs/agri164-forgot-password.md).


## User acceptance follow-up - 2026-11-28

After restarting Metro from the AGRI-164 worktree with a cleared cache and reopening the USB Android preview, the user confirmed that the recovery flow works. Recorded as user-reported physical-device flow acceptance; the agent did not observe each submitted code/password or independently verify mailbox delivery in this run. This supersedes the earlier pending full-flow user acceptance note. Large-font/accessibility variants and iOS runtime remain unrun; existing Expo version drift remains. No new automated tests ran for this documentation-only update; earlier results retain their original scope. No commit or push.

## Compatibility and accessibility fixes - 2026-11-28

Scope: the user requested fixing the remaining actionable issues on the same AGRI-164 branch. No commit/push or workflow changes were authorized.

- Aligned only the three direct Expo packages flagged by the existing check: Expo 58.0.26 -> 58.1.0, Expo Router 58.0.32 -> 58.0.33, Jest Expo 58.0.15 -> 58.0.16. Updated package.json and pnpm-lock.yaml; no SDK major, React Native, Node or pnpm version change. The old shared node_modules junction was removed without deleting its target; AGRI-164 now has an isolated ignored install and AGRI-163 retains Expo 58.0.26. No dependency folders or generated bundles are tracked. Version alignment follows the [Expo CLI dependency guidance](https://docs.expo.dev/more/expo-cli/).
- Recovery email, invalid/expired code, confirmation and service errors now expose the native alert accessibility role alongside their live-region text. Existing theme, controls, layout and API payloads are retained. Component tests assert alerts appear only for errors and clear on editing; password fields remain independently masked/toggleable. Red check: 3 failures/6 passes in the two recovery suites due to missing alert roles. The final full suite passed after the fix.
- Fixed a real Windows fixture race found during this follow-up: Docker capture repeatedly overwrote JSON inbox files while Node read them (EPERM). Each run now owns a fresh directory; Docker copies into staging and publishes complete messages atomically once. Capture failures are surfaced. Three consecutive fresh-process/DB/SMTP runs passed after the fix; the initial failure is retained here rather than counted as a pass.
- Fresh checks: typecheck and lint passed; Expo dependency check now reports Dependencies are up to date. Frozen/offline install with ignored scripts passed. Combined Node adapters: 58 passed, zero failures/skips (auth branches 86.47%, session 87.76%). Full Jest: 42 passed in 8 suites, zero failures; request-screen branches 89.79%, recovery-step branches 84.21%, whole Jest scope 71.69%. Separate Node coverage is not merged. Android and iOS Hermes exports passed using the updated dependencies.
- The first concurrent cold export/coverage run timed out in keeps email and retry available after validation or network failure and then reported a cascading Pressability error in locks repeat requests and shows a neutral acknowledgement only after 202 (40 passed/2 failed). After export finished, the unchanged full suite passed serially in 28.593s versus 88.198s for the concurrent run. Resource contention is an inference; no timeout increase, skipped test or weakened assertion was used.
- Physical Android: verified the request screenshot and code-entry/actions at font scale 1.3 with an unknown synthetic address against the existing project API. Empty code could not verify; resend/change-email controls remained reachable by scrolling. The first local automation attempt used system Back to dismiss the keyboard and navigated away; the helper was corrected to use the email Send action. Font scale was restored to its original 1.0. Captures remain ignored under reactNative/dist/recovery-accessibility. This is a layout/input check, not an additional real Gmail delivery or password-change acceptance run.
- Still unrun: actual iOS runtime, spoken TalkBack/VoiceOver acceptance, and large-font verification of the new-password screen. The user's earlier normal-font end-to-end acceptance remains a separate record. No GitHub Actions success is claimed; no commit, push or merge was performed.

Android font follow-up: the same request/code checks also passed at font scale 2.0. Captures showed wrapping labels/buttons and scrollable controls without overlapping text; the original 1.0 setting was restored. An initial 2.0 helper attempt stopped on Welcome because its Login button was below the viewport; the local helper was corrected to scroll before selecting it, with no production layout change. These checks cover request/code screens, not large-font password entry or spoken screen-reader output. Captures/local helper remain ignored.

## Requested local delivery - 2026-11-28

The user requested local commits and an English PR description without a push. Fresh source, integration, bundle, commitlint and Gitleaks evidence is recorded in [pre-commit verification](precommit_verification.md). Two logical commits separate dependency alignment from the complete recovery flow; existing AGRI-163 dependency history is retained. GitHub Actions and remaining device acceptance are not recast as passing.
