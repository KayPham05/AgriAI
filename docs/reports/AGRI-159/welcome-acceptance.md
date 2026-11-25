# AGRI-159 - Welcome acceptance

Date: 2026-11-24. Branch: `AGRI-159-mobile-welcome`; HEAD `f631185` plus uncommitted task work. Welcome/S02 implementation and its navigation handoff are complete within the agreed scope. Full destination acceptance remains **Blocked**; this report does not establish Jira Done or completion of other mobile tasks.

## Scope and affected paths

The user supplied the earlier task summary: Welcome requires native UI, safe area, large text and navigation handoff; missing destination screens must be reported as dependencies. Implementing S03/S11/S26 is outside AGRI-159. The earlier statement that all those screens must be completed as part of this task was too broad. No fake destinations, API success or session behavior have been introduced.

The [Figma implementation report](figma-welcome.md) records the Welcome, ActionButton, tokens, local asset and component-test changes. The user-selected Sổ tay vườn nhà direction is an adaptation because the supplied file has no S02 frame. System font fallback remains; pixel-identical Manrope metrics are not claimed.

This acceptance update adds [welcome_layout_smoke.py](../../../reactNative/tests/e2e/welcome_layout_smoke.py) and updates the [test instructions](../../../reactNative/tests/README.md), [handoff](../../../reactNative/docs/welcome-handoff.md), report index and [task log](../../task-logs/AGRI-159/AGRI-159-welcome.md). No production behavior or dependency version changed in this update. Unrelated dirty work was preserved; no staging, commit, push, main change or CI result is claimed.

## Required cases

| Case | Current status | Evidence and boundary |
|---|---|---|
| S02-T1: diagnosis opens source selection | **Blocked** for full route | Real component interaction emits exactly `guest-diagnosis`. S11 and the root navigation owner are absent; no camera permission or API request is made by Welcome. |
| S02-T2: Guest catalog navigation | **Blocked** for full route | Real component interaction emits exactly `catalog`. S26 and navigation owner are absent; actual Guest destination/context acceptance has not run. |
| S02-T3: enlarged text and reachable controls | **Passed on Android emulator** | Six native scenarios at 320/390 dp and font scale 1.0/1.5/2.0. All 18 CTA checks passed; screenshots reviewed across all six scenarios and scrolled large-text states. No application text clipping or horizontal overflow was observed in those reviewed states. |
| Login handoff | **Passed at component boundary** | Exact `login` intent; actual S03 integration remains unavailable. |
| Physical phone, iOS and TalkBack | **Not run** | Android emulator evidence does not establish those results. |

The root currently renders Welcome without a navigation handler. All three CTAs therefore remain visibly and semantically disabled with an explanation. Component tests exercise enabled callbacks separately; the native run verifies the actual unavailable state, not successful destination navigation.

## Fresh checks

| Check | Result |
|---|---|
| `pnpm.ps1 test:coverage` | Passed: 2 suites, 8 tests, 0 skipped, 0 snapshots; Jest duration 48.902s. Branches 29/32 (90.62%); Welcome 19/21, ActionButton 10/11. Root route execution is not established by this coverage. |
| Android native layout smoke | Exit 0: 6/6 scenarios, 18 CTA checks. Android 13 / API 33, dedicated `agri159-qa` emulator, Expo Go 58.0.5, Metro port 8082. |
| Python syntax | Parsed the helper with UTF-8 using Python's standard-library AST parser. No Python package dependency added. |
| `pnpm.ps1 typecheck` | Passed, exit 0. |
| `pnpm.ps1 lint` | Passed, exit 0 with `--max-warnings=0`. The broad scan took several minutes without diagnostics before completion. |
| Source and report checks | `git diff --check` passed; relative report/handoff links resolved. Existing LF/CRLF notices remain for pre-existing package/lockfile edits. |

Run commands from `reactNative/`; Windows pnpm commands use `powershell -NoProfile -ExecutionPolicy Bypass -File .\pnpm.ps1`.

```powershell
python -X utf8 tests/e2e/welcome_layout_smoke.py --adb 'C:/Users/GIGABYTE/AppData/Local/Android/Sdk/platform-tools/adb.exe' --serial emulator-5586 --output dist/agri159-native-final
```

Local evidence is ignored: `reactNative/dist/agri159-native-final/native-layout-results.json` and 24 PNG/XML pairs named `welcome-{320,390}-font-{100,150,200}-{top,1,2,3}`. The JSON contains six passed cases and all 18 action bounds. The helper requires fresh accessibility XML plus a drawn Welcome framebuffer before assertions, verifies the system font setting, and checks each disabled control can be fully scrolled into view with the expected minimum height. Visual review supplements these bounds checks; they do not prove every accessibility property.

The helper restores font scale and removes its display overrides in `finally`. After the final run, ADB confirmed font scale 1.0, physical size 1080x2400 and density 420 with no overrides. It refuses personal-device serials and pre-existing display overrides.

The earlier same-day Figma report contains the executed Expo Doctor 20/20, dependency compatibility and Android/iOS Hermes export results. Those are previous checks, not reruns in this acceptance update, and exports do not establish iOS runtime acceptance.

## Environment issues and limits

The initial emulator start failed because E: lacked the emulator's required disk space. The dedicated AVD configuration remains in ignored `reactNative/.tools/native-qa/`; runtime images used the task-specific OS temporary directory `agrivision-agri159-native-qa`. No existing device, SDK image, project data or DB volume was removed. Expo Go came from the official release URL returned by Expo's SDK metadata: [Expo Go 58.0.5](https://github.com/expo/expo-go-releases/releases/tag/Expo-Go-58.0.5).

After acceptance the dedicated emulator and Metro were stopped, and only the verified task-specific temporary runtime directory was removed. The Metro launcher emitted a `Pop-Location` warning during Ctrl+C teardown; the project directory was checked and remains present. This shutdown message is separate from the passing native run.

A System UI startup ANR and Expo Go's first-use developer dialogs were resolved before the final acceptance run. During helper development, stale XML and the native splash could falsely suggest readiness; fresh unique dumps and a framebuffer guard were added before rerunning all six final scenarios. Earlier diagnostic outputs are not acceptance evidence. The Expo Go developer-tools bubble visible in screenshots is external developer chrome.

Remaining work belongs to integration: supply actual S03/S11/S26 and the navigation owner, wire the existing intents, then execute S02-T1/T2 through real destinations and verify Guest context. Physical-device/iOS and screen-reader checks remain unrun. No inference, backend integration, camera permission flow or other tasks' acceptance is claimed.
