# AgriVision AI

Repository-wide guidance. Explicit user instructions take precedence.

## Project and current state

- Stack: Next.js → ASP.NET Core Web API (.NET 9) → PostgreSQL; FastAPI serves ConvNeXt-Tiny classification. Preserve this scope and the agreed dataset v1.4, labels, splits and metric semantics.
- AGRI-79 database integration was verified locally on 2026-10-07: backend image reads/writes `agrivision_db`; 33 unit and 13 PostgreSQL integration tests passed. See the [task log](docs/task-logs/AGRI-79/AGRI-79-database-migrations.md).
- Run migrations separately with `--migrate`; HTTP startup only checks schema. Preserve migration history and DB volumes. `--expire-images` deletes expired images while retaining history; no scheduler is configured.
- FastAPI source exists; real checkpoint inference across CLI–HTTP–API–web is not yet accepted. AI/storage fakes and health checks are separate from real inference. Cloudinary private access is also pending.

## Work and verification

- Inspect the current branch, Git status and relevant source before editing. Preserve unrelated work and make the smallest complete change; reuse existing code and dependencies.
- Read relevant [project rules](.agents/rules/project_rules.md), [directory rules](.agents/rules/directory_structure.md) and applicable skills. Use `coding-standards` for code changes and `git-commit` for requested commits.
- Use `rg` for searches. Batch independent reads; keep edits and dependent operations sequential. Ask only for missing decisions that affect scope; continue work already authorized.
- Use the [command guides](.agents/commands/README.md). Backend integration requires Docker. Run relevant checks and report passed, unrun or blocked results; local results do not establish GitHub Actions success.
- Branch coverage target: 80% per component; current CI floors: backend 50%, frontend 25%, Python 40%. See the [coverage report](docs/reports/AGRI-75/ci_branch_coverage.md).
- Keep secrets, datasets, checkpoints, uploads, backups and generated artifacts out of Git. Keep User Story drafts/interview notes local as specified in `.gitignore`; keep migrations, tests and task logs tracked.
- Put evidence in `docs/reports/AGRI-XXX/` and completion logs in `docs/task-logs/`. Do not invent Jira keys, owners, reviewers or results.

## Git and delivery

- Commit, push, rewrite history or perform destructive Git operations only when requested. Inspect staged paths and diff before committing; exclude User Story drafts and unrelated work.
- Branch: `AGRI-XXX-<short-description>`. Commit: `<type>(<optional-scope>): AGRI-XXX <imperative description>`; one logical change per commit. Use the actual task key, not an unrelated key from branch history.
- PRs follow the project template and require the relevant reviewer; no self-approval. Default base/target is `develop`, with releases targeting `main`, unless the user directs otherwise.
- Include a task log before/with PR creation and before Jira Done. Summarize changes, verification and remaining limits concisely, using Vietnamese for conversation and English for this guide.
## Conventions

- Follow `.agents/rules/project_rules.md` for naming, Jira, commits, pull requests, reviewers, and task reports.
- Use `snake_case.py` for Python, `EXP-XXX` for experiments, `v<major>.<minor>` for datasets, and `convnext-tiny-v<major>.<minor>` for models.
- Prefer readable, typed, minimal code; reuse existing modules before adding abstractions or dependencies.
- Preserve agreed labels, dataset splits, versions, experiment IDs, and metric semantics.

## Important rules

- Read every relevant file in `.agents/rules/` and the complete `SKILL.md` of each matching skill before acting.
- Before using installed third-party skills, read `.agents/skills/README.md` for project-specific usage boundaries. Skill defaults do not authorize actions outside the user's request or override repository rules and `DESIGN.md`.
- Always use `coding-standards` for code changes; use `git-commit` only when staging or committing is explicitly requested.
- Make the smallest complete change, preserve unrelated work, and run the smallest relevant verification.
- Before handing off any repository change, update the technical report and task log for the Jira key verified from the current branch, including changes, affected paths, actual checks and remaining work. Follow the ongoing-record rules in `.agents/rules/project_rules.md`; preserve historical entries and never present an earlier test run as fresh evidence.
- Do not invent Jira keys, owners, reviewers, branches, metrics, or experiment results.
- Do not commit, push, rewrite history, or perform destructive Git operations unless explicitly requested.
- Explicit user instructions take precedence; report any necessary deviation from repository rules.
