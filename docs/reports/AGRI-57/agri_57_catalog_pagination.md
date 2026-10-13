# AGRI-57: Catalog pagination

Date: 2026-10-12. Verified branch: `AGRI-57-frontend-summary`.

## Changes

User requested pagination. Added nine entries per page to `/plants` and `/diseases`, after searching/filtering the complete catalog. Shared `useCatalogPagination.ts` derives count/range/slice and clamps on data shrink without effects. Search/category/crop/empty-state changes reset page one. Page changes focus the live results summary and scroll instantly with the existing sticky-header offset.

`CatalogPagination.tsx` composes existing shadcn Button variants and Lucide arrows: named navigation, disabled previous/next boundaries, aria-current, three adjacent numeric buttons and current/total text. Zero/one-page results hide controls. No new dependency, image/data/API/backend/model/route/CSS-token/motion changes. Existing selection feedback, card actions and unrelated WIP preserved.

Design read: preserve the Vietnamese field-guide product's warm/green visual world. Reuse Button/Input/Select; DESIGN dials remain5/3/5. Coding-standards/TDD/React guided implementation, Taste preservation, Impeccable review-only and webapp-testing verification. The docs CLI failed with registry EACCES; consulted official [Pagination](https://ui.shadcn.com/docs/components/radix/pagination) and [Button](https://ui.shadcn.com/docs/components/radix/button) docs instead of installing a new primitive.

## Fresh evidence

- TDD six initial failures: existing views rendered22/12 cards rather than9 and had no pager. Both initial runs red; corrected fixture import before implementation.
- First implementation3/6: test-only selectors used textbox for existing type=search. Corrected to searchbox, preserving production semantics.
- Final full suite **157/157 tests,24 files PASS**,32.40s. Covers partial last page, keyboard activation/focus, previous/next/numeric state, full-list search, category reset, shrinking/empty data, bounded numeric controls and visible plant selection.
- Initial build exposed fixture category widening and unsupported Testing Library exact role options; typed Disease[] and removed unsupported options. Final build **PASS**, compile12.7s,10 static pages/two dynamic routes. Fresh post-build `tsc --noEmit` **PASS**, after restoring original dev-type imports overwritten by Next.
- Scoped Biome five files **exit0**; two pre-existing useTemplate informational suggestions retained. A test-only format error was corrected. Not a whole-repository lint claim. Whitespace exit0, existing CRLF notices.
- Impeccable detector on new pager exit0/no stdout. No claim of whole-project certification.
- Production Chromium with isolated auth/API fixtures **375/768/1280px,3/3 PASS**, both catalogs: nine initial cards, seven disease pages/two plant pages, final3/5 entries, current-page state, focused summary, all pager controls >=44x44px, no horizontal overflow/pageerrors. Crop filter returned8 Lúa nước entries; Esca search found1 reference, clearing restored page1.
- Browser harness first used Lúa instead of Lúa nước; second assumed3 rice entries instead of8. Inspected source and corrected harness only; final3 cases passed. Viewed mobile disease and desktop plant screenshots in one review batch, no UI remediation needed.

Ignored QA artifacts/script: `tmp/ui-review/pagination-*.png` and `catalog_pagination_check.py`. Separate QA server used3100 and was stopped after testing. Existing standalone/next-start advisory unchanged.

## Limits

Client-side pagination over existing fetched data, not server/API paging. Page/filter state remains local to the mounted view; URL/reload/Back persistence and history paging not added. No real backend/model E2E, CI, coverage measurement, physical-touch device, screen reader, Safari/Firefox or FPS verification. Earlier photo provenance/licensing/expert confirmation still pending. No Docker rebuild, migrations, volume operations, staging, commit, push, PR or Jira changes.
