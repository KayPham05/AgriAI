# AGRI-159 - Welcome

- 2026-11-25. Prepared a separate local CI fix for PR #67. Gitleaks v8.24.2 reproduced one historical test fixture finding across 288 commits, then passed the same scan with the exact fingerprint registered. A new synthetic finding continued to fail the scan. [Evidence and scope](../../reports/AGRI-159/ci-secret-scan.md).

2026-11-25 delivery check. Typecheck, lint and all eight component tests passed before delivery to the mobile integration branch. Full S02-T1/T2 acceptance remains blocked. The unused working copy of the coffee photo and unrelated web change were excluded from the commit.

- Created/checked out `AGRI-159-mobile-welcome` from mobile base `f631185` before editing; preserved unrelated local work. User confirmed no F01/F02 or destination screens.
- Implemented native welcome image/logo/copy, shared ActionButton, semantic tokens, disabled handoff state and image fallback. Added Jest Expo/RNTL tests and mobile-only tooling/docs.
- RED: six expected failures. GREEN/coverage: six tests passed, branch coverage 29/30; typecheck/lint/frozen install/Expo dependency check/Doctor 20-of-20/Android+iOS export passed. Runtime isolation test passed.
- DoD remains incomplete: S02-T1/T2 need real navigation/S11/S26; S02-T3 needs a device/emulator. No fake routes/API, commit/push or main changes.
- [Verification, affected paths and remaining acceptance](../../reports/AGRI-159/README.md).

## 2026-11-24 - Figma adaptation

- Applied the user-selected Sổ tay vườn nhà direction to S02 on the same branch: original Figma rice photo, green header/hero, responsive display text and secondary pills. Kept Welcome copy/intents and existing unavailable-navigation behavior; no S02 frame exists in the supplied Figma file.
- Updated native tokens/buttons, photo accessibility name, handoff docs and tests. Preloaded RN lazy exports in test setup after diagnosing the first-test timeout; kept timeout/assertions unchanged.
- Fresh coverage: 2 suites / 8 tests passed, branches 29/32 (90.62%). Typecheck/lint, bundled offline Expo compatibility check, Expo Doctor 20/20, Android+iOS export and browser checks at five widths passed. Browser preview is supplementary, not native acceptance.
- DoD still incomplete: actual destination navigation and device/font-scale/screen-reader evidence remain outstanding. System font fallback is retained. Preserved unrelated dirty work; no commit/push.
- [Affected paths, failures investigated, fresh evidence and limits](../../reports/AGRI-159/figma-welcome.md).

## 2026-11-24 - Native acceptance and scope clarification

- Completed Welcome/S02 and its typed navigation handoff within AGRI-159. Missing S03/S11/S26 are separate dependencies; they are not additional screens to implement in this task.
- Added the explicit Android emulator layout smoke and mobile instructions. Android 13 / Expo Go 58.0.5 passed all 6 width/font scenarios (320/390 dp, 100/150/200%), including 18 CTA reachability checks; reviewed native screenshots. Display/font settings were restored.
- Fresh typecheck/lint passed; component coverage: 2 suites / 8 tests passed, branches 29/32 (90.62%). S02-T3 passed on Android emulator; S02-T1/T2 full destination acceptance remains Blocked. Physical phone, iOS and TalkBack are Not run. No commit/push or Jira Done.
- [Current checks, affected paths, setup issues and remaining dependencies](../../reports/AGRI-159/welcome-acceptance.md).
