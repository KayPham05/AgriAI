# AGRI-57 — Remote main merge and release review

Verified on 2026-10-13 on `AGRI-57-frontend-summary`. This is fresh evidence;
earlier reports retain their historical results. **DoD remains incomplete:
local checks pass, but remote CI on the updated commit and reviewer approval
are still required before merging PR #29 into main.**

## Merge and affected paths

Pre-merge HEAD: `7c8685a53561687830f5f2be80fd63c05e10b87f`.
Fetched origin/main: `25075b4b52097b3f17be1614b11375f4b829e3e5`.
There were seven feature commits and four upstream commits. Both merge-tree and
the actual merge completed without conflicts.

The merge imports AGRI-82 real AI Docker/Compose integration, CI smoke,
checkpoint paths in `ai/configs/config.py`, ignore rules and documentation.
Existing AGRI-57 frontend/tooling/skills are preserved. The first-parent merge
diff lists the 21 inherited paths; no source model labels/splits were changed.

The integration correction in `.github/workflows/ci.yml` changes its upload
fixture from absent `frontend/public/images/rice-leaf-cutout.png` to tracked
`frontend/src/assets/banner-leaves/rice-leaf-cutout.png`. The fixture assertion
failed before correction and passed after it. Curl with the absent file returns
26, matching the remote failure annotation.

Five frontend files had CRLF despite Biome requiring LF: `App.routing.test.tsx`,
`App.startup.test.tsx`, `providers/AppProvider.tsx`, `services/authApi.ts`, and
`services/authApi.test.ts`. Local normalization fixes format checking and yields
no Git content diff. No frontend behavior was changed.

Local build initially failed because generated `.next/dev/types/validator.ts`
still imported `/admin` from another branch. Its type directory was moved to
`.cache/agri57-main-review/previous_dev_types` after checking both absolute paths.
The temporary Next dev server on 3107 was stopped. Production build/typecheck
then passed; the original next-env development imports were retained.

## Actual verification

| Check | Fresh result |
| --- | --- |
| Frontend strict lint/format | PASS, 140 files each after the CRLF correction. |
| Frontend tests/coverage | 160/160 tests, 25 files; 654/1195 branches = 54.73%, floor 25% PASS. |
| Production build/typecheck | Final rerun PASS: 13.5s compile, 10 static pages and two dynamic routes; post-build `tsc --noEmit` PASS. |
| Backend restore/build | PASS, zero build warnings/errors. |
| Backend tests/coverage | 33 unit + 33 real PostgreSQL integration, zero failed/skipped; merged 207/358 branches = 57.82%, floor 50% PASS. AI/storage suite dependencies are fake. |
| Python CI suites/coverage | 3 CI-helper tests + 65 dataset/runtime tests PASS in Python 3.12/CPU PyTorch 2.8; 502/1074 branches = 46.74%, floor 40% PASS. |
| Workflow syntax | actionlint 1.7.12 PASS, optional shellcheck/pyflakes disabled. |
| Commitlint | Regression 1/1, seven feature content commits and proposed merge subject PASS. |
| Secret scan | Gitleaks 8.24.2: 118 commits / 48.16 MB, no leaks; container network disabled. |
| Compose config/build/startup | PASS for isolated `agri57-main-review`; all application/migration images built using existing matching cache; migration completed and four services healthy. |
| Checkpoints | Both SHA-256 values match CI/AGRI-82 pinned hashes. |
| Real AI HTTP | `/predict` names/indices/confidences/top-k/groups match 59-label v1.4 mapping; observed `Lua___Khoe_manh`, index 28. Execution/contract evidence, not accuracy measurement. |
| Authenticated frontend proxy | Registration and prediction HTTP 201; stored image bytes match upload; history list/detail and delete/404 PASS. Test prediction cleaned. |
| HTTP routes/health/uploads | Root AgriAI branding, seven application routes HTTP 200, API/proxy health and writable uploads PASS. |
| AI failure mode | Stopping only review AI yields dependency/prediction 503; API/DB and proxy remain healthy. |

Frontend ran `corepack pnpm lint`, `format:check`, `test:coverage`, `build`, and
`typecheck`. Backend ran restore/build and `dotnet test backend/AgriVision.sln
--no-build --no-restore --settings backend/coverage.runsettings --collect
'XPlat Code Coverage'`, then ReportGenerator and the existing floor validator.
Python ran both CI unittest discoveries and coverage in the built AI image with
read-only source and writable `.cache` mounts. No coverage exclusions, gates,
dependencies or model semantics were changed.

The review stack used ports 55487/15087/18087/13087, separate DB/uploads volumes
and disabled Cloudinary. Existing application containers, volumes, stashes and
model files were preserved. Review containers/network are removed with `down`
without deleting volumes. Checkpoints/outputs/generated artifacts are ignored.

