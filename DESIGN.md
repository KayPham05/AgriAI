# AgriAI Design System

User-approved naming update on 2026-10-09: the website's visible brand and metadata use AgriAI. Preserve legacy package/storage identifiers to avoid breaking persisted sessions/history. The user also explicitly requested removal of the introductory hero's illustration disclaimer and the introductory footer's AI-support disclaimer; remove only those two passages, preserving classification limitations and other factual guidance elsewhere.

User-approved on 2026-10-09: remove the home-page green informational strip titled “Một bức ảnh là điểm bắt đầu” and its supporting disclaimer. Classification-result limitations elsewhere remain unchanged.

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
- User-approved map detail expansion (2026-10-09): this Dialog may widen to the standard max-w-4xl, displaying crop information on the left and the same interactive geographic map on the right from 768px; smaller screens stack info then map within the scrollable body. Open once with synchronized GSAP scaleX expansion from the right edge and transform/opacity panel entrance, using existing entrance tokens and --crop-map-dialog-enter-scale: 0.86. Do not animate width/layout or change geography. Selected pin artwork uses --crop-map-selected-scale: 1.3, anchored at its bottom center without enlarging/moving the button hit area; aria-pressed identifies selection. --crop-map-detail-width: clamp(16rem, 34svh, 18rem) keeps the inset map readable; short screens scroll the body rather than shrinking pin targets. Give each SVG canopy pattern a unique ID. Preserve crop switching, source links, focus trap/Escape/close and restoration to the original opening pin even after switching regions. Reduced-motion displays the final two-panel state and enlarged selected pin without travel.
- Width cap token --crop-map-dialog-width: min(56rem, calc(100vw - 2rem)) preserves 16px side clearance on tablets. In the compact dialog map, the Trường Sa label may move upward by standard spacing to avoid the enlarged inland pin, without changing island geometry or geographic anchors.
- User-approved introduction correction (2026-10-09) supersedes the two-map/centered-dialog treatment for this hero: keep exactly one original interactive map mounted in the right column. On selection, the existing left copy/actions/film recede together (scale --crop-map-copy-recede-scale: 0.94, negative --view-enter-distance, opacity to zero) while a single shadcn Card information surface expands from its right edge into that same left column using --crop-map-dialog-enter-scale and the existing entrance duration. No portal, backdrop, duplicate map or focus trap in this inline flow. Reverse the same scoped GSAP timeline on close so the original copy and film return without remounting or resetting the strip. Hidden content is aria-hidden/inert; pause the film while inert. Keep the selected pin's 1.3 artwork scale, fixed hit area and transparent button background. Close and Escape restore focus to the opening pin; other map points remain usable. On stacked screens below the existing 1280px hero split, reveal the information above the same map and scroll its header below the sticky navigation with the existing 6rem offset. Reduced-motion switches immediately; changing preference must preserve the current open/closed state.
- User-approved on 2026-10-09: remove the visible crop-map heading/instructions and geography/source caption from the introduction hero. This supersedes the visible source-link/limitation-note requirement above for this map instance. Retain the accessible region name, island labels, geographic source records in code/reports, and crop-source links inside the dialog.
- Crop-map illustration: the user-requested canopy texture may be clipped inside the geographic outline and schematic island insets only. `--crop-map-depth-shadow` gives the land illustration subtle relief; do not apply it to controls. Keep Hoàng Sa, Trường Sa, and Côn Đảo visibly labelled with source links and an explicit not-to-scale/maritime-boundary note. This does not permit generated replacement imagery elsewhere, including the botanical banners.
- User-requested mainland relief refinement (2026-10-09): combine `--crop-map-depth-shadow: 2px 4px 2px color-mix(in srgb, var(--primary-hover) 28%, transparent)` with `--crop-map-ambient-shadow: 6px 12px 10px color-mix(in srgb, var(--foreground) 20%, transparent)` on the mainland path only. The close contact shadow and softer down-right cast shadow separate the canopy from the warm canvas without changing geometry, position or motion. Keep small islands/reef traces, labels and pin controls unfiltered as above; no halo, black shadow, new floating animation or rectangular shadow around the SVG.

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

