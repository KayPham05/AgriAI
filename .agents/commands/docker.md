# Docker: startup and checks

Run from the root in PowerShell. Docker Desktop must use Linux containers. Keep the existing .env; if absent, copy .env.example and set POSTGRES_PASSWORD and JWT_SECRET first. Keep secrets out of Git.

## Build and start with explicit migration

[Back up and review migrations](database.md) before changing an existing database. Run commands one at a time; continue only after success:

~~~powershell
docker version
docker compose version
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 120 postgres
docker compose run --rm --no-deps backend --migrate
docker compose up -d --wait --wait-timeout 180
~~~

Startup does not migrate or seed. Production migration does not seed the demo catalog; a fresh database needs an agreed catalog import. Full Compose config output may expose secrets; use --quiet.

If images and schema are already current:

~~~powershell
docker compose up -d --wait --wait-timeout 180
~~~

For a backend-only rebuild:

~~~powershell
docker compose build backend
docker compose up -d --wait --wait-timeout 120 postgres
docker compose run --rm --no-deps backend --migrate
docker compose up -d --no-deps --wait --wait-timeout 120 backend
~~~

## Status, logs and ports

~~~powershell
docker compose ps --all
docker compose logs --tail 100 backend frontend postgres
docker compose logs --follow backend
docker compose port backend 8080
docker compose port frontend 3000
docker compose port postgres 5432
~~~

Ctrl+C stops log following. PostgreSQL uses 5432 inside Compose; use the reported host port for host connections.

## Web/API checks

Examples use default host ports; adjust URLs if API_HOST_PORT or FRONTEND_HOST_PORT changes in .env.

~~~powershell
(Invoke-WebRequest http://localhost:3000/ -UseBasicParsing -TimeoutSec 20).StatusCode
Invoke-RestMethod http://localhost:5080/api/health -TimeoutSec 20
Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 20
(Invoke-WebRequest http://localhost:5080/swagger/index.html -UseBasicParsing -TimeoutSec 20).StatusCode
Invoke-RestMethod http://localhost:5080/swagger/v1/swagger.json -TimeoutSec 20
Invoke-RestMethod http://localhost:5080/api/health/deps -TimeoutSec 20
~~~

Base Compose runs web/API/DB. The AI dependency check may return 503 when AI is unavailable while API/DB remain healthy.

## Optional mock smoke

The CI override adds a separate migration job and an AI health mock. Host ports must be free: a separate project name does not isolate host ports.

~~~powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml config --quiet
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml up --build -d --wait --wait-timeout 180
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml ps --all
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml logs --tail 100 migrations backend ai-health
~~~

The mock validates health only. Use the same -p and both -f options to stop/remove this smoke project's containers.

## Stop when needed

~~~powershell
docker compose stop
docker compose start
docker compose down
~~~

Choose the appropriate command, rather than running all three in sequence. Down keeps named volumes; do not add --volumes.
