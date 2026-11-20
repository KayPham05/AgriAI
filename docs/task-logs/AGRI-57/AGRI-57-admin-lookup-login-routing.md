# AGRI-57 — Admin lookup login routing

- Fixed successful admin sign-in from public lookup pages to reuse the existing admin greeting and redirect to `/admin`; regular user public navigation remains in place.
- Added seven admin-entry regression cases and a regular-user control in the authentication timing integration suite.
- RED reproduced seven failures; focused routing/timing checks passed 25 tests. TypeScript, scoped Biome and diff checks passed. The default full run had six timeouts; the full run with two workers passed all 583 tests in 81 files without changing timeouts/assertions. Details in the [technical report](../../reports/AGRI-57/agri_57_admin_lookup_login_routing.md).
- Real browser/backend login and Docker rebuild were not run. No commit/push.

- 2026-11-20 pre-commit checks: fresh routing/timing tests 25/25, TypeScript and scoped Biome passed. Earlier full-suite results remain dated evidence. Excluded generated declarations and the unrelated R2 hostname edit; local commits requested, no push. See report for limits.
