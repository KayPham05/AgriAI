#!/usr/bin/env python3
"""Deterministic testcase generation, execution and Google Sheets sync."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import subprocess
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sheets_client import SheetsClient

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


def load_sheets() -> dict[str, dict[str, Any]]:
    sheets = read_json(CONFIG / "sheets.json")["spreadsheets"]
    if set(sheets) != KINDS:
        raise ValueError(f"sheets.json must contain exactly {sorted(KINDS)}")
    return sheets


def build_sheet_row(case: dict[str, Any], mapping: dict[str, str], result: dict[str, Any] | None = None) -> list[str]:
    result = result or {}
    fields = {
        "id": case["id"], "detail_tab": case["detail_tab"], "kind": case.get("kind", ""),
        "item": case.get("item", "Prediction"),
        "test_name": case.get("name", case.get("expected_result", "")),
        "precondition": case.get("precondition", "System under test is available"),
        "test_data": case.get("test_data", "Configured fixture/input"),
        "params": case.get("params", ""),
        "request_body": case.get("request_body", ""),
        "expected_status": case.get("expected_status", ""),
        "expected_body": case.get("expected_body", case.get("expected_result", "")),
        "expected_database": case.get("expected_database", ""),
        "system": case.get("system", "AgriVision AI"),
        "major": case.get("major", "Prediction"),
        "middle": case.get("middle", "Upload ảnh"),
        "minor": case.get("minor", case.get("expected_result", "")),
        "confirmation": case.get("confirmation", case.get("expected_result", "")),
        "main_category": case.get("main_category", "Prediction"),
        "sub_category": case.get("sub_category", "Diagnosis"),
        "type": case.get("type", "Function"),
        "test_description": case.get("test_description", case.get("expected_result", "")),
        "steps": case.get("steps", "Execute configured testcase"),
        "requirement_refs": ", ".join(map(str, case.get("requirement_refs", []))),
        "viewpoint_refs": ", ".join(map(str, case.get("viewpoint_refs", []))),
        "source_path": case.get("source_path", ""), "expected_result": case.get("expected_result", ""),
        "status": result.get("status", case.get("status", "Not run")),
        "execution": result.get("execution", case.get("execution", "N/A")),
        "actual": redact_sensitive(result.get("actual", case.get("actual", ""))),
        "evidence": redact_sensitive(result.get("evidence", case.get("evidence", ""))),
        "run_id": result.get("run_id", ""), "run_at": result.get("run_at", ""),
    }
    indexes = {column: column_number(column) - 1 for column in mapping.values()}
    row = [""] * (max(indexes.values(), default=-1) + 1)
    for field, column in mapping.items():
        row[indexes[column]] = str(fields.get(field, ""))
    return row


def column_number(column: str) -> int:
    value = 0
    for char in column.upper():
        value = value * 26 + ord(char) - 64
    return value


def column_name(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def upsert_row(client: SheetsClient, spreadsheet_id: str, tab_name: str, case: dict[str, Any], mapping: dict[str, str], result: dict[str, Any] | None = None, detail_mode: str = "table", data_start_row: int = 1) -> dict[str, Any]:
    id_column = mapping.get("id", "A")
    values = client.values(spreadsheet_id, tab_name, f"{id_column}:{id_column}")
    rows = [(index, str(row[0]).strip()) for index, row in enumerate(values, start=1) if row and str(row[0]).strip()]
    row = build_sheet_row(case, mapping, result)
    end_column = column_name(max(len(row), 1))
    for row_number, value in rows:
        if value == case["id"] or (detail_mode == "viewpoint_table" and case["id"] in value):
            if detail_mode == "viewpoint_table":
                return {"action": "unchanged", "tab": tab_name, "row": row_number}
            existing = client.values(spreadsheet_id, tab_name, f"A{row_number}:{end_column}{row_number}")
            prior = existing[0] if existing else []
            merged = [(new_value if new_value else (prior[index] if index < len(prior) else "")) for index, new_value in enumerate(row)]
            client.update(spreadsheet_id, tab_name, f"A{row_number}:{end_column}{row_number}", [merged])
            return {"action": "update", "tab": tab_name, "row": row_number}
    full_values = client.values(spreadsheet_id, tab_name, "A:Z")
    blank_row = next((index for index in range(data_start_row, len(full_values) + 1) if not any(str(cell).strip() for cell in full_values[index - 1])), None)
    if blank_row is not None:
        client.update(spreadsheet_id, tab_name, f"A{blank_row}:{end_column}{blank_row}", [row])
        return {"action": "add", "tab": tab_name, "row": blank_row}
    client.append(spreadsheet_id, tab_name, row)
    return {"action": "add", "tab": tab_name}


def calculate_summary_counts(cases: list[dict[str, Any]], latest: dict[str, Any]) -> dict[str, int]:
    counts = {"total": len(cases), "passed": 0, "failed": 0, "blocked": 0, "not_run": 0, "automation": 0, "manual": 0, "na": 0}
    for case in cases:
        result = latest.get(case["id"], {})
        status = str(result.get("status", case.get("status", "Not run"))).strip().lower().replace(" ", "_")
        execution = str(result.get("execution", case.get("execution", "N/A"))).strip().lower().replace("/", "_")
        if status in counts:
            counts[status] += 1
        if execution in counts:
            counts[execution] += 1
    return counts


def update_summary_dashboard(client: SheetsClient, spreadsheet_id: str, sheet: dict[str, Any], cases: list[dict[str, Any]], latest: dict[str, Any]) -> list[dict[str, Any]]:
    tab_name = sheet["summary_tab"]
    mapping = sheet["dashboard_mapping"]
    values = client.values(spreadsheet_id, tab_name, mapping["range"])
    headers = {str(cell).strip().casefold() for row in values[:6] for cell in row}
    required_headers = {"sheet name", "total testcase", "passed", "failed", "blocked", "not run"}
    if not required_headers.issubset(headers):
        raise RuntimeError(f"Summary tab {tab_name!r} header schema drift; refusing to write")
    grouped: dict[str, list[dict[str, Any]]] = {}
    for case in cases:
        grouped.setdefault(case["detail_tab"], []).append(case)
    metadata = next((item for item in client.sheet_metadata(spreadsheet_id) if item.get("title") == tab_name), None)
    if not metadata:
        raise RuntimeError(f"Summary tab {tab_name!r} was not found; refusing to write")
    used_rows = {str(row[column_number(mapping["sheet_name_column"]) - 1]).strip(): index for index, row in enumerate(values, start=1) if len(row) >= column_number(mapping["sheet_name_column"]) and str(row[column_number(mapping["sheet_name_column"]) - 1]).strip()}
    label_index = column_number(mapping.get("total_label_column", "A")) - 1
    total_row = next((index for index, row in enumerate(values, start=1) if len(row) > label_index and str(row[label_index]).strip().casefold() == mapping["total_label"].casefold()), None)
    if total_row is None:
        total_row = next((index for index, row in enumerate(values, start=1) if any(str(cell).strip().casefold() == mapping["total_label"].casefold() for cell in row)), None)
    if total_row is None:
        raise RuntimeError(f"Summary tab {tab_name!r} has no total row; refusing to corrupt dashboard")
    updates = []
    for detail_tab, detail_cases in grouped.items():
        counts = calculate_summary_counts(detail_cases, latest)
        row_number = used_rows.get(detail_tab)
        if row_number is None:
            row_number = next((index for index in range(mapping["data_start_row"], total_row) if index > len(values) or not str(values[index - 1][column_number(mapping["sheet_name_column"]) - 1] if len(values) >= index and len(values[index - 1]) >= column_number(mapping["sheet_name_column"]) else "").strip()), None)
            if row_number is None:
                client.insert_row(spreadsheet_id, int(metadata["sheetId"]), total_row)
                row_number = total_row
                total_row += 1
        name = detail_cases[0].get("summary_name") or detail_cases[0].get("test_selector") or detail_tab
        total = counts["total"]
        done = counts["passed"] + counts["failed"] + counts["blocked"]
        progress = f"{round(done / total * 100) if total else 0}%"
        status = "Test Done" if total and counts["not_run"] == 0 else "To do" if counts["not_run"] == total else "In progress"
        row = [detail_tab, name, total, counts["passed"], counts["failed"], counts["blocked"], counts["not_run"], counts["automation"], counts["manual"], counts["na"]]
        if mapping.get("status_column"):
            row.append(status)
        if mapping.get("progress_column"):
            row.append(progress)
        start = mapping["sheet_name_column"] + str(row_number)
        end = (mapping.get("progress_column") or mapping["na_column"]) + str(row_number)
        client.update(spreadsheet_id, tab_name, f"{start}:{end}", [row])
        updates.append({"detail_tab": detail_tab, "row": row_number, "status": status, "progress": progress})
    values = client.values(spreadsheet_id, tab_name, mapping["range"])
    total_values = []
    for column in (mapping["total_column"], mapping["passed_column"], mapping["failed_column"], mapping["blocked_column"], mapping["not_run_column"], mapping["automation_column"], mapping["manual_column"], mapping["na_column"]):
        index = column_number(column) - 1
        total_values.append(sum(int(str(row[index]).replace(",", "")) for row_index, row in enumerate(values, start=1) if row_index != total_row and len(row) > index and str(row[index]).replace(",", "").isdigit()))
    done = total_values[1] + total_values[2] + total_values[3]
    total_progress = f"{round(done / total_values[0] * 100) if total_values[0] else 0}%"
    client.update(spreadsheet_id, tab_name, f"{mapping['total_column']}{total_row}:{mapping['na_column']}{total_row}", [total_values])
    if mapping.get("status_column"):
        client.clear(spreadsheet_id, tab_name, f"{mapping['status_column']}{total_row}:{mapping['status_column']}{total_row}")
    if mapping.get("progress_column"):
        client.update(spreadsheet_id, tab_name, f"{mapping['progress_column']}{total_row}:{mapping['progress_column']}{total_row}", [[total_progress]])
    return updates


def update_summary_list(client: SheetsClient, spreadsheet_id: str, sheet: dict[str, Any], cases: list[dict[str, Any]], latest: dict[str, Any]) -> list[dict[str, Any]]:
    mapping = sheet["list_mapping"]
    tab_name = sheet["summary_tab"]
    values = client.values(spreadsheet_id, tab_name, "A1:E100")
    headers = {str(cell).strip().casefold() for cell in (values[0] if values else [])}
    if not {"sheet name", "status", "remarks"}.issubset(headers):
        raise RuntimeError(f"Summary tab {tab_name!r} list schema drift; refusing to write")
    sheet_column = column_number(mapping["sheet_name_column"]) - 1
    status_column = column_number(mapping["status_column"]) - 1
    remarks_column = column_number(mapping["remarks_column"]) - 1
    updates = []
    next_row = max(mapping["data_start_row"], len(values) + 1)
    for case in cases:
        result = latest.get(case["id"], {})
        status = result.get("status", case.get("status", "Not run"))
        evidence = redact_sensitive(result.get("evidence", case.get("evidence", "")))
        found = next((index for index, row in enumerate(values, start=1) if len(row) > sheet_column and case["detail_tab"] == str(row[sheet_column]).strip()), None)
        row_number = found or next_row
        if not found:
            next_row += 1
        if found:
            existing = values[row_number - 1]
            row = list(existing) + [""] * max(0, remarks_column + 1 - len(existing))
        else:
            row = [""] * (remarks_column + 1)
            row[sheet_column] = case["detail_tab"]
        row[status_column] = str(status)
        row[remarks_column] = evidence or case.get("expected_result", "")
        client.update(spreadsheet_id, tab_name, f"A{row_number}:E{row_number}", [row[:5]])
        updates.append({"detail_tab": case["detail_tab"], "row": row_number, "status": status})
    return updates


def validate_detail_schema(client: SheetsClient, spreadsheet_id: str, tab_name: str, mode: str) -> None:
    ranges = {
        "api_table": ("A13:M14", {"id", "item", "testcase name", "result", "excution"}),
        "screen_table": ("A13:K14", {"no.", "main category", "testing result", "excution"}),
        "viewpoint_table": ("A1:G2", {"no.", "đối tượng test", "mục xác nhận", "ghi chú"}),
    }
    a1, required = ranges.get(mode, ("A1:M5", set()))
    values = client.values(spreadsheet_id, tab_name, a1)
    headers = {str(cell).strip().casefold() for row in values for cell in row}
    if not required.issubset(headers):
        raise RuntimeError(f"Detail tab {tab_name!r} schema drift for {mode}; refusing to write")


def clear_template_case_rows(client: SheetsClient, spreadsheet_id: str, tab_name: str, start_row: int) -> None:
    values = client.values(spreadsheet_id, tab_name, "A:Z")
    for row_number in range(start_row, len(values) + 1):
        row = values[row_number - 1]
        if not any(str(cell).strip() for cell in row):
            break
        client.clear(spreadsheet_id, tab_name, f"A{row_number}:Z{row_number}")


def sync(dry_run: bool, write_sheets: bool) -> None:
    cases = load_cases()
    sheets = load_sheets()
    state = read_json(STATE) if STATE.exists() else {"schema_version": 2, "cases": {}, "runs": []}
    latest = state.get("latest_results", {})
    changes = []
    for case in cases:
        sheet = sheets[case["kind"]]
        previous = state.get("cases", {}).get(case["id"])
        action = "add" if previous is None else "move" if previous.get("detail_tab", previous.get("tab")) != case["detail_tab"] else "unchanged"
        changes.append({"id": case["id"], "kind": case["kind"], "detail_tab": case["detail_tab"], "summary_tab": sheet["summary_tab"], "action": action})
    print(json.dumps({"dry_run": dry_run, "case_count": len(cases), "changes": changes}, ensure_ascii=False, indent=2))
    if dry_run:
        return
    state["schema_version"] = 2
    state["cases"] = {**state.get("cases", {}), **{case["id"]: case for case in cases}}
    if not write_sheets:
        write_json_atomic(STATE, state)
        return
    if os.getenv("AGRIVISION_WRITE_SHEETS", "").lower() != "true":
        raise RuntimeError("Sheets write blocked. Set AGRIVISION_WRITE_SHEETS=true explicitly.")
    client = SheetsClient()
    grouped = {kind: [case for case in cases if case["kind"] == kind] for kind in KINDS}
    for case in cases:
        sheet = sheets[case["kind"]]
        result = latest.get(case["id"])
        detail_meta = client.ensure_sheet(sheet["id"], case["detail_tab"], sheet.get("template_tab"))
        if detail_meta.get("created"):
            clear_template_case_rows(client, sheet["id"], case["detail_tab"], sheet.get("detail_data_start_row", 1))
        validate_detail_schema(client, sheet["id"], case["detail_tab"], sheet.get("detail_mode", "table"))
        upsert_row(client, sheet["id"], case["detail_tab"], case, sheet["detail_mapping"], result, sheet.get("detail_mode", "table"), sheet.get("detail_data_start_row", 1))
    for kind, kind_cases in grouped.items():
        sheet = sheets[kind]
        if sheet.get("summary_mode") == "list":
            update_summary_list(client, sheet["id"], sheet, kind_cases, latest)
        else:
            update_summary_dashboard(client, sheet["id"], sheet, kind_cases, latest)
    write_json_atomic(STATE, state)


def record_result(result: CaseResult) -> None:
    with state_lock():
        state = read_json(STATE) if STATE.exists() else {"schema_version": 2, "cases": {}, "runs": []}
        state.setdefault("latest_results", {})[result.id] = asdict(result)
        state.setdefault("runs", []).append(asdict(result))
        state["runs"] = state["runs"][-200:]
        write_json_atomic(STATE, state)


def emit_result(result: CaseResult) -> None:
    record_result(result)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


def run_group(group_name: str) -> bool:
    group = read_json(CONFIG / "test-groups.json")["groups"][group_name]
    command = [group["command"], *group["args"]]
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    started_clock = datetime.now(timezone.utc)
    try:
        completed = subprocess.run(command, cwd=ROOT / group["working_directory"], text=True, capture_output=True, check=False, timeout=group.get("timeout_seconds", 600))
    except OSError as error:
        result = CaseResult(f"RUN-{group_name}", "Blocked", "Automation", blocker=str(error), command=" ".join(command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    except subprocess.TimeoutExpired as error:
        result = CaseResult(f"RUN-{group_name}", "Blocked", "Automation", blocker=f"timeout after {group.get('timeout_seconds', 600)} seconds", actual=redact_sensitive(str(error.stdout or "")[-4000:]), command=" ".join(command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    else:
        status = "Passed" if completed.returncode == 0 else "Failed"
        result = CaseResult(f"RUN-{group_name}", status, "Automation", actual=redact_sensitive((completed.stdout or "")[-4000:]), evidence=f"run_id={run_id}; stderr={redact_sensitive((completed.stderr or '')[-4000:])}", command=" ".join(command), run_at=started, run_id=run_id, group=group_name, exit_code=completed.returncode, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    emit_result(result)
    return result.status == "Passed"


def check_health(url: str) -> bool:
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    try:
        with urlopen(url, timeout=10) as response:
            body = redact_sensitive(response.read().decode("utf-8", errors="replace")[:2000])
            result = CaseResult("API-HEALTH-01", "Passed" if response.status == 200 else "Failed", "Automation", actual=f"HTTP {response.status}: {body}", command=f"GET {url}", evidence="live HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
    except HTTPError as error:
        result = CaseResult("API-HEALTH-01", "Failed", "Automation", actual=f"HTTP {error.code}", command=f"GET {url}", evidence="live HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
    except (URLError, TimeoutError, OSError) as error:
        result = CaseResult("API-HEALTH-01", "Blocked", "Automation", blocker=str(error), command=f"GET {url}", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
    emit_result(result)
    return result.status == "Passed"


def check_guest_prediction(url: str, image_path: str) -> bool:
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    boundary = f"----AgriVision{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(image_path)[0] or "application/octet-stream"
    file_name = Path(image_path).name
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"File\"; filename=\"{file_name}\"\r\nContent-Type: {content_type}\r\n\r\n").encode() + Path(image_path).read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    request = Request(url, data=body, method="POST", headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urlopen(request, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
            has_guest_token = bool(payload.get("guestToken"))
            actual = f"HTTP {response.status}; class={payload.get('predictedPlantDisease', {}).get('className')}; confidence={payload.get('confidence')}; guestToken={'present' if has_guest_token else 'missing'}"
            result = CaseResult("API-PRED-GUEST-01", "Passed" if response.status == 200 and has_guest_token else "Failed", "Automation", actual=actual, command=f"POST {url} -F File=@{file_name}", evidence="live multipart HTTP response; token presence only", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
    except HTTPError as error:
        result = CaseResult("API-PRED-GUEST-01", "Failed", "Automation", actual=f"HTTP {error.code}", command=f"POST {url} -F File=@{file_name}", evidence="live multipart HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        result = CaseResult("API-PRED-GUEST-01", "Blocked", "Automation", blocker=str(error), command=f"POST {url} -F File=@{file_name}", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
    emit_result(result)
    return result.status == "Passed"


def run_case(case_id: str, health_url: str | None = None, guest_url: str | None = None, guest_image: str | None = None) -> bool:
    case = next((item for item in load_cases() if item["id"] == case_id), None)
    if case is None:
        raise ValueError(f"unknown testcase ID: {case_id}")
    runner = case.get("runner")
    if runner == "health":
        return check_health(health_url or read_json(CONFIG / "runtime.json")["health_url"])
    if runner == "guest_prediction":
        runtime = read_json(CONFIG / "runtime.json")
        image = guest_image or runtime["guest_fixture"]
        return check_guest_prediction(guest_url or runtime["guest_prediction_url"], image)
    if runner == "dotnet":
        command = ["dotnet", "test", "tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj", "--no-restore", "--filter", case["selector"], "--logger", "console;verbosity=minimal"]
        cwd = ROOT / "backend"
    elif runner == "vitest":
        source_path = Path(case["source_path"])
        if source_path.parts and source_path.parts[0].lower() == "frontend":
            source_path = Path(*source_path.parts[1:])
        command = ["pnpm.cmd", "exec", "vitest", "run", str(source_path), "-t", case["selector"]]
        cwd = ROOT / "frontend"
    else:
        raise RuntimeError(f"case {case_id} has no explicit runner adapter; group exit cannot mark it Passed")
    started = datetime.now(timezone.utc)
    run_id = uuid.uuid4().hex
    try:
        completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False, timeout=900)
        result = CaseResult(case_id, "Passed" if completed.returncode == 0 else "Failed", "Automation", actual=redact_sensitive((completed.stdout or "")[-4000:]), evidence=f"per-case selector={case['selector']}; stderr={redact_sensitive((completed.stderr or '')[-4000:])}", command=" ".join(command), run_at=started.isoformat(), run_id=run_id, evidence_kind="per_case", selector=case["selector"], exit_code=completed.returncode, duration_seconds=(datetime.now(timezone.utc) - started).total_seconds())
    except (OSError, subprocess.TimeoutExpired) as error:
        result = CaseResult(case_id, "Blocked", "Automation", blocker=str(error), command=" ".join(command), run_at=started.isoformat(), run_id=run_id, evidence_kind="per_case", selector=case["selector"])
    emit_result(result)
    return result.status == "Passed"


def run_all(write_sheets: bool, guest_image: str | None = None, health_url: str = "http://localhost:5080/api/health", guest_url: str = "http://localhost:5080/api/predictions") -> None:
    group_results = [run_group(group_name) for group_name in ("api", "playwright")]
    success = all(group_results)
    runtime = read_json(CONFIG / "runtime.json")
    fixture = guest_image or runtime["guest_fixture"]
    for case in load_cases():
        if case.get("runner") == "health":
            success = run_case(case["id"], health_url=health_url) and success
        elif case.get("runner") == "guest_prediction":
            success = run_case(case["id"], guest_url=guest_url, guest_image=fixture) and success
        elif case.get("runner") in {"dotnet", "vitest"}:
            success = run_case(case["id"]) and success
    sync(False, write_sheets)
    if not success:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    sync_parser = subparsers.add_parser("sync")
    sync_parser.add_argument("--dry-run", action="store_true")
    sync_parser.add_argument("--sheets", action="store_true")
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("group", choices=["api", "screen", "playwright"])
    all_parser = subparsers.add_parser("run-all")
    all_parser.add_argument("--sheets", action="store_true")
    all_parser.add_argument("--guest-image")
    all_parser.add_argument("--health-url", default="http://localhost:5080/api/health")
    all_parser.add_argument("--guest-url", default="http://localhost:5080/api/predictions")
    case_parser = subparsers.add_parser("run-case")
    case_parser.add_argument("case_id")
    case_parser.add_argument("--health-url")
    case_parser.add_argument("--guest-url")
    case_parser.add_argument("--guest-image")
    health_parser = subparsers.add_parser("check-health")
    health_parser.add_argument("--url", default="http://localhost:5080/api/health")
    prediction_parser = subparsers.add_parser("check-guest-prediction")
    prediction_parser.add_argument("--url", default="http://localhost:5080/api/predictions")
    prediction_parser.add_argument("--file", required=True)
    args = parser.parse_args()
    try:
        if args.command == "sync":
            sync(args.dry_run, args.sheets)
        elif args.command == "run":
            run_group(args.group)
        elif args.command == "run-all":
            run_all(args.sheets, args.guest_image, args.health_url, args.guest_url)
        elif args.command == "run-case":
            if not run_case(args.case_id, args.health_url, args.guest_url, args.guest_image):
                raise SystemExit(1)
        elif args.command == "check-health":
            check_health(args.url)
        else:
            check_guest_prediction(args.url, args.file)
    except (RuntimeError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
