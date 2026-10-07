# AI: Python unit tests

Run from the root in a Python environment with the required test dependencies:

~~~powershell
$env:PYTHONPATH = (Get-Location).Path
python -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"
~~~

Unit tests do not validate a real checkpoint. Preserve dataset v1.4, the agreed 59-class mapping and fixed splits. Training/evaluation needs the corresponding artifacts; see [AGRI-21](../../docs/reports/AGRI-21/README.md) and [roadmap](../../docs/development_roadmap.md).

Base Compose does not run real FastAPI. Do not invent a startup command. Python branch coverage target is 80%, current CI floor is 40%; see [CI workflow](../../.github/workflows/ci.yml) for collection.
