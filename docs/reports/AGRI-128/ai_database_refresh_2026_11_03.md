# AGRI-128 — AI rebuild and database migration, 2026-11-03

Scope: requested local AI rebuild, separate migration and database catalog readiness
on `AGRI-128-backend-improvement`. No application source changes or Git delivery.

## Changes and commands

- Backed up `agrivision_db` before migration with `pg_dump -Fc`:
  `.cache/database-verification/agrivision_before_migrate_83c2e1fb156947b6a70b4eb20d75f051.dump`
  (59,021 bytes). `pg_restore --list` succeeded; restore was not tested.
- `docker compose build ai-service backend` passed, using build cache.
- `docker compose run --rm --no-deps backend --migrate` passed and applied
  `20261028225650_OptionalMedicineTargetUse`. Migration history increased from
  8 to 9 entries. This migration relaxes the medicine target-use constraint.
- `docker compose up -d --no-deps --force-recreate --wait --wait-timeout 180 ai-service backend`
  passed. Only these two containers were recreated; PostgreSQL volume preserved.
- Compared active class indices 0–58 and exact class names against
  `database/import_dataset_v1_4_catalog.sql`: expected 59, actual 59, mismatches 0.
  The catalog was already loaded; no redundant SQL import or legacy baseline reset.
  Existing 2 accounts remain present; no demo-user seed was requested or run.

## Fresh verification

- AI and backend container health checks passed. PostgreSQL and frontend also healthy.
- AI `/health`, backend `/api/health` and `/api/health/deps`, and frontend proxy
  `/api/health` returned HTTP 200 with Healthy status.
- Anonymous multipart prediction via `http://localhost:3000/api/predictions`, using
  `frontend/src/assets/banner-leaves/rice-leaf-cutout.png`, returned HTTP 200:
  `Lua___Khoe_manh`, confidence `0.8705999851226807`, 3 details,
  `imagePath=""`, `imagePublicId=null`, `hasHistoricalSnapshot=false`.
  Response: `.cache/verification/AGRI-128/ai-database-refresh/prediction.json` (ignored).
- This is a runtime smoke check, not model accuracy acceptance or a full regression
  suite. No unit/integration/CI rerun, checkpoint change, training, volume deletion,
  commit or push in this operation. Existing unrelated local edits were preserved.
