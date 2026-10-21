# AgriAI Design System

This system is adapted from the Starbucks analysis on getdesign.md, then reworked for a Vietnamese plant-disease classification product. It borrows the warm canvas, disciplined green hierarchy, photography-first composition, and tactile controls. It does not copy Starbucks branding, content, or retail-specific patterns.

## 1. Design intent

AgriAI should feel like a knowledgeable field guide: calm, useful, credible, and close to real crops. The interface must foreground the user's leaf image, the classification result, and the next action. Decorative effects never compete with those jobs.

Design dials:

- Design variance: 5/10. Asymmetric only where it improves hierarchy.
- Motion intensity: 3/10. Motion explains state changes and entry order.
- Visual density: 5/10. Product screens are compact enough for repeated use.

The visual language is forest green on a warm mineral canvas, with true crop photography and restrained depth. Avoid futuristic scanner decoration, floating ornaments (except the approved banner treatment in section 6.1), glass panels, nested cards, and generic AI gradients.

## 2. Tokens

Raw visual values may appear only in this file and in the token definitions in `frontend/src/index.css`. React components must use semantic tokens or standard spacing utilities.

### Color

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#f4f2ea` | Warm page canvas |
| `--surface` | `#fbfaf6` | Primary content surface |
| `--surface-muted` | `#e9eee5` | Quiet grouped content |
| `--foreground` | `#17251b` | Primary text |
| `--muted-foreground` | `#5f6d62` | Supporting text |
| `--primary` | `#17613a` | Primary action and selected state |
| `--primary-hover` | `#0f4d2c` | Primary hover |
| `--secondary` | `#dce8d8` | Secondary controls |
| `--accent` | `#79a65a` | Sparse positive emphasis |
| `--border` | `#ccd7c8` | Hairlines and input borders |
| `--ring` | `#2f754c` | Focus ring |
| `--destructive` | `#b83a32` | Errors and destructive actions |
| `--warning` | `#a66416` | Warnings and uncertain inputs |

Semantic status colors are not decorative accents. Confidence, warning, and error treatments must remain distinguishable without relying on color alone.

### Typography

- Primary family: Manrope via `next/font`.
- Display and body share the same family. Hierarchy comes from size, weight, and whitespace.
- Display: 40-60px desktop, 34-44px mobile, weight 650-750, line-height 1.05-1.12.
- Page title: 30-40px, weight 700, line-height 1.15.
- Section title: 22-30px, weight 650, line-height 1.2.
- Body: 15-17px, weight 400-500, line-height 1.6.
- Label: 13-14px, weight 600. Avoid excessive uppercase and tracking.
- Maximum readable line length: 68 characters.

### Shape, spacing, and depth

- Spacing uses a 4px base scale. Prefer Tailwind's standard 1-16 steps.
- Buttons: full pill only for primary/secondary CTAs and compact filters.
- Inputs: 12px radius.
- Cards and dialogs: 16px radius.
- Large media: 20px radius.
- Use one card layer. Prefer whitespace or a hairline over cards inside cards.
- Shadows are tinted green-gray and low contrast. Only dialogs, navigation, and primary floating surfaces may use elevation.
- Crop-map outline: `--crop-map-outline-width: 2px` in `frontend/src/index.css`; use the existing semantic surface, primary, and border colors for the schematic map.
- Island coastlines and reef traces: `--crop-map-island-outline-width: 0.6px`. Use sourced geographic paths, canopy fill for land and the existing accent token for unfilled reef traces. No island drop shadows; small representative features may be enlarged within labelled, not-to-scale insets. Côn Đảo may show its main Côn Sơn island where the source dataset lacks smaller islands.
- Standalone crop-map details use the existing centered shadcn Dialog on pin activation. The introduction hero instead follows the user-approved inline exploration correction below. Standalone dialogs use `--crop-map-dialog-max-height: calc(100svh - 2rem)` with a scrollable body and visible header/close control.

- Width cap token --crop-map-dialog-width: min(56rem, calc(100vw - 2rem)) preserves 16px side clearance on tablets. In the compact dialog map, the Trường Sa label may move upward by standard spacing to avoid the enlarged inland pin, without changing island geometry or geographic anchors.

