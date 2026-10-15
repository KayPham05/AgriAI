# AGRI-80 runtime startup repair - 2026-10-14

## Admin password follow-up - 22:19 Asia/Bangkok

The user saved `DEMO_ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` in the root `.env` and requested working admin login. Only variable names/presence were printed. Existing `admin@agrivision.ai` already had role Admin. Compose does not map these variables; Production `DbInitializer` does not seed users, and Development seeding also skips when users exist. Editing `.env` therefore does not reset database passwords.

Before update, login through `http://localhost:3000/api/auth/login` with the configured admin password returned HTTP 401. Created fresh ignored backup `.cache/database-verification/agrivision_pre_admin_password_20261014_221942.dump` (34763 bytes). A throwaway ignored .NET helper reused the existing BCrypt DLL, accepting the password on stdin and verifying its generated hash. Initial PowerShell DLL loading was incompatible; helper build initially hit sandbox-blocked NuGet, then authorized build passed with zero warnings/errors. No passwords/tokens/hashes were printed or saved in source.

Updated only the existing Admin row's `password_hash` and `updated_at`; verified exactly one row affected. No role change, account creation, user-password change or startup seeding/configuration change. Fresh verification through the web proxy passed login, `/api/auth/me` with role Admin, and protected `/api/admin/summary`. Logged out the verification session. Browser interaction was not tested. Future `.env` edits still require an explicit password reset; no automatic synchronization was introduced. Backup restoration and unit/integration suites were not rerun for this operational change.

Branch verified: `AGRI-80-create-crm-admin-page`. User requested autonomous local Compose repair. Existing application WIP was preserved; no application code, Compose configuration, checkpoint or account credential changes.

## Diagnosis and repair

AI logs raised FileNotFoundError for `/app/ai/models/checkpoints/plant/best_convnext_tiny.pth`; health returned 503. Host checkpoints existed (plant 334166937 bytes; disease 334483289 bytes), but their bind-mounted container directory was empty, even after recreation. Docker Desktop WSL listed C: and D: mounts but no E: and reported `Failed to translate 'E:\AgriAI'`.

Restored the drive using `wsl -d docker-desktop -u root -- mount -t drvfs E: /mnt/host/e -o metadata`, then `docker compose up -d --force-recreate ai-service`. Both checkpoints became visible at matching sizes. No Docker restart, volume deletion or copying checkpoints into the image.

Backend separately rejected pending migrations. Reviewed `backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261013063941_LoginSessions.cs`: it adds a session table, constraints and indexes. Initial database history had the first three migrations. Before schema changes, created custom-format backup `.cache/database-verification/agrivision_pre_startup_fix_20261014_220319_893640733dbf4fb587949793d57aa231.dump` (31141 bytes). `pg_restore --list` read its contents; restoration was not tested. Git ignores the backup.

`docker compose run --rm --no-deps backend --migrate` applied only LoginSessions successfully. `docker compose up -d backend` started the API. History now contains all four migrations. Production migration did not seed users.

## Fresh verification

Local run 2026-10-14 around 22:03-22:05 Asia/Bangkok:

- `docker compose ps --all`: postgres, ai-service, backend and frontend all healthy.
- AI `/health`: Healthy. Backend `/api/health`: Healthy/database Healthy. `/api/health/deps`: Healthy/aiService Healthy.
- Web `http://localhost:3000/`: HTTP 200.
- Real AI `POST /predict` with existing `frontend/src/assets/banner/bưởi banner.jpg` copied to ignored `.cache/startup-verification/inference-smoke.jpg`: success, class index 15, `Cam___Khoe_manh`, confidence 0.9845 and grouped predictions. Execution smoke only; no accuracy claim. The guide's rice-leaf image was absent, so initial curl failed locally before any request; used the existing banner instead.
- No application changes; unit/integration suites and GitHub Actions were not rerun. Full CRM/browser acceptance remains separate.

Related sources: `docker-compose.yml`, `ai/service/app.py`, `ai/predict.py`, `backend/src/AgriVision.API/Program.cs` and LoginSessions above.

Mount restoration is verified for this session; persistence after Windows/WSL restart was not tested. No WSL configuration files changed. If E: becomes unavailable again, restore its WSL mount before recreating AI. Database volumes/history retained; no staging/commit/push.
