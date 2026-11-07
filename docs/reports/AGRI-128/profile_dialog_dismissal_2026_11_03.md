# AGRI-128 — Preserve profile drafts on dialog dismissal

Date: 2026-11-03. Branch: `AGRI-128-backend-improvement`.
Scope: follow-up to the review finding in PR #55. Overall AGRI-128 DoD remains
incomplete; this report concerns only local synchronization and draft protection.

## Local synchronization

- Fetched `origin/AGRI-128-backend-improvement`, then fast-forwarded local HEAD
  from `d565022` to `170e2be` (merge of PR #55, including the PR #54 changes).
- Used `git merge --ff-only --autostash`; autostash reapplied successfully.
  Preserved pre-existing tracked edits, the deleted appsettings example and
  untracked personal/report files. No conflicts, new commit or push.

## Fix and affected paths

- `frontend/src/components/agricultural-profile/AgriculturalProfileForm.tsx`:
  exposes a typed `requestCancel` ref handle, reusing its existing dirty-state
  check and discard confirmation. The Cancel button uses the same action.
- `frontend/src/components/agricultural-profile/CreateAgriculturalProfileDialog.tsx`:
  routes outer dismissal through that handle. Escape, the close button and
  backdrop clicks ask before discarding; successful submission still closes
  directly and pending submissions retain their existing dismissal guard.
- `frontend/tests/component/views/CreateAgriculturalProfileDialog.test.tsx`:
  five tests cover four dismissal paths, retaining name/description after
  declining, explicit discard, and immediate closing of an untouched form.

## Fresh verification

Environment: Windows, Node 24.15.0, pnpm 10.34.5, existing locked dependencies.
Commands run from `frontend/` with the installed managed Node directory on PATH.

- Regression before fix: 4 failed, 1 passed. Escape/close lost the draft; the
  Cancel scenario also exposed loss through a subsequent outer-close attempt.
  The outside-click fixture initially needed adjustment for jsdom's missing
  backdrop hit testing/PointerEvent. A complete pointerdown/click sequence now
  exercises the real Radix dismissal boundary; no production component is mocked.
- Rechecked the final regression file against the unchanged pre-fix merge-tree
  snapshot under `.cache/pr-55-review/merged/`: 4 failed, 1 passed, exit 1 as
  expected. This confirms all final dismissal fixtures detect the original bug
  without reverting code in the working tree. Evidence: `red-baseline.log` in
  the verification directory below.
- `corepack pnpm test tests/component/views/CreateAgriculturalProfileDialog.test.tsx tests/component/views/AgriculturalProfileForm.test.tsx tests/integration/diagnosis/DiagnoseProfileCreation.test.tsx --maxWorkers=2`:
  14/14 passed in 3 files, including existing success/retry/duplicate-save/Guest
  and pending-submission cases.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed, 249 files.
- `corepack pnpm exec biome check` for the two changed components and new test:
  passed after formatting only those files.
- `corepack pnpm test --maxWorkers=2`: 483/483 passed in 69 files, exit 0,
  duration 160.68 seconds. This is a fresh run on the synchronized local branch
  with the fix, separate from the earlier PR-review merge-tree run.
- `git diff --check`: passed. Local HEAD matches the fetched remote commit;
  no staged files or unmerged paths remain.

## Limits

No backend, migration, dataset, AI or API contract changes. No browser E2E,
production build, Docker rebuild, backend suite or coverage measurement in this
fix run. Earlier PR CI results do not verify this uncommitted local patch.
Full-suite evidence is saved under
`.cache/verification/AGRI-128/dialog-dismissal/frontend-full.log` (ignored).

## Follow-up: merge main — 2026-11-03

- User requested merging main into the current branch. Fetched `origin/main`
  at `fa9ce15` and merged it with commit `c39a262`
  (`chore(git): AGRI-128 merge main into backend improvement`).
- Reviewed staged changes before the merge commit: only the 9 incoming files
  from main (auth-panel public media, its tests and AGRI-57/frontend documentation).
  No conflicts. Autostash restored existing local changes after commit, including
  the dialog fix; local report/test files remain untracked and outside the commit.
- Fresh verification after merging and restoring local changes:
  `corepack pnpm test tests/component/modals/LoginModal.test.tsx tests/component/views/CreateAgriculturalProfileDialog.test.tsx tests/component/views/AgriculturalProfileForm.test.tsx tests/integration/diagnosis/DiagnoseProfileCreation.test.tsx --maxWorkers=2`:
  20/20 passed in 4 files, duration 13.68 seconds. Typecheck and full frontend
  lint also passed (249 files). No unmerged/staged paths; `git diff --check` passed.
- Earlier 483/483 full-suite result belongs to the pre-main-merge fix verification;
  the full suite was not rerun for this merge. No browser media playback, backend,
  Docker rebuild or migration checks in this follow-up. No push; the dialog fix
  and its documentation remain uncommitted.
