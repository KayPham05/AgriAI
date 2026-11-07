# PR #60 target integration — 2026-11-06–07

The user requested resolving the seven conflicts between `AGRI-134-142-integration` and PR target `AGRI-128-backend-improvement`. The source started at `64f1c23`; the fetched target was `16a0115`. Integration uses a merge commit, without rebasing or replacing either branch's history.

## Resolution decisions

- `backend/src/AgriVision.API/Program.cs`: retain SignalR session notices and add the target's account-challenge rate-limit policy. Existing storage/auth traffic policies and explicit maintenance commands remain.
- `backend/src/AgriVision.Domain/Entities/User.cs` and `backend/src/AgriVision.Infrastructure/Persistence/Configurations/UserConfiguration.cs`: keep account-lock fields and the email two-factor flag, with all mappings.
- `backend/tests/AgriVision.ApiTests/Contracts/api_manifest.json`: retain admin/catalog/guest cases and append the seven auth endpoint entries; no duplicate method/route pairs.
- `backend/tests/AgriVision.IntegrationTests/Persistence/CatalogImportTests.cs` and `MigrationTests.cs`: compare applied migration IDs with the migration assembly instead of a hardcoded count. Retain historical-schema fixtures, downgrade rejection and data-preservation checks.
- `frontend/src/views/DiagnosePage.tsx`: support embedded presentation and optional result callbacks while preserving guest save/restore behavior and the guest notice. Embedded presentation does not add another page-level heading.

The automatically merged EF snapshot includes both branches' fields and constraints; existing migration files are retained. The incoming email two-factor migration is applied through the normal explicit migration command, not HTTP startup.

## Integration follow-ups

`IntroductionRoute.tsx`, `IntroPage.tsx` and `LandingPredictionSection.tsx` connect the embedded guest save action to `/diagnose` plus authentication. The existing session draft carries the original result and save intent into that route, so login does not repeat inference. Landing requests remain anonymous until the visitor explicitly chooses to save.

`LandingPrediction.test.tsx` supplies the required populated plant fixture (an empty catalog suppresses the map hero), verifies the save intent and login callback, and checks that embedded diagnosis adds no extra page heading. Existing diagnosis/auth tests cover saving after login and the added email challenge.

## Verification

Recorded checks on the combined source:

- Backend solution build: passed with `-p:LangVersion=12.0`, zero errors and two NU1900 warnings because vulnerability metadata could not be fetched from NuGet. The first sandboxed restore failed due blocked network; the approved retry restored dependencies and built successfully.
- Unit: 225/225 passed (`dotnet test ...UnitTests.csproj --no-build --no-restore --verbosity quiet`).
- API: 286/286 passed, including route inventory and manifest mapping (`dotnet test ...ApiTests.csproj --no-build --no-restore --verbosity quiet`).
- Frontend: the full 80-file run passed 569/570 cases. The sole failure was the incoming landing fixture missing a populated plant catalog; after correcting that fixture, all 4/4 landing cases passed on a targeted rerun. Thus all 570 cases have passing evidence across these runs; there was no subsequent full-suite rerun.
- Frontend typecheck passed. Scoped Biome check passed after applying the final test-file formatting.
- Integration: the November 6 process was interrupted without a final result. The fresh November 7 run passed 82/82 selected cases in 2m04s, including migrations and preserved history; `Category!=RealCheckpoint&Category!=RealR2`. Evidence: ignored `.cache/pr60-merge-results/integration.trx`. No success is inferred from the interrupted log.
- No unmerged index entries or conflict markers remain; Git whitespace checks pass.

Checks use disposable PostgreSQL containers and AI/storage doubles; real checkpoint and R2 categories are excluded. No live migration, deployment, R2 relocation or AI startup is part of this conflict resolution.

The local build uses the previously documented `-p:LangVersion=12.0` workaround. Default-language build and GitHub Actions success are separate checks and are not implied by local results.


## Remote delivery

On November 7, merge commit `d18a665` was pushed to PR #60's source branch. GitHub verified the exact SHA and `mergeable=true`; `mergeable_state=unstable` reflected checks still in progress. PR title/body were verified after updating the test evidence. Current state was open and `draft=false`; readiness was not changed by this workflow. The target remains `AGRI-128-backend-improvement`, with both requested reviewers retained. CI completion and reviewer approval remain separate from conflict resolution.
