# AGRI-57 - Main synchronization

- Date: 2026-11-10; branch AGRI-57-frontend-summary.
- Fetched and fast-forwarded 770df43 to main b3b5d31, receiving 81 commits without conflict. Preserved pre-existing next-env.d.ts modification and ignored assets.
- Verified HEAD/main equality, no unmerged files, 0/0 divergence and whitespace. Tests/build not run; frozen dependency sync needed for incoming SignalR dependency. No DB migration, commit of these notes or push.
- [Technical evidence](../../reports/AGRI-57/agri_57_main_sync_2026_11_10.md).

- User approved backup/migration follow-up. Backup 68058 bytes with readable archive TOC created. Migration transaction failed on pre-existing lock_reason; schema audit found one notification in a legacy incompatible table. History unchanged; no deletion/history rewrite. Backend remains stopped pending schema reconciliation decision; see report for exact backup/evidence.

- User approved legacy schema archival/reconciliation. Moved the old notification table to agri57_legacy_20261110 and renamed duplicate lock columns, preserving data. Standard migration applied 13 missing entries successfully; transferred one notification with exact mapped-field verification and retained the original. All four services healthy; frontend, API/proxy, AI and dependencies HTTP 200. No source changes, volume reset, commit/push or full test-suite claim. Detailed report retains initial failure and backup/evidence paths.
