# AGRI-80 — Frontend/backend mapping, tests and CI audit (2026-10-15)

DoD: **incomplete**. Scope: current dirty worktree on `AGRI-80-create-crm-admin-page`, including untracked admin/session/notification code. Audit only; application/workflow/migrations were preserved. Earlier reports remain historical.

## Findings by priority

1. **P1 — Prediction mapping drops backend decision fields.** `backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs:27-32` includes images, snapshot state, warning, informationPending and medication. `frontend/src/services/predictionApi.ts` declares/maps the older subset. `DiagnosePage.tsx:417-437` shows crop/disease/confidence and a general disclaimer without backend-specific warning/pending state. At confidence 0.75 backend sets a low-confidence warning (<=0.8), while frontend assigns medium (>=0.6). The isolated mapper probe confirms the missing fields. Preserve agreed backend semantics when fixing.
2. **P2 — Valid guest result is rejected.** Backend guest prediction deliberately skips image upload/persistence and returns an empty imagePath. `predictionApi.ts:231` rejects that valid HTTP 200 response. Reproduced with a valid DTO and XHR double. This is a client/API contract defect; anonymous access through the current login-gated UI was not established.
3. **P2 — History stops after 100 items.** `predictionApi.ts:262` always requests pageNumber=1&pageSize=100, then discards totalCount/hasNextPage. Older account results cannot be retrieved by this client.
4. **P2 — Image lifecycle is missing from history UI.** Backend clears imagePath on expiry/deletion and supplies images[].isExpired/expiresAt. Mapper drops lifecycle fields; `HistoryDetailModal.tsx:58-65` passes an empty URL to Image without an explicit expired/deleted state.
5. **P2 — CI omits format checking.** Workflow runs lint, test:coverage and build but not format:check/check:ci. Fresh formatting fails on `frontend/src/App.routing.test.tsx` and `frontend/src/services/authApi.test.ts`; CI can pass despite that failure.
6. **P2 — No full-system E2E gate.** Frontend diagnosis integration mocks createPrediction; admin component tests stub fetch. Backend integration has real PostgreSQL but fake inference/storage. FastApiContractTests use a stub HTTP server. Compose smoke calls real FastAPI directly and checks HTML/proxy health, without browser/backend upload and saved-history verification. Thus those tests cannot establish frontend → backend → real inference → DB acceptance.
7. **P3 — develop push is not a trigger.** `.github/workflows/ci.yml:4-6` enables push only on main; PRs and workflow_dispatch are enabled. Direct push/merge to develop lacks a push run. Add develop if post-merge verification is required; PR verification is not disabled.

## Endpoint and feature inventory

| Surface | Frontend integration | Assessment |
| --- | --- | --- |
| Auth register/login/me/logout | authApi, login/provider/admin access | Routes, methods and bearer headers correspond; error/session coverage remains partial. |
| Predictions POST/history/detail/DELETE | predictionApi, DiagnosePage, AppProvider | Core connected, with response/guest/pagination/lifecycle gaps above. |
| Plants/diseases list GET | catalogApi | Connected, enriched with local templates. getDiseases iterates ALL_DISEASES and matches backend records by name, so new active backend diseases are not automatically added. Hybrid reference catalog, not full DB mirroring. |
| Plants/diseases by ID, admin CRUD, includeInactive | No corresponding client operations found | Backend capabilities not exposed. May be outside current CRM scope; inventory rather than an automatic requirement. |
| Admin summary/activity/users/images/sessions | adminApi and admin components | Routes, DTOs, bearer headers, search/paging correspond. Optional backend userId filtering is not exposed by getAdminPage. |
| Account lock/restore/logout-all/warnings; image warning/delete | adminApi moderation | Matching methods/payloads; main flows covered by component and PostgreSQL integration tests. |
| Notifications GET/read-all/DELETE | notificationsApi/useAccountNotifications | Connected and persisted server-side; polling/focus/revoked session tested through broader App tests. |
| Profile editing | AppProvider.updateProfile | Session-only state, explicitly described as unsaved; no backend update endpoint. |
| Health/dependencies | CI HTTP/proxy smoke | Operational verification, not user-flow/inference acceptance. |

Not every backend endpoint needs a UI. Missing product features above are separated from concrete contract defects.

## Fresh verification

