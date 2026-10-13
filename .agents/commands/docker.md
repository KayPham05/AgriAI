# Docker: startup and checks

Run from the root in PowerShell. Docker Desktop must use Linux containers. Keep the existing .env; if absent, copy .env.example and set POSTGRES_PASSWORD and JWT_SECRET first. Keep secrets out of Git.

Base Compose includes CPU FastAPI inference. Provide the v1.4 checkpoints at
`ai/models/checkpoints/plant/best_convnext_tiny.pth` and
`ai/models/checkpoints/disease/best_convnext_tiny.pth` before starting the full stack.
They are mounted read-only. Missing or invalid checkpoints keep AI unhealthy
and prevent backend startup. Keep `ai/models/` outside Git and the image.

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

Startup does not migrate or seed. Migration now includes the 59-class v1.4 catalog via DatasetV14Catalog, without demo users or automatic content approval. A fresh database does not need a separate SQL import. Full Compose config output may expose secrets; use --quiet.

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
docker compose logs --tail 100 backend frontend postgres ai-service
docker compose logs --follow backend
docker compose port backend 8080
docker compose port frontend 3000
docker compose port postgres 5432
docker compose port ai-service 8000
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
Invoke-RestMethod http://localhost:8000/health -TimeoutSec 20
~~~

Base Compose runs web/API/DB/AI. Backend waits for DB and AI health at startup;
frontend waits for backend health. AI health confirms model loading, not real
prediction acceptance. If AI becomes unavailable after startup, the AI
dependency check returns 503 while API/DB may remain healthy.

## Real AI smoke with a separate test database

The CI override adds a separate migration job and retains real AI from base
Compose. Provide the two checkpoints under `ai/models/checkpoints/`; GitHub CI
downloads the configured Google Drive archive and verifies SHA-256 first.
Host ports must be free: a separate project name does not isolate host ports.

~~~powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml config --quiet
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml up --build -d --wait --wait-timeout 180
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml ps --all
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml logs --tail 100 migrations backend ai-service
~~~

CI also calls real `/predict` with `frontend/public/images/rice-leaf-cutout.png`
and validates the 59 compound labels and confidence scale. This checks inference
execution, not model accuracy. Use the same -p and both -f options to stop/remove
this smoke project's containers.

## Stop when needed

~~~powershell
docker compose stop
docker compose start
docker compose down
~~~

Choose the appropriate command, rather than running all three in sequence. Down keeps named volumes; do not add --volumes.
