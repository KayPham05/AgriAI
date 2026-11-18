# AgriVision AI

Repository-wide guidance. Explicit user instructions take precedence; report any necessary deviation from repository rules.

## Project and current state

- Stack: Next.js (`output: 'standalone'`) → ASP.NET Core Web API (.NET 9) → PostgreSQL; FastAPI serves two-stage ConvNeXt-Tiny classification; private image storage uses Cloudflare R2 (`R2ImageStorage.cs`). Preserve dataset `v1.4` (`59` classes), agreed labels, splits, and metric semantics.
- AGRI-79 database integration was verified locally on 2026-10-07: backend image reads/writes `agrivision_db`; 33 unit and 13 PostgreSQL integration tests passed. See the [task log](docs/task-logs/AGRI-79/AGRI-79-database-migrations.md).
- Run migrations separately with `--migrate`; HTTP startup only checks schema. Preserve migration history and DB volumes. `--expire-images` deletes expired DB images for signed-in accounts while retaining history (no external scheduler configured); guest diagnosis images reside in-memory (`GuestPredictionStore.cs`) with TTL cleanup.
- CI `compose-smoke` and Live System E2E verify real ConvNeXt inference across FastAPI–Backend–Next.js; automated backend integration tests exclude `Category!=RealCheckpoint&Category!=RealR2` unless real credentials/checkpoints are intentionally run.

## Work, rules, and verification

- Inspect branch, Git status, and relevant source before editing. Read [project rules](.agents/rules/project_rules.md), [directory rules](.agents/rules/directory_structure.md), `.agents/skills/README.md`, and complete `SKILL.md` files before acting (skill defaults never override repo rules or `DESIGN.md`).
- Use `coding-standards` for code changes and `git-commit` only when staging or committing is explicitly requested. Make the smallest complete change, preserve unrelated work, prefer readable typed code, and reuse existing modules/dependencies.
- Use `rg` (or `Select-String` on Windows) for searches. Batch independent reads; keep edits and dependent operations sequential. Ask only for missing decisions that affect scope; continue work already authorized.
- Follow [TESTING.md](TESTING.md) and [command guides](.agents/commands/README.md). Backend integration requires Docker. Branch coverage target: 80% per component; CI floors: backend 70%, frontend 65%, Python 40% ([current gate report](docs/reports/AGRI-127/README.md), [historical coverage report](docs/reports/AGRI-75/ci_branch_coverage.md)). Report exact passed, unrun, or blocked results; local results do not establish GitHub Actions success.
- Keep automated E2E tests and manual tests strictly disjoint (`overlap = 0`) across docs (`frontend_e2e_test_specification.md` vs `manual_e2e_test_cases.md`), suites (`frontend/tests/browser/e2e/`), and configs (`tools/testcase-workflow/config/`).
- Testcase & Google Sheets sync (`tools/testcase-workflow/`): live Sheet writes require `AGRIVISION_WRITE_SHEETS=true` and an ignored Service Account key; avoid running local `sync --sheets` concurrently with CI `sheets-sync` (`main` push) to stay within Google Sheets per-minute read quotas. When running Next.js `output: 'standalone'` (`server.js`), copy `.next/static` and `public` into `.next/standalone/`.

## Documentation, Jira, and task logs

- Keep secrets, datasets, checkpoints, uploads, backups, generated artifacts, `state.json`, and User Story drafts/interview notes out of Git per `.gitignore`; keep migrations, tests, and task logs tracked. Never invent Jira keys, owners, reviewers, branches, metrics, or experiment results.
- For every confirmed Jira key, use `docs/reports/AGRI-XXX/README.md` for technical evidence and `docs/task-logs/AGRI-XXX/` for task logs. Never create `README.md` (or any README file) inside `docs/task-logs/<JIRA-KEY>/`.
- Before handing off changes, opening a PR, or moving Jira to `Done`, update the technical report and task log per `.agents/rules/project_rules.md` (§4): refresh only the top 4–5 line status block, append a chronological `### [YYYY-MM-DD HH:MM +07:00] <Title>` entry (`Changed`, `Verified`, `Remaining`) without deleting or rewriting past entries, link detailed evidence instead of pasting long outputs, and never present an earlier test run as fresh evidence.

## Git, conventions, and delivery

- Follow `.agents/rules/project_rules.md` for naming (`snake_case.py`, `EXP-XXX`, `v<major>.<minor>`, `convnext-tiny-v<major>.<minor>`), Jira, commits, PR template, and required domain reviewer (`main` base/target, no self-approval).
- Commit, push, rewrite history, or perform destructive Git operations only when explicitly requested. Inspect staged paths and diff first; exclude User Story drafts and unrelated work.
- Branch: `AGRI-XXX-<short-description>`. Commit: `<type>(<optional-scope>): AGRI-XXX <imperative description>` (one logical change per commit, enforced by CI `commitlint`); use the actual branch Jira key.
- Use Vietnamese for conversation and English for this guide.
