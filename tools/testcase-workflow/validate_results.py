#!/usr/bin/env python3
"""Validate testcase result artifacts before Google Sheets sync."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ALLOWED_STATUS = {"Passed", "Failed", "Blocked", "Skipped", "Deprecated"}
REQUIRED_RESULT_FIELDS = {"id", "status", "execution"}


def _load_result_file(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid result artifact {path}: {error}") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("cases"), list):
        raise ValueError(f"result artifact {path} must contain a cases list")
    return payload


def validate_results(root: Path, expected_ids: set[str] | None = None) -> dict[str, Any]:
    files = sorted(root.rglob("results.json"))
    if not files:
        raise ValueError(f"no results.json artifact found under {root}")

    seen: set[str] = set()
    cases: list[dict[str, Any]] = []
    for path in files:
        payload = _load_result_file(path)
        for index, case in enumerate(payload["cases"], start=1):
            if not isinstance(case, dict):
                raise ValueError(f"{path}: cases[{index}] must be an object")
            missing = REQUIRED_RESULT_FIELDS - set(case)
            if missing:
                raise ValueError(f"{path}: cases[{index}] missing {sorted(missing)}")
            case_id = str(case["id"]).strip()
            status = str(case["status"]).strip()
            if not case_id:
                raise ValueError(f"{path}: cases[{index}] has empty id")
            if status not in ALLOWED_STATUS:
                raise ValueError(f"{path}: {case_id} has invalid status {status!r}")
            if case_id in seen:
                raise ValueError(f"duplicate testcase result: {case_id}")
            seen.add(case_id)
            cases.append(case)

    if not cases:
        raise ValueError("result artifacts contain no testcase results")
    if expected_ids is not None:
        actual_ids = {case["id"] for case in cases}
        missing = sorted(expected_ids - actual_ids)
        if missing:
            raise ValueError(f"missing testcase results: {missing}")
    failed = [case["id"] for case in cases if case["status"] in {"Failed", "Blocked"}]
    return {"artifact_files": [str(path) for path in files], "case_count": len(cases), "failed_cases": failed, "cases": cases}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--expected-cases", type=Path)
    parser.add_argument("--expected-id", action="append", default=[])
    args = parser.parse_args()
    try:
        expected = set(args.expected_id) or None
        if args.expected_cases:
            payload = json.loads(args.expected_cases.read_text(encoding="utf-8"))
            expected = {str(case["id"]) for case in payload["cases"] if str(case.get("runner", "")) != ""}
        summary = validate_results(args.root, expected)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps({"valid": not summary["failed_cases"], "case_count": summary["case_count"], "failed_cases": summary["failed_cases"]}))
    return 1 if summary["failed_cases"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
