# AGRI-57: Profile layout refresh, 2026-10-21

## Follow-up: Confirm or discard avatar changes (turn135)

ProfileAvatarEditor now stages a successfully decoded image instead of immediately updating
the profile. Reuses the existing shadcn Dialog with a preview and three actions: “Lưu ảnh”,
“Không lưu”, “Chọn ảnh khác”. Closing/Escape discards the draft and restores camera-button
focus; discarding while reading cancels callbacks. Save is disabled during reading or
validation errors. Only explicit save invokes the latest profile callback. Existing avatar,
file checks, camera corner control and session-only storage remain unchanged.

Affected source: `frontend/src/components/profile/ProfileAvatarEditor.tsx`; component
and browser tests from turn133 updated, with tests README instructions. No shared dialog,
global CSS, API or provider changes. Six tests failed before implementation; final focused
19/19 passed (two files,2.90s, raw start11:49:59), including cancel/Escape/focus, replacement
preview and delayed save. A test simulation initially attempted a pointer click on the
file input behind Radix's modal; changed it to the native chooser's change event, while
Chromium verifies the real choose-another button. Removed unsupported test-only `exact`
query options; subsequent TypeScript and Biome checks passed.

Full coverage: **308/308,46files**,60.21s, raw start11:49:09;
branches1203/1814=66.31%, editor30/35=85.71%. Evidence: ignored
`.cache/avatar-confirm-tests.log` and coverage JSON. Production build passed
(compile4.3s, TypeScript1235ms), frontend container recreated alone.
Final Chromium passed five widths, dialog containment at320/375/1280px, preview without
profile mutation, real choose-another file picker, discard, explicit save, retry and
navigation/edit retention. Page errors empty; inspected320px confirmation screenshot.
API responses remain fixtures, native reading/decoding is real; no CI, real-device or
backend persistence acceptance. No commit/push.

## Follow-up: Avatar corner camera control (turn134)

Replaced the separate text button with a32px camera badge at the lower-right of the
avatar, retaining a44px keyboard/touch button, accessible name/title and disabled reading state.
Only ProfileAvatarEditor markup/layout changed; selection, validation and session storage behavior remain.
Browser regression now checks the control center lies in the avatar's lower-right area
at1280/375/320px and the button is44px. RED on the old wide button, GREEN after the change.
Fresh16/16 focused tests (two files,2.54s, raw start11:45:13), Biome and TypeScript passed.
Docker build passed (compile4.2s, TypeScript1365ms), only frontend recreated; final browser
five widths/upload/decode/retry/navigation/edit and corner geometry passed without page errors.
Inspected `.cache/profile-redesign/avatar-320.png`. No new full-suite/coverage/CI run;
the305-test result below belongs to turn133. No shared/global/API changes or commit/push.

## Follow-up: Change profile avatar (turn133)

Added `frontend/src/components/profile/ProfileAvatarEditor.tsx`, composed in ProfilePage.
The visible “Đổi ảnh” button opens the device file picker. Reuses existing JPG/PNG,
nonempty-file and15MiB validation. FileReader creates an in-memory data URL only after
the browser successfully decodes the image. A failed read/decode keeps the previous avatar;
selection resets for retries of the same file. Pending callbacks detach and reads abort on unmount.
The latest profile callback prevents delayed decoding from overwriting newer display details.
No blob URL is revoked during navigation; the data URL stays in the existing provider state.
No upload/API, database, localStorage, global CSS, Navbar or dependency changes were made.
The UI states explicitly that the avatar is retained only for this session, not across reload/login.

