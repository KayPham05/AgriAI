# AGRI-57 — Custom 404 page, 2026-10-21

User requested a custom page for nonexistent URLs, explicitly reminding to write tests.
Verified branch AGRI-57-frontend-summary and preserved unrelated work. Existing root
`frontend/src/app/not-found.tsx` was a basic text fallback. Replaced it with a responsive
AgriAI recovery page: existing logo, warm/green semantic palette, Manrope, large404 and
existing decorative tea foliage, Vietnamese heading/copy, public-home link and back action.
Uses existing shadcn Button, Next Link/Image, lucide icons; no dependency/assets/global
CSS changes. Decorations aria-hidden/emptyalt,44px actions. Mobile stacks artwork above
copy; desktop shows two columns. No auth/provider/backend requirement for the fallback.

Back uses router.back when history length>1, otherwise router.replace('/') for directly
opened invalid links. Home href'/' is public; application auth guards remain unchanged.
Next.js still owns real not-found handling and automatic noindex; no fake200 error route.

Verification:

- `tests/component/app/RouteFallbacks.test.tsx`: RED3 new expectations before code;
  GREEN4/4,1.08s, runner10:58:11UTC, actual container exit0 verified. Tests real home
  href, back history, no-history fallback and existing error retry/privacy. Evidence
  ignored `.cache/not-found-{red,tests}.log`.
- `tests/browser/not_found.py`: production HTTP404 and noindex for invalid routes,
 1280×900/768×900/375×812/320×568/844×390, no horizontal overflow,44px main actions,
  home/back navigation and no page errors. Nested invalid paths `/abc/xyz` and
  `/home/khong-co-trang-nay` show same custom404. Screenshots in ignored `.cache/not-found/`;
  desktop1280/mobile320 inspected.
- Biome2files passed; review-only detector[]. Production build passed compile4.6s and
  TypeScript1075ms. Only frontendlocalhost3000 recreated. Own exited test container removed.
- No fullsuite/coverage/CI, real-device or backend acceptance in this scoped change;
  no80%coverage claim. No commit/push or DB/volume changes.


## Remove header logo follow-up (2026-10-21)

User requested removing the top leaf/AgriAI brand from the 404 page. Removed only the header in `frontend/src/app/not-found.tsx`; existing content, decorative foliage, footer and home/back actions remain. Fresh `vitest run tests/component/app/RouteFallbacks.test.tsx`: 4/4 passed (36.78s). Scoped Biome passed after normalizing this file to LF. No new tests for this simple visual removal. No commit/push or backend changes.
