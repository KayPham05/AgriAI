# AGRI-159 - Native welcome screen

For the separate CI repair branch and its Gitleaks reproduction, see [CI secret scan for PR #67](ci-secret-scan.md).

2026-11-25 delivery check. Fresh typecheck and lint passed. The component suite passed 8/8 with 90.62% branch coverage. The Android layout evidence below is from 2026-11-24. The mobile integration PR targets `AGRI-199-initial-mobile-app`. S02-T1/T2 remain blocked on destination integration.

Branch: `AGRI-159-mobile-welcome`, created from `AGRI-199-initial-mobile-app` at `f631185` before implementation. **Current status (2026-11-24): Welcome implementation and Android layout acceptance are complete; full destination integration remains blocked.** See [current acceptance evidence](welcome-acceptance.md). No Jira Done, commit or push is claimed.

## Current update: 2026-11-24

The user supplied Figma F02 and selected **Sổ tay vườn nhà** for the S02 adaptation on this same branch. See [Figma implementation](figma-welcome.md) for affected UI paths and its earlier verification, then [current acceptance evidence](welcome-acceptance.md) for the subsequent native checks. There is no dedicated S02 frame in the supplied file. The 2026-11-21 sections below are a historical baseline, including their then-blocked device status; they are not the current acceptance result.

## Scope and implementation

The user supplied S02 requirements and authorized starting the mobile sequence on a task branch. They confirmed that F01/F02 and S03/S11/S26 do not exist yet. This task does not implement those separate screens or invent their routes/session behavior.

- [WelcomeScreen](../../../reactNative/src/features/onboarding/screens/WelcomeScreen.tsx): existing AgriVision wordmark/title, local leaf imagery, concise guidance, native primary diagnosis action and secondary login/catalog actions. SafeAreaView and one ScrollView keep text in document flow, without fixed text heights, line caps or absolute CTAs.
- [ActionButton](../../../reactNative/src/components/ui/ActionButton.tsx): native Pressable, semantic disabled state/hints, scalable label and 48-point minimum touch height. Uses [mobile tokens](../../../reactNative/src/theme/tokens.ts); preserves the existing palette and light/system-font baseline. Added pill, brand typography and welcome media dimensions only in tokens. No web primitives, animation dependency, remote image request, API or camera permission flow.
- [Welcome handoff](../../../reactNative/docs/welcome-handoff.md): proposed `onNavigate` intents for Guest diagnosis, login and catalog. With no navigation owner supplied by the root route, buttons are disabled with an explanation; no unmatched/fake route. Callback tests are not destination-screen acceptance.
- Assets are unchanged copies of the existing project coffee-leaf photo and user leaf mark, kept in `reactNative/assets/`. Leaf SHA-256: `1162ce76822a99e3060051947c9a6422e049b1b69260bb236d7512ea4fed084e`. Image-error fallback retains the introduction/actions; the photo is not an inference result.
- Added the first mobile component test setup: Jest Expo 58.0.15, Jest 30.5.2, RNTL 14.1.0 and Test Renderer 1.3.1, plus required type/preset/server-renderer development peers. No existing production dependency specifier/version was intentionally upgraded. Package and lockfile changes are mobile-only. Tests are centralized; TypeScript checks them too.

## Actual checks

All mobile commands use `reactNative/pnpm.ps1`, which preserves the machine's default runtime. Cold bootstrap/download encountered timeouts; the official Node 24.22.3 archive was resumed with curl and checked against the official SHA-256 manifest before extraction. No global runtime/configuration change.

| Check | Fresh result |
|---|---|
| `tests/tooling/LocalRuntime.Tests.ps1` | Passed; pinned runtime, exit-code and PATH/cache/cwd/default-runtime isolation |
| RED `pnpm.ps1 test` before source change | Six failures: required actions/image absent from old static screen |
| GREEN `pnpm.ps1 test` | Six component tests passed; zero snapshots |
| `pnpm.ps1 test:coverage` | Six passed; all production `src/` included; branches **29/30 (96.66%)**, ActionButton 11/11, WelcomeScreen 18/19. Layout is not rendered in these component tests. Output: ignored `reactNative/dist/coverage/coverage-summary.json` |
| `pnpm.ps1 typecheck` | Passed after adding explicit Jest types; initial missing-test-global errors corrected |
| `pnpm.ps1 lint` | Passed, max-warnings 0 |
| `pnpm.ps1 exec expo install --check` | Dependencies up to date |
| `pnpm.ps1 dlx expo-doctor` | 20/20 passed |
| `pnpm.ps1 exec expo export --platform all --output-dir dist/agri159-verification` | One Android and one iOS Hermes bundle exported, exit 0; outputs ignored |
| `pnpm.ps1 install --frozen-lockfile --offline` | Lockfile up to date; exit 0 |
| Final source/doc checks | `git diff --check` passed; report links resolved; asset copies byte-identical; production dependency specifiers unchanged |
| Static token contrast calculation | Primary label 7.16:1; body 14.23:1; muted body 4.87:1 against intended backgrounds. Does not establish full device accessibility |

Test source: [WelcomeScreen.test.tsx](../../../reactNative/tests/component/WelcomeScreen.test.tsx). Tests keep the screen/Pressable real, mock native safe-area metrics, and spy on the network boundary. They check each exact handoff intent, unavailable-state affordance, image-error recovery and no API request. Scanner/transport/backend/model inference are outside S02 scope. Expo export emitted the existing NO_COLOR/FORCE_COLOR warning; pnpm skipped optional Parcel watcher build scripts without requiring approval or affecting the checks above.

## Planned acceptance and remaining work

| Required case | Status | Evidence / missing dependency |
|---|---|---|
| S02-T1: diagnosis opens source selection | **Blocked** | Guest intent verified in component; S11 and navigation owner are absent |
| S02-T2: Guest catalog navigation | **Blocked** | Public catalog intent verified in component; S26 and navigation owner are absent |
| S02-T3: enlarged text keeps labels/CTAs reachable | **Blocked** | Native scalable/scrolling layout implemented; adb found no connected device/emulator. Physical layout/font scaling/safe-area and screen-reader checks not executed |

When real navigation is supplied, wire the typed boundary at the root and verify actual S03/S11/S26 destinations and Guest context. Do not mark this task Done based on callback mocks or bundle export. No device installation, APK/IPA, CI run, backend change, commit, push or merge was performed. The pre-existing `frontend/next-env.d.ts` working edit was preserved.

[Task log](../../task-logs/AGRI-159/AGRI-159-welcome.md). Native project guidance: [architecture](../../../reactNative/docs/architecture.md), [development](../../../reactNative/docs/development.md), [tests](../../../reactNative/tests/README.md).