- Crop-map illustration: the user-requested canopy texture may be clipped inside the geographic outline and schematic island insets only. `--crop-map-depth-shadow` gives the land illustration subtle relief; do not apply it to controls. Keep Hoàng Sa, Trường Sa, and Côn Đảo visibly labelled with source links and an explicit not-to-scale/maritime-boundary note. This does not permit generated replacement imagery elsewhere, including the botanical banners.

## 3. Components

Use shadcn/ui with Radix underneath for common primitives. Do not recreate these primitives:

- Button, Input, Label, Textarea
- Dialog, AlertDialog, Sheet
- Tabs, Select, Checkbox
- Card, Badge, Progress, Separator
- Tooltip and toast

Domain components such as camera preview, upload dropzone, Grad-CAM viewer, confidence explanation, and diagnosis result may be custom. They must compose the common primitives and use semantic tokens.

### Buttons

- Primary: green fill, light text, minimum 44px touch height, `scale(0.98)` active feedback.
- Secondary: transparent or surface fill with green border/text.
- Ghost: text-only actions inside toolbars.
- Destructive: reserved for irreversible actions.
- Keep desktop labels on one line. Use a verb-first Vietnamese label.

### Inputs and dialogs

- Labels stay visible; placeholders are examples, not labels.
- Authentication focus/error shadow recipes live in tokens: `--auth-field-focus-shadow: 0 0 0 var(--auth-field-ring-width) var(--auth-field-focus-ring)` and `--auth-field-error-shadow: 0 0 0 var(--auth-field-ring-width) color-mix(in srgb, var(--destructive) 20%, transparent)`. These are state outlines, not raised input surfaces.
- Error text appears beside the field and is announced to assistive technology.
- Dialogs use Radix focus management and Escape handling.
- Mobile task flows that need more space may use Sheet instead of a cramped dialog.

### Classification result

- Show predicted class, confidence, and limitations before secondary details.
- State clearly that the output is decision support, not a guaranteed diagnosis.
- Do not present mock severity, detection boxes, or heatmaps as validated model output.
- Confidence is a probability indicator, not medical certainty. Pair the value with plain-language interpretation.

## 4. Layout

- App container: max 1280px, 20px mobile gutters, 32px tablet, 48px desktop.
- Navigation stays under 80px tall and keeps one line on desktop.
- User-approved navigation treatment: introduction and app use a sticky top header with standard page gutters and 12px vertical breathing room. The visible bar is 72px high, uses the 16px card radius, surface/border tokens and `--navigation-shadow: 0 4px 16px color-mix(in srgb, var(--primary-hover) 8%, transparent)`. It remains in document flow, below dialog/sheet layers; do not animate/hide it on scroll. Preserve the existing 6rem anchor offset and mobile navigation behavior. Ancestors must not create a competing scroll container that disables viewport stickiness.
- Marketing/intro hero: left-aligned copy and one real crop image. Maximum two CTAs. Introduction/home banners may use the full-width photographic composition in section 6.1; their text still aligns to the app container.
- Diagnose flow: image input, validation, analysis state, result. Keep this order stable.
- Catalog grids may use 2-4 columns. Avoid three identical feature cards as the default marketing pattern.
- Mobile below 768px collapses to one column. Primary action remains reachable without covering content.

## 5. Photography and icons

- Use real plant and leaf photography already owned by the project.
- Images need descriptive Vietnamese alt text, fixed dimensions/aspect ratio, and lazy loading below the fold.
- Use Lucide consistently because the repository already depends on it. Do not hand-draw SVG icons or mix icon families.
- Avoid decorative labels on images and floating leaf ornaments outside the approved banner treatment in section 6.1.

## 6. Motion

- Use GSAP only when motion clarifies hierarchy, feedback, or a state transition.
- React animations use `useGSAP` with a scoped ref. Cleanup must be automatic through the hook/context.
- Prefer `transform` and `opacity`; never animate layout properties for movement.
- Respect `prefers-reduced-motion`. Reduced mode renders the final state without travel or loops.
- No infinite bounce, ping, shimmer, scan beam, parallax, or autoplay carousel.
- Standard entrance: 12-20px vertical travel, 0.45-0.7 seconds, `power2.out` or `power3.out`.

