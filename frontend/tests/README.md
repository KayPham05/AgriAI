# Frontend tests

All Vitest tests and support code live here. Application code stays under `src/`.
Use `@/` for application imports and ordinary relative imports for shared test helpers.

Custom 404: `python tests/browser/not_found.py` against localhost3000 checks actual404
status/noindex, five viewports,44px recovery actions, nested unknown URLs and home/back
navigation. Component coverage lives in `component/app/RouteFallbacks.test.tsx`.

```text
tests/
├── browser/home/         # Optional Python Playwright checks against local production UI
├── browser/auth/         # Optional auth-dialog media playback checks
├── browser/diagnosis/    # Diagnosis stepper/result layout and controlled API states
├── browser/catalog/      # Compact plant/disease catalog headers and search
├── browser/profile/      # Profile layout, local editing and existing guest guard
├── unit/
│   ├── app/              # Route metadata
│   ├── data/             # Catalog and supplied asset contracts
│   ├── services/         # API adapters with controlled HTTP/XHR
│   └── utils/            # Input validation
├── component/
│   ├── admin/
│   ├── app/              # Error/not-found screens
│   ├── common/            # Shared UI, reload animation and login/farewell loading
│   ├── diagnosis/         # Three-step state mapping and result loading/empty/error/data
│   ├── home/              # Home hero/banner motion and plant guide tabs/selection/navigation
│   ├── layout/
│   ├── modals/
│   └── views/
├── integration/
│   ├── admin/
│   ├── app/              # Provider, routing and authentication composition
│   └── diagnosis/
├── tooling/              # Real Biome rule probes
├── helpers/              # Test-only AppHarness
└── setup.ts              # Testing Library cleanup and jsdom shims
```

Run from `frontend/` using the existing pnpm version and dependencies:

```powershell
corepack pnpm test                # Every group
corepack pnpm test:unit
corepack pnpm test:component
corepack pnpm test:integration
corepack pnpm test:tooling
corepack pnpm test:coverage       # Every group; source coverage remains src/**
corepack pnpm typecheck
corepack pnpm lint
```

The all-tests command includes tooling tests; individual groups partition the suite
without duplicate discovery. Existing `.unit.test.tsx`/`.integration.test.tsx` names
are retained, while directory location now decides the group.

`integration` means in-process React/Testing Library composition with controlled
network responses, not browser E2E or real backend/model acceptance. E2E remains
deferred. Asset-contract tests read the original files under `src/assets/`.

Crop-filter scrolling: `python tests/browser/catalog/filter_scroll.py` checks the
menu stays below its trigger, height is bounded, mouse-wheel scroll stays inside
the list, and keyboard selection/reopening work at320/375/768/1280px. API fixtures
are isolated; screenshots go to ignored `.cache/filter-scroll/`.

Two-row pagination: `python tests/browser/catalog/two_rows.py` checks both public
catalogs at320/375/767/768/1024/1280px, two rendered rows, next/previous selection
and no overlapping items between adjacent pages. Uses isolated catalog/API fixtures.

Optional profile regression: `python tests/browser/profile/profile_page.py` checks
five widths (320, 375, 768, 1280, 1440), editing/cancel/save, blank-name guard and
the existing unauthenticated redirect/login. API responses are isolated fixtures;
screenshots go to ignored `.cache/profile-redesign/`. This does not verify server-side profile persistence.

The same script checks real avatar-file selection/decoding, a corrupt-image retry,
retention across client navigation and retention when other profile fields change.
Avatar changes now require confirmation: preview, choose another image, discard or save.
The browser script verifies the dialog at320/375/1280px and that discarding leaves the original avatar intact.
Avatar editor component tests additionally cover format/size/empty-file validation,
file-reader failure, cancelled selection, unmount cleanup and the latest update callback.

Introduction lower sections: `python tests/browser/home/intro_lower_sections.py`
checks six viewports, rice-photo delivery, workflow/principle layout, registration
and trial-to-login actions, and preservation of the single hero map. Uses API fixtures;
screenshots go to ignored `.cache/intro-lower/`.