- Authentication input refinement (2026-10-09): retain the existing shadcn Input/Label/Button controls and visible top labels. Inside `.auth-form-panel` only, use `--auth-field-height: 3rem` (48px), standard 16px left padding, the existing 12px input radius and surface fill. Define `--auth-field-border: color-mix(in srgb, var(--muted-foreground) 80%, var(--surface))`, `--auth-field-focus-ring: color-mix(in srgb, var(--ring) 18%, transparent)` and `--auth-field-ring-width: 3px` in the token layer. Green border/focus, destructive border/ring for invalid fields and existing disabled guards stay distinguishable. Match the CAPTCHA tile height and center the existing 44px password action with standard 2px inset. Autofill retains the surface/foreground through `--auth-field-autofill-paint: inset 0 0 0 1000px var(--auth-field-background)`; this inset color paint masks browser autofill blue, not elevation. Preserve focus/error rings on autofilled inputs. No floating labels, new icons, hidden labels, layout animation, validation/API change or global restyling of other forms.

- User-approved auth-switch reference (2026-10-09): desktop from 768px may use a two-panel shadcn Dialog, with a secondary-green welcome/switch panel and one active surface form exchanging sides through transform-only GSAP. Reuse existing entrance duration/distance/opacity; no duplicate hidden forms, neumorphic shadows, social-login placeholders or decoration from the video. Below 768px keep one column with gentle form feedback. Use --auth-dialog-max-height: calc(100dvh - 2rem), scroll for long terms/errors, visible close and existing focus management. Reduced-motion switches directly; preserve all fields, validation and submission guards.

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

- User-approved routing architecture refinement (2026-10-09): replace the shared pathname-based view switch with explicit page-to-feature imports. Keep persistent typed domain contexts in the website provider and navigation/footer/entrance in an application-group shell. Preserve URLs, brand/loading entrance, page visuals and auth/history dialogs. Next Link may replace navigation buttons via the existing shadcn Button asChild composition. Route loading/error/not-found states reuse the warm canvas, semantic text colors and existing Button variants; no additional motion or decorative treatment. Keep async API errors separate from render-error boundaries. Server-session/API contract changes are not implied by this structural refactor.

- User-approved routing migration (2026-10-09): preserve the existing views, navigation labels, semantic tokens and entrance motion while assigning Next.js App Router URLs: `/` for introduction, `/home`, `/diagnose`, `/plants`, `/plants/[id]`, `/diseases`, `/diseases/[id]`, `/history`, `/about`, `/profile`. Keep the authenticated app shell in a shared layout. URL state selects the view/detail; reload and browser Back/Forward must restore that selection. Preserve the existing login-required app flow and return to the requested route after login. Authentication and history-detail dialogs remain dialogs, not new pages.

- User-approved map exploration spacing refinement (2026-10-09): from the existing 1280px hero split, opening information removes the left column's copy-only `pt-12` offset and top-aligns both the information and the original map. Retain standard hero `pt-8`, giving 44px clearance below the visible navbar including its lower gutter. Closed copy/film/map layout returns unchanged. No new spacing values, map scaling, extra motion or mobile-layout change.
- App container: max 1280px, 20px mobile gutters, 32px tablet, 48px desktop.
- Navigation stays under 80px tall and keeps one line on desktop.
- User-approved navigation treatment: introduction and app use a sticky top header with standard page gutters and 12px vertical breathing room. The visible bar is 72px high, uses the 16px card radius, surface/border tokens and `--navigation-shadow: 0 4px 16px color-mix(in srgb, var(--primary-hover) 8%, transparent)`. It remains in document flow, below dialog/sheet layers; do not animate/hide it on scroll. Preserve the existing 6rem anchor offset and mobile navigation behavior. Ancestors must not create a competing scroll container that disables viewport stickiness.
- Marketing/intro hero: left-aligned copy and one real crop image. Maximum two CTAs. Introduction/home banners may use the full-width photographic composition in section 6.1; their text still aligns to the app container.
- Diagnose flow: image input, validation, analysis state, result. Keep this order stable.
- Catalog grids may use 2-4 columns. Avoid three identical feature cards as the default marketing pattern.
- Mobile below 768px collapses to one column. Primary action remains reachable without covering content.

