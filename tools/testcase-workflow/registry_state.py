"""Testcase registry, persisted state, and result artifacts."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from validate_results import validate_results

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "tools" / "testcase-workflow" / "config"
STATE = CONFIG / "state.json"
KINDS = {"api", "screen", "viewpoint"}
SENSITIVE_PATTERNS = (
    (re.compile(r"(?i)(authorization\s*:\s*bearer\s+)[^\s;]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(guestToken\s*[=:]\s*)[^;\s]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(access_token\s*[=:]\s*)[^;\s]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)(private_key\s*[=:]\s*)[^;\s]+"), r"\1[REDACTED]"),
)


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
    run_id: str = ""
    evidence_kind: str = "execution"
    group: str = ""
    exit_code: int | None = None
    duration_seconds: float | None = None
    selector: str = ""


def read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


@contextmanager
def state_lock():
    lock_path = STATE.with_suffix(".lock")
    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise RuntimeError(f"state lock exists: {lock_path}") from error
    try:
        os.close(descriptor)
        yield
    finally:
        lock_path.unlink(missing_ok=True)


def normalize_tab_name(value: str) -> str:
    clean = " ".join(str(value).strip().split())
    if len(clean) <= 100:
        return clean
    suffix = hashlib.sha1(clean.encode("utf-8")).hexdigest()[:8]
    return f"{clean[:91]}-{suffix}"


def redact_sensitive(value: str) -> str:
    redacted = str(value)
    for pattern, replacement in SENSITIVE_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def normalize_case(case: dict[str, Any]) -> dict[str, Any]:
    kind = str(case.get("kind", "")).strip().lower()
    if kind not in KINDS:
        raise ValueError(f"unsupported testcase kind: {kind!r}")
    detail_tab = case.get("detail_tab", case.get("tab"))
    expected = case.get("expected_result", case.get("expected", ""))
    normalized = dict(case)
    normalized.update({
        "kind": kind,
        "detail_tab": normalize_tab_name(detail_tab or case["id"]),
        "expected_result": str(expected),
        "requirement_refs": case.get("requirement_refs", case.get("requirement", [])),
        "viewpoint_refs": case.get("viewpoint_refs", case.get("viewpoint", [])),
        "source_path": case.get("source_path", case.get("source_test", "")),
        "api_case_keys": case.get("api_case_keys", []),
    })
    normalized["tab"] = normalized["detail_tab"]
    normalized["expected"] = normalized["expected_result"]
    return normalized


def load_cases() -> list[dict[str, Any]]:
    cases = [normalize_case(case) for case in read_json(CONFIG / "cases.json")["cases"]]
    seen: set[str] = set()
    duplicates: list[str] = []
    for case in cases:
        if case["id"] in seen:
            duplicates.append(case["id"])
        seen.add(case["id"])
    if duplicates:
        raise ValueError(f"duplicate case IDs: {', '.join(duplicates)}")
    return cases


def deprecated_case_ids(previous_cases: dict[str, Any], current_cases: list[dict[str, Any]]) -> list[str]:
    current_ids = {case["id"] for case in current_cases}
    return sorted(case_id for case_id in previous_cases if case_id not in current_ids)


def load_previous_cases_from_git() -> dict[str, dict[str, Any]]:
    """Reconstruct previous cases.json snapshot from Git when local state.json lacks cases."""
    rel_path = "tools/testcase-workflow/config/cases.json"
    before_push = os.getenv("AGRIVISION_CASES_BEFORE_SHA", "").strip()
    if before_push:
        if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", before_push):
            raise RuntimeError("Invalid previous push commit SHA")
        if not before_push.strip("0"):
            return {}
        ref = before_push
        commit = subprocess.run(
            ["git", "cat-file", "-e", f"{ref}^{{commit}}"],
            cwd=ROOT,
            capture_output=True,
            check=False,
        )
        if commit.returncode != 0:
            raise RuntimeError(f"Cannot read previous push commit {ref} from local Git history")
    else:
        dirty = subprocess.run(
            ["git", "diff", "--quiet", "--", rel_path],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        ref = "HEAD" if dirty.returncode == 1 else "HEAD^1"
    show = subprocess.run(
        ["git", "show", f"{ref}:{rel_path}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if show.returncode != 0 or not show.stdout.strip():
        return {}
    try:
        payload = json.loads(show.stdout)
    except json.JSONDecodeError:
        return {}
    return {
        normalized["id"]: normalized
        for item in payload.get("cases", [])
        for normalized in [normalize_case(item)]
    }


def load_sheets() -> dict[str, dict[str, Any]]:
    sheets = read_json(CONFIG / "sheets.json")["spreadsheets"]
    if set(sheets) != KINDS:
        raise ValueError(f"sheets.json must contain exactly {sorted(KINDS)}")
    return sheets


def import_results(root: Path) -> None:
    summary = validate_results(root)
    state = read_json(STATE) if STATE.exists() else {"schema_version": 2, "cases": {}, "runs": []}
    latest = state.setdefault("latest_results", {})
    for result in summary["cases"]:
        latest[result["id"]] = result
    state["runs"] = (state.get("runs", []) + summary["cases"])[-200:]
    write_json_atomic(STATE, state)


def record_result(result: CaseResult) -> None:
    with state_lock():
        state = read_json(STATE) if STATE.exists() else {"schema_version": 2, "cases": {}, "runs": []}
        state.setdefault("latest_results", {})[result.id] = asdict(result)
        state.setdefault("runs", []).append(asdict(result))
        state["runs"] = state["runs"][-200:]
        write_json_atomic(STATE, state)


def emit_result(result: CaseResult) -> None:
    result_dir = os.getenv("AGRIVISION_RESULT_DIR")
    if result_dir:
        output_dir = Path(result_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "results.json"
        payload = {
            "schema_version": 1,
            "run_id": os.getenv("GITHUB_RUN_ID", result.run_id),
            "commit_sha": os.getenv("GITHUB_SHA", ""),
            "job": os.getenv("GITHUB_JOB", result.group),
            "cases": [],
        }
        if output_path.exists():
            payload = read_json(output_path)
        payload.setdefault("cases", []).append(asdict(result))
        write_json_atomic(output_path, payload)
    try:
        record_result(result)
    except OSError:
        if not result_dir:
            raise
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
