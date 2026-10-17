# AgriVision AI — QA project context

Recorded 2026-10-17; QA modules are now bundled under .agents/skills/qa-testing/SKILL.md. Original module names in this file are internal guides selected by that entrypoint, not separate installed skills. Facts come from repository source and explicit user decisions. This is repository context, not proof that every target feature works. Read AGENTS.md, .agents/rules/, .agents/skills/README.md and DESIGN.md where relevant. User instructions and repository rules take precedence over upstream skill defaults.

## Product

AgriVision AI is a web application for farmers and agriculture students to classify supported plants and leaf conditions using ConvNeXt-Tiny. Scope is classification, not detection, segmentation, severity estimation, LLMs or RAG. Preserve dataset v1.4, the agreed 59-class mapping, fixed splits and metric semantics.

Critical journeys to test as their implementation becomes available:

1. Guest submits a supported leaf image, sees a result, and creates no stored business history/profile or long-lived image.
2. User registers/logs in and can access only their own history; Admin-only actions reject User/Guest.
3. Logged-in user skips optional profile creation and successful predictions still save to the account.
4. User selects an owned profile before diagnosis; the result saves into that profile. Existing results cannot be transferred or attached later. Removing a result from a profile, or deleting the profile, retains account history and the snapshot.
5. Single/multiple JPG/JPEG/PNG images total less than 30 MB. Multiple images need the same plant/condition prediction; common confidence is their arithmetic mean. Reject mismatched labels, invalid images and unsupported input according to the target contract.
6. Confidence at or below 80% produces a warning and no medication. Above 80%, medication requires a disease condition and approved content; healthy/nutrient-deficiency conditions use care guidance. Missing approved information uses the agreed pending-content message.
7. History retains the displayed result, warnings and pending-content state. Original images expire after 30 days; history/snapshot remain and expired original URLs are hidden.
8. Admin updates account status/roles and knowledge/medicine data. Target session rules: role change/disable revokes all sessions; logout revokes the current session. Editing knowledge content requires renewed approval.

Items above include target behavior, not blanket acceptance. See docs/reports/AGRI-127/database_improvement_implementation.md for schema support and API/UI follow-ups.

## Tech Stack

- Frontend: Next.js 16.3.6 App Router, React 19.2, TypeScript; frontend/package.json. pnpm 10.34.5, Node 24 according to package engines; do not upgrade as part of QA setup.
- Backend: ASP.NET Core REST controllers, target net9.0; backend/AgriVision.sln. EF Core 9.0.2 and Npgsql with PostgreSQL 16.
- Inference: Python/FastAPI and PyTorch ConvNeXt-Tiny; ai/service/app.py and ai/predict.py. Read actual requirements before choosing Python tooling.
- Storage: Cloudinary abstraction for images, PostgreSQL metadata/history/snapshots; private Cloudinary access is not accepted merely because a fake passes.
- Hosting baseline: Docker Compose and GitHub Actions. VPS/provider/domain remain unconfirmed; do not invent production URLs or assume cloud dashboards exist.

## Test Stack

- Frontend unit/component: Vitest 5.0.2, Testing Library React 16.3.3, jsdom; frontend/vitest.config.mts, frontend/tests/setup.ts, centralized suites under frontend/tests/unit, component, integration and tooling; shared helpers under frontend/tests/helpers. Coverage uses V8. Biome lint and tsc typecheck are separate checks.
- Backend: xUnit 2.9.3, FluentAssertions 8.11.0; Moq 4.21.0 in unit tests. backend/tests/AgriVision.UnitTests and backend/tests/AgriVision.IntegrationTests.
- API/DB integration: WebApplicationFactory 9.0.2 and Testcontainers.PostgreSql 4.15.0 against real PostgreSQL. API integration substitutes AI/image storage with explicit fakes; database tests use actual migrations/constraints.
- Python: standard-library unittest under ai/tests/unit and ai/tests/integration; explicit artifact-backed tests under ai/tests/checkpoint; coverage.py 7.10.6 is pinned in ai/requirements_ci.txt. Do not migrate this suite to pytest solely because a skill example uses it.
- E2E browser framework: no repository Playwright/Cypress config or dependency found at setup time. webapp-testing and playwright-automation are guidance, not installed browser runtimes or an existing E2E suite. Use only browser automation supported by the current environment; obtain a scoped implementation request before adding a framework.
- Visual regression, accessibility automation, load/security scanners, contract broker, email capture server: no dedicated configured suite/service established by this installation. Record missing setup rather than claim coverage.
- Authoritative commands: .agents/commands/README.md, backend.md, frontend.md, ai.md and database.md. Resolve stale examples against package scripts/configuration: current frontend lint is Biome; typecheck is tsc.

## CI/CD

- Source: .github/workflows/ci.yml; pull requests, main pushes and manual dispatch.
- Jobs include commitlint, secret scan, Compose smoke, Python tests/coverage, backend unit/integration/coverage, frontend lint/test coverage/build and aggregate ci-gate.
- Compose CI uses isolated services/migration execution and explicit checkpoint artifacts for a real inference smoke check. A smoke check is not an accuracy evaluation or acceptance of CLI-to-web inference.
- Existing reports/coverage artifacts are retained by workflow configuration. No new provider, sharding system, broker, paid reporting account or gate is authorized by installing skills.
- Local pass results do not establish that GitHub Actions ran successfully. See task reports for dated evidence; do not reuse previous results as fresh checks.

## Environments