## 5. Photography and icons

User-requested map size/scroll correction (2026-10-12): the compact hero canvas grows from432px to the standard512px width from640px screens, remaining centered inside equal desktop columns. Keep432px on narrow phones and the existing detail-map sizing. Explicitly hide vertical overflow on the native horizontal map viewport so the existing entrance transform cannot produce a temporary internal vertical scrollbar. Preserve horizontal keyboard/touch pan on narrow screens, geography/presentation offsets,44px pins, relief, labels and all existing motion. This supersedes the432px desktop size below only.

User-approved compact map composition (2026-10-12) supersedes the strictly geographic offshore display below, not its source data. Use equal desktop hero columns and a centered standard432px internal map canvas (presentation viewBox width480, original projected height). Translate only displayed Hoàng Sa by-80 and Trường Sa by-128 SVG units horizontally; move corresponding labels with their groups, without scaling/altering polygons. Côn Đảo and mainland stay in place. Keep source geometry/projection in vietnamOutline unchanged and offsets in separate mapPresentation metadata. Recalculate pin percentage positions against the cropped presentation width so every source anchor, hit area and existing leader stays fixed visually. Preserve canopy/relief,44px targets, native narrow-screen pan, focus, single-map exploration and reverse motion. This is a compact illustration, not a same-distance geographic map.

User-requested geographic accuracy correction (2026-10-12) supersedes the map's enlarged island insets, 4:7 canvas and label offsets above. Use Natural Earth 1:10m geometry for mainland and a selected offshore land/reef subset, all in the same spherical Web Mercator projection (101.5-118E, 6-24N). Keep island positions and silhouettes at source scale; do not fabricate missing features or imply legal boundaries. The selected Trường Sa subset excludes Palawan/northern Borneo coastal neighbors. Preserve canopy texture as decoration, not measured terrain. Use a standard w-xl internal canvas with its projection-derived aspect ratio and a labelled, keyboard-focusable native horizontal viewport on narrow screens so geography is not compressed/rearranged. Island labels remain transparent, now anchored to the expanded regional canvas without the earlier artificial Trường Sa translation. Regional crop coordinates remain representative; the existing nho leader and a short eastward Đông Bắc leader retain true anchors while separating44px pin targets. Preserve single-map inline exploration, reverse motion, source links and all existing controls.

User-requested island-label correction (2026-10-12): Hoàng Sa, Trường Sa and Côn Đảo use transparent label backgrounds on both map variants, keeping primary-colored type. Apply the existing standard `-translate-y-12` Trường Sa label offset to the hero as well as details so the text clears mainland canopy after removing its opaque backing. Preserve island/map geometry, pin controls and all motion.

User-requested leaf photo integration on 2026-10-12: preserve all 70 supplied files in `frontend/src/assets/Bệnh lá/` and map them explicitly by crop and condition, separate from banners and decorative cutouts. Treat their filenames as user-provided illustration labels, not verified diagnoses or approved training evidence; show this qualification in condition descriptions and disease overviews. Healthy photos belong to plant conditions, not the disease listing. Add missing reference entries without inventing pathogen identities, severity, prevention, treatment, model-support counts or classifier labels. Generic scorch/yellowing names do not certify a more specific existing condition. Preserve missing-image fallbacks for unmatched references. Source attribution, licensing and expert confirmation remain pending.

