# AgriVision AI Working Rules

> Condensed rules covering naming, commits, pull requests, and task completion reports.

---

## 1. Naming Conventions

### 1.1. Jira Key

- Format: `AGRI-XXX`, for example `AGRI-23`.
- Every branch, commit, and pull request **MUST** include its Jira key.

### 1.2. Branch

```text
AGRI-XXX-<short-description>
```

- Keep the Jira key uppercase.
- Write the description in lowercase kebab-case without underscores or spaces.
- Keep the branch name short and specific.

| Correct | Incorrect |
|---|---|
| `AGRI-23-convnext-baseline` | `convnext` - missing Jira key |
| `AGRI-31-macro-f1-evaluation` | `AGRI_23_baseline` - uses underscores |
| `AGRI-42-fastapi-predict-endpoint` | `fix-bug` - unclear and missing Jira key |

### 1.3. Files by Language

| Area | Convention | Correct | Incorrect |
|---|---|---|---|
| Python | `snake_case.py` | `data_loader.py` | `DataLoader.py` |
| C# and .NET | `PascalCase.cs` | `PredictionController.cs` | `predictionController.cs` |
| React and TSX | `PascalCase.jsx/.tsx` | `DiseaseCard.jsx` | `disease_card.jsx` |
| Configuration | `snake_case.yaml/.json` | `class_mapping.json` | `ClassMapping.JSON` |
| Notebook | `0X_snake_case.ipynb` | `01_eda_dataset.ipynb` | `test.ipynb`, `final.ipynb` |

### 1.4. Experiments, Models, and Datasets

- Experiment ID: `EXP-XXX`, incremented and matched to `experiments/EXP-XXX/`.
- Model version: `convnext-tiny-v<major>.<minor>`, for example `convnext-tiny-v1.0`.
- Dataset version: `v<major>.<minor>`, for example `v1.0` or `v1.1`.

---

## 2. Commit Standard

### 2.1. Syntax

```text
<type>(<optional-scope>): AGRI-XXX <short-description>
```

- Follow Conventional Commits and place the Jira key at the start of the description.
- The scope is optional. Recommended scopes include `ai`, `docs`, `data`, and `api`.
- Omit the parentheses when no scope is used.

### 2.2. Allowed Types

| Type | Use |
|---|---|
| `feat` | Add a feature |
| `fix` | Fix a bug |
| `refactor` | Restructure code without changing behavior |
| `docs` | Update documentation only |
| `test` | Add or update tests |
| `chore` | Maintain configuration, dependencies, or `.gitignore` |
| `experiment` | Run an AI experiment or change hyperparameters |
| `style` | Change formatting without changing behavior |
| `perf` | Improve performance |
| `build` | Change the build system or dependencies |
| `ci` | Change CI or CD configuration |
| `revert` | Revert an earlier commit |

`experiment` is a project-specific extension. The remaining types follow `.agents/skills/git-commit/SKILL.md`.

### 2.3. Examples

Correct:

```text
feat(ai): AGRI-23 implement ConvNeXt-Tiny model definition
experiment(data): AGRI-24 add ColorJitter augmentation pipeline
test(ai): AGRI-31 add tests for Macro-F1 evaluation metric
```

Incorrect:

```text
update code                          # missing Jira key, type, and useful description
fix: update model                    # missing Jira key
AGRI-23 fix                          # not a Conventional Commit
feat(ai): AGRI-24 added and fixed... # combines work and does not use imperative mood
```

### 2.4. Principles

- Every commit **MUST** be atomic and contain one logical change.
- Use imperative mood and keep the subject under 72 characters when practical.
- Use either English or Vietnamese consistently within a commit.

---

## 3. Pull Requests

### 3.1. Required Conditions

- The title **MUST** contain the Jira key, for example `AGRI-23 Implement ConvNeXt baseline training`.
- The branch **MUST** start from `main` and target `main`.
- Authors **MUST NOT** approve their own pull requests.
- At least one reviewer from the relevant domain **MUST** approve the pull request.

### 3.2. Required Pull Request Template

