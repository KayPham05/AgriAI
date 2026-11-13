#!/usr/bin/env python3
"""Deterministic testcase sync/run workflow for AgriVision."""

from __future__ import annotations

import argparse
import json
import subprocess
from urllib.error import HTTPError, URLError
from urllib.request import urlopen
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sheets_client import SheetsClient

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "tools" / "testcase-workflow" / "config"
STATE = CONFIG / "state.json"


@dataclass(frozen=True)
class CaseResult:
    id: str
    status: str
    execution: str
    actual: str = ""
    command: str = ""
    evidence: str = ""
    blocker: str = ""
    run_at: str = ""


def read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_cases() -> list[dict[str, Any]]:
    return read_json(CONFIG / "cases.json")["cases"]


def sync(dry_run: bool, write_sheets: bool) -> None:
    cases = load_cases()
    seen: set[str] = set()
    duplicates: list[str] = []
    for case in cases:
        case_id = case["id"]
        if case_id in seen:
            duplicates.append(case_id)
        seen.add(case_id)
    if duplicates:
        raise SystemExit(f"duplicate case IDs: {', '.join(duplicates)}")

    state = read_json(STATE) if STATE.exists() else {"cases": {}, "runs": []}
    changes: list[dict[str, Any]] = []
    for case in cases:
        previous = state["cases"].get(case["id"])
        if previous is None:
            changes.append({"action": "add", "id": case["id"], "tab": case["tab"]})
        elif previous.get("tab") != case["tab"]:
            changes.append({"action": "move", "id": case["id"], "from": previous.get("tab"), "to": case["tab"]})
    print(json.dumps({"dry_run": dry_run, "case_count": len(cases), "changes": changes}, ensure_ascii=False, indent=2))
    if dry_run:
        return
    previous_cases = state.get("cases", {})
    state["cases"] = {**previous_cases, **{case["id"]: case for case in cases}}
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if write_sheets:
        sheets = read_json(CONFIG / "sheets.json")["spreadsheets"]
        client = SheetsClient()
        existing_ids: dict[str, set[str]] = {}
        for case in cases:
            sheet = sheets[case["kind"]]
            existing_ids.setdefault(case["tab"], client.first_column(sheet["id"], case["tab"]))
            if case["id"] in existing_ids[case["tab"]]:
                continue
            row = [case["id"], case["tab"], case.get("expected", ""), case.get("status", "Not run"), case.get("execution", "N/A")]
            client.append(sheet["id"], case["tab"], row)


def run_group(group_name: str) -> None:
    groups = read_json(CONFIG / "test-groups.json")["groups"]
    group = groups[group_name]
    command = [group["command"], *group["args"]]
    working_directory = ROOT / group["working_directory"]
    started = datetime.now(timezone.utc).isoformat()
    try:
        completed = subprocess.run(command, cwd=working_directory, text=True, capture_output=True, check=False, timeout=group.get("timeout_seconds", 600))
    except OSError as error:
        result = CaseResult(group_name, "Blocked", "Automation", blocker=str(error), command=" ".join(command), run_at=started)
    except subprocess.TimeoutExpired as error:
        result = CaseResult(group_name, "Blocked", "Automation", blocker=f"timeout after {group.get('timeout_seconds', 600)} seconds", command=" ".join(command), actual=(error.stdout or "")[-2000:], run_at=started)
    else:
        status = "Passed" if completed.returncode == 0 else "Failed"
        evidence = f"stdout={len(completed.stdout)} bytes; stderr={len(completed.stderr)} bytes"
        result = CaseResult(group_name, status, "Automation", actual=completed.stdout[-2000:], evidence=evidence, command=" ".join(command), run_at=started)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


def check_health(url: str) -> None:
    started = datetime.now(timezone.utc).isoformat()
    try:
        with urlopen(url, timeout=10) as response:
            body = response.read().decode("utf-8", errors="replace")
            status = "Passed" if response.status in {200, 503} else "Failed"
            result = CaseResult("API-HEALTH-01", status, "Automation", actual=f"HTTP {response.status}: {body[:1000]}", command=f"GET {url}", evidence="live HTTP response", run_at=started)
    except HTTPError as error:
        result = CaseResult("API-HEALTH-01", "Failed" if error.code not in {200, 503} else "Passed", "Automation", actual=f"HTTP {error.code}", command=f"GET {url}", evidence="live HTTP response", run_at=started)
    except (URLError, TimeoutError, OSError) as error:
        result = CaseResult("API-HEALTH-01", "Blocked", "Automation", blocker=str(error), command=f"GET {url}", run_at=started)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    sync_parser = subparsers.add_parser("sync")
    sync_parser.add_argument("--dry-run", action="store_true")
    sync_parser.add_argument("--sheets", action="store_true", help="append new cases through Google Sheets REST API")
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("group", choices=["api", "screen", "playwright"])
    health_parser = subparsers.add_parser("check-health")
    health_parser.add_argument("--url", default="http://localhost:5000/api/health")
    args = parser.parse_args()
    if args.command == "sync":
        sync(args.dry_run, args.sheets)
    elif args.command == "run":
        run_group(args.group)
    else:
        check_health(args.url)


if __name__ == "__main__":
    main()