User-approved follow-up on 2026-10-10: replace the former generated crop photographs throughout the UI with the thirteen user-supplied JPEGs, including crop catalogs/details, map information and supporting banners. Remove obsolete generated crop/foliage assets. The user explicitly excludes the existing logo and geographic map texture from replacement/deletion; retain both and all map geometry, relief and interactions. Do not use general crop photographs as verified healthy/diseased leaf-reference evidence; keep the existing missing-image treatment until appropriate photographs are verified. Existing banner/film motion stays unchanged. This supersedes the banner-only asset scope in section 6.2; photo provenance/licensing still needs source records.

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
- User-approved authenticated loading page (2026-10-09, supersedes the previous success-screen/button treatment): show only the real logo, six AgriAI letters and the account greeting. Reveal logo → brand letters → greeting once using --auth-brand-stagger: 0.08 seconds and existing entrance tokens; preserve screen-reader brand text, scoped cleanup and static reduced-motion. Automatically enter home after both this finite entrance and real startup catalog/history requests complete, without an extra hold or fake progress. Normal state has no success paragraphs or enter button. On failed startup or a 15-second connection timeout only, show a concise error and shadcn retry/return actions. Never silently mask missing account data with guest/demo history. This exception permits automatic entry here, not elsewhere.
- Introduction reference-video adaptation: reveal hero copy/actions in reading order and below-fold headings, photo, workflow steps, principles and final CTA once on viewport entry. Reuse `--view-enter-distance`, `--view-enter-duration`, `--selection-enter-stagger` and `--selection-enter-opacity`; animate wrapper transform/opacity, not button transforms. Content stays readable before enhancement. No scroll hijacking, scrub, parallax, split-letter effects, replay loops or layout changes; reduced-motion is static.
- Crop map: one entrance when it first enters the viewport, with land and north-to-south pins using existing `--view-enter-*` and `--selection-enter-*` tokens. Selecting a region may lift and settle the pin artwork once; selecting a crop reuses `SelectionFeedback` for its photo/copy. Keep geographic anchors and button hit areas fixed. No ambient loop, island drift, map rotation, scan effect or parallax; reduced motion keeps the static final state.

### 6.1. Approved botanical banner exception

User-approved on 2026-10-07: the introduction and home hero media may use repeating leaf drift to restore the earlier botanical character. The user's follow-up explicitly requests automatic scene changes, removal of the selector/navigation strip and slightly stronger leaf movement. This exception permits ambient motion and autoplay only inside those banner media, not elsewhere in the application.

- Retain left-aligned copy, action labels, typography and the green/warm palette. Restore all thirteen original crop scenes in their original order, as mapped in `frontend/src/data/bannerData.ts`. Each scene pairs its existing crop photograph with the matching foliage cutout; only rice uses `rice-leaf-cutout.png`. Do not replace photographic leaves with icon stickers. No generated replacement assets, added glow, scan beams or glass.
- Automatically advance through all thirteen scenes, wrapping from the last scene to rice. Remove the crop selector and previous/next controls; do not announce automatic changes through a live region. Changing crop reverts the previous GSAP context. Render only the active and next scene, not thirteen hidden image stacks; the next scene is hidden from assistive technology and loads at low priority. Keep the current scene visible until the next image pair and any decorative leaves have loaded, then fade the prepared scene over it. Copy and classification actions stay unchanged as the image advances.
- At 1024px and above, the photograph spans the page width directly beneath navigation, without a rounded card. Text stays within the 1280px app container. Below 1024px, show copy and actions above the photo in a single column; never cover mobile text with foliage.
- Keep decoration clipped to the banner and confined to its right half on desktop. Decorative leaves are `aria-hidden` and ignore pointer events. Keep the existing caption/limitation copy below the hero actions, separate from the moving photo layers; remove the caption/control strip beneath the banner.
- A banner-only warm-canvas photo scrim is allowed to protect text contrast, not as a decorative gradient. `--banner-copy-scrim` stays 96-100% opaque through the copy area, then fades over the photograph. Local stacking uses an isolated scene and `z-10` content; no glass or text shadows.
- Layout tokens in `frontend/src/index.css`: `--banner-height: clamp(32rem, 70svh, 42rem)`, `--banner-foliage-width: clamp(24rem, 36vw, 44rem)`, `--banner-photo-position: 74% center`. Hero height is a minimum and may grow with text; never clip content at larger text sizes.
- Use at most three small drifting leaves on desktop and two below 768px, with a gently swaying crop image. No scroll-linked or pointer parallax.
- Motion tokens in `frontend/src/index.css`: `--banner-drift-distance: 20px`, `--banner-drift-rotation: 5`, `--banner-drift-duration: 6`, `--banner-cycle-duration: 6.5` and `--banner-fade-duration: 0.65` (durations in seconds). Use transform-only leaf movement, opacity-only scene transitions and smooth `sine.inOut` easing. Foliage may sway horizontally as well as vertically. Only the active scene's leaves animate.
- User override on 2026-10-07: remove the corner pause/resume button entirely, without adding another overlay control. Keep automatic scene changes and leaf movement. This replaces the previous visible-pause requirement; users no longer have an on-page manual pause mechanism, an accessibility trade-off to retain in the review report. Pause automatically when offscreen or the document is hidden. Restart a full scene interval on return, or resume an interrupted fade, rather than catching up through missed slides.
- Reduced-motion renders a static scene with no automatic advancement or looping animation. Media changes and unmount must clear timers, revert GSAP contexts and disconnect listeners/observers.
- This narrow exception supersedes the general decorative-loop and autoplay restrictions above; all other design rules and the global 5/3/5 dials remain unchanged.

