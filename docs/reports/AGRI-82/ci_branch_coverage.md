# AGRI-82 — Local code coverage

Measured on 2026-10-09 before delivery commits, with the unchanged source and
coverage configuration on `main`. AGRI-82 retains that source on its feature
branch. All 162 component tests passed.

| Component | Tests passed | Lines covered | Line coverage | Branches covered | Branch coverage | Current CI floor |
|---|---:|---:|---:|---:|---:|---:|
| Backend | 33 unit + 33 PostgreSQL integration | 1081/1681 | 64.31% | 207/358 | 57.82% | 50% — PASS |
| Frontend | 31 | 287/1149 | 24.98% | 255/954 | 26.73% | 25% — PASS |
| Python | 65 | 1915/3538 | 54.13% | 502/1074 | 46.74% | 40% — PASS |

The target remains 80% branch coverage per component; none currently meets it.
Percentages above are computed from covered/total counts and rounded to two
decimals. Vitest text/JSON truncates and may display 26.72% instead of 26.73%.

## Backend assemblies

| Assembly | Line coverage | Branch coverage |
|---|---:|---:|
| AgriVision.API | 67.50% | 47.62% |
| AgriVision.Application | 55.41% | 70.39% |
| AgriVision.Domain | 92.94% | 100.00% |
| AgriVision.Infrastructure | 65.95% | 49.18% |

## Collection and scope

- Backend: `dotnet test backend/AgriVision.sln --no-restore --settings
  backend/coverage.runsettings --collect 'XPlat Code Coverage'`, then merge both
  reports with ReportGenerator. PostgreSQL is real; AI/storage test dependencies
  remain fake. Test assemblies and migrations are excluded by the existing rules.
- Frontend: all Vitest tests with V8 coverage and the existing include/exclude
  configuration in `frontend/vitest.config.mts`; all application `src` files are
  included, including files not exercised by tests.
- Python: Python 3.12 / PyTorch CPU in a disposable container, CI-pinned
  `ai/requirements_ci.txt`, and `coverage run -m unittest discover -s
  ai/tasks/agri_21/tests -p 'test_*.py'`. Existing `.coveragerc` includes runtime,
  training/evaluation and offline scripts while excluding tests and old stubs.

Fresh logs, TRX, raw Cobertura/XML and HTML reports are available locally under
the ignored `.cache/coverage/run-20261009-dzxaplww/` directory. No source, test,
exclude rule or threshold was changed to increase these results.

Coverage measures executed code, not model accuracy. The separate real-checkpoint
CLI/HTTP/browser smoke checks are not included in these percentages. These local
results do not establish GitHub Actions success.
