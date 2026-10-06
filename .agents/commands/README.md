# Commands

Run from the repository root in PowerShell with the existing .env and locked dependencies.

| Area | Guide |
|---|---|
| Docker startup, status and health | [Docker](docker.md) |
| Backup, explicit migrations and image expiry | [Database](database.md) |
| Unit, integration and live API/DB tests | [Backend](backend.md) |
| Next.js development and tests | [Frontend](frontend.md) |
| Python unit tests | [AI](ai.md) |
| Git diff and commit-message checks | [Change checks](checks.md) |

Normal backend startup does not migrate or seed. For a new database or schema change: validate Compose, build, start PostgreSQL, run migration explicitly, then start the application. Review the migration and back up an existing database first.

Run tests separately. [verify_database.ps1](verify_database.ps1) checks the real backend image against PostgreSQL and cleans its own fixtures.

Keep DB/uploads volumes; do not delete them without explicit authorization. Tests, health checks and AI mocks do not validate real inference.

See [migration workflow](../../docs/notes/database_migrations.md) and [project rules](../rules/project_rules.md). These guides do not imply every command has been executed.