### 6.2. Approved introduction crop-film strip

User-approved grape addition on 2026-10-12: append the real `assets/banner/nho banner.jpg` to the thirteen existing scenes without reordering them, using the shared grape catalog/photo registry in home, film and map information. Add a sourced geographic Ninh Thuận grape marker near Ninh Phước/Thuận Nam; avoid representing the historical geographic-indication name as a new administrative-boundary claim. Where this marker sits near Lâm Đồng, keep its true geographic anchor and connect a marker shifted north-east by `--crop-map-nearby-pin-offset: 1.5rem` and `--crop-map-nearby-pin-rise: 3rem` with a thin primary-color leader (`--crop-map-leader-stroke: 1px`); other marker anchors do not change. The new `assets/banner-leaves/grape-foliage-cutout.png` is an imagegen-assisted transparent decorative extraction/reconstruction, not a diagnostic photograph. Reuse exactly one anchored cluster and the existing7s base-pivot sway, prepared-scene fade/pause/reduced-motion/cleanup. No extra flying copies, new motion system or disease-count claims.

Asset organization clarified by the user on 2026-10-12: the thirteen original JPEG photographs live in `frontend/src/assets/banner/`; fourteen decorative PNGs live in the sibling `frontend/src/assets/banner-leaves/`. Both folders are directly inside assets, not nested. This is a path-only relocation with unchanged image bytes, crop mappings, visual tokens and playback. Older paths below are historical.

User-requested corn refinement on 2026-10-10: reduce only the corn foliage frame to 70% of its previous width using `--banner-corn-foliage-width: min(63%, 25.2rem)` so the photographed person remains more visible. Keep its lower-right anchor, 4:3 aspect, sway pivot/timing, shared scene fade and every other crop unchanged.

User-approved correction on 2026-10-10 after reviewing the legacy code supersedes the small duplicated crop cutouts below: each scene has exactly one large foliage/stalk artwork anchored at the lower-right of the existing media, width min90%/36rem, reserved4:3 frame with contain fit, right-1.5%, bottom-13%. Recover `rice-stalk-cutout.png` into the same src/assets/banner-leaves directory for rice, while its small floating leaves use the separate rice-leaf asset. Other crops have no flying copies of their plant artwork. Sway the single plant around its original94%/95% base pivot, from-2.5deg to3deg over7s with sine.inOut yoyo; no x/y translation of that plant. Only rice retains three small leaves (two below768px): widths90/64/70px, opacity0.72/0.55/0.65, right9%/35%/13%, top15%/52%/77%, restrained20px/5deg drift over13s. Keep all positioning/motion in tokens, decoration within clipped photo media and hidden to assistive technology. No old shadow, haze, pointer parallax, scanner panel or crop-photo changes. Preserve balanced bounds, photo crossfade1.2s, readiness/error fallback, visibility pause, reduced-motion and cleanup. Restore only the requested artwork, not the former full page or generated crop photos. Earlier restoration prose describes the rejected iteration.

