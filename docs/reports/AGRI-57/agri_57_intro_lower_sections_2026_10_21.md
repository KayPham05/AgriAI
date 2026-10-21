# AGRI-57: Introduction lower sections, 2026-10-21

## Follow-up: Botanical hero background (turn142)

User approved faint leaf veins at outer edges plus a few slowly moving leaves for the
introductory hero. Reused IntroLeafBackdrop with a typed `variant` prop: default section
retains its existing stronger motion; hero adds two static oversized rice-leaf textures
at5% combined opacity and four smaller leaves (three on phones) at10%. Hero sway uses
original banner tokens20px/5degrees/13seconds. Same supplied transparent asset, no new
dependencies, gradients or generated imagery. Hero clips decoration, preserves map/copy
layout and isolates layering. All decoration aria-hidden/pointer-events-none, no focus
targets. Existing scoped GSAP cleanup, hidden/offscreen pause and reduced motion reused.
Updated DESIGN.md to record this narrow user-authorized exception.

Affected source: `frontend/src/components/home/IntroLeafBackdrop.tsx`,
`frontend/src/views/IntroPage.tsx`. Browser test
`frontend/tests/browser/home/intro_hero_background.py` RED before implementation: no hero
backdrop. GREEN production run: actual sway, dynamic reduced-motion clears decorative
transforms, decoded decorative images/empty alts,1920/1280/768/375/320px without horizontal
overflow, single interactive map, pin/close/Escape/focus restoration and registration dialog.
Screenshots inspected at1920/375px, ignored `.cache/intro-hero-background/`.
Middle-section browser regression now scopes its selectors to the section variant and passed
amplitude, hidden/offscreen pause/resume, reduced motion and narrow layouts.

Observed during test development: changing OS reduced-motion preference while the page is
already open can leave existing map copy with visibility:hidden despite aria-hidden=false.
No change to CropMap in this task; root cause/pre-existing status not certified. Browser
test checks dynamic decorative cleanup, then reloads under reduced motion for layout/map
checks; this is not acceptance of dynamic map preference switching. Follow-up remains.

Fresh Biome two files passed; mechanical Impeccable detector returned[] (review-only).
Docker build passed compile4.3s/TypeScript963ms. Isolated no-network IntroPage component
tests5/5 passed,2.84s, raw runner start07:09:28UTC, container exit0 verified and removed.
Only localhost frontend recreated. No new full-suite coverage, GitHub CI, real-device or
real-backend acceptance. No commit/push or database changes.

## Follow-up: Stronger leaf motion (turn141)

User requested more pronounced motion. Only IntroLeafBackdrop locally scales existing
banner tokens: translation20→60px per axis, rotation5→15degrees, duration13→5.85seconds.
Shared tokens, placement, opacity, leaf count and visibility/reduced-motion handling remain unchanged.

Added a real-browser regression to `frontend/tests/browser/home/intro_leaf_motion.py`:
first visible leaf must travel more than25px over2.5seconds. RED before implementation:
observed3.2px. GREEN after final build: amplitude, visible playback, hidden-document pause,
offscreen pause, resume, reduced-motion static behavior and768/375/320px layouts all passed;
no browser page errors. Inspected desktop screenshot in ignored `.cache/intro-leaves/`.
Fresh Biome check passed. Final Docker production build passed (compile4.8s,
TypeScript849ms); recreated only frontendlocalhost3000. Full unit/coverage suite and
GitHub CI were not rerun for this local motion tuning; prior311-test result is historical.
No commit/push or backend/DB changes.

## Follow-up: Multiple moving background leaves (turn140)

User explicitly requested more leaves and motion in the middle beige section. Replaced
its single static image with `frontend/src/components/home/IntroLeafBackdrop.tsx`:
five leaves on desktop/tablet, three below768px, grouped10% opacity, clipped to the section,
pointer-events-none and aria-hidden. Uses the existing rice-leaf RGBA asset and spacing tokens.
The existing banner remains unchanged. No global CSS, tokens, asset edits or dependencies.
This is a narrow user-authorized extension of the previous static introduction decoration.

Scoped useGSAP/matchMedia drives transform-only x/y/rotation, sine.inOut/yoyo and stagger,
reusing banner drift distance/rotation/duration tokens. IntersectionObserver and document
visibility pause offscreen/hidden playback; media-query changes and unmount revert GSAP
and remove observers/listeners. Reduced motion preserves a static arrangement. No React
state per frame or new on-page pause button; continuous decorative motion is user-requested.

