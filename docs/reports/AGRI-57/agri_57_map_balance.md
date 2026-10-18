# AGRI-57: Balanced hero and compact offshore presentation

Date:2026-10-12. Verified branch:AGRI-57-frontend-summary. User explicitly requested equal left/right balance and moving Hoàng Sa/Trường Sa closer to mainland, overriding the previous source-distance display.

## Changes

- CropMap.tsx: equal desktop columns (xl:grid-cols-2) instead of0.8/1.2 split. Preserve container/gutters, sticky navigation, copy, buttons, inline information surface and its reverse GSAP timeline.
- New data/mapPresentation.ts: width480, Hoàng Sa-80/Trường Sa-128 SVG-unit horizontal presentation offsets, Côn Đảo0. Separate from geographic source data. No scale, coastline edits or artificial new island features.
- CropMapCanvas.tsx: cropped display viewBox480 by original projected height, centered standard432px internal canvas, unchanged0.9 display scale for mainland and all source shapes. Labels move with the two groups, still transparent. Recompute pin horizontal percentages using original640-unit geographic width against presentation480-unit width: same source anchors,44px hit areas and existing leaders. Narrow viewports retain native horizontal pan/focus; desktop frame centered with max-w-lg.
- DESIGN records the explicit presentation-only exception. vietnamOutline.ts, source geometry/tests, projection, crop coordinates, canopy/relief, photos, model/dataset/API/dependencies and unrelated WIP are unchanged. Displayed offshore distances are intentionally no longer geographically exact.

Taste/React/coding-standards guided minimal visual preservation; Button/Badge/Card and GSAP implementations reused unchanged. Impeccable review-only, no craft/polish command.

## Fresh evidence

- Browser TDD before edit: Hoàng Sa group center remained86.11px east of mainland bounding-box right, failing compact-layout threshold60px. Same harness checks desktop column-width equality; final layout passed both constraints.
- Production build **PASS**,14.6s compile,10static pages/two dynamic routes. Restored original Next dev-type imports overwritten by build; fresh tsc --noEmit **PASS**.
- Full Vitest **160/160,25files PASS**,60.36s with maxWorkers1. Original source-coordinate/island bounds tests remain passing because display offsets do not mutate geography.
- Scoped Biome3files **exit0**, no remaining warnings. Initial removed viewBox usage left an unused import; removed it. Whitespace exit0. Impeccable detector on Canvas exit0/no stdout, not a whole-project certification.
- Chromium public intro with reduced motion **375/768/1280/1900px,4/4 PASS**: equal-width desktop columns within1px, both island groups within declared60px bounding-box-center threshold,44px pin targets/non-overlap, no horizontal document overflow, inline opening/Escape restores original pin focus. Native panning remains available; this run does not certify physical touch gestures.
- Viewed1900px desktop and375px mobile screenshots in one review batch; no further visual remediation needed. Film is flat in reduced-motion captures; film motion code was not changed.

Ignored QA: tmp/ui-review/map_balance_check.py and map-balance-*.png. Own QA server3100 stopped. Existing standalone/next-start advisory left unchanged.

## Limits

This is now a compact crop-map illustration, not a same-distance geographic map; accurate source data stay available separately. No normal-motion/FPS/physical-device/screen-reader/Safari/Firefox certification, backend/model E2E, CI or coverage measurement. No Docker rebuild, migration, volume operation, staging, commit, push, PR or Jira mutation. Prior geographic evidence remains historical, not a claim about current displayed offshore distances.

## Follow-up: map entrance scrollbar and larger canvas (2026-10-12)

Verified branch: AGRI-57-frontend-summary. User requested removing the temporary internal scrollbar and enlarging the map while preserving balance. Earlier verification above remains historical.

- Root cause reproduced in Chromium before editing: the horizontal viewport computed overflow-y:auto; the SVG entrance translateY extended the654px frame to670px. The early-frame harness recorded10 vertical-overflow frames.
- CropMapCanvas.tsx now explicitly uses overflow-y-hidden, retaining native horizontal scrolling. Hero canvas grows from432px to512px at the existing640px breakpoint; phones and detail canvas retain432px. Equal desktop columns, map metadata/source geometry,44px controls, leaders, labels, canopy/shadows and all GSAP code remain unchanged. No new dependency or animation.
- Fresh production build PASS (76s compilation,10 static pages/two dynamic routes); restored original Next dev-type imports after build. Fresh typecheck PASS; full Vitest160/160 across25files PASS in54.09s. Scoped Biome1file PASS; whitespace check exit0. Impeccable detector scoped to Canvas exit0/no findings, not a whole-site audit or accessibility score.
- Browser regression harness tmp/ui-review/map_size_scroll_check.py:1900px normal motion plus375/768/1280px reduced motion,4/4 PASS. Early requestAnimationFrame sampling recorded zero visible vertical-overflow frames across137/130/132/125 samples respectively. Desktop canvas at least500px, equal columns within1px, no desktop horizontal map overflow or document horizontal overflow,44px non-overlapping targets, inline open/Escape restoration and375px keyboard horizontal panning all passed.
- Viewed1900px desktop and375px mobile screenshots in one bounded batch; unchanged signature copy/film, larger centered desktop map. Mobile remains a horizontally pannable canvas to preserve pin target sizes. Taste preserved layout identity; coding-standards/React guidance kept the change to two CSS class decisions, with Impeccable review-only. Screenshots/scripts remain ignored QA artifacts.
- Limits: normal entrance specifically checked at1900px, not every screen/motion combination; no physical touch/device, FPS, Safari/Firefox, screen-reader, Lighthouse, coverage, GitHub CI, backend/model E2E or full-site accessibility certification. No Docker rebuild/deployment, DB/volume operation, stage/commit/push/PR/Jira mutation. Existing standalone-start warning unchanged. Own QA server3100 stopped after checks.
