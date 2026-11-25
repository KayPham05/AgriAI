# AGRI-159 - Figma Welcome adaptation

Historical implementation snapshot: subsequent Android emulator acceptance and the corrected task boundary are recorded in [current acceptance evidence](welcome-acceptance.md). The outstanding device status below describes this earlier run, not the latest result.

Date: 2026-11-24. Branch: `AGRI-159-mobile-welcome`; HEAD `f631185` plus the existing uncommitted task work and this update. **DoD incomplete:** S02 UI adaptation is implemented; real destination navigation and device acceptance remain outstanding. No commit, push, branch switch or main change.

## Scope and reference

The user requested implementation within the current task/branch, then explicitly selected **Sổ tay vườn nhà: large photography, dark green blocks, large text**. The supplied [Figma file](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=23-2) contains no Welcome/S02 frame. This adapts [Home `26:2`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-2), its photo `26:9`, and the shared Button/Foundations to S02; it does not implement the Home screen or its sample history/tab navigation.

S02 retains its existing introduction, diagnosis/login/catalog labels, optional typed `onNavigate` boundary, disabled state without destinations, and local photo-error fallback. No API, camera permission, session or inference behavior was added. System font fallback remains; exact Manrope typography is not claimed.

## Affected paths

- [WelcomeScreen.tsx](../../../reactNative/src/features/onboarding/screens/WelcomeScreen.tsx): green safe-area/header and hero, light status-bar content, original rice photography, warm action area, one scroll container, scalable text and compact display size below 360 logical points. Content caps at 640; media keeps the 390:218 reference slot ratio.
- [tokens.ts](../../../reactNative/src/theme/tokens.ts): reference secondary/on-secondary colors, 12-point control padding, 38/43 display and 16/25 body scales, compact threshold and welcome media/logo dimensions. Visual values stay in tokens.
- [ActionButton.tsx](../../../reactNative/src/components/ui/ActionButton.tsx): reference secondary fill/text and 12-point vertical padding with the existing 48-point minimum and pressed/disabled semantics.
- [welcome-rice-field.png](../../../reactNative/assets/welcome-rice-field.png): original Figma image asset, 1280×798, 276465 bytes. SHA-256 `d25f6846926b92ede967eaffe5df1929352e4edf8cef508218c998a2ff1b9be9`. This is not a screen screenshot. Existing logo reused with light tint; previous coffee asset retained as pre-existing work.
- [WelcomeScreen.test.tsx](../../../reactNative/tests/component/WelcomeScreen.test.tsx): updated the photo's accessible name to describe the actual image.
- [ActionButton.test.tsx](../../../reactNative/tests/component/ActionButton.test.tsx): real Pressable interactions across unavailable → available → unavailable handler states for both variants.
- [tests/setup.ts](../../../reactNative/tests/setup.ts): preloads RN lazy exports before test timers, preserving the timeout and assertions.
- [Welcome handoff](../../../reactNative/docs/welcome-handoff.md), [mobile README](../../../reactNative/README.md), [test guide](../../../reactNative/tests/README.md), this report/index and the [task log](../../task-logs/AGRI-159/AGRI-159-welcome.md).

No application dependency/config/lockfile change was made in this update. Their already-dirty changes, the prior coffee asset, and `frontend/next-env.d.ts` were preserved.

## Fresh verification

Windows commands below run from `reactNative/` through `powershell -NoProfile -ExecutionPolicy Bypass -File .\pnpm.ps1 ...`. Execution policy is process-only; no profile, global Node/pnpm or machine policy was changed. Runtime remains portable Node 24.22.3/pnpm 10.34.5.

| Check | Actual result |
|---|---|
| `pnpm.ps1 typecheck` | Passed, including both component test files |
| `pnpm.ps1 lint` | Passed with `--max-warnings=0` |
| `pnpm.ps1 test:coverage` | 2 suites, 8 tests passed; 0 skipped, 0 snapshots; Jest duration 45.434s |
| Coverage over all production `src/` | Branches **29/32 (90.62%)**; Welcome **19/21 (90.47%)**, ActionButton **10/11 (90.90%)**. Root routes remain unexecuted by component tests; 100% branch with zero branches there is not route coverage |
| `EXPO_OFFLINE=1` then `pnpm.ps1 exec expo install --check` | Exit 0, dependencies up to date against bundled compatibility data. Expo warns validation is unreliable offline; this is not fresh registry verification. The initial online command failed with sandbox `EACCES` |
| `pnpm.ps1 dlx expo-doctor` | Passed **20/20** checks with network access; no issues detected |
| `pnpm.ps1 exec expo export --platform all --output-dir dist/agri159-figma-final` | Passed: one Android and one iOS Hermes bundle, including the local rice image and logo. Existing NO_COLOR/FORCE_COLOR warnings remain |
| Browser preview | Passed at 320×844, 375×812, 390×844, 768×1024, 1280×900. Original photo loads; header visible; no horizontal overflow; all three unavailable CTAs disabled, at least 48px high, and individually scrollable into the viewport; zero page errors |
| `git diff --check` | Passed; existing LF/CRLF notices for the pre-existing package/lockfile edits |

Coverage artifact: ignored `reactNative/dist/coverage/coverage-summary.json`. Bundle metadata: ignored `reactNative/dist/agri159-figma-final/metadata.json`.

The first baseline run and the first post-layout run each had **1 timeout / 5 passes** in the initial diagnosis interaction. A diagnostic run measured first mount at 4737ms, versus 6–7ms for subsequent mounts; render+press was 4993ms against a 5000ms limit. RN lazy export compilation was moved into module setup. No timeout, assertion, production navigation or dependency version was relaxed. Following that setup change, the six-test suite passed in three fresh processes (26.178s with coverage, 9.905s and 2.508s); the final expanded eight-test coverage run passed separately. These test durations are Jest-reported, not full shell wall time.

## Visual evidence and limits

Browser checks used Chromium headless, a local development preview at `http://127.0.0.1:8765`, and the actual Welcome/ActionButton/token source rendered through React Native Web 0.21.4. A temporary Vite adapter translated local image requires and omitted the native status bar, with web safe-area implementations. No API responses or inference fixtures were used. Preview-only dependencies and adapter remain ignored under `reactNative/.tools/figma-preview/`; application manifests were unchanged.

Local evidence: ignored `reactNative/dist/agri159-figma-preview/results.json` and `welcome-{320,375,390,768,1280}.png`. All five screenshots were visually inspected. The initial browser setup needed CommonJS dependency prebundling and web safe-area resolution; those adapter errors were corrected before the passing checks. This is supplementary browser layout evidence, not a native/device test or full-system E2E acceptance.

- S02-T1/T2: real S11/S26 and S03/navigation integration remain absent; root renders Welcome without a handler, so CTAs intentionally remain disabled.
- S02-T3: `adb devices` returned no attached devices; no configured AVD was found. Native 100/150/200% system-font scaling, screen reader, status bar and physical safe-area behavior remain unverified. Scrolling/scalable layout and browser widths do not establish those results.
- No APK/IPA build/install, native runtime acceptance, GitHub Actions result or API/model acceptance is claimed.

See the [report index](README.md) for historical 2026-11-21 implementation evidence.
