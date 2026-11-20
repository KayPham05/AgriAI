# AGRI-57 - Main synchronization (2026-11-10)

## Scope and result

User requested merging latest main into the current branch. Verified AGRI-57-frontend-summary at 770df43 with only pre-existing generated frontend/next-env.d.ts modified. Fetched origin/main at b3b5d312d49beb3800c803fecfaeb137f000f2d9; before merge divergence was 0 ahead / 81 behind. git merge --ff-only origin/main succeeded, updating 400 paths without conflicts. HEAD exactly matches fetched main. Preserved generated local declarations and ignored assets. No push, source fix, migration or deployment.

## Verification and remaining work

Git branch/status, 0/0 post-merge divergence, exact HEAD/main equality, empty unmerged index and git diff --check passed. This is Git integration evidence only; application tests/build/backend integration were not run. Incoming main adds @microsoft/signalr 9.0.6 to the frontend manifest and lockfile, alongside backend/API/auth, catalog/admin/profile, storage and test changes. Run a frozen dependency install before starting or validating the updated frontend. Received migration files were not applied to the local application database. No independent dependency upgrade or library vendoring.

Technical report/index and short task log for this request remain uncommitted; existing runtime test results are not claimed as fresh validation of this revision.


## Authorized local migration attempt

User approved backup and local schema update after Docker backend refused pending migrations. Reviewed incoming migration sources. Created ignored custom-format pg_dump `.cache/database-verification/agrivision_before_main_20261110_5ed6f2a09544461c945b1e717b5c678d.dump` (68058 bytes); pg_restore --list succeeded, restoration not tested.

`docker compose run --rm --no-deps backend --migrate` failed at AdminNotifications because users.lock_reason already exists. The migration transaction rolled back; history remains the same seven previously applied entries. Read-only schema checks found pre-existing user_notifications with admin_id/title, unlike expected actor_user_id and message constraint; one existing notification must be preserved. Both existing user lock columns match types but have no populated values. No schema reconciliation attempted yet. Backend remains stopped; database, AI and existing frontend are healthy. Pending explicit choice on archiving/adopting the legacy notification schema before retry. No data deletion, history edits, volume reset, source edits or push.


## Approved legacy-schema reconciliation and successful startup

After the failed migration and read-only findings, user explicitly approved preserving the legacy structure separately, applying standard migrations and transferring the existing notification. Preflight confirmed one nonblank notification, matching old lock-column types, no populated old lock metadata and no other incoming column collisions.

Executed transactional archive: created schema agri57_legacy_20261110; moved the legacy user_notifications table into it (preserving its indexes, constraints and title column); renamed users.lock_reason/locked_at to lock_reason_legacy_20261110/locked_at_legacy_20261110. No rows dropped, no migration history forged. Standard backend --migrate then exited 0, applying 13 missing migrations; history now has 20 entries through 20261107134812_PasswordChangeTokenPurpose.

Transferred one notification into the new public table, preserving ID/user/image/message/timestamps and mapping admin_id to actor_user_id, with the model's default Warning kind. Old title remains in the archived original table. Exact EXCEPT comparison of all mapped fields passed inside the transaction. Lock metadata copy affected zero users, consistent with preflight; original renamed columns retained.

`docker compose up -d --wait --wait-timeout 180` exited 0. All four services healthy. Fresh HTTP checks: frontend root 200, direct API health 200/Healthy, frontend-proxied API health 200/Healthy, AI health 200/Healthy, API dependency health 200/Healthy. These establish startup/health, not real model prediction or complete feature acceptance. No unit/integration suites run in this operational fix. No source modification, commit/push, volume reset or image-expiry cleanup.

Backup remains local and readable (restore not tested). Ignored evidence: database-verification/main-migrate-reconciled-20261110.log, reconciliation-verification-20261110.txt, stack-health-20261110.json, plus full-stack-start-20261110.log. Earlier failed attempt retained as history; this follow-up resolves the startup block. Legacy table/columns remain intentionally for recovery and must not be removed without a separate reviewed cleanup.
