# AGRI-57 — Local backend startup and pending migrations, 2026-10-21

## Cause and authorization

The user reported backend `Exited (139)` while PostgreSQL, AI and frontend were healthy. Fresh logs showed `Database migrations are pending`, with `OOMKilled=false`; normal HTTP startup deliberately rejects pending schema changes. The local database retained the existing InitialCreate, ConfirmedRequirementsSchema, DatasetV14Catalog, LoginSessions and AdminModeration history. The current backend required two additional migrations.

Reviewed `backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261017084014_DatabaseImprovement.cs` and `20261017084202_OptionalAgriculturalProfiles.cs`, including additive columns/tables/indexes and triggers. Both migrations are forward-only. After explaining the schema change and backup, the user explicitly approved application. No migration source, history entry or existing volume was edited manually.

## Backup and execution

Created a local custom-format pg_dump before application:

`.cache/database-verification/agrivision_before_pending_migrations_20261021_637714c066954d198ecf61a5e170bee1.dump` — 40,447 bytes. `pg_restore --list` passed; restoration was not performed or tested. Keep the backup ignored and private.

`docker compose config --quiet` passed. Ran `docker compose run --rm --no-deps backend --migrate`, exit 0; it applied exactly:

- `20261017084014_DatabaseImprovement`
- `20261017084202_OptionalAgriculturalProfiles`

Log: `.cache/database-verification/agri57-migration-20261021.log`. Started the existing backend image with `docker compose up -d --no-deps --wait --wait-timeout 60 backend`, exit 0/Healthy. No build, volume deletion, restore or downgrade was performed.

## Fresh verification

- Both migration IDs are recorded in PostgreSQL history; legacy history remains present.
- `http://localhost:5080/api/health`: HTTP200, API/database Healthy.
- `http://localhost:5080/api/health/deps`: HTTP200, AI dependency Healthy.
- `http://localhost:5080/api/plants`: HTTP200.
- `http://localhost:3000/api/health`: HTTP200, frontend proxy reaches backend.
- Compose reports PostgreSQL, AI, backend and frontend all Healthy.

Structured evidence: `.cache/database-verification/agri57_migration_health_20261021.json`. These are local startup/schema/health checks, not a new full test-suite, CI result, real classification acceptance or Cloudinary private-access verification. No frontend/backend implementation, tracked migration, Git commit/push or stash was changed by this operational fix; only this report/index/task log were updated.