- Introduction reference-video adaptation: reveal hero copy/actions in reading order and below-fold headings, photo, workflow steps, principles and final CTA once on viewport entry. Reuse `--view-enter-distance`, `--view-enter-duration`, `--selection-enter-stagger` and `--selection-enter-opacity`; animate wrapper transform/opacity, not button transforms. Content stays readable before enhancement. No scroll hijacking, scrub, parallax, split-letter effects, replay loops or layout changes; reduced-motion is static.
- Crop map: one entrance when it first enters the viewport, with land and north-to-south pins using existing `--view-enter-*` and `--selection-enter-*` tokens. Selecting a region may lift and settle the pin artwork once; selecting a crop reuses `SelectionFeedback` for its photo/copy. Keep geographic anchors and button hit areas fixed. No ambient loop, island drift, map rotation, scan effect or parallax; reduced motion keeps the static final state.

### 6.1. Approved botanical banner exception

- Retain left-aligned copy, action labels, typography and the green/warm palette. Restore all thirteen original crop scenes in their original order, as mapped in `frontend/src/data/bannerData.ts`. Each scene pairs its existing crop photograph with the matching foliage cutout; only rice uses `rice-leaf-cutout.png`. Do not replace photographic leaves with icon stickers. No generated replacement assets, added glow, scan beams or glass.
- Automatically advance through all thirteen scenes, wrapping from the last scene to rice. Remove the crop selector and previous/next controls; do not announce automatic changes through a live region. Changing crop reverts the previous GSAP context. Render only the active and next scene, not thirteen hidden image stacks; the next scene is hidden from assistive technology and loads at low priority. Keep the current scene visible until the next image pair and any decorative leaves have loaded, then fade the prepared scene over it. Copy and classification actions stay unchanged as the image advances.
- At 1024px and above, the photograph spans the page width directly beneath navigation, without a rounded card. Text stays within the 1280px app container. Below 1024px, show copy and actions above the photo in a single column; never cover mobile text with foliage.
- Keep decoration clipped to the banner and confined to its right half on desktop. Decorative leaves are `aria-hidden` and ignore pointer events. Keep the existing caption/limitation copy below the hero actions, separate from the moving photo layers; remove the caption/control strip beneath the banner.
- A banner-only warm-canvas photo scrim is allowed to protect text contrast, not as a decorative gradient. `--banner-copy-scrim` stays 96-100% opaque through the copy area, then fades over the photograph. Local stacking uses an isolated scene and `z-10` content; no glass or text shadows.
- Layout tokens in `frontend/src/index.css`: `--banner-height: clamp(32rem, 70svh, 42rem)`, `--banner-foliage-width: clamp(24rem, 36vw, 44rem)`, `--banner-photo-position: 74% center`. Hero height is a minimum and may grow with text; never clip content at larger text sizes.
- Use at most three small drifting leaves on desktop and two below 768px, with a gently swaying crop image. No scroll-linked or pointer parallax.
- Motion tokens in `frontend/src/index.css`: `--banner-drift-distance: 20px`, `--banner-drift-rotation: 5`, `--banner-drift-duration: 6`, `--banner-cycle-duration: 6.5` and `--banner-fade-duration: 0.65` (durations in seconds). Use transform-only leaf movement, opacity-only scene transitions and smooth `sine.inOut` easing. Foliage may sway horizontally as well as vertically. Only the active scene's leaves animate.

- Reduced-motion renders a static scene with no automatic advancement or looping animation. Media changes and unmount must clear timers, revert GSAP contexts and disconnect listeners/observers.
- This narrow exception supersedes the general decorative-loop and autoplay restrictions above; all other design rules and the global 5/3/5 dials remain unchanged.

### 6.2. Approved introduction crop-film strip

