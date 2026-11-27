# AGRI-158 startup and session restoration

2026-11-25 Home handoff and live verification: see [startup integration](startup-integration.md). Earlier status in the report below is historical.

2026-11-25 update: [Figma references, startup UI and retry verification](figma-startup.md). The checks below describe the original 2026-11-24 implementation.

2026-11-24. Branch `AGRI-158-mobile-session-startup` from `AGRI-199-initial-mobile-app` at `f631185`. This work uses a separate worktree. The user confirmed continuing with AGRI-158 after the Welcome implementation on AGRI-159.

- The [root route](../../../reactNative/src/app/index.tsx) starts [StartupScreen](../../../reactNative/src/features/auth/screens/StartupScreen.tsx). The screen shows loading, opens the existing Welcome on Guest, offers retry for recoverable errors, and reports restored or unsupported accounts. It uses native safe area, scrolling, scalable text and the existing theme.
- [Session restoration](../../../reactNative/src/features/auth/restoreSession.ts) reads the [SecureStore token](../../../reactNative/src/lib/storage/sessionToken.ts) and checks Bearer authentication against [the existing `GET /api/auth/me` action](../../../backend/src/AgriVision.API/Controllers/AuthController.cs). A 401 clears the token before opening Welcome. Timeout, server and storage errors keep the recoverable path available. Admin has no mobile session. The ten-second deadline is a client request timeout.
- `.env.example`, `app.json`, the mobile manifest and lockfile declare the backend origin and [SDK-compatible SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). The [development instructions](../../../reactNative/docs/development.md) describe the token key for future login integration.

| Behavior | Evidence |
|---|---|
| No stored token opens Guest without contacting the backend | Unit test passed. A cold Android emulator launch also opened the existing Welcome. |
| Valid Bearer token restores User identity | Unit test passed with a controlled HTTP response. Home destination and live-token device check pending. |
| 401 clears token before Guest | Unit test passed including SecureStore failure handling with a test double. Native deletion and API runtime acceptance pending. |
| Timeout and network/server failure keep the token and allow retry | Unit tests passed with controlled transport and storage. Native network failure and retry interaction pending. |
| Admin and malformed responses cannot grant a mobile User session | Unit tests passed. |

The [unit suite](../../../reactNative/tests/unit/restoreSession.test.mjs) first failed because the implementation module was absent. `pnpm.ps1 test:session` passed **12/12** with **91.89% branch coverage for `restoreSession.ts`**. Storage and HTTP boundaries used controlled inputs. Coverage is limited to that module.

| Check | Result |
|---|---|
| `pnpm.ps1 typecheck` and `pnpm.ps1 lint` | Passed. |
| `pnpm.ps1 exec expo install --check` | Passed in offline mode against bundled Expo compatibility data. Expo warns that offline validation is limited. |
| `pnpm.ps1 exec expo export --platform all --output-dir dist/agri158-export --max-workers 2` | Passed. Android and iOS Hermes bundles exported. iOS runtime remains untested. |
| [Android Guest smoke](../../../reactNative/tests/e2e/startup_guest_smoke.py) | Passed after a cold launch on Android 13 API 33 with Expo Go 58.0.5. The final run returned exit 0. Reviewed the screenshot and retained XML and PNG under ignored `reactNative/dist/agri158-native/`. The first manual app open happened before Metro was listening and showed Expo's connection error. The final run started with Metro ready and the one-time Expo Go tutorial dismissed. |
| Source checks | `git diff --check` passed. Report links resolved and the Python script parsed. |

The local mobile base has no User Home, private cache, or deep-link return destinations. When those exist, scope private cache and navigation by verified `userId`, reset both on identity changes and allow only actual whitelisted return targets. Login and OTP integration own writing the token after successful server confirmation. No live test backend answered on port 5034 and the local Docker daemon was unavailable during the check. Token scenarios with a real backend remain blocked; this report does not establish Jira acceptance.
