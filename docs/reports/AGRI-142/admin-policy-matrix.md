# Admin policy follow-up — 2026-11-05

Later acceptance corrections are recorded in [Session events and catalog](session-events-and-catalog.md). That entry supersedes the request-response-only notice behavior and case-preserving name behavior below; the original record and historical evidence are retained here.

Confirmed scope on existing branch AGRI-134-142-integration; no new Jira key supplied. Prior real-data integration remains uncommitted and is preserved.

| Requirement / boundary | Expected behavior | Verification planned |
| --- | --- | --- |
| Admin lock / logout and authenticated API | Backend rejects immediately; signed session receives distinct reason; popup requires acknowledgement before client clears session, no real-time kick/polling | AdminPolicyTests + frontend session notice integration |
| Account restoration / notifications | Exactly one stored restoration notice per inactive-to-active transition; private ownership retained | AdminPolicyTests + notification tests |
| User notification UI / Admin toolbar | Readable status, constrained scrolling, keyboard actions; aligned toolbar at desktop, responsive at 375/768/1280 | Component tests + browser viewport checks |
| Catalog normalization | Trim/collapse harmless whitespace, preserve scientific names, medicine amounts and AI labels | Utility/service tests |
| Approximate catalog search | Accent/case-insensitive, small typo tolerance, exact matches first; paginate after matching | Search unit/API/picker tests |
| Plant-disease links | Add/reactivate pair by IDs, no duplicate or replacement of existing identity, no invented AI mapping; inactive parents cannot enable pair | AdminPolicyTests + manager integration |
| Disabled plants/pairs in prediction/catalog | No new inference result/history/upload for disabled winner; exclude unavailable alternatives without changing probability or model mapping; historical results remain | Prediction service/API regressions |

## Implementation and acceptance status

2026-11-05: code is prepared for user acceptance. The user explicitly requested **no further test execution until their acceptance is complete**. Automated checks, browser checks and full regression are deferred; these implementation notes are not passing-test evidence.

- `Program.cs`, `AdminUserService`, session repositories and notification persistence distinguish locked accounts from administrator session revocation. Status transitions lock the user row within the existing transaction. Restoration writes one private notice per actual transition and leaves previous sessions revoked.
- `sessionFetch.ts`, the prediction XHR adapter, `AppProvider` and `SessionIssueModal` observe subsequent authenticated responses. They preserve the client session until acknowledgment, ignore responses from old tokens and perform no background revocation polling.
- `NotificationsModal` adds status icons, unread styling, wrapping and constrained scrolling. `KnowledgeAdmin` aligns the search/add toolbar and stacks it on narrow screens.
- `CatalogText` / `catalogText.ts` trim and collapse horizontal whitespace while retaining paragraph breaks, letter case, scientific names, label codes, punctuation and medicine quantities. Forms normalize on blur and before save; the backend normalizes persisted text.
- Catalog search ignores Vietnamese accents/case and tolerates one edit in words of 3–5 characters or two in longer words. Exact/substring results precede approximate matches. Plant/disease lists and pickers use the frontend matcher; medicine/document/pair repositories rank lightweight name/ID projections before pagination, then load only page content. No new database extension is needed, but matching remains linear in the filtered catalog size and has not been benchmarked.
- `POST /api/admin/plant-diseases` creates or reactivates a unique pair. PostgreSQL upsert preserves its ID and AI mapping. `PlantDiseaseManager` can add another disease/condition, deactivate, or restore existing pairs; an unsaved plant draft no longer disables unrelated pair actions. Inactive parents cannot enable a pair. Histories and labels are retained.
- New prediction requests reject an inactive primary plant/disease/pair before upload/history persistence. Unavailable top-k alternatives are omitted without changing probabilities or choosing a substitute winner. Public pairs require active parents. Home categories, the introductory crop map and catalog adapters derive plants from active backend records instead of appending static reference crops.

## Migration and delivery

New migration: `20261105022754_AdminCatalogPolicies`, after `20261104135449_AdminNotifications`. It adds session revocation reason and notification kind, and allows both AI mapping fields to be null for catalog-only links. Mapped classes must have both fields. Downgrade refuses to discard catalog-only links or invent model labels.

Files were generated from the intermediate build using `ef migrations add --no-build`; **no database was migrated**. Build frontend/backend from this worktree, apply `--migrate` separately using the existing Compose project/environment/database volume, then recreate those two services for acceptance. AI checkpoints and R2 configuration were not modified. No commit, push or PR was performed.

## Evidence before the testing pause

- Initial API red run: two expected failures for missing link creation and session reasons (`.cache/admin-policy-red.log`).
- Small frontend run: two session-notice cases passed; the catalog text suite failed because its utility did not exist yet (`.cache/admin-policy-frontend-red.log`).
- Intermediate backend build passed with zero warnings/errors (`.cache/admin-policy-build.log`). Later edits are **not** covered by that build.
- Attempted frontend typecheck did not execute: its command could not locate `tsc` (`.cache/admin-policy-typecheck.log`).
- After the pause: source review, edits, migration scaffolding and formatting only. No tests, browser acceptance, full build, coverage or GitHub Actions result is claimed for final code.

## Suggested user acceptance

1. Keep a user signed in and lock it from Admin. On the next authenticated action, inspect the lock popup/reason; acknowledge to return to login. Repeat with forced logout and inspect the distinct message.
2. Restore the account and log in again. Inspect the restoration notice, read/dismiss actions and continued invalidity of old sessions.
3. Inspect notification layout and Admin search/add alignment on desktop and mobile.
4. Save plant, disease and medicine text with extra spaces/paragraphs; scientific names and doses must retain their meaning.
5. Search without Vietnamese accents and with a minor typo; inspect ordering and page totals.
6. Deactivate a pair, add a different pair and restore the original. Verify no duplicate or invented AI code; inactive parents cannot enable links.
7. Deactivate a plant and revisit home/catalog. It and categories without active plants must be absent. A new prediction with a disabled model winner must report unavailable rather than a substitute; stored history remains accessible.

After user acceptance, run relevant backend/API/migration and frontend regressions, including route/ApiCase manifest consistency and responsive browser checks.