- Local Compose defaults: web port 3000, backend 5080, FastAPI 8000, PostgreSQL 5432. Environment overrides may change these; inspect status/ports before starting services and avoid duplicate servers.
- Application DB is agrivision_db, not the separate legacy ERD database. Never print credentials or raw .env; use relevant presence-only/redacted diagnostics.
- Tests should own their PostgreSQL containers, synthetic users and fixtures, then clean up only those resources. Preserve application data, uploads and named volumes.
- Apply migrations separately with --migrate after review/backup. HTTP startup checks schema; it does not migrate. AGRI-127 migrations and the catalog migration are forward-only; do not run down/drop/reset as a generic QA recipe.
- --expire-images deletes real expired storage images while retaining history: not an innocuous test. Use isolated fixtures for expiry checks.
- Staging/production URLs and browser/device analytics are not confirmed. Browser-matrix suggestions remain proposals, not measured audience coverage.

## Quality Goals

- Branch coverage target: 80% for each component. Current CI floors: backend 60%, frontend 60%, Python 40%; source is CI config and docs/reports/AGRI-75/ci_branch_coverage.md. Do not replace these with example thresholds or confuse line and branch coverage.
- Flake-rate and suite-duration budgets are not confirmed; no numeric SLA is invented here. Report actual duration/retries when measured; do not hide failing tests by increasing retries or deleting tests.
- Verify trust boundaries, ownership/roles, negative/edge cases and meaningful output assertions. Tests that only mirror implementation text/constants are not evidence of behavior.
- Claims require fresh evidence: command, environment, result and limitations. Installing skills and validating their files is not a test run of AgriVision.

## Risk Areas

The priority labels below are planning judgments based on architecture and known integration gaps, not measured defect probabilities. Likelihood is unmeasured until test/incident evidence exists.

| Area | Impact | Likelihood | Planning priority and evidence basis |
|---|---|---|---|
| Ownership, Guest persistence, optional profiles | High: cross-account access or data loss | Unmeasured | Critical: explicit user boundaries and new DB links/triggers |
| Migrations, history/snapshot and image expiry | High: lost history or private/expired image exposure | Unmeasured | Critical: forward-only schema, cloud/DB failure coordination, 30-day retention boundary |
| AI labels, preprocessing and confidence | High: wrong condition or inappropriate displayed guidance | Unmeasured | Critical: preserve class mappings, CLI/HTTP parity, 80% boundary and approved-content conditions |
| Session/role/knowledge integration | High: stale privileges or unapproved information | Unmeasured | Critical: AGRI-127 data support does not complete JWT/API/UI integration |
| Frontend forms, responsive layout, accessibility | Medium to high: users cannot submit/read results | Unmeasured | Important: browser E2E/a11y/visual suites not configured at this setup |
| FastAPI/storage timeouts, invalid/large uploads | Medium to high: failed requests and orphaned data | Unmeasured | Important: test transport failures separately from model quality and use bounded isolated load |

## Team

- QA headcount, developer-to-QA ratio, named QA owner and team maturity are not confirmed. Do not infer solo-team status or invent reviewers from missing information.
- Follow repository domain review rules; no self-approval. Ask only when a concrete QA deliverable actually requires missing ownership or scheduling information.

## Conventions

- Use existing runners and naming: frontend Vitest tests under frontend/tests grouped by unit/component/integration/tooling, with @/ imports for source and relative imports for test helpers; backend PascalCase test classes; Python snake_case test files under ai/tests grouped into unit/data, unit/inference, unit/training, unit/tasks, integration, checkpoint and manual. Reuse fixtures/fakes before adding abstractions/dependencies.
- Browser locators: prefer role/accessibility name or labels, then stable existing test IDs. Test IDs may be added only in a scoped change; never replace user-facing behavior assertions with implementation selectors.
- Build traceability: requirement/source decision -> risk -> test case -> actual evidence. Optional profiles, Guest behavior and confirmed decisions override incompatible upstream examples.
- Web/API/AI contracts: test Next.js -> .NET and .NET -> FastAPI shapes, class mapping and confidence; retain existing DTOs/envelopes/routes. Prefer current HTTP clients/xUnit/unittest before suggesting Pact, Supertest, Prisma, WireMock or MSW.
- AI testing: use api-testing, contract-testing, test-data-management, unit-testing, performance-testing, ai-qa-review and existing pytorch-patterns. Validate supported labels/order, preprocessing, seeds where specified, confidence boundaries, invalid/corrupt/out-of-scope inputs, timeouts and CLI/HTTP parity. Distinguish unit/fake tests, real-checkpoint smoke and held-out accuracy evaluation; never report one as another.
- Dataset tests use approved frozen/synthetic fixtures, not accidental training-data reuse. No training, checkpoint download/replacement, split changes or metric changes just to follow a QA example. Keep artifacts/checkpoints/datasets outside Git.
- Security/performance/email skills are opt-in guidance: use isolated authorized targets, synthetic accounts and local capture/fakes. No production scan/load, real email transmission, third-party account creation or paid services from skill installation.
- Write evidence under docs/reports/the-actual-task-key and completion/ongoing records in docs/task-logs; follow branch/task-key rules. Reports in Vietnamese for the user; this context is English. Preserve unrelated work; no automatic staging, commit/push, Jira comments or status changes.
- Shared upstream tool catalogue: .agents/skills/qa-testing/references/support/tools/REGISTRY.md. Missing sibling skills are optional references, not permission to install or execute them.
