"""Run live system E2E runners and emit a testcase-shaped JSON report."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

E2E_DIR = Path(__file__).resolve().parent
RUNNERS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("live_smoke.py", "LIVE-CAT-SMOKE", ("E2E-CAT-01", "E2E-CAT-02", "E2E-CAT-03", "E2E-CAT-04", "E2E-SYS-01", "E2E-SYS-02", "E2E-SYS-04", "E2E-HOME-01", "E2E-HOME-02", "E2E-HOME-03", "E2E-HOME-04", "E2E-AUTH-06", "E2E-DIAG-01", "E2E-DIAG-07")),
    ("live_account.py", "LIVE-ACCOUNT", ("E2E-AUTH-01", "E2E-AUTH-03", "E2E-AUTH-04", "E2E-PROF-01", "E2E-PROF-02", "E2E-HIST-06")),
    ("live_diagnosis.py", "LIVE-DIAGNOSIS", ("E2E-AUTH-02", "E2E-DIAG-02", "E2E-DIAG-03", "E2E-DIAG-05", "E2E-HIST-01", "E2E-HIST-02", "E2E-HIST-03")),
    ("live_prediction_profile.py", "LIVE-PREDICTION-PROFILE", ("E2E-PROF-AGRI-03",)),
    ("live_agricultural_profile.py", "LIVE-AGRICULTURAL-PROFILE", ("E2E-PROF-AGRI-01", "E2E-PROF-AGRI-02")),
    ("live_admin.py", "LIVE-ADMIN", ("E2E-ADM-01", "E2E-ADM-02", "E2E-ADM-03", "E2E-ADM-04", "E2E-ADM-06")),
    ("live_catalog_admin.py", "LIVE-CATALOG-ADMIN", ("E2E-ADM-07",)),
    ("live_email_auth.py", "LIVE-EMAIL-AUTH", ("E2E-AUTH-05", "E2E-AUTH-07", "E2E-PROF-03", "E2E-PROF-04")),
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run live AgriAI system E2E tests.")
    parser.add_argument("--json-report", type=Path)
    args = parser.parse_args()
    records: list[dict[str, object]] = []
    started = time.monotonic()
    meta = {
        "base_url": "http://localhost:3000",
        "build_mode": "docker-compose-production",
        "browser": "chromium-headless",
        "viewport": "1280x900 (responsive: 768x900, 375x900)",
        "api_mode": "real-backend-postgres",
        "ai_mode": "real-fastapi-convnext-tiny",
        "smtp_mode": "mailpit-docker",
    }
    for filename, runner_id, case_ids in RUNNERS:
        command = [sys.executable, str(E2E_DIR / filename)]
        result = subprocess.run(command, cwd=E2E_DIR.parents[3], check=False)
        status = "Passed" if result.returncode == 0 else "Failed"
        for case_id in case_ids:
            records.append({"id": case_id, "runner": runner_id, "status": status})
        if result.returncode != 0:
            if args.json_report:
                args.json_report.parent.mkdir(parents=True, exist_ok=True)
                args.json_report.write_text(
                    json.dumps(
                        {
                            **meta,
                            "total": len(records),
                            "passed": sum(r["status"] == "Passed" for r in records),
                            "failed": sum(r["status"] == "Failed" for r in records),
                            "duration_seconds": round(time.monotonic() - started, 3),
                            "cases": records,
                        },
                        indent=2,
                    )
                    + "\n",
                    encoding="utf-8",
                )
            return result.returncode
    report = {
        **meta,
        "total": len(records),
        "passed": len(records),
        "failed": 0,
        "duration_seconds": round(time.monotonic() - started, 3),
        "cases": records,
    }
    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Live system E2E: {report['passed']}/{report['total']} mapped cases passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