```markdown
## Jira Issue
AGRI-XXX

## Summary
[Briefly explain the purpose of the pull request]

## Changes
- Add module X to ai/
- Update API endpoint Y

## Testing
- [x] Unit tests for module X pass
- [x] Manual local verification completed

## AI Experiment Information
- Experiment ID: EXP-XXX
- Dataset Version: vX.X
- Primary Metric: Macro-F1 0.885

## Checklist
- [ ] Code runs locally without errors
- [ ] Linting and formatting pass
- [ ] Relevant tests are included
- [ ] The diff contains no secret, API key, or password
- [ ] Related documentation is updated
```

Omit the AI experiment section only when it does not apply.

### 3.3. Review Ownership

| Pull Request Scope | Reviewer |
|---|---|
| `ai/` | Thanh Ngoc Huy, AI Lead, or Nguyen Quang Vinh, ML Engineer |
| `backend/` | Tran Trung Thong |
| `frontend/`, UI, or Data | Nguyen Pham Bao Khanh |

---

## 4. Ongoing Task Log & Completion Report

Before or together with pull request creation, every member **MUST** maintain a concise task log inside a directory named after the Jira key (never create `README.md` inside `docs/task-logs/AGRI-XXX/`):

```text
docs/task-logs/AGRI-XXX/AGRI-XXX-<short-topic-or-member>.md
```

Example: `docs/task-logs/AGRI-24/AGRI-24-vinh.md` or `docs/task-logs/AGRI-145/AGRI-145-testcase-workflow.md`.

### 4.1. Ongoing-Record Rules (Append-Only & Timestamped)

- **Top status block (max 4–5 lines, refreshable):** Keep `Owner`, `Branch`, `Report` link (`docs/reports/AGRI-XXX/README.md`), `Status` (`In Progress` | `Ready for PR` | `Done`), `Pull request`, and a one-line `Next / Blocker` at the top so readers see current state immediately. Only this summary header may be updated in place.
- **Append-only `## Log` (strictly chronological):** Write entries top-to-bottom from oldest to newest. **Never delete, squash, or rewrite past log entries** when adding a new update. Append a new entry at the bottom of `## Log`; if a prior entry needs correction, note the correction in a new timestamped entry (only broken links or file-path typos may be patched in place).
- **Mandatory date + hour timestamp:** Heading each entry **MUST** use local time with hours and minutes:
  `### [YYYY-MM-DD HH:MM +07:00] <Short action title>`
  (for example `### [2026-11-18 13:35 +07:00] Clean Sheets and verify full local suite`), so multiple updates on the same day stay distinct.
- **Short visual structure (`3–5` lines per entry):** Keep each entry to at most three bullets (`Changed`, `Verified`, `Remaining`). Never paste raw terminal output or long narratives; state exact checked counts/scopes (and any `Unrun`/`Blocked` scope) and link detailed evidence in `docs/reports/AGRI-XXX/README.md`.

### 4.2. Task Log Template

```markdown
# AGRI-XXX - <task-name>

- **Owner:** <name> | **Branch:** `AGRI-XXX-<short-description>` | **Pull request:** <link or pending>
- **Report:** [README.md](../../reports/AGRI-XXX/README.md) | **Status:** In Progress
- **Next / Blocker:** <1 concise line or None>

---

## Log (append-only; do not edit or delete past entries)

### [YYYY-MM-DD HH:MM +07:00] <Short milestone or batch title>
- **Changed:** `<path1>`, `<path2>` - <1 concise summary sentence>.
- **Verified:** `<command or scope>` passed (`X/Y`); Unrun/Blocked: `<scope or None>`.
- **Remaining:** <next concrete step or None>.

### [YYYY-MM-DD HH:MM +07:00] <Next update title>
- **Changed:** <what changed in this follow-up>.
- **Verified:** <fresh checks run after this change>.
- **Remaining:** <updated remaining work or None>.
```

The task log **MUST** be updated with the latest run/check before opening or updating a pull request and before moving the Jira issue to `Done`.

---

## 5. Submission Checklist

- [ ] Branch matches `AGRI-XXX-<short-description>`.
- [ ] Every atomic commit matches `<type>(<optional-scope>): AGRI-XXX <short-description>`.
- [ ] The task report exists inside `docs/task-logs/AGRI-XXX/` (without a `README.md`).
- [ ] The pull request uses the template and its title contains the Jira key.
- [ ] The correct domain reviewer is assigned.
- [ ] The diff contains no secret or credential.