The existing `agriai-ai-service-1` was stopped at initial inspection and running
but unhealthy at handoff. It retains the old image/configuration: a read-only
`ai/checkpoints` mount and checkpoint environment paths under `/app/ai/checkpoints`.
The old host plant checkpoint is absent; current files are under `ai/models`.
Its health endpoint returns 503. This existing container needs recreation with
the merged Compose configuration before the default local stack is fully
operational. It was not recreated during this review; the isolated stack used
the new paths and passed. Existing backend/frontend/PostgreSQL remained healthy.

Local evidence: `.cache/agri57-main-review/` contains backend TRX/raw/merged
coverage, `smoke.py`, `smoke_results.json`, `ai_prediction.json`, `without_ai.json`
and GitHub job/annotation/PR metadata plus `github_failed.log`. Frontend/Python coverage is under
`.cache/coverage/`; secret results are in `.cache/secret-scan/agri57-main-review.json`.
These ignored artifacts require separate attachment for another checkout.

## GitHub CI and reviewer conditions

Public API and authenticated gh inspection found [PR #29](https://github.com/KayPham05/AgriAI/pull/29)
targeting main at head `7c8685a`. It has no requested reviewers and no reviews.
The frontend reviewer is Nguyen Pham Bao Khanh under project rules; no login
was guessed or reviewer assigned by this task. gh reports `MERGEABLE` but
`mergeStateStatus: BLOCKED` and `reviewDecision: REVIEW_REQUIRED`.

[Feature run 38246822704](https://github.com/KayPham05/AgriAI/actions/runs/38246822704)
failed in `compose-smoke` at `Build containers and verify real AI inference`
(annotation and full job log: exit 26); `ci-gate` subsequently failed. Backend, frontend,
Python, commitlint and secret-scan succeeded. The missing fixture was reproduced
and corrected locally. After the user authenticated gh, the full failed log
confirmed the old fixture argument and `curl: (26) Failed to open/read local
data from file/application`. The earlier public API checks used no credentials.
[Main run 38111617697](https://github.com/KayPham05/AgriAI/actions/runs/38111617697)
at `25075b4` succeeded. Neither remote run validates the new local merge commit.

**Do not merge PR #29 yet.** Publish the updated feature commit when authorized,
require its GitHub `ci-gate` to pass, and obtain the relevant reviewer approval.
This request completes a local merge; it does not push or merge the remote PR.

## Remaining limits

- All components remain below the 80% branch target despite passing CI floors.
- No fresh browser/physical-device acceptance, CLI inference or CI archive
  download/extraction run here. HTTP proxy checks do not certify browser UI.
- Cloudinary private storage and photo licensing/expert verification remain pending.
- Guest API returns empty imagePath, rejected by `createPrediction`; current
  application entry requires authentication. Guest UI support is a follow-up.
- Review account/DB fixtures exist only in retained isolated review volumes.

## Quick review and ignore policy follow-up — 2026-10-13

User requested another quick review and a gitignore update. Verified the same
branch and HEAD `699328c`; the worktree was clean before this follow-up. No new
application, backend, AI or workflow source changes were present. The workflow
upload fixture still exists and is tracked. The earlier component tests and
build results above were not rerun or presented as fresh results here.

Added only `/v1.4/` and `/v1.4.zip` to the root `.gitignore`, completing the
existing dataset-version exclusions for the agreed v1.4. Both paths were
unignored before this update. Existing checkpoint/output/secret/cache exclusions
already cover the current local artifacts; no broad image/archive/source
exclusion was added and no tracked path was removed.

Fresh `git check-ignore --no-index` verification passed for 17 artifact paths
and nine paths that must remain visible: environment examples, the .NET tool
manifest, CI image fixture, schema SQL, migration/test source, project rules
and the technical report. Evidence is local at
`.cache/agri57-main-review/ignore_policy_review.json`.

Fresh gh inspection still reports PR #29 at `7c8685a`, `BLOCKED` and
`REVIEW_REQUIRED`, with the old compose-smoke/ci-gate failures. Fresh Compose
status still shows the old AI unhealthy and backend/frontend/PostgreSQL healthy.
Release conditions therefore remain open. Changes are kept local and unstaged;
no commit, push, PR mutation or container recreation is performed in this follow-up.

## Requested commit and feature push — 2026-10-13

User subsequently authorized committing all remaining changes and pushing the
feature branch. Inspected exactly three changed files: `.gitignore`, this report
and the AGRI-57 task log. Remote feature HEAD was already `699328c`, matching
local HEAD before this commit. The delivery uses a normal fast-forward push to
`AGRI-57-frontend-summary`; main and PR merge/review actions are outside this step.

The ignore-policy cases, staged whitespace and commit subject are checked again
before committing. Application source is unchanged, so component tests/build are
not rerun for this ignore/documentation change. Push/ref equality and PR/CI status
are checked after delivery; earlier local-only decisions remain historical above.