- Mouse drag, native touch/trackpad horizontal scrolling and focused ArrowLeft/ArrowRight/Home/End navigation reveal the remaining photographs. User-approved follow-up: remove the visible drag hint and loop both directions continuously, last crop back to first. This is user-driven looping, not autoplay. Three bounded copies may bridge/rebase the scroll seam; expose only the central set to assistive technology, retain hidden keyboard instructions and descriptive image alternatives. Do not hijack vertical wheel/page scrolling.
- GSAP may update frame transform-only curvature in response to the user's scroll; no React state per frame, inertial loop or continuous decoration. Scope setup with useGSAP; remove listeners, cancel scheduled frames and disconnect ResizeObserver on cleanup. Reduced-motion renders a flat strip with instant keyboard/release scrolling, retaining all navigation.
- Token layer: --crop-film-rise: 24px; --crop-film-angle: 10 (degrees); --crop-film-gutter: 6px; --crop-film-rail: 10px; --crop-film-hole: 5px; --crop-film-height: 11rem (14rem below 768px). Use standard spacing utilities around the strip and reserve its height before images load.

### 6.3. Video-reference seedling loading

Use native SVG/CSS steps for the small loop, pause when hidden/on error, and show a static full sprout for reduced motion. User startup ends when actual catalog/history data arrives, without waiting for an animation cycle; preserve the separate admin entrance. Initial restore and route fallback reuse this component; route section leaves navigation usable. A standalone wait offers recovery at20s; existing startup deadline15s/error/retry/cancel remain. Clear timers and visibility listeners on unmount. Keep logo/artwork responsive and greetings wrapping on narrow/enlarged-text screens. Do not restore the discarded preview route.

## 7. Do's and Don'ts

### Do

- Preserve AgriAI navigation labels, task flow, Vietnamese copy voice, and product behavior.
- Use semantic CSS variables for every visual decision.
- Let crop photography and clear copy carry personality.
- Provide loading, empty, error, and success states.
- Maintain visible keyboard focus and 44px touch targets.
- Verify at 375px, 768px, and 1280px.

### Don't

- Do not hardcode hex, arbitrary radius, spacing, or shadow values in feature components.
- Do not use gradients as a default surface treatment.
- Do not put every section in a card or nest cards.
- Do not use fake precision, invented metrics, or mock inference as real evidence.
- Do not add detection, segmentation, or severity UI unless explicitly requested.
- Do not use excessive pills, uppercase eyebrows, status dots, or decorative technical grids.
- Do not use em dashes in visible copy.
- Do not change routes, primary navigation labels, form field order, or legal/limitation copy without explicit approval.

## 8. Responsive and accessibility rules

- Minimum target: WCAG AA contrast.
- Interactive targets are at least 44x44px on touch screens.
- Focus-visible uses the ring token and must not be removed.
- Content order remains logical without CSS positioning.
- Dialogs and sheets have accessible titles and descriptions.
- Motion and smooth scrolling are disabled for reduced-motion users.
- Result meaning must remain understandable without color.

## 9. Agent Prompt Guide

Use this prompt for future UI work:

> Read `DESIGN.md` and `AGENTS.md` fully before coding. `DESIGN.md` is the source of truth for tokens and visual decisions. For common UI primitives, use shadcn/ui with Radix underneath; do not recreate button, input, dialog, select, tabs, checkbox, toast, or tooltip. Domain components may be custom but must compose shadcn primitives and semantic tokens. Raw color, radius, spacing, and shadow values may only appear in the token layer, never in feature components. Use `design-taste-frontend` to direct and repair the UI. Use `vercel-react-best-practices` for every React/Next.js change. Use GSAP only when motion clarifies hierarchy or state, with `useGSAP`, scoped refs, automatic cleanup, transform/opacity, and reduced-motion support. Impeccable is review-only: use only critique/audit, never let it edit files. Implement all remediation with Taste plus React Best Practices. Keep classification as the core scope and never present mock output as real inference. Before editing, state one design-read sentence and inventory the shadcn primitives to reuse. After editing, run the relevant typecheck, tests, build, and responsive checks at 375px, 768px, and 1280px. Task: `<describe the page or component>`.

## 10. Review boundary

Impeccable may inspect screenshots and code, then return critique or audit findings. It must not run craft, polish, normalize, animate, or any command that edits UI. Findings return to the implementation pass governed by Taste and Vercel React Best Practices.
