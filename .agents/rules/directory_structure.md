# Directory Structure Rules

This document defines how to organize files and directories under `ai/`, `frontend/` and `docs/`.
Read it before creating any new file, directory, or report.

---

## 1. Layout

```text
AgriAI/
├── ai/
│   ├── data/              # Shared runtime: DataLoader, transforms, preprocessing
│   ├── tasks/
│   │   └── <agri_xx>/    # Task-specific offline scripts
│   │       └── scripts/
│   ├── tests/             # All AI tests, grouped by test level and concern
│   ├── configs/
│   ├── networks/
│   ├── utils/
│   ├── train.py
│   ├── evaluate.py
│   └── predict.py
├── docs/
│   ├── task-logs/         # Mandatory Jira completion reports
│   ├── reports/
│   │   └── <AGRI-XXX>/   # Technical evidence per task
│   ├── plans/
│   ├── notes/
│   ├── journals/
│   └── notebooks/
└── experiments/
    └── EXP-XXX/
```

---

## 2. Rules for `ai/`

User-approved layout on 2026-10-17 supersedes task-local test directories.

### 2.1. Runtime and offline source

- Shared runtime imported by train/evaluate/predict belongs in `ai/data/`,
  `ai/networks/`, `ai/utils/` or `ai/configs/`.
- `ai/data/` contains only `dataset.py`, `augmentations.py` and
  `image_preprocessing.py`; do not place scripts or tests there.
- Task-specific offline dataset scripts remain in `ai/tasks/<agri_xx>/scripts/`,
  with package markers in the task and scripts directories. Scripts use a main guard.
- Experiment scripts belong in `experiments/EXP-XXX/`.

### 2.2. All AI tests in `ai/tests/`

```text
ai/tests/
├── unit/
│   ├── data/
│   ├── inference/
│   ├── training/
│   └── tasks/agri_21/
├── integration/           # FastAPI with controlled model doubles
├── checkpoint/            # Explicit real-artifact acceptance tests
└── manual/                # Explicit hardware diagnostics
```

- Use package markers in every test directory so unittest discovery can recurse.
- Automated files use `test_*.py` and `unittest.TestCase`; the manual GPU diagnostic
  is `check_gpu.py` and runs only on request.
- Unit/HTTP integration tests use synthetic fixtures, not a real training dataset.
- Checkpoint tests run separately with verified local artifacts. Missing or wrong
  artifacts fail the explicit checkpoint run; do not label a skip as model acceptance.
- Keep tests out of `ai/tasks/*/tests` and out of the `ai/` root.

### 2.3. Imports and execution

Tests may import runtime modules and `ai.tasks.*.scripts.*`; runtime modules and
application entrypoints must never import test or offline task modules.
Set `PYTHONPATH` to the repository root and run from there:

```powershell
python -m unittest discover -s ai/tests/unit -t . -p "test_*.py"
python -m unittest discover -s ai/tests/integration -t . -p "test_*.py"
python -m unittest ai.tests.checkpoint.test_real_checkpoint -v
```

See `ai/tests/README.md` for artifact-backed and coverage commands. Python files use
snake_case; names must explain their purpose.

---

## 3. Rules for `docs/`

### 3.1. Directory selection

| Content | Directory | File name pattern |
|---|---|---|
| Jira task completion report | `task-logs/` | `AGRI-XXX-<member>.md` |
| Technical evidence for a task | `reports/AGRI-XXX/` | `README.md` + detail files |
| Implementation plan | `plans/` | `AGRI-XXX-<member>-plan.md` |
| Shared technical notes | `notes/` | `<topic>.md` |
| Daily development journal | `journals/` | `<member>-YYYY-MM-DD.md` |
| Exploratory notebook | `notebooks/` | `0X_<topic>.ipynb` |

### 3.2. `reports/AGRI-XXX/` structure

Each task has exactly one directory under `reports/`. Its `README.md` is the single entry point and must include:
- DoD status (complete or incomplete).
- Key results or metrics with their source files.
- Links to detail files in the same directory.
- Paths to the related source code under `ai/`.

```text
docs/reports/AGRI-21/
├── README.md
├── assets/
└── *.md
```

### 3.3. File naming

- Describe content, not the action: `dataset_v1_2_resize.md`, not `resize_done.md`.
- Include the version or Jira key: `dataset_v1_1_exact_dedup.md`, not `dedup.md`.
- No arbitrary sequence numbers: `preprocessing_compliance.md`, not `01_report.md`.
- No vague names: never use `final.md`, `new.md`, or similar.

### 3.4. Source references

Every technical report must state the related source file and cite a concrete evidence source (CSV, JSON, or a specific run) for every metric. Do not record estimated or inferred numbers without evidence.

---

## 4. Rules for `frontend/`

User-approved centralized layout on 2026-10-17 supersedes colocated test files.

- Application source stays under `frontend/src/`; all Vitest files live under
  `frontend/tests/{unit,component,integration,tooling}/`.
- Shared setup is `tests/setup.ts`; test-only helpers live in `tests/helpers/`.
- Use `@/` for application imports and relative paths for test helpers. Preserve
  original asset locations under `src/assets/`; update filesystem paths after moves.
- Unit covers services/data/utilities/metadata, component covers isolated rendered
  UI, integration covers app/admin/diagnosis composition, tooling covers rule probes.
- Full test/coverage commands discover all groups; directory-filter commands run
  individual groups. Coverage includes production `src/**`, not test helpers.
- These are Vitest/Testing Library tests, not browser E2E. See
  `frontend/tests/README.md` for commands and environment boundaries.

---

## 5. Pre-commit checklist

1. New Python file: classified under runtime/offline source or the centralized test layout in Section 2.
2. New task/test directory: required package markers created; tests live under `ai/tests/`.
3. New documentation file: directory chosen per Section 3.1, name follows Section 3.3.
4. New task report: `docs/reports/AGRI-XXX/README.md` created before adding detail files.
5. All tests pass: `unittest discover` runs clean with no failures.
