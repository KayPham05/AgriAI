# AGRI-57: Commit preparation and CI limits

Date:2026-10-12. Verified branch:AGRI-57-frontend-summary. User explicitly authorized committing frontend/assets/docs and the installed skills/rules, and then chose **not to fix CI failures** before committing. No push, history rewrite, hook bypass or Jira mutation is authorized.

## Scope and grouping

- Runtime/tooling: frontend Dockerfile, package/lockfile, Node/workspace configuration, Biome/editor configuration, shadcn configuration, Vitest aliases and lint-boundary tests.
- Frontend feature integration: App Router/features/providers, UI/controls/auth/map/banner/film/catalog/pagination, tests, real crop/leaf assets and removal of obsolete generated crop files. DESIGN.md records current visual authority. These changes share the same imported registries, contexts and primitives and are delivered together rather than splitting a dependent source tree into broken snapshots.
- Agent tooling: AGENTS.md, .agents/skills and .agents/workflows; preserve upstream skill text/licenses and existing duplicate packages rather than silently deleting them.
- Documentation: frontend README and AGRI-57 technical reports/task logs, including this preflight record.
- Excluded: literal %SystemDrive% Windows cache tree, the duplicated agents/ tree, node_modules, .next, generated coverage/test artifacts, secrets/.env, uploads/checkpoints/datasets and local User Story drafts. Existing ignored/unrelated material is not removed.

Messages validated before commit using the root locked commitlint configuration:

1. build(frontend): AGRI-57 configure runtime and quality tooling
2. feat(frontend): AGRI-57 integrate crop UI and routed catalog
3. chore(agents): AGRI-57 add project skills and usage rules
4. docs(frontend): AGRI-57 record implementation and CI limits

All four messages passed with0problems/0warnings. Each includes the verified Jira key. Commit IDs and final history validation are checked after creation and reported at handoff; this file does not predict hashes.

## Fresh local checks

| Check | Actual result |
| --- | --- |
| Frozen dependencies | Root and frontend install PASS after authorized network access; unchanged manifests/lockfiles. Initial sandbox install failed on network access and frontend non-TTY purge confirmation. Existing installed frontend was synchronized to its lockfile; no dependency upgrade. |
| Frontend lint, exact CI command | **FAIL**,49warnings/7infos under biome lint . --error-on-warnings. Includes raw img usage, type-only imports, unused variable, non-null assertions and print CSS important warnings. No weakening or fixes applied by user decision. |
| Frontend format:check | **FAIL**,62errors. Extra local quality check, not a separate job in current ci.yml. No formatting rewrite applied. |
| Frontend test:coverage, exact CI command | **PASS**,160/160tests25files,39.27s. Initial attempt failed because @vitest/coverage-v8 was not installed locally; rerun after frozen install passed. |
| Branch coverage validator | **PASS**,654/1197branches=54.64%, current CI floor25%. Vitest prints54.63% by its own rounding; no threshold/exclusion changes. Per-component target80% is not established. Generated XML/HTML remain ignored under .cache/coverage/frontend/. |
| Production build | **PASS**,87s compilation, TypeScript12.2s,10static pages/two dynamic routes. Restored existing Next dev-type imports after build. |
| Fresh post-build typecheck | **PASS**,tsc --noEmit exit0. |
| Commitlint regression test | **PASS**,1/1 after root frozen install. Initial concurrent attempt failed because the install was incomplete; not a code regression or a skipped test. |
| Gitleaks v8.24.2 staged diff | **PASS**,5.61MB scanned/no leaks, no network in scanning container. |
| Gitleaks v8.24.2 existing Git history | **PASS**,109commits/50.17MB/no leaks with --log-opts=--all before the new commits. Final new docs are scanned again before commit. |
| Whitespace | Tracked worktree diff check passed before staging new packages. Full staged diff check **FAILS** on preserved vendor skill whitespace and an existing report trailing blank line. Not repaired under the explicit no-fix decision; not currently a CI job. |

Source: commands executed in this preparation turn, frontend/package.json, frontend/vitest.config.mts, .github/workflows/ci.yml, commitlint.config.cjs and .github/scripts/check_coverage.py. No earlier browser run is represented as fresh verification.

## CI/CD is not passing or certified

- Current frontend CI job runs the strict lint command and will fail on the known49warnings unless those are corrected later.
- Compose smoke still grep-checks **LeafAI** in root HTML, while the visible brand/metadata now use **AgriAI**. This is a source-inspection finding; the full Compose job was not run here. The smoke expectation needs review rather than inserting obsolete text merely to satisfy it.
- Backend/Python coverage jobs, full Compose smoke and GitHub ci-gate were not run in this turn. They cannot be inferred from frontend results or secret scanning. No CI workflow edit, application remediation or threshold reduction was made.
- Existing history secret scan and staged-diff scan are local evidence, not a successful GitHub secret-scan job. No deployment or CD action was performed.
- No source/licensing/expert image certification, real inference E2E, browser/device/FPS/Lighthouse or new UI review in this commit-only turn.
- Explicit user decision takes precedence over a green preflight: commits are requested with these failures recorded, not as a claim of CI/CD readiness. Push/PR remains a separate action; default PR target remains develop under project rules.
