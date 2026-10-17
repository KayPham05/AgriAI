---
name: qa-testing
description: >-
  Plan, write, run or review QA tests for web interfaces, REST APIs, databases,
  migrations and service integrations. Route frontend/E2E, unit, contract,
  accessibility, visual, performance, security, email, coverage and flaky-test
  requests to the relevant bundled QA guide. Use for QA testing, test plans,
  regression checks, test generation and test-quality reviews. Not for routine
  feature implementation, deployment, production monitoring or LLM/RAG evaluation.
license: MIT
---

# QA testing

This is the single discoverable entrypoint for 25 QA guides. Select guides by the
user's requested outcome, then read only the complete selected guide and references
needed for that task. Do not load all 25 guides into context.

## Start with project context

Read [project QA context](../../references/qa-project-context.md) and
[repository skill boundaries](../README.md). Use confirmed stack/requirements and
current source; ask only for missing decisions that affect the requested work.
The context describes target behavior as well as known gaps, not proof of coverage.

The original upstream names below now identify internal guides, not separate
installed skills. When a guide says to use another named QA skill, use this routing
table to open its guide. Mentions of unbundled skills are optional references:
do not invent files, install missing tools or stall a scoped test to satisfy them.

## Choose a guide

For a concrete request, go directly to its matching guide. For a broad system test,
rank risks, create a bounded test plan, and then choose the relevant component
guides. Review existing tests with ai-qa-review; create new tests with
ai-test-generation. Do not replace a test run with a plan or infer a passing result.

| Requested outcome | Read |
|---|---|
| Create/update QA project context | [qa-project-context](references/qa-project-context/guide.md) |
| Rank risks, failure modes and critical journeys | [risk-based-testing](references/risk-based-testing/guide.md) |
| Multi-quarter QA approach | [test-strategy](references/test-strategy/guide.md) |
| One task/sprint/release coverage plan | [test-planning](references/test-planning/guide.md) |
| Structured manual exploration/charters | [exploratory-testing](references/exploratory-testing/guide.md) |
| Browser workflows and scripted E2E | [playwright-automation](references/playwright-automation/guide.md) |
| REST endpoint behavior, errors, auth and pagination | [api-testing](references/api-testing/guide.md) |
| Logic/unit tests, doubles and timers | [unit-testing](references/unit-testing/guide.md) |
| Screenshot baselines and responsive visual regressions | [visual-testing](references/visual-testing/guide.md) |
| Keyboard, screen-reader, ARIA and accessibility audits | [accessibility-testing](references/accessibility-testing/guide.md) |
| Browser compatibility matrix and divergences | [cross-browser-testing](references/cross-browser-testing/guide.md) |
| Bounded load/latency/Web Vitals measurements | [performance-testing](references/performance-testing/guide.md) |
| Explicitly scoped security/negative attacker-path testing | [security-testing](references/security-testing/guide.md) |
| PostgreSQL integrity, migrations, constraints and query plans | [database-testing](references/database-testing/guide.md) |
| Generate new cases/code from requirements or changes | [ai-test-generation](references/ai-test-generation/guide.md) |
| Review quality/oracles/smells of existing tests | [ai-qa-review](references/ai-qa-review/guide.md) |
| Diagnose flakes, unstable locators or unreliable tests | [test-reliability](references/test-reliability/guide.md) |
| Test environment provisioning/parity | [test-environments](references/test-environments/guide.md) |
| Synthetic fixtures, factories, isolation and cleanup | [test-data-management](references/test-data-management/guide.md) |
| Consumer/provider schemas and integration contract verification | [contract-testing](references/contract-testing/guide.md) |
| Choose fakes/stubs or isolate external-service failures | [service-virtualization](references/service-virtualization/guide.md) |
| Analyze measured coverage gaps and meaningful assertions | [coverage-analysis](references/coverage-analysis/guide.md) |
| Requested CI test stages, artifacts and gates | [ci-cd-integration](references/ci-cd-integration/guide.md) |
| Signup/reset/OTP email flows with isolated capture | [email-testing](references/email-testing/guide.md) |
| Evidence-based release smoke/go-no-go assessment | [release-readiness](references/release-readiness/guide.md) |

Use more than one guide when the request genuinely spans boundaries, e.g. API
contract plus database ownership, or E2E plus keyboard navigation. For CI failures,
follow the repository's existing gh-fix-ci workflow when applicable; this router
does not bypass its requirements. For observed bugs, use systematic-debugging.

## Adapt to AgriVision

- Use existing Vitest/Testing Library, xUnit/WebApplicationFactory/Testcontainers
  and Python unittest/coverage. Examples using Jest, pytest, Pact, Prisma or a
  browser provider are not authorization to replace the current stack.
- Keep scope: database support does not imply API/UI completion, fake inference
  does not imply checkpoint acceptance, and a real smoke test is not accuracy
  evaluation. Record actual commands, outcomes, skipped/blocked checks and limits.
- For ConvNeXt/FastAPI requests, use API/contract/unit/data/performance/review guides
  as appropriate, plus existing pytorch-patterns for model-specific changes.
  Preserve labels, dataset v1.4/splits, preprocessing and metric semantics. Do not
  substitute LLM prompt/RAG/judge workflows or run training/download checkpoints
  merely to use this skill.
- Keep migrations forward-only and preserve application data/volumes. Destructive
  examples apply only to explicitly disposable authorized fixtures. Security/load
  tests need bounded authorized targets; email tests use synthetic/local capture.
- Skill selection grants no extra tool permissions or authorization to deploy,
  send messages, change Jira/CI, delete tests, commit/push or add paid services.

Preserved upstream guides and per-guide licenses originate from
`petrkindlmann/qa-skills` at `b3bb61bd268b147476252c6ed5a0440c87b97441`.
The [shared tool catalogue](references/support/tools/REGISTRY.md) is documentation,
not installed tooling. Source provenance remains in ../installed_skills.json.