New tests: `frontend/tests/component/views/ProfileAvatarEditor.test.tsx` (nine cases).
After resolving the initial missing-module import with a minimal stub, six tests failed
for absent avatar controls before implementation; all passed after implementation.
Additional tests cover latest-callback behavior, FileReader failure and picker cancellation.
One test-only TypeScript `this` annotation error was fixed before the passing check.
Final Biome check of the three touched TSX files and TypeScript passed.
Final `corepack pnpm test:coverage --maxWorkers=2`: **305/305,46files**, 56.22s,
raw runner start11:41:48, branches1193/1803=66.16% (floor60%); AvatarEditor20/24=83.33%.
Evidence: ignored `.cache/avatar-full-tests-final.log` and coverage JSON summary.
Docker production build passed (compile4.3s, TypeScript938ms), and only frontend was recreated.
Chromium passed all five layout widths, real PNG decoding, corrupt-image rejection/retry,
client navigation away/back and retention after editing other fields; no page errors.
API fixtures isolate authentication/history, while browser file reading/decoding is real.
Inspected320px avatar screenshot in ignored `.cache/profile-redesign/avatar-320.png`.
Backend persistence, real-device testing and GitHub CI remain outside this verification.
No commit/push. The remainder records the earlier layout implementation.

## Scope and result

Completed the requested local profile redesign on `AGRI-57-frontend-summary`.
The profile uses a desktop identity sidebar and a wider personal-information column,
with saved-sample statistics below. Small screens stack these sections, use a compact
identity row and keep the three sample counts together. Existing green/cream semantic
tokens, Manrope, card radius, Lucide and installed controls are retained.

Source: `frontend/src/views/ProfilePage.tsx`. Tests:
`frontend/tests/component/views/ProfilePage.test.tsx` and
`frontend/tests/browser/profile/profile_page.py`; commands documented in `frontend/tests/README.md`.
No shared controls, global styles, routes, authentication APIs or other views changed in this turn.
The previously restored About page still has an empty Git diff.

Editing retains field order, trimming, cancellation and the existing session-only update callback.
A status message now confirms local display updates and clears when editing starts again.
Missing optional details show a readable fallback. Sample counts still derive from supplied history;
the existing garden-health limitation remains visible. No remote profile-save endpoint was added.

## Fresh verification

- TDD: the three added cases failed first because the status announcement and named content regions
  did not exist; the four original cases passed. After implementation all seven passed.
- Full `corepack pnpm test:coverage --maxWorkers=2`: **296/296 tests, 45 files**, 57.97s,
  raw runner start `11:31:55`. Branches **1175/1783 = 65.90%**, above the current 60% floor;
  ProfilePage branches **90.62%**. Evidence: ignored `.cache/profile-full-tests.log` and
  `.cache/coverage/frontend/coverage-summary.json`. This run preceded the final CSS-only mobile refinement.
- After that refinement: focused **7/7**, 3.00s, raw start `11:33:26`; Biome check of both TSX files passed.
- Host TypeScript check passed. Final Docker build passed: compile4.4s, TypeScript874ms,
  11 static pages and two dynamic routes. Recreated only the frontend container on localhost3000.
- Final Chromium script passed at **320, 375, 768, 1280 and 1440px**: no horizontal overflow,
  edit/cancel/reset, blank-name guard, trimmed save, updated location and live confirmation.
  The existing unauthenticated route guard returns to Intro and opens login normally.
  Browser page-error list was empty. Inspected desktop, editing and narrow-screen screenshots;
  artifacts remain ignored in `.cache/profile-redesign/`.

## Failed attempts and limits

The first sandboxed focused test stalled and was interrupted; the approved external-process rerun
provided the RED/GREEN evidence. The initial default-worker full coverage run overlapped Docker build
and failed19 cases across LoginModal, HistoryPage, App.adminEntrance, IntroPage, CatalogPagination,
App.startup, AdminCrmPage and AdminCrmPage.integration (timeouts and a subsequent missing-CAPTCHA query).
The complete two-worker rerun passed without changes to those tests, timeouts or application modules.
No gate was lowered. The shadcn docs CLI encountered registry network EACCES;
installed component source was inspected and reused without dependency updates.

System dark preference was exercised; the existing site retained its current light palette.
No theme system was introduced. No Lighthouse, real-device, GitHub CI or real backend persistence
acceptance was performed. API browser responses were fixtures; logout callback remains covered in
the component suite. No commit or push.
