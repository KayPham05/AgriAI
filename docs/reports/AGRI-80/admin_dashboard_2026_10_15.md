# AGRI-80 - Admin dashboard layout and motion (2026-10-15)

Branch verified: AGRI-80-create-crm-admin-page. User requested the layout/effect direction of an attached dashboard screenshot while retaining the current design-system colors and documenting new rules. The reference is a static image; motion is an interpretation, not a verified reproduction of the original video.

## Implementation

- Reworked admin chrome into a rounded floating frame, compact112px desktop navigation rail, account search and existing mobile Sheet. Kept existing route/auth gate, server authorization, pending/error handling and logout.
- Overview composes existing shadcn Card/Button/Badge primitives: three actual summary totals, management shortcuts, recent uploaded images, authenticated admin identity and recent login sessions. Existing authenticated paged APIs supply the previews; no backend contract or database migration changed for this UI follow-up. Preview requests run independently and are aborted on unmount, with loading/empty/error/retry states and safe image fallback.
- Search opens the backend account directory with the entered query retained in its visible search input. Existing list search, pagination and confirmed account/image moderation remain available.
- Added scoped AdminMotion using the installed GSAP/useGSAP stack. Finite transform/opacity entrance runs on view changes with up to eight staggered groups, context cleanup and cleared inline styles. CSS provides metric hover lift and action-arrow movement; reduced-motion stays static with working focus/navigation.
- Preserved all palette and font tokens. DESIGN.md section11 records the user-authorized admin layout exception, responsive composition, data semantics, motion and fourteen new admin tokens. No dependency added.
- Affected paths: frontend/src/features/admin/{AdminCrmPage,AdminOverview,AdminOverviewPanels,AdminMotion,AdminUsers,AdminRecordList,AdminCrmPage.test}.tsx; frontend/src/index.css; DESIGN.md; this report, report index and AGRI-80 task log.

## Fresh verification

- TDD: two added behavior tests initially failed (missing recent regions and dashboard search), with12 existing tests passing; after implementation14/14 passed. Final selected rerun after mobile grouping adjustment:14/14 PASS,7.81s.
- Full frontend suite:180/180 tests across26files PASS,57.29s. This run preceded only a CSS-grid class adjustment and changing the unavailable marker back to a hyphen; final selected suite and build cover those edits.
- Final typecheck PASS; strict lint155files PASS; admin/CSS format12files PASS. Whole-project format still reports the same two unrelated WIP files: src/App.routing.test.tsx and src/services/authApi.test.ts. They were not reformatted.
- Docker frontend production build PASS; frontend recreated locally. All four Compose services observed healthy. Backend unit/integration suites were not rerun for this frontend-only follow-up; earlier evidence belongs to the moderation report.
- Chromium live browser checks at1280/768/375: real summary counts match API, no document horizontal overflow, no visible CRM text, account search opens filtered backend list, rapid desktop switching and mobile Sheet navigation work, no page errors. Hover computes the requested4px lift; reduced-motion returns no transform and skips view-entry styles. Screenshots stored under ignored .cache/admin-verification/dashboard_*.png and desktop/mobile visually reviewed.
- Full live moderation regression against a newly created isolated account/image: warning delivery/read; open-user-tab force logout; lock/blocked login/restore; image warning persistence; physical local image deletion with prediction history retained; responsive management views; no page errors. Fixture account/history cleanup PASS. No real user's account/image was moderated.

## Limits

Local Chromium viewport emulation is not a physical-device or cross-browser certification. No new coverage measurement, GitHub Actions result, real model-quality acceptance, Cloudinary private-delete acceptance or deployment beyond local Compose is claimed. Existing changes remain uncommitted; no commit/push performed.
