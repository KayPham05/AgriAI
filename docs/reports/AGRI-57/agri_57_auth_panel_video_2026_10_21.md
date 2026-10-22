# AGRI-57 — Auth side-panel video, 2026-10-21

## Media restoration after stash restore (2026-10-21)

User reported a plain green auth background after switching back to AGRI-57 and rebuilding Docker. Read-only inspection found AuthPanelVideo still references the correct MP4/poster, but `frontend/public/media/auth/` was missing. These ignored local media files had been captured as untracked assets in the AGRI-80 stash when the branch changed. The restored AGRI-57 stash therefore did not restore them. Both stashes remained intact.

Recovered only `field-original.mp4` (75,923,556 bytes), `field-poster.webp` (239,408 bytes) and `field-loop.webm` (704,549 bytes) from the untracked parent of stash `4d6176fa297d7c55a715989669f3c737cabededa`. No admin code was applied to AGRI-57 and no component behavior changed. `git check-ignore` confirms the media stay local and out of Git.

The current frontend image had also been built without these media. Copied the recovered directory into the running frontend container and restarted only that container so Next.js re-enumerates public assets. No build/backend/AI/DB operation was run. This repairs the current container immediately; the local source assets must be present for the next build. Recreating from the existing image before rebuilding would lose the container-only copy.

Fresh verification: before repair both media URLs returned 404; afterwards Docker video range request returned HTTP206/16bytes and poster HTTP200. Existing `frontend/tests/browser/auth/auth_panel_video.py` passed: original 3840×2160 MP4, muted/loop/playsInline, real playback, HTTP range, hidden-tab pause/resume, continuous same video across auth-mode changes, unmount, desktop/tablet, mobile/reduced still fallback and no pause button. Sample `.cache/auth-video/original-playback.json`: 1.002416 seconds advanced, 59 decoded frames, 4 dropped over the sampled second; this does not establish physical-device smoothness. Browser screenshots are in `.cache/auth-video/`.

No fresh component suite, production build, coverage or CI run was needed for this asset restoration. Existing component code/tests and unrelated restored work were preserved. No commit/push, stash drop or schema change.

## Follow-up148: Remove playback button

User explicitly requested removing the pause button. Removed the Button, icon imports
and manual paused state from AuthPanelVideo; original MP4 autoplay/loop and document
visibility pause/resume, reduced-motion/mobile still state remain. Updated modal test
to assert no video control, and browser test checks absence plus visibility-based pause.
Browser RED before code: pause button count1; GREEN on rebuilt localhost: original4K
playback, no play/pause buttons, hidden-tab pause/resume, auth-mode continuity, unmount,
mobile/reduced no MP4 request. Production build compile4.4s/TypeScript962ms passed.
Biome two files exit0/no errors, one informational redundant-fragment finding. Small
browser verification only; component suite/coverage/CI not rerun. No commit/push/DB change.

## Follow-up147: Stable dialog and unified video background

User requested equal login/register heights and one continuous video/background surface.
LoginModal now uses `--auth-dialog-height: min(44rem, var(--auth-dialog-max-height))`,
defined in index.css and documented in DESIGN.md. The form scrolls internally; the
outer dialog/frame does not resize on mode changes, validation or expanded terms.
AuthPanelVideo mounts once in a full-dialog background outside the sliding aside.
Only the existing form and greeting move; no video translation, resize or remount.
The pause control stays in the exposed side via group state. Local close-control z30
keeps it above the form/video after internal scrolling. Original MP4 and API unchanged.

Affected source: LoginModal.tsx, AuthPanelVideo.tsx, index.css; tests/modal selectors
now use shared background. New `tests/browser/auth/auth_panel_layout.py` RED on old
video nested inside aside; GREEN at1280×900/768×900/375×812/320×568/900×480. Samples18frames
per transition, three mode changes per size: dialog height/top stable within1px, one
stationary video rectangle/DOM node, no horizontal overflow, expanded terms/internal
scroll preserve frame and close hit-testing/click works. Screenshots ignored in
`.cache/auth-layout/`; desktop/mobile inspected. Previous auth-video browser regression
also passed actual original MP4, controls, mode continuity and mobile/reduced no requests.

