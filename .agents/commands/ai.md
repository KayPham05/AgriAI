# AI: centralized Python tests

All AI tests live under `ai/tests/`; offline scripts stay under `ai/tasks/*/scripts`.
Run from repository root in a Python environment with the existing dependencies:

~~~powershell
$env:PYTHONPATH = (Get-Location).Path
python -m unittest discover -s ai/tests/unit -t . -p "test_*.py"
python -m unittest discover -s ai/tests/integration -t . -p "test_*.py"
~~~

Unit tests use synthetic data. HTTP integration tests use fake models; they do not
establish real checkpoint acceptance. Run artifact-backed tests explicitly:

~~~powershell
python -m unittest ai.tests.checkpoint.test_real_checkpoint -v
~~~

This requires the existing verified plant/disease checkpoints, fails on missing or
wrong artifacts, and does not download or train a model. See
[test layout and commands](../../ai/tests/README.md) and
[checkpoint/security verification](../../docs/reports/AGRI-127/checkpoint_security_testing.md).
The hardware diagnostic runs explicitly with `python -m ai.tests.manual.check_gpu`.

For branch coverage, reuse `.coveragerc`:

~~~powershell
python -m coverage run -m unittest discover -s ai/tests/unit -t . -p "test_*.py"
python -m coverage run --append -m unittest discover -s ai/tests/integration -t . -p "test_*.py"
python -m coverage xml
~~~

Preserve dataset v1.4, the 59-class mapping, fixed splits and metric semantics.
Python branch target remains 80%, existing CI floor 40%; do not confuse passing
smoke/contract checks with measured accuracy. Base Compose uses real CPU FastAPI;
follow [Docker startup](docker.md) and explicit migration rules.
