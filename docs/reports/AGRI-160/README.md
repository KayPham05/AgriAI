# AGRI-160 · Native login (S03)

2026-11-25 · `AGRI-160-mobile-login` based on `AGRI-199-initial-mobile-app` at `87006f1`.

## Local delivery

The branch was fast-forwarded to the existing AGRI-158 commit `ba86a80` before committing the auth change. The integration PR targets `AGRI-199-initial-mobile-app`. While PR #69 is open, its existing commit also appears in that comparison. After PR #69 lands, check the merge base and confirm that the compare shows only the auth delta. Registration is included on this branch at the user's request and tracked under AGRI-161.

## Integrated navigation and startup restore

The user requested completing the end-to-end flow locally. The runtime reuses startup, Home and SecureStore from AGRI-158 and connects login and registration to that provider. [PR #69](https://github.com/KayPham05/AgriAI/pull/69) tracks the dependency independently.

- A verified User response saves the token before publishing the authenticated session. The router redirects the active auth screen to a fixed `/home` route. Home access requires a verified User, and Guests start at Welcome.
- On cold launch, the startup provider reads the same SecureStore key and validates the token with `GET /api/auth/me`. A 401 clears the token before Welcome. Timeouts and network errors preserve it and offer a retry.
- A login 202 still displays the pending OTP state without saving a token or granting Home access. OTP entry, verification and resend remain in AGRI-163.

Fresh local verification passed 18 component tests, 36 adapter unit tests, and a live ASP.NET Core/PostgreSQL integration test covering registration, invalid credentials, login, restored profile and revoked-token cleanup. The new component test failed before wiring because successful login stayed on its confirmation screen.

Android emulator smoke passed all four scenarios with Expo Go and the live service. Guest Home links opened Welcome, login opened the named User's Home, a cold relaunch restored Home, and signed-in Login links went back to Home. Typecheck, lint, offline Expo dependency validation, and Android/iOS Hermes exports passed. iOS runtime and GitHub Actions remain unrun.

## Shared auth layout update

At the user's request, the same branch now previews both forms. The login route uses the web modal's leaf mark, heading, description and Login / Register tabs, adapted to a single scrolling native panel using the Figma fields and button below. Switching tabs clears the password, visibility toggle and validation state while preserving email. Existing sign-in and OTP handling still run on the Login tab. See the [registration report](../AGRI-161/README.md) for verification of the combined implementation. The results below record the earlier login-only implementation.

The shared panel now fades and moves up on entry. On tab changes the fields fade and move up while the tab controls keep their position. See the [shared motion verification](../AGRI-161/README.md#shared-form-motion).

## Design and implementation

The supplied [Figma F02 file](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S/AgriVision-Mobile-%C2%B7-AGRI-196-F02) has no dedicated S03 frame. The [Login screen](../../../reactNative/src/features/auth/screens/LoginScreen.tsx) composes its AppHeader (6:105), TextField default/error/secure (6:36, 6:46, 6:56), Button default/loading (6:3, 6:9), and InlineNotice error (7:137). The app bundles three 72 px transparent icon exports at 24 dp. The form uses safe areas, scrolls with the keyboard, scales with system text, and follows the web login form's email and password interaction patterns.

Welcome opens the fixed `/login` route. The [login adapter](../../../reactNative/src/features/auth/submitLogin.ts) calls `POST /api/auth/login` with email and password. It normalizes email, preserves the password as entered, and validates the 72-byte UTF-8 limit. Production API configuration requires an HTTPS origin. It blocks duplicate submissions in the screen and handles 401, 429, network and service errors, timeout, and cancellation.

- A 200 for a User account awaits [Expo SecureStore](../../../reactNative/src/lib/storage/loginToken.ts) before showing signed-in confirmation. Storage uses the session key shared with AGRI-158. A response for an Admin account is rejected.
- A 202 retains its challenge in component memory and shows that OTP is required. Token storage is untouched on this branch.

## Verification

| Check | Result on 2026-11-25 |
| --- | --- |
| `test:login` | 20 passed. Adapter branch coverage 86.21%, line coverage 100%. Includes 200/202, 401/429, Admin rejection, timeout and cancellation. |
| `test` | 12 component tests passed. Includes Welcome intent, show/hide password, duplicate-submit prevention, 202 handoff and retryable 401. |
| `test:login:integration` | 1 passed against ASP.NET Core and a disposable PostgreSQL database. Real 401 left storage untouched, real 200 produced a User token verified by `GET /api/auth/me`, and fixture sessions were revoked. |
| `typecheck` and `lint` | Passed. |
| Expo dependency check | Passed in offline mode against the local SDK dependency list. |
| Expo Doctor | 20/20 checks passed. |
| Android and iOS Hermes exports | Both passed. |
| Android emulator + Expo Go 58 | Passed Welcome → Login, required-field errors, a live 401 and a live 200 with awaited SecureStore write. Reviewed screenshots of the default and field-error states. |

## Earlier integration status

- The original login-only worktree did not yet include Home navigation and startup restore. The current local integration is recorded above.
- Production OTP entry, verify and resend belong to AGRI-163. The 202 response and memory-only handoff were exercised with controlled responses. Live 2FA and iOS runtime were not run.
- Google sign-in is unavailable pending approved native configuration. Registration and recovery are separate tickets. GitHub Actions for AGRI-160 have not run.