Hero background: `python tests/browser/home/intro_hero_background.py` checks decorative
image delivery, motion/reduced-motion cleanup, five viewport widths, map/focus and
registration actions. Layout checks reload under reduced motion; dynamic map preference
switching is a known follow-up recorded in the AGRI-57 report. Screenshots go to ignored
`.cache/intro-hero-background/`.

Introduction leaves: `python tests/browser/home/intro_leaf_motion.py` verifies multiple
visible decorative leaves, real transform changes, controlled document-visibility pause,
offscreen pause/resume, static reduced-motion output and narrow layouts. Screenshots
go to ignored `.cache/intro-leaves/`.

Home banner leaves: `python tests/browser/home/banner_leaves.py` checks responsive
foliage sizing at five widths, decoded assets, clear headline/actions/caption, button
hit-testing, visible sway, hidden/offscreen pause, reduced motion and crop synchronization.
Uses isolated auth/API fixtures; screenshots go to ignored `.cache/home-banner-leaves/`.

Banner transitions: `python tests/browser/home/banner_transition.py` samples photo/foliage
opacity during real desktop/mobile crossfades, verifies decoded assets, outgoing-leaf
pose continuity and removal of the previous scene after animation completion. API
fixtures only; ignored JSON/screenshots in `.cache/banner-transition/`.

Auth layout: `python tests/browser/auth/auth_panel_layout.py` checks five viewports,
stable dialog height/position through mode transitions, a single stationary video node,
internal form scrolling and close-button hit-testing. Requires localhost3000 and local
auth media. `auth_panel_video.py` in the same directory checks original MP4 playback,
HTTP Range, controls and mobile/reduced-motion delivery behavior.

Optional browser motion regression (requires a running frontend at localhost:3000,
Python Playwright and Chromium): run `python tests/browser/home/photo_tip_motion.py`
from `frontend/`. It checks the three photo-tip cards lifting, shadow/return,
pressed state and reduced motion using controlled API/auth fixtures. This is a
local UI check, excluded from Vitest discovery and CI, not real-backend E2E.

`python tests/browser/home/plant_catalog_layout.py` checks all four featured cards
have large 16:9 photos flush with their top edges, readable titles, hover/focus lift,
reduced-motion support and no overflow at four viewport sizes.
It uses the same local runtime requirements and fixture-only scope.

`python tests/browser/diagnosis/analysis_components.py` checks the diagnosis page
at six sizes, then selects an image and exercises pending API, error, retry, Top-3
success and image removal. API/auth data are fixtures; it does not run inference.
Screenshots and JSON evidence go to the ignored root `.cache/diagnosis-components/`.
Component tests stay in `component/diagnosis/`, flow tests in `integration/diagnosis/`
and the shared complete prediction fixture in `helpers/prediction.ts`.

`python tests/browser/diagnosis/error_states.py` exercises all eleven issue states
at 1440/375/320px, with real file metadata/dimension checks and explicit API code
fixtures for semantic image rejection. It verifies CTA bounds, image preservation,
retry, supported-plant dialog, sample loading and provisional Top-3 disclosure.
Evidence is ignored under `.cache/diagnosis-errors/`; this does not establish
real-model leaf detection, occlusion detection or out-of-distribution rejection.
Issue policy tests live in `unit/utils/diagnosisIssues.test.ts`; structured error
transport is covered by `unit/services/predictionApi.test.ts`.

`python tests/browser/catalog/compact_headers.py` checks both catalog pages keep
only a screen-reader page heading, remove the visible header block, and retain
search/reset behavior without overflow at four viewport sizes.

Do not run full-tree lint/format concurrently with tooling probes: those tests
create and clean up their own temporary fixtures under `src/`. CI still runs
`test:coverage` and discovers every group through `vitest.config.mts`; no new CI
job, gate, dependency or browser runtime is required.
