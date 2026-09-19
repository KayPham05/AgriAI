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
- The branch **MUST** start from `develop` and target `develop`, except releases that target `main`.
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

## 4. Task Completion Report

Before or together with pull request creation, every member **MUST** add a short report at:

```text
docs/task-logs/AGRI-XXX-<member>.md
```

Example: `docs/task-logs/AGRI-24-vinh.md`.

### Task Report Template

```markdown
# AGRI-XXX - <task-name>

- **Owner:**
- **Completion date:**
- **Branch:**
- **Pull request:**

## 1. Completed Work
[Summarize the completed work in three to five lines]

## 2. Main Changes
- ...
- ...

## 3. Results and Verification
[For code, record actual checks. For AI, record the experiment ID and measured metrics]

## 4. Issues or Blockers
[Record difficulties, blockers, or reviewer notes]

## 5. Remaining Work or Follow-up
[Record unfinished work or a concrete follow-up]
```

The report is required before moving the Jira issue to `Done`.

---

## 5. Submission Checklist

- [ ] Branch matches `AGRI-XXX-<short-description>`.
- [ ] Every atomic commit matches `<type>(<optional-scope>): AGRI-XXX <short-description>`.
- [ ] The task report exists under `docs/task-logs/`.
- [ ] The pull request uses the template and its title contains the Jira key.
- [ ] The correct domain reviewer is assigned.
- [ ] The diff contains no secret or credential.
