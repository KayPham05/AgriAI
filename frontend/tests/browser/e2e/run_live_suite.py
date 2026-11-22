"""Run each live journey with its own assertions and execution record."""

from __future__ import annotations

import argparse
import importlib
import json
import os
from pathlib import Path
import sys
import time
import unittest

E2E_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(E2E_DIR.parent))
from e2e.browser_results import StructuredResult

# Live journeys have independent IDs because their fixtures and scope differ from the UI registry.
JOURNEYS = {
    "LIVE-GUEST": "live_smoke",
    "LIVE-ACCOUNT": "live_account",
    "LIVE-DIAGNOSIS-HISTORY": "live_diagnosis",
    "LIVE-PREDICTION-PROFILE": "live_prediction_profile",
    "LIVE-AGRICULTURAL-PROFILE": "live_agricultural_profile",
    "LIVE-ADMIN-NAVIGATION-SEARCH": "live_admin",
    "LIVE-CATALOG-ADMIN": "live_catalog_admin",
    "LIVE-EMAIL-AUTH": "live_email_auth",
}


class LiveJourney(unittest.TestCase):
    def __init__(self, module, method="run", args=()):
        super().__init__()
        self.module = module
        self.method = method
        self.args = args

    def id(self):
        suffix = f"[{','.join(self.args)}]" if self.args else ""
        return f"e2e.{self.module}.{self.method}{suffix}"

    def __str__(self):
        return self.id()

    def runTest(self):
        module = importlib.import_module(f"e2e.{self.module}")
        getattr(module, self.method)(*self.args)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-report", type=Path)
    args = parser.parse_args()
    tests = {cid: LiveJourney(module) for cid, module in JOURNEYS.items()}
    tests["LIVE-DIAGNOSIS-HEALTHY"] = LiveJourney("live_diagnosis", "run_healthy")
    for route in ("plants", "diseases", "medicines", "knowledge"):
        tests[f"LIVE-CATALOG-{route.upper()}"] = LiveJourney("live_smoke", "run_catalog", (route,))
    id_map = {test.id(): cid for cid, test in tests.items()}
    started = time.monotonic()
    runner = unittest.TextTestRunner(
        verbosity=2, resultclass=lambda *args: StructuredResult(*args, id_map=id_map)
    )
    result = runner.run(unittest.TestSuite(tests.values()))
    records = result.records
    report = {
        "runner": "live",
        "base_url": os.getenv("E2E_BASE_URL") or os.getenv("BASE_URL") or "http://localhost:3000",
        "build_mode": "docker-compose-production",
        "browser": "chromium-headless",
        "api_mode": "real-backend-postgres",
        "ai_mode": "real-fastapi-convnext-tiny",
        "smtp_mode": "mailpit-docker",
        "total": result.testsRun,
        "passed": sum(r["status"] == "Passed" for r in records),
        "failed": sum(r["status"] == "Failed" for r in records),
        "skipped": sum(r["status"] == "Skipped" for r in records),
        "duration_seconds": round(time.monotonic() - started, 3),
        "cases": records,
    }
    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0 if result.wasSuccessful() and report["passed"] == len(tests) else 1


if __name__ == "__main__":
    raise SystemExit(main())
