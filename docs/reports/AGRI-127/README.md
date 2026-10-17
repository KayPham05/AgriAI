# AGRI-127 - Merge `main` into database-improvement

- **Status:** Merge integration complete; the overall AGRI-127 database task DoD was not evaluated.
- **Source:** `main` at `ee09f925c68f36e97cf7b0b13b801cb3a6cef5da` (PR #31, AGRI-80 admin CRM).
- **Target:** `AGRI-127-database-improvement`.

## Integrated changes

Integrated the admin CRM frontend, its tests and AGRI-80 reports from `main`. The merge affected 45 paths, primarily under `frontend/src/features/admin/`, along with frontend routing/provider/styles, test scripts, and AGRI-80 documentation. No `ai/` paths were changed.

## Verification

- `git diff --cached --check` — passed before finalizing the merge.
- `corepack pnpm --dir frontend test` — 32 test files, 200 tests passed. The first full run had a 5-second timeout in `src/test/lintRules.test.ts`; its isolated rerun passed, and the subsequent full run passed.
- `corepack pnpm --dir frontend typecheck` — passed.
- `corepack pnpm --dir frontend lint` — passed (163 files).
- Production build and browser verification were not run.

## Related source and evidence

- Admin implementation: `frontend/src/features/admin/`.
- Admin route: `frontend/src/app/(admin)/admin/page.tsx`.
- Frontend tests: `frontend/src/features/admin/` and `frontend/src/App.adminEntrance.test.tsx`.
- [Merge task log](../../task-logs/AGRI-127-merge-main.md).
