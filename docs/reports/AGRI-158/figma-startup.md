# AGRI-158 startup UI and retry

Historical UI snapshot. The later [startup integration](startup-integration.md) replaces the temporary success notice with the protected Home route and verifies it with real backend tokens.

2026-11-25, branch `AGRI-158-mobile-session-startup`. The five pages in [AGRI-196 F02](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S) contain shared states and Home references, with no dedicated S01 frame. S01 composes the existing patterns rather than importing a full Home layout.

| Figma component | Native use |
|---|---|
| [LoadingState / Initial](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=7-104) | Checking the saved session. The icon rotates only when reduced motion is off. |
| [ErrorState / Network](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=7-70) | Transport failure with a secondary retry button. |
| [ErrorState / Server](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=7-84) | Timeout, unavailable verification and unsupported account treatments, with text adapted to the actual state. |
| [InlineNotice / Success](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=7-144) | Verified session with the temporary Home handoff status. |

[StartupStatus](../../../reactNative/src/features/auth/screens/StartupStatus.tsx) uses a 340 dp max-width card, safe areas, native text sizing and a retry control at least 48 dp high. Retry keeps its label, is disabled while a check runs and exposes a busy state. The native system font remains in use. The four [status icons](../../../reactNative/assets/startup/) are 72x72 PNG raster exports of the original 24x24 Figma icon asset SVGs. This keeps their geometry and transparency at 24 dp without adding an SVG runtime or a network dependency.

[StartupScreen](../../../reactNative/src/features/auth/screens/StartupScreen.tsx) maps the [restore result](../../../reactNative/src/features/auth/restoreSession.ts) to the relevant message. A network error, deadline and unavailable verification are distinct. A timeout preserves the saved token. A 401 clears the token before opening the existing Guest Welcome. A validated Admin account is not admitted to the mobile User session.

The Home references in [App Shell](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1702) and the garden journal direction cover separate screens. The User branch shows a truthful session confirmation while waiting for a real mobile Home route. The Guest route still opens the Welcome from the branch base. The customized AGRI-159 Welcome remains its own integration.

## Verification

- RED: 8 behavior tests failed because the generic retry state lacked a reason. GREEN: 12/12 session tests passed, with 85.11% branches in the session module.
- Typecheck, lint and offline Expo dependency validation passed. Expo warned that offline validation is limited.
- Android and iOS Hermes exports passed and include all four 72x72 icons. Output is ignored at `reactNative/dist/agri158-startup-figma/`. Bundle exports do not establish runtime acceptance.
- The existing Android Guest smoke passed again on Android 13 with Expo Go 58.0.5. A cold launch with empty SecureStore reached Welcome, confirmed with accessibility XML and a reviewed PNG in ignored `reactNative/dist/agri158-native-figma/`.
- React Native Web on Chromium passed eight transitions or states at each of 320 px and 390 px. It rendered the actual StartupScreen and substituted SecureStore and HTTP at the preview boundary. The checks covered network, disabled retry while pending, successful retry without clearing the token, server error, timeout, unsupported account, expired token and tokenless Guest. The icon images loaded, the retry target measured at least 48 px and the cards did not overflow horizontally. Example screenshots were reviewed. Ignored artifacts: `reactNative/dist/agri158-startup-preview/`. The first preview launch reached the URL before Vite was listening. A later run missed the short busy interval in one browser scenario. The final run held the retry response until after asserting the disabled state and then passed both widths.
- Local backend port 5034 did not respond and Docker daemon was unavailable. SecureStore with valid or expired backend tokens, User Home navigation and physical iOS remain pending.
