# Build diagnosis and test typing correction — 2026-11-05

Branch: `AGRI-134-142-integration`, checkout `.worktrees/AGRI-128-knowledge-medicine`.

The user supplied the PowerShell guard exception `Build lỗi, dừng tại đây.` after a Docker build. That exception indicates a nonzero command exit; the underlying Docker build log was not provided. No attached app-terminal log was available.

## Confirmed local blocker and correction

`corepack pnpm typecheck` reproduced three TS2769 errors: Testing Library's role queries do not accept an `exact` option. Removed only that option at two button queries in `frontend/tests/component/admin/CatalogImageEditor.test.tsx` and one image query in `frontend/tests/integration/app/PublicCatalogCards.test.tsx`. The existing string `name` queries keep their exact accessible-name matching. No assertions, test cases or production behavior were removed.

The frontend tsconfig includes test sources, so invalid test typings can block Next.js production compilation even without executing tests. This is a confirmed compilation issue; the original Docker log is still needed to attribute any other Docker-stage failure.

## Actual verification

- Before the change: `corepack pnpm typecheck` exited 1 with three TS2769 diagnostics.
- After the change: the same command exited 0.
- Initial host `dotnet build backend/src/AgriVision.API/AgriVision.API.csproj --no-restore --verbosity minimal` exited 1 with no warning/error diagnostic. This result is retained, not counted as successful.
- A diagnostic single-node build, `dotnet build backend/src/AgriVision.API/AgriVision.API.csproj --no-restore --verbosity normal -m:1 -nr:false`, exited 0 with 0 warnings and 0 errors. Its output reported compiler-server connection failures followed by successful compilation. This establishes the host API project build only, not an Alpine Docker publish or application test pass.

No test runner, full Next.js production build, Docker build/start, live migration, database mutation, commit or push was performed. The user can retry Docker build; unresolved Docker-specific failures require its actual compiler/build-stage log. Earlier testing-pause records remain historical; this turn explicitly performed compilation diagnostics in response to the reported build failure.

## Follow-up: Docker build confirmed

After the user requested continuation, an initial Docker invocation was blocked before execution by automatic approval review reporting a usage limit. On the user's subsequent continuation, the same build scope was approved and executed from this checkout:

```powershell
docker compose --progress plain -p agriai --env-file D:/AgriAI/.env -f docker-compose.yml -f D:/AgriAI/docker-compose.ai.yml build backend frontend
```

The command exited 0 and reported both `agriai-backend` and `agriai-frontend` Built. Backend publish/runtime layers were reused from Docker cache. Frontend `pnpm run build` completed compilation, TypeScript validation, static page generation (14/14), optimization and runtime image export. This supersedes the earlier unverified Docker-build status, without attributing unseen original Docker errors.

No application tests, migration, database mutation, AI rebuild, container start/recreation, commit or push was performed. Database backup/migration and starting the newly built frontend/backend remain separate user-run deployment steps.
