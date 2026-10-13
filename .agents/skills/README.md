# AgriVision AI skills

Read the root `AGENTS.md`, relevant `.agents/rules/` files and the complete matching `SKILL.md` before using a skill. For UI work, also read `DESIGN.md` first. Apply only skills relevant to the task, not this entire collection on every turn.

## Repository-local collection

Seven UI skills were added on 2026-10-08 at the user's explicit request. The repository now contains **22 skills**: 20 installed third-party packages plus the two preserved original skills. The 2026-10-07 installation counts below describe that earlier batch, not the current total.

| UI skill | Project directory | Source |
| --- | --- | --- |
| Taste (`design-taste-frontend`) | [taste-skill](taste-skill/SKILL.md) | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| GSAP core | [gsap-core](gsap-core/SKILL.md) | [GreenSock](https://github.com/greensock/gsap-skills) |
| GSAP React | [gsap-react](gsap-react/SKILL.md) | GreenSock |
| GSAP performance | [gsap-performance](gsap-performance/SKILL.md) | GreenSock |
| GSAP ScrollTrigger | [gsap-scrolltrigger](gsap-scrolltrigger/SKILL.md) | GreenSock |
| React Best Practices (`vercel-react-best-practices`) | [react-best-practices](react-best-practices/SKILL.md) | [Vercel](https://github.com/vercel-labs/agent-skills) |
| Impeccable, review-only | [impeccable](impeccable/SKILL.md) | [Paul Bakaus](https://github.com/pbakaus/impeccable) |

| Skill | Use when | Source |
| --- | --- | --- |
| [coding-standards](coding-standards/SKILL.md) | Every code change; readability and project conventions | Existing repository skill, preserved |
| [git-commit](git-commit/SKILL.md) | The user explicitly requests staging or committing | Existing repository skill, preserved |
| [shadcn](shadcn/SKILL.md) | Inspecting, composing or maintaining shadcn/Radix components | [shadcn/ui](https://github.com/shadcn/ui/tree/97ddbf4274ed09d02aa7fd34375f2cf1e48cbbf0/skills/shadcn) |
| [vercel-composition-patterns](vercel-composition-patterns/SKILL.md) | Refactoring complex React component APIs or shared state | [Vercel](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns) |
| [webapp-testing](webapp-testing/SKILL.md) | Local web interaction tests, screenshots and browser logs | [Anthropic](https://github.com/anthropics/skills/tree/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/webapp-testing) |
| [aspnet-core](aspnet-core/SKILL.md) | Explicitly requested work on the existing ASP.NET Core backend | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/aspnet-core) |
| [security-best-practices](security-best-practices/SKILL.md) | An explicit security review or secure-by-default request for Python/JavaScript/TypeScript | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices) |
| [systematic-debugging](systematic-debugging/SKILL.md) | Investigating a bug, failing test or unexpected behavior before proposing a fix | [Superpowers](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/systematic-debugging) |
| [test-driven-development](test-driven-development/SKILL.md) | Adding or changing behavior with a failing test, minimal implementation and regression checks | [Superpowers](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/test-driven-development) |
| [verification-before-completion](verification-before-completion/SKILL.md) | Checking fresh evidence before claiming a change is fixed, tested or complete | [Superpowers](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/verification-before-completion) |
| [gh-fix-ci](gh-fix-ci/SKILL.md) | An explicit request to investigate or fix failing GitHub Actions PR checks | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/gh-fix-ci) |
| [security-threat-model](security-threat-model/SKILL.md) | An explicit request to map trust boundaries, attack paths and mitigations from repository evidence | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model) |
| [docker-patterns](docker-patterns/SKILL.md) | Requested Dockerfile, Compose, networking, volume or container-development work | [ECC community](https://github.com/affaan-m/ECC/tree/ef648e01899ba3e8dc6371642deaaf64b4477775/skills/docker-patterns) |
| [api-design](api-design/SKILL.md) | Designing or reviewing REST contracts, validation, pagination, errors and versioning | [ECC community](https://github.com/affaan-m/ECC/tree/ef648e01899ba3e8dc6371642deaaf64b4477775/skills/api-design) |
| [pytorch-patterns](pytorch-patterns/SKILL.md) | Requested PyTorch training, evaluation, model or data-loading work | [ECC community](https://github.com/affaan-m/ECC/tree/ef648e01899ba3e8dc6371642deaaf64b4477775/skills/pytorch-patterns) |

The thirteen third-party packages in the original table were installed on 2026-10-07 with the official `skill-installer` helper, including their reference files and assets where provided. Together with the two preserved skills, that batch contained fifteen skills. The seven UI packages above were added with the same helper on 2026-10-08. Exact source commits and installation dates are recorded in [installed_skills.json](installed_skills.json). Upstream skill instructions were not rewritten.

## Project boundaries

- System/developer instructions and explicit user scope still apply. Installing a skill does not grant tool permissions, authorize deployment, or expand the classification-only project scope.
- Preserve existing code, labels, dataset splits, model versions, experiment IDs and measured results. Do not upgrade React, Next.js, .NET, dependencies or infrastructure just because an upstream example uses a newer version.
- UI direction and fixes remain governed by Taste, React Best Practices and `DESIGN.md`. Impeccable remains **review-only**: audit/critique, never craft/polish/animate commands that edit the UI. shadcn and composition guidance supplement this workflow; they do not replace its visual decisions.
- Run frontend-specific commands from `frontend/`, where `components.json` and `package.json` live. Use the configured pnpm runner. Reuse existing shadcn components; inspect proposed changes before adding or updating. Do not reset presets, replace tokens, switch Radix to another primitive library, or overwrite customized components without explicit approval. Do not mass-refactor unrelated forms to match new upstream examples.
- `webapp-testing` is a test-workflow package, not a browser installation. Playwright/runtime dependencies were not installed. Use only browser/computer tools permitted by the active environment; a skill's Python or shell example never bypasses those restrictions. Avoid starting a duplicate server on an occupied port. Use test data, not destructive actions on real accounts.
- `security-best-practices` has Python and JavaScript/TypeScript guidance, but does not claim C# coverage. Use the ASP.NET Core security references for the .NET backend. A review request authorizes a report, not automatic remediation or production changes.
- Write task evidence under `docs/reports/<existing-Jira-key>/`, linked from that directory's README, rather than the skill's generic root-level report filename. Never invent a Jira key or reviewer.
- No automatic staging, commits, pushes, history rewriting, secret access, hooks, MCP connections or publishing. Request the relevant authorization when a task actually requires them.

## Debugging, testing, CI and threat-model boundaries

- This is a selected set of standalone Superpowers skills, not installation of the full plugin. No session hooks, automatic delegation, worktrees or branch-finishing workflows were installed. References to `superpowers:test-driven-development` and `superpowers:verification-before-completion` mean the corresponding local skills in this directory; no extra plugin is required to read them.
- Investigate first, then fix only within the requested scope. A diagnosis-only request does not authorize implementation or adding instrumentation to application code. Do not copy upstream examples that dump environment variables, credentials, signing identities or private payloads. Use redacted diagnostics or presence-only checks for specifically relevant settings.
- TDD never authorizes deleting pre-existing or user-owned code. Preserve the dirty worktree; add characterization/regression coverage for existing code, and use red-green-refactor for new behavior. Any temporary reversal for a red-green check must be limited to the agent's own isolated change and restored without destructive Git operations. If a skill instruction cannot be followed without risking existing work, explain the conflict and ask before proceeding.
- Use the project's existing test runners and directory conventions: frontend pnpm/Vitest, the existing backend test setup, and the prescribed Python tests. Do not install another test framework, run training against real datasets, or require production services merely to follow an upstream example. Run the complete relevant verification command; state exactly which suites ran and what remains unverified. Do not expand the task to fix unrelated failures without approval.
- `verification-before-completion` requires fresh evidence for the actual claim. A test run is not a visual review, a lint pass is not a successful build, and a skill-file integrity check is not an application test. If tools are unavailable, report that limit rather than claiming success.
- `gh-fix-ci` does not create CI workflows or grant GitHub access. Use it only for requested GitHub Actions failures, with the existing authorized `gh` session. If authentication is missing, ask the user to authenticate; never request tokens in chat or broaden account permissions automatically. Present the fix plan and obtain the approval required by the skill before implementing. An unavailable `create-plan` skill is not a blocker: use the documented inline-plan fallback. Do not rerun workflows, open PRs, post comments or change remote settings merely because the skill is installed.
- `security-threat-model` is distinct from a coding security checklist: it models evidenced architecture and abuse paths. Activate only on explicit request, validate material deployment/authentication assumptions with the user, and separate findings from hypothetical risks. It does not authorize live attacks, production probing, deployment or remediation. Follow the report-location rule above instead of creating a generic report at the repository root.
- Bundled Bash and Python helpers are reference tools, not startup scripts. Inspect a helper before running it, verify its platform and exact targets, and request any required permission. Never translate a destructive Bash example into an unchecked Windows command.

## Docker, API and PyTorch boundaries

- These three ECC packages are community instructions, not official Docker/PyTorch documentation or installation of the full ECC plugin. Installing them does not install Docker, PyTorch, CUDA, dependencies, hooks, MCP servers or the ECC CLI. No containers, migrations or training jobs are started during skill installation.
- `docker-patterns`: inspect the existing Compose project, services, ports and volumes before acting. Preserve data volumes and unrelated containers. Examples such as `docker compose down -v`, `docker system prune` and forced container removal are not maintenance defaults; require explicit authorization for the exact destructive targets. Do not expose database/debug ports, pass host credentials, replace the package manager or upgrade base images just to match an example. ECC-specific `docker/plugin-setup/` paths and commands belong to the upstream repository, not AgriAI. Do not introduce Kubernetes, ECS or Swarm solely because of the upstream anti-pattern list; use the project's approved deployment scope and requirements.
- `api-design`: preserve existing routes, DTO field names, response envelopes, authentication behavior and frontend/inference consumers. Generic `/api/v1/`, casing, rate limits and deprecation schedules are examples, not migration instructions. Any breaking contract change needs explicit agreement and relevant contract tests. Use `aspnet-core` for .NET implementation details; do not introduce Django, Go or Next.js API handlers merely because the skill demonstrates them. A review request does not authorize endpoint changes.
- `pytorch-patterns`: preserve ConvNeXt-Tiny, class mappings, dataset splits/versions, preprocessing, agreed seeds, metrics and experiment IDs. Do not replace the model with the sample CNN, reinitialize pretrained weights, drop validation/test samples, or alter optimization/training settings to match generic snippets. AMP, compilation and DataLoader workers must match the installed PyTorch/CUDA versions, Windows behavior and available hardware; performance claims need measurements. Keep checkpoints and generated data out of Git, avoid untrusted checkpoints, and do not launch costly training or overwrite experiment artifacts without authorization. Apply the existing `ai/` directory and test conventions.

## Existing machine-level UI skills

The current workstation also provides `design-taste-frontend`, `vercel-react-best-practices`, `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger` and `impeccable`. Those machine-level copies were left untouched. As of 2026-10-08, this repository includes its own pinned copies, so another workstation no longer needs to copy these seven instruction packages separately. Do not load both copies for the same task; use the repository-local package and its base directory when available. A client may need the next turn or a project/session reload to refresh discovery.

Installing these packages does not install GSAP/React npm dependencies or enable Impeccable hooks, agent delegation, image generation, browser automation or the Impeccable engine. Its launcher can download an engine on first use; inspect it and obtain any required network/execution approval then. Use Impeccable only for the already-approved review workflow; its editing commands and recommendations never override DESIGN.md. Taste and React Best Practices implement fixes; GSAP motion remains constrained by the design rules. Preserve MIT licenses for Taste/GSAP, Vercel's MIT declaration, and Impeccable's Apache-2.0 LICENSE/NOTICE.

Do not install the retired `next-best-practices` package from its old repository. [Vercel's migration notice](https://github.com/vercel-labs/next-skills/blob/main/README.md) directs Next.js 16.3+ reference knowledge to framework-bundled documentation. This installation does not enable generated agent rules or alter `next.config.ts`.

## Verification and updates

- Validate each package's `SKILL.md` front matter, local references and bundled assets after installation. Inspect executable helpers before granting additional execution permissions; installation alone is not a full security audit.
- No bundled helper, app migration or browser automation is run just to register these skills.
- Keep licenses and author attribution. shadcn's root `LICENSE.md` is included with its skill; Vercel's manifest declares MIT. OpenAI and Anthropic packages retain their bundled `LICENSE.txt` files.
- Each selected Superpowers skill includes a copy of the upstream root MIT `LICENSE`, with Jesse Vincent's copyright notice, from the same pinned commit as its instructions.
- Each selected ECC skill includes a copy of the upstream root MIT `LICENSE`, with Affaan Mustafa's copyright notice, from the same pinned commit as its instructions.
- Review upstream changes before updates. The installer refuses to overwrite an existing destination; do not delete existing skill folders just to bypass that safeguard. Keep repository-specific guidance here and preserve the source commit record.

Repository-local skills follow the [official OpenAI repository workflow](https://developers.openai.com/blog/skills-agents-sdk). Newly installed skills are available from the next turn; if a client has not refreshed its skill inventory, reopen the project/session.
