# AGRI-142 — User pagination

2026-11-04, branch AGRI-142-user-pagination. AdminRecordList uses a fixed maximum of ten users per page at every viewport. Image/session pagination keeps its existing responsive sizes. Search (submit or debounce) resets to page one; shrinking results clamp the current page and boundary buttons remain disabled appropriately.

Affected: frontend/src/features/admin/AdminRecordList.tsx and frontend/tests/component/admin/AdminRecordList.unit.test.tsx. Twelve-user fixtures verify a 10/2 split at 375, 900 and 1440 px without duplicates. Focused regression initially failed 6/14; after implementation AdminRecordList and AdminCrmPage component/integration checks passed 28/28 (.cache/agri142-{red,green}.log). git diff --check passed. DoD: implementation and focused checks complete; combined verification/review pending.

Existing AdminUsers still consumes AdminMockProvider demonstration records. This task changes pagination of that existing screen; it does not introduce real account-management API integration or claim that mock records are production accounts.

2026-11-04 delivery: independent branch AGRI-142-users-page-size starts at 170e2be; all 28 focused pagination/Admin checks passed after splitting (.cache/split-142.log). Combined frontend typecheck/lint, 483 tests and production build passed. Changed-file formatting passed; whole-checkout CRLF formatting remains a recorded limitation. Branch split complete; remote PR/review pending.
