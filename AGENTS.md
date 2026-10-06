# AgriVision AI

These instructions apply to the entire repository.

## Project

- Build an end-to-end plant leaf disease classification system using ConvNeXt-Tiny.
- The application includes a Next.js web frontend, an ASP.NET Core Web API, and PostgreSQL. The intended inference service is FastAPI; a CI health mock is not model inference.
- Keep classification as the core scope. Add detection, segmentation, or severity estimation only when explicitly requested.

## Directory structure

```text
ai/                             Training, evaluation, CLI inference, shared data code
ai/tasks/agri_21/               Offline dataset scripts and their tests
backend/src/                    ASP.NET Core API, application, domain, infrastructure
backend/tests/                  .NET unit and PostgreSQL Testcontainers integration tests
frontend/src/                   Next.js pages, views, services, and Vitest tests
docker-compose.yml              Web, API, and PostgreSQL for local development
.github/workflows/ci.yml        CI jobs and coverage gates
docs/                           Plans, technical reports, task logs, and notes
experiments/                    Versioned experiment records under EXP-XXX
.agents/rules/                  Repository-specific rules
.agents/skills/                 Reusable agent skills
```

- Root `docker-compose.yml` starts web, API, and PostgreSQL; `docker-compose.ci.yml` adds an AI health mock. For PostgreSQL alone, run `docker compose up -d postgres` from the repository root.
- Keep datasets, checkpoints, generated outputs, caches, and secrets out of Git.

## Conventions

- Follow `.agents/rules/project_rules.md` for naming, Jira, commits, pull requests, reviewers, and task reports.
- Follow `.agents/rules/directory_structure.md` when placing AI code or documentation. Use `docs/reports/AGRI-XXX/` for task evidence and `docs/task-logs/` for required completion reports.
- Use `snake_case.py` for Python, `EXP-XXX` for experiments, `v<major>.<minor>` for datasets, and `convnext-tiny-v<major>.<minor>` for models.
- Prefer readable, typed, minimal code; reuse existing modules before adding abstractions or dependencies.
- Preserve agreed labels, dataset splits, versions, experiment IDs, and metric semantics.
- Treat passing tests, service health, branch coverage, and real model inference as separate evidence. Never present a stub or mock result as a validated prediction.

## Verification

- CI runs Compose smoke, Python tests, .NET unit and integration tests, and frontend lint/tests/build. See `.github/workflows/ci.yml` and `docs/reports/AGRI-75/README.md` for the current scope and evidence.
- Target **80% branch coverage separately** for backend, frontend, and Python. Until the test suites reach that target, CI enforces measured interim floors of backend 50%, frontend 25%, and Python 40%; raise them as coverage improves. Backend coverage merges unit and integration runs before applying the gate; see `.github/workflows/ci.yml` and `docs/reports/AGRI-75/ci_branch_coverage.md`.
- Run the smallest relevant local checks after a change. Backend integration tests require Docker; AI tests in CI use CPU dependencies and do not validate a real checkpoint.

## Important rules

- Read every relevant file in `.agents/rules/` and the complete `SKILL.md` of each matching skill before acting.
- Always use `coding-standards` for code changes; use `git-commit` only when staging or committing is explicitly requested.
- Make the smallest complete change, preserve unrelated work, and run the smallest relevant verification.
- Do not invent Jira keys, owners, reviewers, branches, metrics, or experiment results.
- Do not commit, push, rewrite history, or perform destructive Git operations unless explicitly requested.
- Explicit user instructions take precedence; report any necessary deviation from repository rules.