New `frontend/tests/browser/home/intro_leaf_motion.py` failed RED on the old single static
leaf, then passed GREEN: multiple leaves, actual transform differences, controlled hidden
document pause/resume, offscreen pause, static reduced-motion output and768/375/320px without
overflow. Desktop and320px screenshots inspected. The existing six-width introduction
layout/image/CTA regression also passed, with no page errors in either script.

Final Biome(two TSX) and native TypeScript passed; Docker production build compile4.1s/
TypeScript862ms passed. Recreated only frontendlocalhost3000. Full Linux coverage with
current source copied into an isolated network-disabled test container: **311/311,46files**,
36.75s, raw start06:47:52UTC, container exit0 confirmed; branches1225/1846=66.35%>=60%.
Evidence: ignored `.cache/intro-leaves-tests.log` and `.cache/intro-leaves-coverage.json`.
Motion is verified through the browser, not certified by the component branch-coverage target.
Temporary test container removed after extracting evidence. No DB/volumes/CI/Lighthouse/
real-device/model acceptance, commit or push.

## Scope and implementation

The user explicitly selected implementation in the existing introduction page, then
requested tests. Updated only the three sections below its hero in
`frontend/src/views/IntroPage.tsx`:

- Rice photograph and integrated camera tip on the left; numbered01/02/03 workflow
  cards and ConvNeXt-Tiny badge on the right. Stacks below1024px.
- Warm canvas with the existing responsible-use headline, three information rows,
  and a faint static leaf decoration. Keeps the result limitations intact.
- Dark forest-green closing banner, subtle static rice-leaf texture, registration
  and “Thử nghiệm ngay” buttons. Trial opens the existing login flow, with an explicit
  nearby explanation; it does not introduce unauthenticated inference or a fake demo.

Reused supplied rice photography, existing RGBA rice-leaf artwork, semantic tokens,
Manrope, Lucide and installed Button/Card/Badge components. No asset generation/edit,
dependencies, global CSS, Design System, shared primitives, auth logic or APIs changed.
Hero/map/film and footer matched the pre-edit snapshot exactly (compared those source
regions); the map remains a single instance. Existing scoped GSAP reveal/cleanup and
reduced-motion behavior remain in place. Removed redundant step icons after inspecting
the320px rendering to avoid an icon sitting alone above a wrapped title.

## Tests and verification

- Added the CTA callback test in `frontend/tests/component/views/IntroPage.test.tsx`.
  RED: missing named closing-banner region before implementation. GREEN: both register
  and trial invoke their appropriate callbacks. Original intro/map/film tests preserved.
- Native Biome check of both TSX files and TypeScript passed. Native Vitest startup
  was very slow after the earlier local device issue, so broad checks used a Linux
  container built from the existing Dockerfile, with networking disabled.
- First container full run:307passed/4failed, all four in `tests/tooling/lintRules.test.ts`:
  direct-Radix restriction, shared-primitive allowance, service-import restriction and
  conditional-hook restriction. All failed because Biome's repository ignore file at
  `/` was missing from the frontend-only image. Bind mount failed with “no such device”;
  `docker cp` supplied the original `.gitignore` to the isolated test container instead.
  No test, config, threshold or lint rule was weakened.
- Complete rerun: **311/311 tests,46files**,39.90s, raw container start05:58:10UTC;
  actual container exit0 confirmed. Branches1220/1829=66.70%, above current60% floor.
  Existing Intro animation coverage remains31.25%; this does not certify the80% target.
  Evidence: ignored `.cache/intro-lower-linux-tests-retry.log` and
  `.cache/intro-lower-coverage.json`.
- After final icon-only cleanup: focused **5/5**,2.00s, raw start05:59:28UTC, actual
  exit0 verified with the final source copied into the isolated container. No behavior
  changed after the full run. Final production build passed: compile5.2s, TypeScript1286ms.
- Final `frontend/tests/browser/home/intro_lower_sections.py` passed1440/1024/768/375/320/
  667landscape: image decoding, correct split/stack layout, three workflow cards,
  three principle rows, no horizontal overflow,44px buttons and real registration/login
  dialogs through the two closing CTAs. Single hero map preserved; page errors empty.
  Inspected desktop and320px workflow/banner/principle screenshots in ignored
  `.cache/intro-lower/`.

Only frontendlocalhost3000 was recreated. The two temporary test containers were stopped
with exit0 and removed after evidence extraction; no DB/volume operations. Browser API
responses were fixtures. No Lighthouse, real-device, GitHub CI or real-model acceptance
run in this task. No commit/push.
