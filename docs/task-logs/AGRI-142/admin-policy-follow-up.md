# Admin policy follow-up — 2026-11-05

Branch: `AGRI-134-142-integration`. Existing uncommitted real-data work is preserved; no new Jira key was supplied.

- Added acknowledgment-based lock/logout notices, restoration notifications, notification styling and aligned Admin search controls.
- Added catalog text normalization and approximate search; implemented pair creation/reactivation without replacing identity or AI mappings.
- Excluded inactive entries from new prediction results and active-plant navigation. Added migration `20261105022754_AdminCatalogPolicies`.
- User paused tests until acceptance. Final code has not been built or tested; earlier partial results and pending checks are in the [technical report](../../reports/AGRI-142/admin-policy-matrix.md).
- No live migration, Docker rebuild, commit, push or PR. Manual rebuild/migration and user acceptance remain; resume tests only after the user permits them.

## Acceptance corrections — 2026-11-05

- User clarified that lock/forced logout must display a popup immediately while the page is idle. Added authenticated SignalR session notices with persisted-reason recovery, keeping acknowledgment before client logout. This supersedes the earlier request-response-only implementation.
- Moved new-link search inside the disease/condition dropdown and excluded all existing pairs. Added first-character capitalization of names and persisted, editable plant categories.
- Added `20261105100000_PlantCategories`, its target model and snapshot. No existing migration was rewritten or applied to a live database.
- Updated source, frontend dependency/lockfile and affected test fixture/schema expectations. Installed dependencies without scripts and formatted edited frontend files. **No tests, typecheck, lint run, build or browser checks were run**, as explicitly requested; acceptance and runtime verification remain pending.
- Detailed affected paths, transport limits and acceptance steps: [technical report](../../reports/AGRI-142/session-events-and-catalog.md). No commit, push, PR or Docker rebuild performed.

## Acceptance issue: invariant globalization — 2026-11-05

- The user encountered a `vi-vn` culture exception. Traced it to the newly added named-culture call in `CatalogText.Name` on the Alpine backend runtime.
- Replaced named-culture capitalization with `char.ToUpperInvariant`; added unrun regression cases in `CatalogTextTests` for Vietnamese initials and preservation of the remaining name.
- Source and Microsoft documentation reviewed; no tests, build, live migration or Docker action executed. Rebuild/recreate backend to deploy. No additional migration is needed for this correction. Details and deferred invariant-mode verification are in the technical report above.
