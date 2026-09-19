# AgriVision AI

These instructions apply to the entire repository.

## Project

- Build an end-to-end plant leaf disease classification system using ConvNeXt-Tiny.
- Keep classification as the core scope. Add detection, segmentation, severity estimation, backend, or frontend only when explicitly requested.

## Directory structure

```text
ai/                 Training, evaluation, inference, and AI utilities
experiments/        Versioned experiment records under EXP-XXX
docs/               Project documentation and task logs
.agents/rules/      Repository-specific rules
.agents/skills/     Reusable agent skills
.agents/workflows/  Reusable workflows
```

- Keep datasets, checkpoints, generated outputs, caches, and secrets out of Git.

## Conventions

- Follow `.agents/rules/project_rules.md` for naming, Jira, commits, pull requests, reviewers, and task reports.
- Use `snake_case.py` for Python, `EXP-XXX` for experiments, `v<major>.<minor>` for datasets, and `convnext-tiny-v<major>.<minor>` for models.
- Prefer readable, typed, minimal code; reuse existing modules before adding abstractions or dependencies.
- Preserve agreed labels, dataset splits, versions, experiment IDs, and metric semantics.

## Important rules

- Read every relevant file in `.agents/rules/` and the complete `SKILL.md` of each matching skill before acting.
- Always use `coding-standards` for code changes; use `git-commit` only when staging or committing is explicitly requested.
- Make the smallest complete change, preserve unrelated work, and run the smallest relevant verification.
- Do not invent Jira keys, owners, reviewers, branches, metrics, or experiment results.
- Do not commit, push, rewrite history, or perform destructive Git operations unless explicitly requested.
- Explicit user instructions take precedence; report any necessary deviation from repository rules.
