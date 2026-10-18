# AGRI-82 — Integrate real AI into Docker Compose and CI

- Verification date: 2026-10-09
- Branch: `AGRI-82-integrate-real-ai-docker-ci`
- Status: implementation and local verification complete; GitHub Actions pending.

## Completed work

- Integrate CPU FastAPI and real ConvNeXt-Tiny checkpoints into base Compose.
- Move the Dockerfile to `ai/Dockerfile`, use the `ai/` build context and align
  checkpoint/output paths with `ai/models/`.
- Keep model artifacts outside Git/images and mount checkpoints read-only.
- Replace the CI health mock with artifact download/checksums and real inference
  smoke checks while retaining the one-shot migration job.
- Update startup, troubleshooting and CI documentation.

## Verification

All application images built. Real inference passed through CLI, FastAPI,
backend/frontend proxy and Chromium upload for an authenticated test account.
Local image storage and prediction history read/delete passed on an isolated
database. Missing checkpoints or unavailable AI returned 503 without a mock.

All 162 component tests passed: 33 backend unit, 33 PostgreSQL integration,
31 frontend and 65 Python tests. Branch coverage was 57.82% backend, 26.73%
frontend and 46.74% Python, above the current CI floors but below the 80% targets.
Workflow syntax and whitespace checks passed. A dedicated Gitleaks history scan
found no secrets in the 117 commits scanned before delivery.

See the [operational evidence](../../reports/AGRI-82/docker_ai_verification.md)
and [coverage report](../../reports/AGRI-82/ci_branch_coverage.md).

## Remaining limits

- Run GitHub Actions with these changes and confirm all jobs, including ci-gate.
- Existing guest response mismatch: empty backend `imagePath` is rejected by the
  frontend; the authenticated browser flow is the one verified here.
- No test-set accuracy evaluation, Cloudinary private-access verification or
  full requirements acceptance was performed. Model versions, dataset labels
  and splits were preserved; this task did not train a new model.
- Review and PR acceptance remain pending. Existing database/uploads volumes
  were preserved throughout local checks.
