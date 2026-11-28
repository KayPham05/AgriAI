# AGRI-158 Startup and Home integration

2026-11-25, `AGRI-158-mobile-session-startup`. The task worktree was fast-forwarded from `f631185` to mobile base `87006f1`, which already includes AGRI-159. Overlapping local files were backed up before the fast-forward and their AGRI-158 changes were reapplied alongside the merged Welcome. The latest diff is scoped to AGRI-158.

- [The Expo layout](../../../reactNative/src/app/_layout.tsx) provides a single startup session and protects Home with a verified User guard. A Guest asking for `/home` redirects to the public startup route. When the guard switches, [Expo Router removes disallowed entries from navigation history](https://docs.expo.dev/router/advanced/protected/). Home is keyed by the verified account ID. The app accepts no external return target or private persisted cache in this task.
- [The User Home landing](../../../reactNative/src/features/home/screens/UserHomeScreen.tsx) uses the [Figma App Shell greeting](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1709) and displays the name returned by the backend. The AGRI-159 Welcome is the Guest destination. Startup retains its Figma loading and retry cards. The temporary success state was removed after connecting Home.
- The [session adapter](../../../reactNative/src/features/auth/restoreSession.ts) accepts only a validated User profile with a name before allowing Home. It clears the token on 401 and preserves it on timeout and recoverable failures. The [provider](../../../reactNative/src/features/auth/StartupSession.tsx) keeps the verified identity in memory and does not expose the token to any route.

## Verification

- The RED unit run had three assertion failures because the validated profile did not carry a name. The GREEN suite passed 13/13 with 87.76% branch coverage for `restoreSession.ts`.
- The [live API integration test](../../../reactNative/tests/integration/startupApi.test.mjs) passed. An API image was built from the branch backend source and run with a new PostgreSQL 16 database on an isolated Docker network. Migrations ran explicitly before the API started. The test registered a unique User, restored its actual JWT, revoked the server session, observed the 401 path, and verified local token deletion. This test uses an in-memory storage boundary.
- The offline frozen install passed after reconciling the mobile base lockfile with the previously installed SecureStore snapshot. Optional Parcel watcher scripts remained disabled. The existing test dependencies were inherited from the mobile base.
- Typecheck and lint passed. Jest initially reported zero tests in the Windows `.cache` worktree because the absolute glob escaped the dot and the preset allowed empty suites. Relative test discovery with explicit roots and `passWithNoTests: false` found all three suites. The full run passed 9/9 component tests, including the retry control and the inherited Welcome tests.
- Expo dependency validation passed against bundled SDK data in offline mode. After removing the emulator resolver, fresh Android and iOS Hermes exports succeeded under ignored `reactNative/dist/agri158-final/` and bundled the three startup icons and existing Welcome assets.

## Android integration

The dedicated Android 13 emulator ran Expo Go 58.0.5. A temporary Metro resolver seeded SecureStore for a new test account and forwarded real Bearer traffic to the disposable ASP.NET backend through loopback. Only the timeout response was delayed by the fixture. The fixture issued no fake successful profile and used the app's actual SecureStore read and delete calls. The temporary resolver was moved out of the app root before bundle export.

| Scenario | Result |
|---|---|
| Cold Guest opens a Home deep link | Protected route redirected into AGRI-159 Welcome. No profile request. |
| Cold start with a valid server-issued token | Backend returned 200. Home displayed the first account's real name. |
| Cold start with the saved token and delayed profile response | The UI showed the startup timeout and exposed a usable retry. |
| Tap retry after the delay was removed | Exactly one new verification request returned 200 and opened Home. |
| Cold start after server logout revoked this token | Backend returned 401 and app opened Welcome. |
| Cold start again after the 401 | Welcome opened without a profile request, confirming SecureStore deletion. |
| Seed a different verified account and cold start | Home displayed the second identity with no stale first-account name. |

The harness exited 0, and the seven fresh accessibility dumps and screenshots are under ignored `reactNative/dist/agri158-integration/`. Transient Android UI dump warnings were retried with new dumps. Home and timeout screenshots were visually reviewed. The QA API, database and network were stopped after the run. Installed iOS and physical-device runtime remain untested.

## Pre-commit verification

On 2026-11-25, reran typecheck, lint, 13 session unit tests, 9 component tests, and the live integration test with a fresh disposable PostgreSQL database. All passed. The Expo dependency check also passed against bundled metadata offline. The seven Android scenarios and both Hermes exports recorded above are from the earlier run of the same application changes. GitHub Actions has not run for the local delivery commit.
