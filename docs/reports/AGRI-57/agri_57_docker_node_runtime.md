# AGRI-57 — Frontend Docker Node runtime compatibility

Date: 2026-10-09. Branch verified: `AGRI-57-frontend-summary`.

## Cause and scoped fix

- User supplied `ERR_PNPM_MUSL` at the frontend `pnpm run build` step. Reproduced before editing with `docker compose --progress plain build frontend`: frozen install cached successfully; build attempted to fetch Node 24.15.0 and failed with the same MUSL error, exit 1.
- `frontend/pnpm-workspace.yaml` sets `useNodeVersion: 24.15.0`. pnpm therefore downloads that runtime for commands. Original `frontend/Dockerfile` uses `node:24-alpine`, a musl environment. Workspace config was copied only after dependency installation, so install and build saw different settings.
- Change both Docker stages to `node:24.15.0-bookworm-slim` (glibc) and copy workspace config with package/lock files before frozen install. Retain Node 24.15.0, pnpm 10.34.5, host managed-runtime behavior, standalone output, non-root `node` user, proxy contract and all app source/dependencies. Debian slim is larger than Alpine; matching build/runtime libc avoids shipping incompatible native dependencies.
- Update `frontend/README.md` with the compatibility requirement and targeted rebuild command. No Compose service/port/volume changes, backend build/start, DB migrations, secret edits, commits or pushes.

References: [pnpm 10 useNodeVersion](https://github.com/pnpm/pnpm.io/blob/main/versioned_docs/version-10.x/settings.md#usenodeversion), [official Node image libc variants](https://github.com/nodejs/docker-node/blob/main/README.md#nodealpine).

## Verification

- Docker engine 29.7.2 reachable after the required sandbox escalation. `docker compose config --quiet` PASS; existing PostgreSQL remained healthy.
- Red reproduction above runs the real failing artifact, not a text assertion against the Dockerfile. No permanent grep/config test added.
- Fresh `docker compose --progress plain build frontend` PASS, exit 0. Frozen dependency install PASS (507 packages); network download speed warnings, no dependency resolution changes. Next 16.3.6 compile/TypeScript/generation 10/10 PASS; runtime image `agriai-frontend` exported successfully. Resolved base digest: `sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d`.
- Runtime smoke PASS in a temporary container with `--network none`, no host ports and a read-only mount of the ignored local test script `tmp/docker-runtime-review/runtime_check.cjs`: Node v24.15.0, glibc runtime and non-root UID asserted; actual standalone server returns HTTP200 with AgriAI markup, linked static CSS returns HTTP200/nonempty and missing URL returns HTTP404. Script stops its own child server; Docker `--rm` removes only this test container. No Compose service restarted.
- Fresh `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` PASS: 114/114 tests, 21 files, exit 0. This is fixture-based frontend coverage, not real backend/model E2E.
- `docker compose config --quiet` and targeted Git whitespace diff check on Dockerfile/README PASS. No standalone host TypeScript/lint rerun: no TypeScript or UI source changed; container build performed TypeScript verification.

## Limits

Image build success does not establish integrated backend/database/AI inference. Full Compose startup, GitHub Actions, image vulnerability scan and real prediction E2E are outside this fix's verification. No data volume is deleted or recreated.