| Check | Result |
| --- | --- |
| Backend solution tests + XPlat coverage | PASS: 33 unit + 40 PostgreSQL integration; 0 failed/skipped. |
| Merged backend branches | 258/420 = **61.43%**; above current 50% floor, below 80% target. |
| Default frontend test:coverage | FAIL: 2 lint-boundary timeouts, 13 worker-start errors; incomplete suite, 111 passed. Partial 17.38% coverage is not a full-suite baseline. |
| Frontend test:coverage --maxWorkers=2 | PASS: **188/188**, 28 files, 31.93s; branches **923/1565 = 58.97%**, above 25% floor, below 80% target. No test/config/source changes for rerun. |
| Frontend lint | PASS: separate rerun, 160 files. Initial concurrent lint raced with lintRules.test.ts temporary file creation/deletion. |
| Format | FAIL: App.routing.test.tsx and services/authApi.test.ts. No format --write. One follow-up used an incorrect extra separator; corrected direct Biome invocation confirmed exactly 2 diagnostics. |
| Production build + explicit typecheck | PASS. Pre-existing next-env.d.ts bytes restored after build. |
| Python unit tests | PASS: **65/65**, Python 3.12 CPU AI image, current repository mounted read-only, network disabled. Logged inference exceptions are expected negative cases. Dependencies were not freshly installed from requirements_ci.txt, so this is not the exact CI environment. |
| Python coverage | BLOCKED: host Python 3.14 and existing image both lack coverage; no 40% floor certification. No dependencies installed. |
| CI helper tests | PASS: Node commitlint helper 1/1; Python CI helpers 3/3. |
| Workflow syntax | PASS: actionlint 1.7.12; shellcheck/pyflakes disabled. Does not prove action download or runner execution. |
| GitHub Actions | gh run list for current branch returned []; no remote run certification, rerun, push or dispatch. Dirty worktree is not represented by a remote CI run. |
| Prediction probe | Reproduced discarded fields, medium category at 0.75 and guest contract rejection. Isolated mapper/XHR double, not real inference. |

Default frontend worker failures occurred while other local checks ran; the constrained full rerun passed. Do not infer that Ubuntu CI fails from this local startup/resource failure. Keep whole-tree lint separate from tests that create/delete source fixtures.

## Test gaps and next work

- Fresh merged backend coverage records **zero executed lines/branches in PlantService and DiseaseService**. Catalog import/migration tests do not replace service/API CRUD, authorization, validation, not-found and inactive filtering coverage.
- Frontend ProfilePage: 0/22 branches; HistoryDetailModal: 3/18 (16.66%); useAccountNotifications: 12/20 (60%); catalogApi: 39/60 (65%). Investigate meaningful uncovered behaviors, not file count.
- adminApi and notificationsApi reach 75% branch coverage through broader tests despite no dedicated service test file. Add relevant HTTP/network/abort/error regressions rather than equating missing files with absent tests.
- First add contract/UI regressions for warning/pending/medication, valid guest result, expired/deleted history image, >100 history items. Test backend catalog additions if full database mirroring is required.
- Add format to CI and browser/API/DB E2E coverage; keep real-checkpoint smoke separate from mocks and model-quality evaluation. Raise floors gradually toward the documented 80% goal with meaningful tests.

## CI strengths and limits

Locked installs, separate backend unit/integration, Testcontainers PostgreSQL, TRX empty/skipped rejection, merged branch gates, failure artifacts, restricted permissions, concurrency, checkpoint checksums, explicit migration service and ci-gate requiring all jobs success are present. These structural checks do not certify a remote run.

Unrun in this audit: full GitHub Actions workflow for this worktree, full Compose checkpoint smoke, browser E2E, Python coverage, model-quality and Cloudinary private-access acceptance. Existing live services/DB volumes preserved.

## Evidence and paths

Audit documentation only: this report, AGRI-80 report index and existing AGRI-80 task log. No application/workflow/dependency/migration changes, staging, commit or push.

Ignored local evidence:

- `.cache/mapping-ci-audit-20261015/backend/*.trx`, UUID subdirectories containing per-suite coverage.cobertura.xml, and merged/Cobertura.xml (ReportGenerator 5.5.4).
- `.cache/coverage/frontend/coverage-summary.json` and cobertura-coverage.xml from the successful full 2-worker run.
- `.cache/mapping-ci-audit-20261015/prediction_contract_probe.mjs` and prediction-contract-probe.json; generated module strips types only.
- Fresh terminal/tool results for build/typecheck/lint/format, Python tests, CI helpers, actionlint and gh run listing.

References: [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [Vitest coverage](https://vitest.dev/guide/coverage.html). Repository source/configuration is the primary evidence.

## Commit preparation — 2026-10-15

- User explicitly requested committing the AGRI-80 work. Read root AGENTS.md, both .agents/rules files, skill boundaries, git-commit, coding-standards and verification-before-completion.
- Applied Biome format only to frontend/src/App.routing.test.tsx and frontend/src/services/authApi.test.ts; no behavior changes. Full lint (160 files), format (160 files) and explicit typecheck now pass. This resolves the two formatting failures recorded above; historical audit entries are preserved.
- Fresh pre-commit frontend coverage run: 188/188 tests, 28 files, 66.40s, branches 923/1565=58.97%, with --maxWorkers=2. Fresh backend tests: 33 unit + 40 PostgreSQL integration, 0 failed/skipped; TRX in .cache/agri80-commit-verification/backend. Backend coverage was not recollected; 61.43% above refers to the preceding audit run.
- Prepared separate feature and documentation commits with actual AGRI-80 key; both messages pass project commitlint without warnings. Feature staged diff has 61 files, passes whitespace checks and Gitleaks v8.24.2 stdin scan (no findings).
- Excluded generated frontend/next-env.d.ts, ignored .cache evidence, secrets, datasets, checkpoints, uploads and local drafts. Existing generated-file edit is preserved unstaged. No push/PR, remote CI run or Jira Done is authorized by this commit request.
- Remaining mapping/CI gaps in this audit are unchanged; this preparation fixes formatting only.

Feature commit created: `b9244c5` — `feat(admin): AGRI-80 add account and image administration` (61 files). Documentation is delivered separately; no push or Jira status change.