Final component6/6 passed1.89s, runner10:42:42UTC, actual container exit0 verified;
log `.cache/auth-layout-tests.log`. Final Biome4files passed, detector review-only[].
Final Docker production build compile4.1s/TypeScript790ms passed. Only frontendlocalhost
recreated, own exited test container removed. No fullsuite/coverage/CI or real-device
performance acceptance. Media remains local/ignored and requires separate provisioning.
No commit/push/DB changes.

## Follow-up146: Use original MP4

User reported lag and explicitly requested the original video. AuthPanelVideo now loads
`/media/auth/field-original.mp4` directly; no further conversion/compression. Copied
75,923,556bytes from the supplied source to the ignored public/media/auth directory.
SHA256 of both source and runtime copy:
`99f5cfe09566c51df62d55a1a802f102ac169ba5258b8d8a6ccb0ca3d9ebd947`.
Earlier WebM remains unused local historical derivative. Poster/layout/playback controls,
mobile/reduced no-video behavior and auth API unchanged. Deployment must now provision
original MP4 plus poster separately because media remains outside Git.

Updated tests RED on old WebM source, GREEN with original. Fresh6/6 modal tests passed
1.86s, runner10:31:35UTC, container exit0 verified; `.cache/auth-original-tests.log`.
Biome2files passed; Docker build compile5.4s/TypeScript2.4s passed, only frontend recreated.
Browser verifies3840×2160,24–25second original, HTTP Range206/1024bytes, autoplay time
advance, mute/loop/pause/resume/mode preservation/unmount and mobile/reduced zero MP4
requests. Actual one-second headless playback sample advanced0.922546s with52total frames
and12dropped; evidence `.cache/auth-video/original-playback.json`. This establishes original
playback and delivery, not zero dropped frames or smooth60fps on the user's device.
No fullsuite/coverage/CI or real-device performance acceptance. No commit/push/DB change.

User supplied `D:\Downloads\16899208_3840_2160_60fps.mp4` for the login/registration
side panel. Inspected local video with Chromium:3840×2160,24.691333seconds,
75,923,556bytes, aerial crop-field footage. No new dependency or external upload.

Created local derivatives using Chromium canvas1280×720/captureStream30fps and VP9
MediaRecorder without audio; original file unchanged. Runtime files:

- `frontend/public/media/auth/field-loop.webm`:704,549bytes.
- `frontend/public/media/auth/field-poster.webp`:239,408bytes, first-second still.

These are user media/generated artifacts, explicitly ignored by `.gitignore`; included
in the current local Docker image through public/. A fresh checkout/deployment must
provision these two files separately; this work does not establish remote asset hosting.
No original4K asset copied into source control.

Source `frontend/src/components/modals/AuthPanelVideo.tsx` supplies decorative object-cover
video/poster behind LoginModal's existing side copy. Semantic primary-hover75% overlay,
primary-foreground copy, outlineOnDark existing Button for side action/pause control,
surface behind close control. Form and auth API unchanged. Video muted/loop/playsInline,
only mounted for >=768px with no reduced-motion request. Pauses for hidden document or
explicit user control; cleanup pauses on unmount. Mode switch retains same DOM/video.
Video failure removes video/control while retaining poster and brand background. Mobile
keeps original one-column form with side panel hidden; video not requested. Reduced
motion desktop uses still frame.

Verification:

- New modal video test RED before code: no video element. Final focused6/6 LoginModal
  tests passed2.50s, raw runner10:24:19UTC; container exit0 verified. Covers muted loop,
  shared video node, pause/resume controls, media error poster fallback, no-desktop-motion
  still state, existing CAPTCHA, registration terms and entry mode. Ignored evidence
  `.cache/auth-video-{red,final-tests}.log`.
- Biome3files passed. Review-only detector returned[]. Docker production build passed:
  compile4.9s, TypeScript1350ms. Recreated only frontendlocalhost3000.
- `frontend/tests/browser/auth/auth_panel_video.py` passed actual1280×720 decoded video
  playback/time advance, muted/loop/inline, pause/resume, login→register same node,
  name-field visibility,1280/768px screenshots, Escape/unmount,375/320px and1280px reduced
  mode with zero field-loop requests. No horizontal overflow or main-page errors.
  Screenshots after modal opacity reaches1 in ignored `.cache/auth-video/` inspected.
- `git check-ignore` confirms both generated media files excluded. Own exited test
  container removed; no DB/volume operations. No full coverage/CI, real-device,
  Safari playback or real-auth/backend acceptance run. No commit/push.