User-requested restoration of the former moving leaf artwork on 2026-10-10 is a narrow exception to the generated-foliage removal below: recover only thirteen legacy decorative crop/leaf cutout PNGs into `frontend/src/assets/banner-leaves/` and statically import them through a banner-only registry. Do not restore generated crop photographs or the obsolete public paths. Real banner/film/catalog/map-information photos remain the supplied JPEGs. The decoration is not evidence of crop health, species accuracy or disease. Keep the balanced stage, photographic framing, copy and CTAs unchanged. Inside the clipped media scene only, show three small decorations from 768px and two below; empty alt/aria-hidden/pointer-events-none. Position tokens: start left26%/top10%, end right12%/bottom8%, third right8%/top12%; width clamp5rem/14vw/11rem. Reuse drift20px/rotation5/duration6s with transform-only sine.inOut yoyo, animated only for the active scene. Fade leaves with the photo using the existing1.2s prepared-scene transition. Wait for incoming artwork, but hide a failed decorative image and allow the real photo to advance; a failed photo still keeps the working scene visible. Preserve scoped cleanup, visibility/offscreen pause, static reduced-motion and previous manual-pause override. No new generated image, changes to map/logo/film, dependency, route or API.

User-approved balanced home banner refinement on 2026-10-10 supersedes the edge-to-edge desktop media bounds below: align the banner stage with the visible navigation bar using the same max-w-7xl and desktop outer px-12 gutters. Keep copy inset by the existing standard desktop spacing; photo occupies 60% of this stage, with `--banner-height: clamp(28rem, 32vw, 32rem)` so the inset composition does not retain an oversized full-bleed height. The desktop alpha mask is opaque from 24% through 92%, blending only the two side edges into the canvas; no top/bottom haze, photo-wide wash, border, radius or shadow. Preserve shared scene bounds, crop-specific focal points, cover fit, 1.2-second crossfade and all playback/accessibility guards. Below 1024px retain the existing full-width 3:2 photograph below copy. Update Next image size hints to these bounds. No changes to source photography, logo, map, film, copy, buttons, navigation or routes. Earlier paragraphs remain historical evidence.

User-approved correction after the framing preview on 2026-10-10 supersedes the contain/inset treatment below: give every home banner scene the same filled media bounds, with a 3:2 photo aspect on stacked screens and desktop `--banner-media-width: min(56vw, 60rem)` alongside `--banner-height: clamp(28rem, 37.333vw, 40rem)`. Use `object-cover` with each existing crop focal point; slight edge cropping is the explicit trade-off for stable framing rather than changing letterbox margins. Desktop photograph's left edge blends into the warm canvas through an alpha mask, becoming opaque by 24%; keep top/bottom clean rather than adding a hazy vignette. No blur, shadow, glass, border or pale wash over the whole photo. Maintain copy/actions and original photo sources. Extend `--banner-fade-duration` to 1.2 seconds with the existing opacity-only `sine.inOut` fade, prepared-image gate, scene interval and centered 1.03 zoom; do not animate layout. Mobile stays unmasked beneath copy. Film/map/logo and all pause/reduced-motion/cleanup behavior remain unchanged. Previous framing prose and evidence below record the earlier iteration, not the current treatment.

