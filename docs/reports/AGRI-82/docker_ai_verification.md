# AGRI-82 — Docker and real AI verification

Verification date: 2026-10-09. Dataset: v1.4. These are local results; a
GitHub Actions run with the proposed configuration is still required.

## Changes

- Base Compose now includes CPU FastAPI inference. Backend uses
  `http://ai-service:8000` and waits for PostgreSQL and AI readiness.
- `ai/Dockerfile` uses the `ai/` build context and CPU PyTorch 2.8.0 /
  torchvision 0.23.0. The previous root Dockerfile and AI override are removed.
- Checkpoints and training outputs use `ai/models/`. Checkpoints are mounted
  read-only; model files, mappings and outputs are excluded from Git and builds.
- CI retains the real AI service, downloads the configured Google Drive RAR,
  verifies archive/checkpoint SHA-256 and calls `/predict`. The health mock is
  removed; the separate migration job is retained.

## Artifact checks

| Artifact | SHA-256 |
|---|---|
| RAR | `a55ee86d1f57a44c93a3a0b09f91cd6493490c4edf0c88c3d9b300d0bb171e72` |
| Plant checkpoint | `d071c13d14ef573430b38674647e5ebfce0b5d3f4bd7099d7e815549073178ea` |
| Disease checkpoint | `d21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9` |

The archive was downloaded and extracted locally. Extracted checkpoint hashes
match the user-provided local files. The RAR's original `ai/checkpoints/` prefix
is stripped into `ai/models/checkpoints/` by CI. Mappings contain 10 plants,
44 disease labels and 59 compound plant–disease labels.

## Operational checks

All three application images built successfully. Image inspection confirmed
checkpoint weights are absent and the default CLI paths match `ai/models/`.
The initial AI build transferred approximately 398 kB of source context.

The isolated project `agrivision-verify-20261009` used its own database/uploads
volumes and host ports 55436, 15080, 13000 and 18000. Source migration history
matched the test database. Existing application data and volumes were preserved.

| Check | Local result |
|---|---|
| AI, API/database, AI dependency and frontend proxy health | PASS |
| CLI using default checkpoint locations | PASS |
| Real `/predict` and `/v1/predictions` | PASS; consistent labels |
| Compound indices/names, confidence range, top-k groups | PASS against 59-label mapping |
| Guest request through frontend proxy | HTTP 200; no stored image/history |
| Authenticated prediction through frontend proxy | HTTP 201 |
| Uploaded image served through frontend | PASS; bytes match uploaded image |
| Prediction snapshot/history read and deletion | PASS |
| Chromium UI upload through frontend → backend → real AI | PASS; displayed result, no browser runtime errors |
| AI stopped after startup | Dependency/prediction HTTP 503; API/database and frontend remain available |
| Image without mounted checkpoints | Liveness 200; readiness/health/prediction 503 |
| Corrupt image / unsupported MIME / invalid topK | HTTP 400 / 415 / 422 |
| Repository API/database verifier | PASS; its synthetic fixtures cleaned |

The smoke image was `frontend/public/images/rice-leaf-cutout.png`. The observed
primary result was `Lua___Khoe_manh`, index 28, confidence 0.3572. This verifies
execution and response contracts, not model accuracy on the dataset test split.

## Evidence and limits

Local ignored artifacts are under `.cache/compose-verification/`, including
`runtime.json`, `cli.log`, `browser-result.json`, `real-web-prediction.png`,
`failure-mode.log`, `missing-checkpoint.log`, `live-api-db.log` and build logs.
They are not available in a fresh checkout unless attached separately.

The three application images were rebuilt after verification. The isolated
project's containers/network were removed with `down` without removing volumes.
Cloudinary was disabled for these checks; only local image storage was verified.

The existing guest contract mismatch remains: backend intentionally returns an
empty `imagePath`, but `frontend/src/services/predictionApi.ts` rejects that value.
The authenticated browser flow passes; a guest UI flow was not accepted.

Workflow syntax passed actionlint 1.7.12. Gitleaks v8.24.2 scanned 117 existing
commits with no findings before this delivery; this was a Git history scan.
See [coverage results](ci_branch_coverage.md) for the separately measured suites.
