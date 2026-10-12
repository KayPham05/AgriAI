# AGRI-57 — Route-owned pages and shared application state

Date: 2026-10-09. Verified branch: `AGRI-57-frontend-summary`.

## Scope and architecture

User approved replacing the incremental URL migration with a maintainable App Router structure. Preserve all existing views, CSS/GSAP, session storage, ASP.NET contracts and unrelated WIP. No dependency changes, backend, database, cookie/BFF migration, commit or push.

- `src/app/(website)/layout.tsx` mounts `providers/AppProvider.tsx`. `App.tsx` is now only a compatibility re-export, with no screen switch/imports.
- `(website)/(application)/layout.tsx` mounts `components/layout/AppShell.tsx`; introduction stays outside this shell while sharing the same provider. Groups do not change URLs.
- Each server page imports only its domain's `features/<domain>/*Route.tsx`. Dynamic detail pages await typed `params` and pass the ID explicitly. Existing `views/` are reused unchanged. `test/AppHarness.tsx` owns the jsdom-only route simulation; no production fallback router.
- `AppContexts.ts` exposes separate typed auth/catalog/history/feedback contracts. Memoized values and stable callbacks avoid context propagation for unrelated updates. Provider owns existing session restoration, real startup requests, history/profile actions and global dialogs/toasts. Startup remains parallel and preserves the agreed greeting/data readiness behavior.
- Navbar, mobile navigation and footer use Next Link through existing Radix/shadcn Button asChild. Imperative feature callbacks use `hooks/useAppNavigation.ts`. Keep existing labels, classes, active-page semantics, menu close and touch targets. Logo rendering uses Next Image with declared dimensions and existing fallback behavior.
- Root, website and application render-error boundaries use the installed Next 16.3 `retry` callback. Global error provides its own `html lang=vi`/`body`. Fallback text does not expose exception payloads. Website/application loading boundaries supplement, not replace, client request loading/error states.
- Root custom not-found handles unmatched page URLs. `MissingCatalogItem` preserves unknown-resource messaging and real catalog return links. Resource existence is still resolved from the loaded client catalog; this is not server-side notFound or a guaranteed HTTP 404 for a missing ID.
- Server page metadata names each screen; detail metadata uses known local catalog names, generic fallback for unknown/backend-only IDs without echoing arbitrary input. Application routes are noindex because the current product requires login; no public SSR/SEO catalog is claimed.
- `frontend/README.md` describes ownership and boundaries; DESIGN.md records the authorized structural change without restyling.

## Verification record

- TDD red: two failures in the original structure: supplying a page still showed the shell-selected view, and Navbar destinations were buttons rather than links. Green focused routing/startup/Navbar: 12/12 PASS.
- Metadata red: known crop/disease titles incorrectly remained generic (two failures); fallback case already passed.
- Full suite before the final fallback tests: 112/112 PASS, 20 files. Added two fallback characterization tests: retry action and non-disclosure, plus unknown-page return link; focused 2/2 PASS.
- Route type generation and TypeScript PASS. First focused run stalled during worker startup/import without a result; interrupted only that owned test session, then isolated the test and reran the three suites successfully. No application fix was inferred from the stall.
- Targeted lint first failed six warnings (type-only imports and img elements); corrected the affected imports/logo rendering. Rerun: 46 affected files, no warnings/errors.
- Browser fixtures: authenticated direct links/reload/Back/Forward/list/details/missing/all screens PASS at 375/768/1280 reduced motion and 1280 normal motion. Known detail title, guest redirect/login return and custom unmatched-page HTTP404 PASS. API calls are intercepted test data, not real accounts/inference.
- Final full suite: `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` PASS, 114/114 tests in 21 files, exit 0. Final `corepack pnpm typecheck` PASS after restoring existing Next dev-type references.
- Production `corepack pnpm build` PASS: Next 16.3.6 compiled successfully, generation 10/10 pages, seven application screens, introduction and two dynamic detail routes listed. No dependencies or build configuration changed.
- Final affected-source Biome lint and format check PASS across 46 files without warnings/errors. The Corepack Windows cmd shim rejected unquoted route-group parentheses before executing Biome; reran the same scoped file list through the installed Biome Node entry point. Formatter adjusted only the new fallback test in this final pass.
- Final browser rerun PASS: four authenticated viewport/motion cases plus guest deep-link login return and unmatched-page HTTP404. No page errors or horizontal overflow in the checked flows. Targeted tracked-file Git whitespace diff check PASS with existing LF/CRLF notices.

## Limits and next boundaries

This is a scalable routing/module foundation, not certification that every production concern is complete. Browser-storage JWT cannot be validated in Next Proxy/server components without changing the session contract. ASP.NET remains the data authorization boundary. No real AI/backend E2E, migration, CI, coverage, production bundle-performance measurement, device/screen-reader certification or full-tree lint remediation. Expected API errors are not caught by render boundaries. Root retry/non-disclosure is unit-tested; global error is compiled but not deliberately fault-injected into the live app. Preserve prior phase evidence in `agri_57_app_routing.md`; do not count it as a fresh result for this refactor.