User-approved home banner framing correction on 2026-10-10 supersedes the full-width cover photograph and broad text scrim in 6.1 for `BotanicalBanner`: from 1024px, keep copy/actions within the app container in the left half and the original photograph in the right half. Below 1024px, retain copy above media. Use centered `object-contain` instead of enlarging/cropping the source; remove the photo scrim because text no longer overlays photography. Reserve `--banner-photo-inset: 2%` on all sides so the existing centered 1.03 photo zoom remains inside the media bounds. Preserve the existing minimum height, thirteen sources/order, timing, reduced-motion, readiness, visibility pause and cleanup. Warm-canvas margins may appear where source aspect ratios differ; showing the whole photograph takes priority over edge-to-edge fill. The film strip and map are unchanged.

User-approved real-photo replacement on 2026-10-10 overrides the artificial foliage treatment in 6.1: all thirteen banner/film photographs now use the user-supplied JPEGs in `frontend/src/assets/` through explicit static Next image imports. Preserve crop identities/order, copy/actions, film geometry and the green/warm palette. Do not generate imagery or render the old foliage/rice-leaf cutouts in these surfaces. Replace leaf rotation/drift with a restrained photo-only zoom using `--banner-photo-scale: 1.03` and `--banner-photo-duration: 12` seconds, `sine.inOut`, transform only. Retain the 6.5-second scene interval and 0.65-second prepared-photo crossfade; active and next photographs only. Crop-specific focal positions apply consistently to the banner and film. Keep original files unchanged and let Next optimize delivery. Reduced-motion remains static; offscreen/hidden-tab pause and scoped cleanup remain mandatory. The strip retains its approved 16px/second loop and all manual interactions. This is a banner/film-only asset change, not disease-reference evidence or a replacement of map geography/canopy/catalog imagery. Asset source/licensing must not be inferred from appearance.

User-approved on 2026-10-09: below the introductory hero's left copy/actions, add a small curved film-style crop-photo strip. Reuse the thirteen existing BOTANICAL_BANNERS photographs in order. Four frames fit the desktop viewport; below 768px two fit for readable imagery. This narrow exception permits film perforations and an arched frame arrangement, using primary-hover for the film and background for the holes. No black plastic, metallic gloss, extra shadows, generated imagery, labels over photos or autoplay.

User-approved autoplay follow-up on 2026-10-09 supersedes the no-autoplay wording for this strip only: slowly advance through the existing seamless loop at --crop-film-speed: 16 pixels per second. GSAP may drive native horizontal scroll here, preserving transform-only curvature. Pause while hovered, keyboard-focused, interacting, offscreen or document-hidden; resume without catching up. Provide a small existing shadcn pause/resume control. Reduced-motion has no autoplay and hides the unnecessary control, retaining manual navigation. Clean up the tween, observers and listeners. This does not authorize looping animation elsewhere.

User override on 2026-10-09: remove the crop-film pause/resume button entirely, superseding the control requirement above. Keep slow autoplay, manual navigation, automatic interaction/offscreen/visibility pausing and static reduced-motion. No replacement overlay control; losing an explicit persistent pause control is an accessibility trade-off to record in the UI report.

- Mouse drag, native touch/trackpad horizontal scrolling and focused ArrowLeft/ArrowRight/Home/End navigation reveal the remaining photographs. User-approved follow-up: remove the visible drag hint and loop both directions continuously, last crop back to first. This is user-driven looping, not autoplay. Three bounded copies may bridge/rebase the scroll seam; expose only the central set to assistive technology, retain hidden keyboard instructions and descriptive image alternatives. Do not hijack vertical wheel/page scrolling.
- GSAP may update frame transform-only curvature in response to the user's scroll; no React state per frame, inertial loop or continuous decoration. Scope setup with useGSAP; remove listeners, cancel scheduled frames and disconnect ResizeObserver on cleanup. Reduced-motion renders a flat strip with instant keyboard/release scrolling, retaining all navigation.
- Token layer: --crop-film-rise: 24px; --crop-film-angle: 10 (degrees); --crop-film-gutter: 6px; --crop-film-rail: 10px; --crop-film-hole: 5px; --crop-film-height: 11rem (14rem below 768px). Use standard spacing utilities around the strip and reserve its height before images load.

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
