# AGRI-199 — Initial Mobile App

## Status and scope

Scaffold DoD complete: branch created from main, an installable Expo/React Native TypeScript project with native route, starter screen, theme, directory conventions and developer instructions is prepared. Feature implementation and device/store acceptance are not part of this completion claim. No commit/push or Jira transition was performed.

Branch: `AGRI-199-initial-mobile-app`. Base: local main `b3b5d312d49beb3800c803fecfaeb137f000f2d9`, which matched origin/main when inspected. Worktree: `C:/Users/ASUS/.codex/worktrees/agri-199-mobile/AgriAI`. The original checkout could not switch because two report files were dirty; its changes and untracked files were left intact. No AGRI-195 branch was created.

## Changes

- [Mobile project](../../../reactNative/README.md): Expo58 / React Native0.88.1 / React19.3.0 / TypeScript6, Expo Router, safe area/status bar and strict TypeScript alias configuration. Dependency versions follow the generated official template and Expo bundled-native map; ReactDOM pinned to the matching React version for Router peers.
- [Route layout](../../../reactNative/src/app/_layout.tsx) and [entry](../../../reactNative/src/app/index.tsx) render [WelcomeScreen](../../../reactNative/src/features/onboarding/screens/WelcomeScreen.tsx), a static scrollable native scaffold with no fake feature actions.
- [Semantic theme](../../../reactNative/src/theme/tokens.ts) inherits web colors; system font fallback. Feature/shared UI/API/storage/config/hooks/types and centralized test directories are prepared without empty runtime abstractions.
- Mobile package/lockfile/env example/ignore rules and [architecture](../../../reactNative/docs/architecture.md)/[development](../../../reactNative/docs/development.md) docs stay under reactNative. Root and mobile AGENTS.md record AGRI-199 as the future mobile branch/PR base, overriding generic main-base guidance only for mobile. Root task reports remain in their required documentation locations.

## Actual verification — 2026-11-19

Commands executed in reactNative using bundled Node24.22.3 and pnpm (final frozen-lockfile run used declared10.34.5):

| Check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | Exit0; lockfile up to date |
| `pnpm run typecheck` | Exit0, TypeScript strict |
| `pnpm run lint` | Exit0, max-warnings0 |
| `pnpm exec expo install --check` | Exit0, dependencies up to date |
| `pnpm --package=npm@11 --package=expo-doctor dlx expo-doctor` | Exit0,20/20 checks passed |
| `pnpm exec expo export --platform all --output-dir dist/verification` | Exit0, one Android and one iOS Hermes bundle emitted; output ignored |

Initial plain Expo Doctor invocation failed three dependency-tree checks because system npm6 lacks npm8+ validation. Re-running with temporary npm11 resolved all20 checks without a global tool change. System default Node14 was not used for successful checks. Install warned that ESLint9 is deprecated upstream; it remains compatible with Expo config and lint passed. Metro emitted terminal NO_COLOR/FORCE_COLOR warnings; bundling succeeded.

No unit/component/E2E runner or feature tests are installed; no test-pass/coverage claim. No emulator/device smoke, APK/IPA, signing, API/backend/model/storage, visual accessibility validation or GitHub Actions run was performed. Android adb was not available on PATH; iOS native build requires macOS/Xcode. Exports do not establish native runtime acceptance.

## Remaining work

Scaffold is local and uncommitted; other worktrees/branches will need the user's authorized commit before relying on it as a Git baseline. Build the actual mobile screens/API/session/camera features in later tasks from AGRI-199. Add the native test runner when real behavior tests are introduced, replace template icons and validate fonts/assets. API verification/self-delete, Google native setup, real inference/private storage, signing and store policy remain separate acceptance work.

[Task log](../../task-logs/AGRI-199/initial-mobile-app.md).

## Project-local runtime — 2026-11-20

The user required Node24 only within mobile. [Project-local Node verification](project-local-node-2026-11-20.md) records the portable launcher, isolation behavior tests and fresh checks. Mobile now runs through `reactNative/pnpm.ps1`, with ignored local Node24/pnpm; the default Node14/npm6 and User/Machine PATH remain unchanged. This replaces the setup instruction to activate Node/Corepack globally; earlier results above remain historical.


## Primary checkout delivery — 2026-11-20

The user requested the mobile folder inside the original project checkout and an explicit Git push. Current mobile location is `D:/Git/HK1N4/Project1/AgriAI/reactNative` on `AGRI-199-initial-mobile-app`; earlier worktree/uncommitted statements above describe the initial preparation. The local Node24 launcher and mobile files were transferred and verified in the primary checkout. The requested remote target is origin/AGRI-199-initial-mobile-app; main is not a delivery target.

Pre-existing report additions (AGRI-128 and AGRI-132) and all52 original untracked paths were preserved outside the mobile commit. The two reports have an additional named stash backup and exact-byte originals under ignored `.cache/AGRI-199-relocation/`. Their additions were restored atop the target branch's report versions, preserving target-base content.

Fresh destination checks on 2026-11-20: frozen dependency install, runtime/environment isolation test, TypeScript strict, lint (max-warnings0), Expo dependency check, Doctor20/20 and Android+iOS export all passed in the primary checkout. Export output is ignored at reactNative/dist/checkout-verification. These are fresh executions, not reused earlier evidence. No device/API/model/signing acceptance is claimed.
