# Directory Structure Rules

This document defines how to organize files and directories under `ai/` and `docs/`.
Read it before creating any new file, directory, or report.

---

## 1. Layout

```text
AgriAI/
├── ai/
│   ├── data/              # Shared runtime: DataLoader, transforms, preprocessing
│   ├── tasks/
│   │   └── <agri_xx>/    # Task-specific offline scripts and tests
│   │       ├── scripts/
│   │       └── tests/
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

### 2.1. Where to place a new Python file

Answer each question in order until one applies:

1. Is it imported by `train.py`, `evaluate.py`, or `predict.py`?
   Place it in `ai/data/`, `ai/networks/`, `ai/utils/`, or `ai/configs/`.

2. Is it an offline script to build, audit, or clean a dataset for one Jira task?
   Place it in `ai/tasks/<agri_xx>/scripts/`.

3. Is it a unit test for scripts in `tasks/<agri_xx>/scripts/`?
   Place it in `ai/tasks/<agri_xx>/tests/`.

4. Is it an AI experiment script?
   Place it in `experiments/EXP-XXX/`.

### 2.2. `ai/data/` — Shared runtime only

Contains exactly three modules: `dataset.py`, `augmentations.py`, `image_preprocessing.py`.
Each must be importable by the training or inference entry points without pulling in any offline dependency.
Do not add scripts, audit tools, or test files here.

### 2.3. `ai/tasks/<agri_xx>/` — Task-specific scripts and tests

Create this directory only when a task needs offline scripts or dedicated tests.
The directory name must be lowercase with underscores to be a valid Python package (e.g., `agri_21`).
Each task directory requires `__init__.py` at three levels: the task root, `scripts/`, and `tests/`.

```text
ai/tasks/agri_21/
├── __init__.py
├── scripts/
│   ├── __init__.py
│   └── *.py             # Each script has if __name__ == "__main__"
└── tests/
    ├── __init__.py
    └── test_*.py        # unittest.TestCase; no real dataset dependency
```

### 2.4. Import rules

Allowed:
- `ai.tasks.*.scripts.*` imports from `ai.data.*`
- `ai.tasks.*.tests.*` imports from `ai.tasks.*.scripts.*`
- `ai.tasks.*.tests.*` imports from `ai.data.*`

Forbidden:
- `ai.data.*` imports from `ai.tasks.*`
- `ai.train`, `ai.evaluate`, `ai.predict` import from `ai.tasks.*`

Runtime modules must never depend on offline task scripts.

### 2.5. Naming

- All Python files use `snake_case.py`.
- Scripts in `tasks/<agri_xx>/scripts/` must have `if __name__ == "__main__"`.
- Test files must start with `test_` and subclass `unittest.TestCase`.
- Do not use vague names such as `utils.py`, `helper.py`, `temp.py`.

### 2.6. Running tests

```bash
# All tests for a task
PYTHONPATH=<repo_root> python -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"

# Single test file
PYTHONPATH=<repo_root> python -m unittest ai.tasks.agri_21.tests.test_build_resized_dataset
```

Always set `PYTHONPATH=<repo_root>` because all imports use the absolute `ai.*` form.

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

## 4. Pre-commit checklist

1. New Python file: classified and placed in the correct directory per Section 2.1.
2. New task directory: all three `__init__.py` files created.
3. New documentation file: directory chosen per Section 3.1, name follows Section 3.3.
4. New task report: `docs/reports/AGRI-XXX/README.md` created before adding detail files.
5. All tests pass: `unittest discover` runs clean with no failures.
