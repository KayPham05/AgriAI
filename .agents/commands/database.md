# PostgreSQL and migrations

Run from the root. The application database is agrivision_db. The standalone agrivision_erd database/SQL is the earlier six-table ERD baseline, not the backend migration source. See [entities and current schema](../../docs/notes/database_entities.md).

## Backup before schema changes

PostgreSQL must be running. This creates a unique backup without overwriting an earlier file:

~~~powershell
New-Item -ItemType Directory -Force .cache/database-verification | Out-Null
$backupName = 'agrivision_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N') + '.dump'
docker compose exec -T postgres pg_dump -U agrivision_user -d agrivision_db -Fc -f "/tmp/$backupName"
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
docker compose cp "postgres:/tmp/$backupName" ".cache/database-verification/$backupName"
if ($LASTEXITCODE -ne 0) { throw 'Copy backup failed' }
Get-Item ".cache/database-verification/$backupName" | Select-Object Name, Length
docker compose exec -T postgres rm -- "/tmp/$backupName"
if ($LASTEXITCODE -ne 0) { throw 'Remove temporary backup failed' }
~~~

Adjust the database/user if .env differs. Keep backups local in ignored .cache. Backup creation does not verify restoration; restoration has not been tested for this change. Do not overwrite the live database with a restore without a request.

## Apply migrations with the backend image

After migration review and backup, run each command successfully before continuing:

~~~powershell
docker compose config --quiet
docker compose build backend
docker compose up -d --wait --wait-timeout 120 postgres
docker compose run --rm --no-deps backend --migrate
docker compose up -d --no-deps --wait --wait-timeout 120 backend
~~~

The migration command exits without starting HTTP. Repeating it does not reapply completed migrations. Normal startup rejects pending migrations. DatasetV14Catalog is a data migration for all environments; only explicitly configured demo users are seeded in Development.

## Inspect tables and migration history

~~~powershell
@'
SELECT current_database();
SELECT "MigrationId", "ProductVersion" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
'@ | docker compose exec -T postgres psql -X -w -U agrivision_user -d agrivision_db -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'Schema query failed' }
~~~

Current source includes three migrations: InitialCreate, ConfirmedRequirementsSchema and DatasetV14Catalog. There are nine business tables plus __EFMigrationsHistory.

## Apply with dotnet EF on the host

Prepare host connection as shown in the [shared guide](../../docs/docker_database_guide.md), then run:

~~~powershell
dotnet build backend/AgriVision.sln --no-restore
dotnet ef database update --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --no-build
dotnet ef migrations list --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --no-build
~~~

The host uses 127.0.0.1 and the published PostgreSQL port; keep its connection string out of Git/logs. DatasetV14Catalog adopts an already-imported catalog without changing IDs, and is forward-only to protect history.

## Import the dataset v1.4 catalog separately

The reviewed [catalog SQL](../../database/import_dataset_v1_4_catalog.sql)
is an optional data import, separate from EF history and HTTP startup. The default now uses DatasetV14Catalog via dotnet EF or --migrate. Back up the
database first using the commands above. It aligns 59 active class indices/names
with the Vietnamese v1.4 manifest, retains existing IDs/history and archives
unsupported legacy classes outside indices 0–58. Repeating it preserves IDs.
Ambiguous legacy/canonical aliases cause the transaction to abort.

~~~powershell
$catalogTempPath = '/tmp/agri79_catalog_' + [guid]::NewGuid().ToString('N') + '.sql'
docker compose cp database/import_dataset_v1_4_catalog.sql "postgres:$catalogTempPath"
if ($LASTEXITCODE -ne 0) { throw 'Catalog SQL copy failed' }
try {
    docker compose exec -T postgres psql -X -w -U agrivision_user -d agrivision_db -v ON_ERROR_STOP=1 -f $catalogTempPath
    if ($LASTEXITCODE -ne 0) { throw 'Catalog import failed; transaction rolled back' }
} finally {
    docker compose exec -T postgres rm -- $catalogTempPath
    if ($LASTEXITCODE -ne 0) { throw 'Temporary SQL cleanup failed' }
}
~~~

Copy the UTF-8 SQL file rather than piping it through Windows PowerShell's
default ASCII encoding. New condition display names use the dataset keys with
underscores replaced by spaces; existing curated content is retained. New
content is unapproved and contains no invented treatment or medication.
This import does not validate checkpoint inference or complete the frontend's
partly static disease catalog. See [verification](../../docs/reports/AGRI-79/dataset_v1_4_catalog.md).

## Create a migration after an actual model change

Requires host .NET SDK 9. Set your local connection string in $env:ConnectionStrings__DefaultConnection before EF commands, using PostgreSQL's host port from docker compose port postgres 5432. The Compose hostname postgres is for containers. Do not save credentials in tracked files.

~~~powershell
dotnet tool restore
dotnet restore backend/AgriVision.sln
dotnet build backend/AgriVision.sln --no-restore
dotnet ef migrations list --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --no-build
~~~

The tool manifest pins dotnet-ef 9.0.2. The following generation example is only for a real model change; replace DescribeSchemaChange with a meaningful name:

~~~powershell
dotnet ef migrations add DescribeSchemaChange --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --output-dir Persistence/Migrations
New-Item -ItemType Directory -Force database/generated | Out-Null
dotnet ef migrations script --idempotent --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --output database/generated/ef_migrations.sql
~~~

Review Up/Down, generated SQL, model snapshot, backfill and constraints; run [backend tests](backend.md) before applying. Keep migrations/snapshot in Git. Do not edit applied migrations, remove history or downgrade to hide errors.

## Live verification and image expiry

Independent read/write check, with cleanup of its own fixtures:

~~~powershell
powershell -NoProfile -File .agents/commands/verify_database.ps1
~~~

This operational command deletes real expired images while keeping history/snapshots; run it when you intend cleanup, not as an innocuous test:

~~~powershell
docker compose run --rm --no-deps backend --expire-images
~~~

No periodic scheduler is configured. API hides expired URLs; deleting storage objects requires cleanup. See [full migration workflow](../../docs/notes/database_migrations.md).
