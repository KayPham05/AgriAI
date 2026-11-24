# AGRI-57 — Admin login from public lookup pages

Date: 2026-11-13. Branch: `AGRI-57-frontend-summary`; baseline: `b3b5d31`.

## Problem and change

Fresh admin login on a public catalog left the account in the website shell. Public pages defer private startup and the admin entrance redirect only runs on `/`, so the pending admin session never reached that redirect.

`frontend/src/providers/AppProvider.tsx` now replaces the public URL with `/` after successful admin authentication. This reuses the existing admin greeting and four-second notice, then replaces the URL with `/admin`. Regular users keep the public page and existing guest diagnosis save behavior. Session restoration and API authorization are unchanged.

## Verification

- Regression: `frontend/tests/integration/app/App.authTiming.test.tsx` covers fresh admin login from plants/list detail, diseases, medicines, knowledge, about and diagnosis; regular user catalog login remains in place. Tests simulate Next completing the route replacement and verify the admin target after the notice, without loading user history.
- RED: the initial focused run failed seven admin public-entry cases because no redirect occurred; five other cases passed.
- Focused routing/timing run: 25 tests passed in two files before the final test-helper cleanup.
- `corepack pnpm typecheck`: passed.
- Scoped `biome check` on the two changed TypeScript files: passed after normalizing their formatting. The initial check reported line-ending formatting differences.
- Initial `corepack pnpm test`: 577 passed, six failed in five files, all at the unchanged 5,000 ms timeout (91.72 s total). Affected cases: AdminCrmPage account lock/restore and image/account warnings; AdminQueries moderation; AgriculturalProfilesRoute search; GuestDiagnosis login/save; LandingPrediction anonymous prediction. Raw local log: `.cache/agri57-admin-lookup-tests-20261113.log`.
- Diagnostic full run with `corepack pnpm test --maxWorkers=2`: **583 tests passed in 81 files**, 100.09 s, exit 0, including the final routing regression tests. Reduced worker concurrency resolved the observed timeouts; assertions and timeouts were unchanged. Raw local log: `.cache/agri57-admin-lookup-tests-workers2-20261113.log`. The default-worker timeout failures above remain recorded; no test runner configuration was changed.
- `git diff --check`: passed after removing an extra trailing blank line from the report index.

Vitest uses jsdom with mocked authentication/network and a Next router adapter. This does not establish real browser navigation, backend authentication or deployed Docker behavior. No commit or push performed.

## Commit verification — 2026-11-20

- Fresh `corepack pnpm exec vitest run tests/integration/app/App.authTiming.test.tsx tests/integration/app/App.routing.test.tsx --maxWorkers=2`: 25 tests passed in two files, exit 0 (94.18 s).
- Fresh `corepack pnpm typecheck` and scoped `biome check` for the provider and timing test: passed, exit 0.
- The full-suite results above are historical 2026-11-13 evidence; no full-suite, browser, backend or Docker rebuild was repeated for this commit.
- Excluded unrelated working changes: generated `frontend/next-env.d.ts` and an unrequested auth-media hostname edit containing `SS` in place of the configured R2 hostname. The media edit remains local for separate resolution; no dependency, video, backup or generated artifact is staged.
- User requested local commits only; no push.
