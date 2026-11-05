# AGRI-128 — Profile dialog draft protection

- 2026-11-03, branch `AGRI-128-backend-improvement`: fast-forwarded local HEAD
  to `170e2be` after PR #55 merged; autostash restored all pre-existing local work.
- Fixed Escape, outer close and backdrop dismissal to reuse the form's existing
  discard confirmation; kept direct close after save and pending-save guards.
- Added five regression cases; unchanged baseline: 4 fail/1 pass as expected.
  Related suites: 14/14 passed; full frontend: 483/483 at 69 files passed.
  Typecheck, lint, changed-file format and whitespace checks passed. Evidence in
  [technical report](../../reports/AGRI-128/profile_dialog_dismissal_2026_11_03.md).
- No commit/push, backend changes, database migration or Docker rebuild.
  Browser E2E, coverage and remote CI for this local fix remain unverified.

## Main merge follow-up — 2026-11-03

- Merged fetched `origin/main` (`fa9ce15`) into this branch with merge commit
  `c39a262`, as requested. No conflicts; autostash restored the local dialog fix
  and all prior changes. No push or commit of the local fix.
- Fresh post-merge checks: 20/20 tests in 4 relevant files, typecheck and full
  frontend lint passed; whitespace check passed. Full suite was not rerun;
  483/483 above remains the earlier pre-main-merge result. Details in the report.
