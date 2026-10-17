# AI tests

All AI tests live here. Runtime modules remain in `ai/data`, `ai/networks`,
`ai/configs`, `ai/utils` and the application entrypoints. Offline scripts remain in
`ai/tasks/<task>/scripts`; tests import them without moving production code.

| Directory | Scope | Artifacts required |
|---|---|---|
| `unit/data/` | Transforms, manifests, label/version mappings | Synthetic fixtures only |
| `unit/inference/` | Predictor logic with controlled logits/checkpoint fixtures | No trained checkpoint |
| `unit/training/` | Metrics, evaluation helpers and training schedule | Synthetic fixtures only |
| `unit/tasks/agri_21/` | Dataset audit/build/split/relabel scripts | Temporary fixtures only |
| `integration/` | FastAPI validation/contracts/errors with fake model | Python API dependencies |
| `checkpoint/` | Real trusted checkpoints, direct/HTTP parity and catalog | Two pinned local checkpoints |
| `manual/` | Explicit GPU environment diagnostic; not an automated suite | Compatible CUDA GPU |

From repository root with existing Python dependencies and `PYTHONPATH` set to the
repository root:

```powershell
python -m unittest discover -s ai/tests/unit -t . -p "test_*.py"
python -m unittest discover -s ai/tests/integration -t . -p "test_*.py"
python -m unittest ai.tests.checkpoint.test_real_checkpoint -v
```

The checkpoint command fails if the required artifacts are missing or have the
wrong SHA-256. It does not download or train models and does not measure accuracy.
`python -m unittest discover -s ai/tests -t .` includes every automated group,
including checkpoint tests, and therefore needs those artifacts.

Run the hardware diagnostic explicitly with `python -m ai.tests.manual.check_gpu`.
CPU CI does not run this GPU diagnostic. Its status messages are not an automated
training-readiness acceptance result.

For merged unit/integration branch coverage, reuse `.coveragerc`:

```powershell
python -m coverage run -m unittest discover -s ai/tests/unit -t . -p "test_*.py"
python -m coverage run --append -m unittest discover -s ai/tests/integration -t . -p "test_*.py"
python -m coverage xml
```

Keep generated reports, fixtures and checkpoints outside Git. See
[system QA report](../../docs/reports/AGRI-127/system_qa.md) for the migration record
and actual verification; dated reports mentioning old test paths remain historical.
