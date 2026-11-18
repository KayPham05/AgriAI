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
import tempfile
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sheets_client import SheetsClient
from validate_results import validate_results

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "tools" / "testcase-workflow" / "config"
STATE = CONFIG / "state.json"
KINDS = {"api", "screen", "viewpoint"}
STALE_PLACEHOLDERS = {
    "System under test is available",
    "Configured fixture/input",
    "Execute configured testcase",
}
STALE_FALLBACK_ITEMS = {"Prediction"}
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


def load_sheets() -> dict[str, dict[str, Any]]:
    sheets = read_json(CONFIG / "sheets.json")["spreadsheets"]
    if set(sheets) != KINDS:
        raise ValueError(f"sheets.json must contain exactly {sorted(KINDS)}")
    return sheets


def quote_sheet_name(tab_name: str) -> str:
    return "'" + str(tab_name).replace("'", "''") + "'"


def normalize_execution_label(value: Any) -> str:
    raw = str(value or "N/A").strip()
    lowered = raw.lower().rstrip(")")
    if lowered in {"auto", "automation"}:
        return "Auto"
    if lowered == "manual":
        return "Manual"
    if lowered in {"n/a", "na"}:
        return "N/A"
    return raw or "N/A"


def normalize_sheet_status(value: Any, detail_mode: str = "") -> str:
    raw = str(value or "Not run").strip() or "Not run"
    lowered = raw.lower()
    if lowered in {"blocked", "pending", "pendding"}:
        return "Blocked"
    if detail_mode in {"api_table", "screen_table"} and lowered == "skipped":
        return "Not run"
    return raw


def _matches_case_id(value: str, case_id: str, detail_mode: str) -> bool:
    if value == case_id:
        return True
    if detail_mode != "viewpoint_table":
        return False
    return bool(re.search(rf"(?<![A-Za-z0-9_-]){re.escape(case_id)}(?![A-Za-z0-9_-])", value))


def build_sheet_row(
    case: dict[str, Any],
    mapping: dict[str, str],
    result: dict[str, Any] | None = None,
    detail_mode: str = "",
) -> list[str]:
    result = result or {}
    execution_value = normalize_execution_label(result.get("execution", case.get("execution", "N/A")))
    status_value = normalize_sheet_status(result.get("status", case.get("status", "Not run")), detail_mode)
    expected_result = case.get("expected_result", "")
    fields = {
        "no": case.get("no", result.get("no", "")),
        "id": case["id"], "detail_tab": case["detail_tab"], "kind": case.get("kind", ""),
        "item": case.get("item") or "Prediction",
        "test_name": case.get("name") or expected_result,
        "precondition": case.get("precondition") or "System under test is available",
        "test_data": case.get("test_data") or "Configured fixture/input",
        "params": case.get("params", ""),
        "request_body": case.get("request_body", ""),
        "expected_status": case.get("expected_status", ""),
        "expected_body": case.get("expected_body") or expected_result,
        "expected_database": case.get("expected_database", ""),
        "system": case.get("system", "AgriVision AI"),
        "major": case.get("major", "Prediction"),
        "middle": case.get("middle", "Upload ảnh"),
        "minor": case.get("minor") or expected_result,
        "confirmation": case.get("confirmation") or expected_result,
        "main_category": case.get("main_category", "Prediction"),
        "sub_category": case.get("sub_category", "Diagnosis"),
        "type": case.get("type", "Function"),
        "test_description": case.get("test_description") or expected_result,
        "steps": case.get("steps") or "Execute configured testcase",
        "requirement_refs": ", ".join(map(str, case.get("requirement_refs", []))),
        "viewpoint_refs": ", ".join(map(str, case.get("viewpoint_refs", []))),
        "source_path": case.get("source_path", ""), "expected_result": expected_result,
        "status": status_value,
        "execution": execution_value,
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


def _is_occupied_testcase_row(row_values: list[str], mapping: dict[str, str], id_col_index: int) -> bool:
    if len(row_values) <= id_col_index or not str(row_values[id_col_index]).strip():
        return False
    content_indexes = [
        column_number(col) - 1
        for field, col in mapping.items()
        if field not in {"id", "no"}
    ]
    if not content_indexes:
        return True
    return any(
        len(row_values) > idx and bool(str(row_values[idx]).strip())
        for idx in content_indexes
    )


def upsert_row(
    client: SheetsClient,
    spreadsheet_id: str,
    tab_name: str,
    case: dict[str, Any],
    mapping: dict[str, str],
    result: dict[str, Any] | None = None,
    detail_mode: str = "table",
    data_start_row: int = 1,
    pending_updates: list[tuple[str, str, list[list[str]]]] | None = None,
    tab_values_cache: dict[tuple[str, str], list[list[str]]] | None = None,
    previous_case: dict[str, Any] | None = None,
) -> dict[str, Any]:
    id_column = mapping.get("id", "A")
    id_col_index = column_number(id_column) - 1
    cache_key = (spreadsheet_id, tab_name)
    cached_sheet = tab_values_cache.get(cache_key) if tab_values_cache is not None else None
    if cached_sheet is not None:
        rows = [
            (index, str(r[id_col_index]).strip())
            for index, r in enumerate(cached_sheet, start=1)
            if len(r) > id_col_index and str(r[id_col_index]).strip()
        ]
    else:
        values = client.values(spreadsheet_id, tab_name, f"{id_column}:{id_column}")
        rows = [(index, str(r[0]).strip()) for index, r in enumerate(values, start=1) if r and str(r[0]).strip()]
    row = build_sheet_row(case, mapping, result, detail_mode=detail_mode)
    prior_auto_row = (
        build_sheet_row(previous_case, mapping, None, detail_mode=detail_mode)
        if previous_case is not None
        else None
    )
    end_column = column_name(max(len(row), 1))
    for row_number, value in rows:
        if _matches_case_id(value, case["id"], detail_mode):
            if detail_mode == "viewpoint_table":
                return {"action": "unchanged", "tab": tab_name, "row": row_number}
            if cached_sheet is not None:
                prior = list(cached_sheet[row_number - 1]) if row_number <= len(cached_sheet) else []
            else:
                existing = client.values(spreadsheet_id, tab_name, f"A{row_number}:{end_column}{row_number}")
                prior = existing[0] if existing else []
            authoritative_result_fields = {
                field
                for field in ("status", "execution", "actual", "evidence", "run_id", "run_at")
                if result and str(result.get(field, "")).strip()
            }
            if mapping.get("no"):
                no_idx = column_number(mapping["no"]) - 1
                row[no_idx] = str(max(1, row_number - data_start_row + 1))
            prior_expected_candidates = {
                str(case.get("expected_result", "")).strip(),
                str((previous_case or {}).get("expected_result", "")).strip(),
            } - {""}
            merged = [prior[i] if i < len(prior) else "" for i in range(len(row))]
            for field, column in mapping.items():
                index = column_number(column) - 1
                prior_value = prior[index] if index < len(prior) else ""
                new_value = row[index] if index < len(row) else ""
                prior_clean = str(prior_value).strip()
                is_stale_default = field != "status" and bool(new_value) and (
                    prior_clean in STALE_PLACEHOLDERS
                    or (field == "item" and prior_clean in STALE_FALLBACK_ITEMS and bool(case.get("item")))
                    or (field == "type" and prior_clean == "Function" and str(new_value).strip() in {"UI", "Validate"})
                    or (field in {"test_name", "test_description"} and prior_clean in prior_expected_candidates)
                    or (prior_auto_row is not None and index < len(prior_auto_row) and prior_clean == str(prior_auto_row[index]).strip())
                )
                use_new = (
                    (field in authoritative_result_fields and bool(new_value))
                    or (not prior_clean and bool(new_value))
                    or is_stale_default
                )
                if field == "execution" and prior_clean.lower() == "automation" and new_value == "Auto":
                    use_new = True
                merged[index] = new_value if use_new else prior_value
            if cached_sheet is not None:
                while len(cached_sheet) < row_number:
                    cached_sheet.append([])
                cached_sheet[row_number - 1] = list(merged)
            if pending_updates is not None:
                pending_updates.append((tab_name, f"A{row_number}:{end_column}{row_number}", [merged]))
            else:
                client.update(spreadsheet_id, tab_name, f"A{row_number}:{end_column}{row_number}", [merged])
            return {"action": "update", "tab": tab_name, "row": row_number}
    if cached_sheet is not None:
        full_values = cached_sheet
    else:
        full_values = [list(r) for r in client.values(spreadsheet_id, tab_name, "A:Z")]
        if tab_values_cache is not None:
            tab_values_cache[cache_key] = full_values
    claimed_rows = {
        int(match.group(1))
        for queued_tab, a1_range, _ in (pending_updates or [])
        if queued_tab == tab_name and (match := re.match(r"^[A-Z]+(\d+):", a1_range))
    }
    occupied_rows = [
        index
        for index in range(data_start_row, len(full_values) + 1)
        if _is_occupied_testcase_row(full_values[index - 1], mapping, id_col_index)
    ]
    target_row = max([data_start_row - 1, *occupied_rows, *claimed_rows]) + 1
    if mapping.get("no"):
        no_idx = column_number(mapping["no"]) - 1
        seq_count = len({*occupied_rows, *(r for r in claimed_rows if r >= data_start_row)}) + 1
        row[no_idx] = str(seq_count)
    if pending_updates is not None or target_row <= len(full_values):
        while len(full_values) < target_row:
            full_values.append([])
        full_values[target_row - 1] = list(row)
        if pending_updates is not None:
            pending_updates.append((tab_name, f"A{target_row}:{end_column}{target_row}", [row]))
        else:
            client.update(spreadsheet_id, tab_name, f"A{target_row}:{end_column}{target_row}", [row])
        return {"action": "add", "tab": tab_name, "row": target_row}
    while len(full_values) < target_row:
        full_values.append([])
    full_values[target_row - 1] = list(row)
    client.append(spreadsheet_id, tab_name, row)
    return {"action": "add", "tab": tab_name, "row": target_row}


def calculate_summary_counts(cases: list[dict[str, Any]], latest: dict[str, Any]) -> dict[str, int]:
    counts = {
        "total": len(cases),
        "passed": 0,
        "failed": 0,
        "blocked": 0,
        "not_run": 0,
        "skipped": 0,
        "deprecated": 0,
        "automation": 0,
        "manual": 0,
        "na": 0,
        "ui": 0,
        "function": 0,
        "validate": 0,
    }
    status_aliases = {
        "pass": "passed",
        "done": "passed",
        "fail": "failed",
        "block": "blocked",
        "pending": "blocked",
        "pendding": "blocked",
    }
    for case in cases:
        result = latest.get(case["id"], {})
        status = str(result.get("status", case.get("status", "Not run"))).strip().lower().replace(" ", "_")
        status = status_aliases.get(status, status)
        execution = str(result.get("execution", case.get("execution", "N/A"))).strip().lower().replace("/", "_")
        case_type = str(case.get("type", "Function")).strip().lower()
        if execution == "auto":
            execution = "automation"
        if status in {"passed", "failed", "blocked", "not_run", "skipped", "deprecated"}:
            counts[status] += 1
        if execution in {"automation", "manual", "na"}:
            counts[execution] += 1
        if case_type in {"ui", "function", "validate"}:
            counts[case_type] += 1
    return counts


def _parse_dashboard_int(value: Any) -> int | None:
    text = "" if value is None else str(value).strip()
    if not text:
        return None
    if re.fullmatch(r"\d+", text):
        return int(text)
    if re.fullmatch(r"\d{1,3}(?:,\d{3})+", text) or re.fullmatch(r"\d{1,3}(?:\.\d{3})+", text):
        return int(text.replace(",", "").replace(".", ""))
    return None


def _summary_ref_formula(quoted_tab: str, metric: str, cell_refs: dict[str, str]) -> str:
    if metric == "na" and "na_formula" in cell_refs and "na" not in cell_refs:
        return "=" + str(cell_refs["na_formula"]).format(tab=quoted_tab)
    return f"={quoted_tab}!{cell_refs[metric]}"


def _contiguous_row_spans(rows: list[int]) -> list[tuple[int, int]]:
    if not rows:
        return []
    ordered = sorted(set(rows))
    spans: list[tuple[int, int]] = []
    start = end = ordered[0]
    for r in ordered[1:]:
        if r == end + 1:
            end = r
        else:
            spans.append((start, end))
            start = end = r
    spans.append((start, end))
    return spans


def update_summary_dashboard(client: SheetsClient, spreadsheet_id: str, sheet: dict[str, Any], cases: list[dict[str, Any]], latest: dict[str, Any]) -> list[dict[str, Any]]:
    tab_name = sheet["summary_tab"]
    mapping = sheet["dashboard_mapping"]
    values = [list(r) for r in client.values(spreadsheet_id, tab_name, mapping["range"])]
    headers = {str(cell).strip().casefold() for row in values[:6] for cell in row}
    required_headers = {"sheet name", "total testcase", "passed", "failed", "blocked", "not run"}
    if not required_headers.issubset(headers):
        raise RuntimeError(f"Summary tab {tab_name!r} header schema drift; refusing to write")
    grouped: dict[str, list[dict[str, Any]]] = {}
    for case in cases:
        grouped.setdefault(case["detail_tab"], []).append(case)
    all_sheets = client.sheet_metadata(spreadsheet_id)
    metadata = next((item for item in all_sheets if item.get("title") == tab_name), None)
    if not metadata:
        raise RuntimeError(f"Summary tab {tab_name!r} was not found; refusing to write")
    summary_sheet_id = int(metadata["sheetId"])
    gid_by_title = {item.get("title"): int(item["sheetId"]) for item in all_sheets if "title" in item and "sheetId" in item}
    data_start_row = int(mapping["data_start_row"])
    no_col = mapping.get("no_column")
    no_col_idx = column_number(no_col) - 1 if no_col else None
    sheet_col_idx = column_number(mapping["sheet_name_column"]) - 1
    label_index = column_number(mapping.get("total_label_column", "A")) - 1
    total_row = next((index for index, row in enumerate(values, start=1) if len(row) > label_index and str(row[label_index]).strip().casefold() == mapping["total_label"].casefold()), None)
    if total_row is None:
        total_row = next((index for index, row in enumerate(values, start=1) if any(str(cell).strip().casefold() == mapping["total_label"].casefold() for cell in row)), None)
    if total_row is None:
        raise RuntimeError(f"Summary tab {tab_name!r} has no total row; refusing to corrupt dashboard")
    used_rows = {
        str(row[sheet_col_idx]).strip(): index
        for index, row in enumerate(values, start=1)
        if data_start_row <= index < total_row and len(row) > sheet_col_idx and str(row[sheet_col_idx]).strip()
    }
    has_type_cols = bool(mapping.get("ui_column") and mapping.get("function_column") and mapping.get("validate_column"))
    default_cell_refs = (
        {
            "total": "C11", "passed": "C4", "failed": "C5", "blocked": "C6", "not_run": "C7",
            "automation": "C8", "manual": "C9", "na": "C10", "ui": "G8", "function": "G9", "validate": "G10",
        }
        if has_type_cols
        else {
            "total": "C11", "passed": "C5", "failed": "C6", "blocked": "C7", "not_run": "C8",
            "automation": "C9", "manual": "C10", "na_formula": 'COUNTIF({tab}!L16:L1000;"N/A")',
        }
    )
    cell_refs = sheet.get("summary_cell_refs") or default_cell_refs
    end_col_letter = mapping.get("remarks_column") or mapping.get("progress_column") or mapping.get("status_column") or (mapping.get("validate_column") if has_type_cols else mapping["na_column"])
    end_col_count = column_number(end_col_letter)

    # Pass 1: reserve row numbers (inserting above Total if needed) before assigning sequential No.
    assigned_rows: dict[str, tuple[int, bool]] = {}
    for detail_tab in grouped:
        existing_row = used_rows.get(detail_tab)
        if existing_row is not None:
            assigned_rows[detail_tab] = (existing_row, True)
            continue
        occupied = [
            index
            for index in range(data_start_row, total_row)
            if index <= len(values)
            and len(values[index - 1]) > sheet_col_idx
            and str(values[index - 1][sheet_col_idx]).strip()
        ]
        next_candidate = max([data_start_row - 1, *occupied]) + 1
        if next_candidate < total_row:
            row_number = next_candidate
        else:
            client.insert_row(spreadsheet_id, summary_sheet_id, total_row)
            row_number = total_row
            while len(values) < row_number - 1:
                values.append([])
            values.insert(row_number - 1, [])
            total_row += 1
        while len(values) < row_number:
            values.append([])
        if len(values[row_number - 1]) <= sheet_col_idx:
            values[row_number - 1].extend([""] * (sheet_col_idx + 1 - len(values[row_number - 1])))
        values[row_number - 1][sheet_col_idx] = detail_tab
        used_rows[detail_tab] = row_number
        assigned_rows[detail_tab] = (row_number, False)

    # Compute sequential No. skipping blank gaps
    seq_by_row: dict[int, int] = {}
    seq = 0
    for r_idx in range(data_start_row, total_row):
        if r_idx <= len(values) and len(values[r_idx - 1]) > sheet_col_idx and str(values[r_idx - 1][sheet_col_idx]).strip():
            seq += 1
            seq_by_row[r_idx] = seq

    updates = []
    pending_writes: list[tuple[str, str, list[list[Any]]]] = []
    style_requests: list[dict[str, Any]] = []
    total_col_idx = column_number(mapping["total_column"]) - 1
    legacy_total = sum(
        parsed
        for r_idx, row in enumerate(values, start=1)
        if data_start_row <= r_idx < total_row
        and len(row) > sheet_col_idx
        and str(row[sheet_col_idx]).strip() not in grouped
        and len(row) > total_col_idx
        and (parsed := _parse_dashboard_int(row[total_col_idx])) is not None
    )

    # Pass 2: build live cross-tab formula rows and preserve existing row styles
    for detail_tab, detail_cases in grouped.items():
        counts = calculate_summary_counts(detail_cases, latest)
        row_number, was_existing = assigned_rows[detail_tab]
        name = detail_cases[0].get("summary_name") or detail_cases[0].get("test_selector") or detail_tab
        active_tab_total = counts["total"] - counts["deprecated"]
        executed = counts["passed"] + counts["failed"] + counts["blocked"]
        remaining = counts["not_run"] + counts["skipped"]
        progress = f"={mapping['passed_column']}{row_number}/{mapping['total_column']}{row_number}" if active_tab_total else 0
        status = "To do" if active_tab_total == 0 or executed == 0 else "Test Done" if remaining == 0 else "Testing"
        status_formula = (
            f'=IF({mapping["total_column"]}{row_number}=0;"To do";'
            f'IF({mapping["passed_column"]}{row_number}+{mapping["failed_column"]}{row_number}+{mapping["blocked_column"]}{row_number}=0;"To do";'
            f'IF({mapping["not_run_column"]}{row_number}=0;"Test Done";"Testing")))'
        )
        no_value = seq_by_row.get(row_number, row_number - data_start_row + 1)
        quoted_tab = quote_sheet_name(detail_tab)
        row_cells: list[Any] = []
        if no_col:
            row_cells.append(no_value)
        row_cells.extend([
            detail_tab,
            name,
            _summary_ref_formula(quoted_tab, "total", cell_refs),
            _summary_ref_formula(quoted_tab, "passed", cell_refs),
            _summary_ref_formula(quoted_tab, "failed", cell_refs),
            _summary_ref_formula(quoted_tab, "blocked", cell_refs),
            _summary_ref_formula(quoted_tab, "not_run", cell_refs),
            _summary_ref_formula(quoted_tab, "automation", cell_refs),
            _summary_ref_formula(quoted_tab, "manual", cell_refs),
            _summary_ref_formula(quoted_tab, "na", cell_refs),
        ])
        if has_type_cols:
            row_cells.extend([
                _summary_ref_formula(quoted_tab, "ui", cell_refs),
                _summary_ref_formula(quoted_tab, "function", cell_refs),
                _summary_ref_formula(quoted_tab, "validate", cell_refs),
            ])
        if mapping.get("status_column"):
            row_cells.append(status_formula)
        if mapping.get("progress_column"):
            row_cells.append(progress)
        start_col_letter = no_col or mapping["sheet_name_column"]
        write_end_col = mapping.get("progress_column") or mapping.get("status_column") or (mapping.get("validate_column") if has_type_cols else mapping["na_column"])
        pending_writes.append((tab_name, f"{start_col_letter}{row_number}:{write_end_col}{row_number}", [row_cells]))
        if not was_existing and hasattr(client, "copy_row_style_requests") and row_number > data_start_row:
            style_requests.extend(client.copy_row_style_requests(summary_sheet_id, data_start_row, row_number, row_number, end_col_count, include_validation=True))
        if hasattr(client, "set_hyperlink_request"):
            uri = f"#gid={gid_by_title[detail_tab]}" if detail_tab in gid_by_title else None
            style_requests.append(client.set_hyperlink_request(summary_sheet_id, row_number, sheet_col_idx, uri))
        updates.append({"detail_tab": detail_tab, "row": row_number, "no": no_value, "status": status, "progress": progress})

    if no_col and no_col_idx is not None:
        grouped_rows = {row_num for row_num, _ in assigned_rows.values()}
        for r_idx, expected_no in seq_by_row.items():
            if r_idx in grouped_rows:
                continue
            current_no = str(values[r_idx - 1][no_col_idx]).strip() if len(values[r_idx - 1]) > no_col_idx else ""
            if current_no != str(expected_no):
                pending_writes.append((tab_name, f"{no_col}{r_idx}:{no_col}{r_idx}", [[expected_no]]))

    sum_columns = [
        mapping["total_column"],
        mapping["passed_column"],
        mapping["failed_column"],
        mapping["blocked_column"],
        mapping["not_run_column"],
        mapping["automation_column"],
        mapping["manual_column"],
        mapping["na_column"],
    ]
    if has_type_cols:
        sum_columns.extend([mapping["ui_column"], mapping["function_column"], mapping["validate_column"]])
    total_formulas = [f"=SUM({col}{data_start_row}:{col}{total_row - 1})" for col in sum_columns]
    active_total = legacy_total + sum(len(detail_cases) for detail_cases in grouped.values())
    total_progress = f"={mapping['passed_column']}{total_row}/{mapping['total_column']}{total_row}" if active_total else 0
    pending_writes.append((tab_name, f"{mapping['total_column']}{total_row}:{sum_columns[-1]}{total_row}", [total_formulas]))
    if mapping.get("status_column"):
        client.clear(spreadsheet_id, tab_name, f"{mapping['status_column']}{total_row}:{mapping['status_column']}{total_row}")
        if hasattr(client, "clear_validation_request"):
            style_requests.append(client.clear_validation_request(summary_sheet_id, total_row, column_number(mapping["status_column"]) - 1))
    if mapping.get("progress_column"):
        pending_writes.append((tab_name, f"{mapping['progress_column']}{total_row}:{mapping['progress_column']}{total_row}", [[total_progress]]))
    if has_type_cols:
        pct_row = total_row + 1
        pct_cols = (
            mapping["automation_column"],
            mapping["manual_column"],
            mapping["na_column"],
            mapping["ui_column"],
            mapping["function_column"],
            mapping["validate_column"],
        )
        pct_formulas = [f"={col}{total_row}/{mapping['total_column']}{total_row}" for col in pct_cols]
        pending_writes.append((tab_name, f"{pct_cols[0]}{pct_row}:{pct_cols[-1]}{pct_row}", [pct_formulas]))
    if pending_writes:
        client.batch_update(spreadsheet_id, pending_writes)
    if hasattr(client, "batch_requests") and style_requests:
        client.batch_requests(spreadsheet_id, style_requests)
    return updates


def map_viewpoint_overview_status(raw_status: str) -> str:
    clean = str(raw_status).strip().lower()
    if clean in {"passed", "pass", "done"}:
        return "Done"
    if clean in {"blocked", "block"}:
        return "Block"
    if clean in {"failed", "fail", "in progress", "in_progress", "testing"}:
        return "In progress"
    return "To do"


def aggregate_viewpoint_status(statuses: list[str]) -> str:
    mapped = [map_viewpoint_overview_status(item) for item in statuses]
    if not mapped or all(item == "To do" for item in mapped):
        return "To do"
    if all(item == "Done" for item in mapped):
        return "Done"
    if "In progress" in mapped or ("Done" in mapped and "To do" in mapped):
        return "In progress"
    if "Block" in mapped:
        return "Block"
    return "In progress"


def update_summary_list(client: SheetsClient, spreadsheet_id: str, sheet: dict[str, Any], cases: list[dict[str, Any]], latest: dict[str, Any]) -> list[dict[str, Any]]:
    mapping = sheet["list_mapping"]
    tab_name = sheet["summary_tab"]
    data_start_row = int(mapping["data_start_row"])
    no_col_letter = mapping.get("no_column")
    no_column = column_number(no_col_letter) - 1 if no_col_letter else None
    sheet_column = column_number(mapping["sheet_name_column"]) - 1
    screen_col_letter = mapping.get("screen_column")
    screen_column = column_number(screen_col_letter) - 1 if screen_col_letter else None
    status_column = column_number(mapping["status_column"]) - 1
    remarks_column = column_number(mapping["remarks_column"]) - 1
    mapped_cols = [
        column_number(mapping[key])
        for key in ("no_column", "sheet_name_column", "screen_column", "status_column", "remarks_column")
        if mapping.get(key)
    ]
    start_col_num = min(mapped_cols, default=1)
    table_width = max(mapped_cols, default=5)
    start_col_letter = column_name(start_col_num)
    end_col_letter = column_name(table_width)
    read_range = mapping.get("range") or ("A:Z" if table_width <= 26 else f"A:{end_col_letter}")
    values = [list(r) for r in client.values(spreadsheet_id, tab_name, read_range)]
    headers = {str(cell).strip().casefold() for cell in (values[0] if values else [])}
    if not {"sheet name", "status", "remarks"}.issubset(headers):
        raise RuntimeError(f"Summary tab {tab_name!r} list schema drift; refusing to write")
    all_sheets = client.sheet_metadata(spreadsheet_id) if hasattr(client, "sheet_metadata") else []
    metadata = next((item for item in all_sheets if item.get("title") == tab_name), None)
    summary_sheet_id = int(metadata["sheetId"]) if metadata and "sheetId" in metadata else None
    gid_by_title = {item.get("title"): int(item["sheetId"]) for item in all_sheets if "title" in item and "sheetId" in item}
    grouped: dict[str, list[dict[str, Any]]] = {}
    for case in cases:
        grouped.setdefault(case["detail_tab"], []).append(case)
    updates = []
    pending_writes = []
    style_requests: list[dict[str, Any]] = []
    occupied_rows = [
        index
        for index, row in enumerate(values, start=1)
        if index >= data_start_row and len(row) > sheet_column and str(row[sheet_column]).strip()
    ]
    next_row = max([data_start_row - 1, *occupied_rows]) + 1

    # Pass 1: assign rows for all tabs before computing sequential No. skipping blank gaps
    assigned_rows: dict[str, tuple[int, bool]] = {}
    for detail_tab in grouped:
        found = next(
            (
                index
                for index, row in enumerate(values, start=1)
                if index >= data_start_row and len(row) > sheet_column and detail_tab == str(row[sheet_column]).strip()
            ),
            None,
        )
        row_number = found or next_row
        if not found:
            next_row += 1
            while len(values) < row_number:
                values.append([])
            if len(values[row_number - 1]) <= sheet_column:
                values[row_number - 1].extend([""] * (sheet_column + 1 - len(values[row_number - 1])))
            values[row_number - 1][sheet_column] = detail_tab
        assigned_rows[detail_tab] = (row_number, found is not None)

    seq_by_row: dict[int, int] = {}
    seq = 0
    for r_idx in range(data_start_row, len(values) + 1):
        row_vals = values[r_idx - 1]
        if len(row_vals) > sheet_column and str(row_vals[sheet_column]).strip():
            seq += 1
            seq_by_row[r_idx] = seq

    # Pass 2: write aggregated rows while preserving existing row styles
    for detail_tab, tab_cases in grouped.items():
        statuses = [latest.get(item["id"], {}).get("status", item.get("status", "Not run")) for item in tab_cases]
        status = aggregate_viewpoint_status(statuses)
        evidences = list(dict.fromkeys(
            redact_sensitive(latest.get(item["id"], {}).get("evidence", item.get("evidence", ""))).strip()
            for item in tab_cases
            if redact_sensitive(latest.get(item["id"], {}).get("evidence", item.get("evidence", ""))).strip()
        ))
        evidence = "; ".join(evidences)
        primary = tab_cases[0]
        screen_name = primary.get("summary_name") or primary.get("middle") or detail_tab
        row_number, was_existing = assigned_rows[detail_tab]
        no_value = seq_by_row.get(row_number, row_number - data_start_row + 1)
        if was_existing and row_number <= len(values):
            existing = values[row_number - 1]
            row = [existing[i] if i < len(existing) else "" for i in range(table_width)]
        else:
            row = [""] * table_width
        if no_column is not None:
            row[no_column] = no_value
        row[sheet_column] = detail_tab
        if screen_column is not None and not str(row[screen_column]).strip():
            row[screen_column] = screen_name
        row[status_column] = status
        row[remarks_column] = evidence or primary.get("expected_result", "")
        if len(values[row_number - 1]) < table_width:
            values[row_number - 1].extend([""] * (table_width - len(values[row_number - 1])))
        values[row_number - 1][:table_width] = row[:table_width]
        pending_writes.append((tab_name, f"{start_col_letter}{row_number}:{end_col_letter}{row_number}", [row[start_col_num - 1:table_width]]))
        if not was_existing and summary_sheet_id is not None and hasattr(client, "copy_row_style_requests") and row_number > data_start_row:
            style_requests.extend(client.copy_row_style_requests(summary_sheet_id, data_start_row, row_number, row_number, table_width, include_validation=True))
        if summary_sheet_id is not None and hasattr(client, "set_hyperlink_request"):
            uri = f"#gid={gid_by_title[detail_tab]}" if detail_tab in gid_by_title else None
            style_requests.append(client.set_hyperlink_request(summary_sheet_id, row_number, sheet_column, uri))
        updates.append({"detail_tab": detail_tab, "row": row_number, "no": no_value, "status": status})

    if no_col_letter and no_column is not None:
        grouped_rows = {row_num for row_num, _ in assigned_rows.values()}
        for r_idx, expected_no in seq_by_row.items():
            if r_idx in grouped_rows:
                continue
            current_no = str(values[r_idx - 1][no_column]).strip() if len(values[r_idx - 1]) > no_column else ""
            if current_no != str(expected_no):
                pending_writes.append((tab_name, f"{no_col_letter}{r_idx}:{no_col_letter}{r_idx}", [[expected_no]]))

    stray_start_letter = column_name(table_width + 1)
    for idx, row in enumerate(values, start=1):
        if len(row) > table_width and any(str(cell).strip() for cell in row[table_width:]):
            stray_end_col = len(row)
            stray_end_letter = column_name(stray_end_col)
            client.clear(spreadsheet_id, tab_name, f"{stray_start_letter}{idx}:{stray_end_letter}{idx}")
            if summary_sheet_id is not None:
                style_requests.append({
                    "repeatCell": {
                        "range": {
                            "sheetId": summary_sheet_id,
                            "startRowIndex": idx - 1,
                            "endRowIndex": idx,
                            "startColumnIndex": table_width,
                            "endColumnIndex": stray_end_col,
                        },
                        "cell": {"userEnteredFormat": {}},
                        "fields": "userEnteredFormat.borders",
                    }
                })
    if pending_writes:
        client.batch_update(spreadsheet_id, pending_writes)
    if hasattr(client, "batch_requests") and style_requests:
        client.batch_requests(spreadsheet_id, style_requests)
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
    if len(values) >= start_row:
        client.clear(spreadsheet_id, tab_name, f"A{start_row}:Z{len(values)}")


def sync(dry_run: bool, write_sheets: bool) -> None:
    cases = load_cases()
    sheets = load_sheets()
    state = read_json(STATE) if STATE.exists() else {"schema_version": 2, "cases": {}, "runs": []}
    latest = state.get("latest_results", {})
    effective_latest = dict(latest)
    groups = read_json(CONFIG / "test-groups.json")["groups"]
    for group_name, group in groups.items():
        group_result = latest.get(f"RUN-{group_name}")
        if group_result:
            for case_id in group.get("case_ids", []):
                effective_latest.setdefault(case_id, group_result)
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
    previous_cases = state.get("cases", {})
    if not write_sheets:
        write_json_atomic(STATE, state)
        return
    if os.getenv("AGRIVISION_WRITE_SHEETS", "").lower() != "true":
        raise RuntimeError("Sheets write blocked. Set AGRIVISION_WRITE_SHEETS=true explicitly.")
    client = SheetsClient()
    grouped = {kind: [case for case in cases if case["kind"] == kind] for kind in KINDS}
    pending_updates: dict[str, list[tuple[str, str, list[list[str]]]]] = {kind: [] for kind in KINDS}
    detail_style_requests: dict[str, list[dict[str, Any]]] = {kind: [] for kind in KINDS}
    prepared_tabs: dict[tuple[str, str], int] = {}
    tab_config: dict[tuple[str, str], tuple[str, int, int]] = {}
    added_rows_by_tab: dict[tuple[str, str], list[int]] = {}
    tab_values_cache: dict[tuple[str, str], list[list[str]]] = {}
    for case in cases:
        sheet = sheets[case["kind"]]
        result = effective_latest.get(case["id"])
        tab_key = (sheet["id"], case["detail_tab"])
        start_row = int(sheet.get("detail_data_start_row", 1))
        end_col_count = max(column_number(c) for c in sheet["detail_mapping"].values())
        if tab_key not in prepared_tabs:
            detail_meta = client.ensure_sheet(sheet["id"], case["detail_tab"], sheet.get("template_tab"))
            if detail_meta.get("created"):
                clear_template_case_rows(client, sheet["id"], case["detail_tab"], start_row)
            validate_detail_schema(client, sheet["id"], case["detail_tab"], sheet.get("detail_mode", "table"))
            tab_values_cache[tab_key] = [list(r) for r in client.values(sheet["id"], case["detail_tab"], "A:Z")]
            prepared_tabs[tab_key] = int(detail_meta["sheetId"])
            tab_config[tab_key] = (case["kind"], start_row, end_col_count)
            summary_label = case.get("summary_name") or case["detail_tab"]
            if case["kind"] == "screen":
                pending_updates[case["kind"]].append((case["detail_tab"], "A1:A2", [[""], [f"{case['detail_tab']}/{summary_label}"]]))
                pending_updates[case["kind"]].append((case["detail_tab"], "C7:C7", [['=C11-SUM(C4:C6)']]))
                pending_updates[case["kind"]].append((case["detail_tab"], "C10:C11", [['=COUNTIF(J15:J1108;"N/A")'], ['=COUNTIFS($A15:$A1108;"<>";$C15:$C1108;"<>")']]))
                pending_updates[case["kind"]].append((case["detail_tab"], "G9:G10", [['=COUNTIF(D15:D1108;"FUNCTION")'], ['=COUNTIF(D15:D1108;"VALIDATE")']]))
            elif case["kind"] == "api":
                pending_updates[case["kind"]].append((case["detail_tab"], "B1:B3", [["AgriVision AI"], [summary_label], ["AgriVision QA"]]))
                pending_updates[case["kind"]].append((case["detail_tab"], "A7:A7", [["BLOCKED"]]))
                pending_updates[case["kind"]].append((
                    case["detail_tab"],
                    "C5:C11",
                    [
                        ['=COUNTIF(K16:K1000;"Passed")'],
                        ['=COUNTIF(K16:K1000;"Failed")'],
                        ['=COUNTIF(K16:K1000;"Blocked")'],
                        ['=C11-SUM(C5:C7)'],
                        ['=COUNTIF(L16:L1000;"Auto")'],
                        ['=COUNTIF(L16:L1000;"Manual")'],
                        ['=COUNTIFS($A16:$A1000;"<>";$C16:$C1000;"<>")'],
                    ],
                ))
        upserted = upsert_row(
            client,
            sheet["id"],
            case["detail_tab"],
            case,
            sheet["detail_mapping"],
            result,
            sheet.get("detail_mode", "table"),
            start_row,
            pending_updates[case["kind"]],
            tab_values_cache,
            previous_case=previous_cases.get(case["id"]),
        )
        if upserted.get("action") == "add":
            added_rows_by_tab.setdefault(tab_key, []).append(int(upserted.get("row", start_row)))

    if (
        "screen" in sheets
        and any(kind == "screen" for kind, _start_row, _end_col_count in tab_config.values())
        and hasattr(client, "conditional_formats")
        and hasattr(client, "delete_conditional_format_request")
    ):
        screen_cf_by_sheet = client.conditional_formats(sheets["screen"]["id"])
        for tab_key, (kind, _start_row, _end_col_count) in tab_config.items():
            if kind != "screen":
                continue
            detail_sheet_id = prepared_tabs[tab_key]
            rules = screen_cf_by_sheet.get(detail_sheet_id, [])
            stray_indexes = [
                idx
                for idx, rule in enumerate(rules)
                if rule.get("ranges")
                and all(
                    r.get("startRowIndex") == 7
                    and r.get("endRowIndex") == 8
                    and r.get("startColumnIndex") == 8
                    and r.get("endColumnIndex") == 9
                    for r in rule["ranges"]
                )
            ]
            for idx in sorted(stray_indexes, reverse=True):
                detail_style_requests[kind].append(client.delete_conditional_format_request(detail_sheet_id, idx))

    for tab_key, added_rows in added_rows_by_tab.items():
        kind, start_row, end_col_count = tab_config[tab_key]
        detail_sheet_id = prepared_tabs[tab_key]
        for span_start, span_end in _contiguous_row_spans(added_rows):
            copy_start = max(span_start, start_row + 1)
            if hasattr(client, "copy_row_style_requests") and span_end >= copy_start:
                detail_style_requests[kind].extend(
                    client.copy_row_style_requests(detail_sheet_id, start_row, copy_start, span_end, end_col_count, include_validation=True)
                )
            detail_style_requests[kind].append({
                "repeatCell": {
                    "range": {
                        "sheetId": detail_sheet_id,
                        "startRowIndex": span_start - 1,
                        "endRowIndex": span_end,
                        "startColumnIndex": 0,
                        "endColumnIndex": end_col_count,
                    },
                    "cell": {"userEnteredFormat": {"textFormat": {"fontFamily": "Times New Roman", "fontSize": 12, "foregroundColor": {}}}},
                    "fields": "userEnteredFormat.textFormat(fontFamily,fontSize,foregroundColor)",
                }
            })
    for kind, reqs in detail_style_requests.items():
        if reqs and hasattr(client, "batch_requests"):
            client.batch_requests(sheets[kind]["id"], reqs)
    for kind, writes in pending_updates.items():
        if writes:
            client.batch_update(sheets[kind]["id"], writes)
    for kind, kind_cases in grouped.items():
        sheet = sheets[kind]
        if sheet.get("summary_mode") == "list":
            update_summary_list(client, sheet["id"], sheet, kind_cases, effective_latest)
        else:
            update_summary_dashboard(client, sheet["id"], sheet, kind_cases, effective_latest)
    state["cases"] = {**previous_cases, **{case["id"]: case for case in cases}}
    for case_id in deprecated_case_ids(previous_cases, cases):
        state.setdefault("latest_results", {})[case_id] = {
            "id": case_id,
            "status": "Deprecated",
            "execution": "N/A",
            "evidence": "Removed from cases.json; historical row retained.",
        }
    write_json_atomic(STATE, state)


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


def run_group(group_name: str) -> bool:
    group = read_json(CONFIG / "test-groups.json")["groups"][group_name]
    executable = group["command"]
    if executable == "pnpm.cmd" and os.name != "nt":
        executable = "pnpm"
    command = [executable, *group["args"]]
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    started_clock = datetime.now(timezone.utc)
    if group_name == "playwright" and "--json-report" not in command:
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_path = Path(tmp_dir) / "playwright-results.json"
            full_command = [*command, "--json-report", str(report_path)]
            try:
                completed = subprocess.run(full_command, cwd=ROOT / group["working_directory"], text=True, capture_output=True, check=False, timeout=group.get("timeout_seconds", 600))
            except OSError as error:
                result = CaseResult(f"RUN-{group_name}", "Blocked", "Auto", blocker=str(error), command=" ".join(full_command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
                emit_result(result)
                return False
            except subprocess.TimeoutExpired as error:
                result = CaseResult(f"RUN-{group_name}", "Blocked", "Auto", blocker=f"timeout after {group.get('timeout_seconds', 600)} seconds", actual=redact_sensitive(" ".join(str(error.stdout or "").splitlines())[-500:]), command=" ".join(full_command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
                emit_result(result)
                return False

            duration = (datetime.now(timezone.utc) - started_clock).total_seconds()
            if report_path.is_file():
                payload = read_json(report_path)
                cases = payload.get("cases", [])
                per_case_duration = round(duration / max(len(cases), 1), 3)
                for case_rec in cases:
                    cid = str(case_rec.get("id", "")).strip()
                    if not cid:
                        continue
                    cstatus = str(case_rec.get("status", "Failed")).strip()
                    test_name = str(case_rec.get("test", "")).strip()
                    detail = str(case_rec.get("detail", "")).strip()
                    if cstatus == "Passed":
                        actual_msg = f"{cid} passed via {test_name}"
                    else:
                        tail_line = detail.splitlines()[-1].strip() if detail else ""
                        actual_msg = redact_sensitive(f"{cid} {cstatus.lower()} via {test_name}: {tail_line}"[:500])
                    emit_result(CaseResult(
                        id=cid,
                        status=cstatus,
                        execution="Auto",
                        actual=actual_msg,
                        command=f"python tests/browser/e2e/run_suite.py --case {cid}",
                        evidence=f"run_id={run_id}; selector={test_name}",
                        run_at=started,
                        run_id=run_id,
                        evidence_kind="per_case",
                        group=group_name,
                        exit_code=0 if cstatus == "Passed" else 1,
                        duration_seconds=per_case_duration,
                        selector=test_name,
                    ))
                passed_cnt = int(payload.get("passed", sum(1 for item in cases if item.get("status") == "Passed")))
                failed_cnt = int(payload.get("failed", sum(1 for item in cases if item.get("status") == "Failed")))
                total_cnt = int(payload.get("total", len(cases)))
                run_status = "Passed" if completed.returncode == 0 and failed_cnt == 0 and passed_cnt == total_cnt and total_cnt > 0 else "Failed"
                result = CaseResult(
                    id=f"RUN-{group_name}",
                    status=run_status,
                    execution="Auto",
                    actual=f"{passed_cnt}/{total_cnt} Playwright E2E UI cases passed in {duration:.3f}s",
                    command=" ".join(command),
                    evidence=f"run_id={run_id}; browser={payload.get('browser', 'chromium-headless')}; build={payload.get('build_mode', 'next-production')}",
                    run_at=started,
                    run_id=run_id,
                    evidence_kind="execution",
                    group=group_name,
                    exit_code=completed.returncode,
                    duration_seconds=duration,
                )
                emit_result(result)
                return result.status == "Passed"

            status = "Passed" if completed.returncode == 0 else "Failed"
            stderr_line = " ".join(redact_sensitive(completed.stderr or "").splitlines())[-500:]
            stdout_line = " ".join(redact_sensitive(completed.stdout or "").splitlines())[-500:]
            result = CaseResult(
                f"RUN-{group_name}",
                status,
                "Auto",
                actual=stdout_line,
                evidence=f"run_id={run_id}; exit_code={completed.returncode}; error={stderr_line}" if stderr_line else f"run_id={run_id}; exit_code={completed.returncode}",
                command=" ".join(command),
                run_at=started,
                run_id=run_id,
                group=group_name,
                exit_code=completed.returncode,
                duration_seconds=duration,
            )
            emit_result(result)
            return result.status == "Passed"

    try:
        completed = subprocess.run(command, cwd=ROOT / group["working_directory"], text=True, capture_output=True, check=False, timeout=group.get("timeout_seconds", 600))
    except OSError as error:
        result = CaseResult(f"RUN-{group_name}", "Blocked", "Auto", blocker=str(error), command=" ".join(command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    except subprocess.TimeoutExpired as error:
        result = CaseResult(f"RUN-{group_name}", "Blocked", "Auto", blocker=f"timeout after {group.get('timeout_seconds', 600)} seconds", actual=redact_sensitive(str(error.stdout or "")[-4000:]), command=" ".join(command), run_at=started, run_id=run_id, group=group_name, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    else:
        status = "Passed" if completed.returncode == 0 else "Failed"
        result = CaseResult(f"RUN-{group_name}", status, "Auto", actual=redact_sensitive((completed.stdout or "")[-4000:]), evidence=f"run_id={run_id}; stderr={redact_sensitive((completed.stderr or '')[-4000:])}", command=" ".join(command), run_at=started, run_id=run_id, group=group_name, exit_code=completed.returncode, duration_seconds=(datetime.now(timezone.utc) - started_clock).total_seconds())
    emit_result(result)
    return result.status == "Passed"


def check_health(url: str) -> bool:
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    try:
        with urlopen(url, timeout=10) as response:
            body = redact_sensitive(response.read().decode("utf-8", errors="replace")[:2000])
            result = CaseResult("API-HEALTH-01", "Passed" if response.status == 200 else "Failed", "Auto", actual=f"HTTP {response.status}: {body}", command=f"GET {url}", evidence="live HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
    except HTTPError as error:
        result = CaseResult("API-HEALTH-01", "Failed", "Auto", actual=f"HTTP {error.code}", command=f"GET {url}", evidence="live HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
    except (URLError, TimeoutError, OSError) as error:
        result = CaseResult("API-HEALTH-01", "Blocked", "Auto", blocker=str(error), command=f"GET {url}", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="GET /api/health")
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
            result = CaseResult("API-PRED-GUEST-01", "Passed" if response.status == 200 and has_guest_token else "Failed", "Auto", actual=actual, command=f"POST {url} -F File=@{file_name}", evidence="live multipart HTTP response; token presence only", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
    except HTTPError as error:
        result = CaseResult("API-PRED-GUEST-01", "Failed", "Auto", actual=f"HTTP {error.code}", command=f"POST {url} -F File=@{file_name}", evidence="live multipart HTTP response", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        result = CaseResult("API-PRED-GUEST-01", "Blocked", "Auto", blocker=str(error), command=f"POST {url} -F File=@{file_name}", run_at=started, run_id=run_id, evidence_kind="api_contract", selector="POST /api/predictions without Authorization")
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
        pnpm_exec = "pnpm.cmd" if os.name == "nt" else "pnpm"
        command = [pnpm_exec, "exec", "vitest", "run", str(source_path), "-t", case["selector"]]
        cwd = ROOT / "frontend"
    elif runner == "playwright":
        command = ["python", "tests/browser/e2e/run_suite.py", "--case", case["id"]]
        cwd = ROOT / "frontend"
    else:
        raise RuntimeError(f"case {case_id} has no explicit runner adapter; group exit cannot mark it Passed")
    started = datetime.now(timezone.utc)
    run_id = uuid.uuid4().hex
    try:
        completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False, timeout=900)
        result = CaseResult(case_id, "Passed" if completed.returncode == 0 else "Failed", "Auto", actual=redact_sensitive((completed.stdout or "")[-4000:]), evidence=f"per-case selector={case['selector']}; stderr={redact_sensitive((completed.stderr or '')[-4000:])}", command=" ".join(command), run_at=started.isoformat(), run_id=run_id, evidence_kind="per_case", selector=case["selector"], exit_code=completed.returncode, duration_seconds=(datetime.now(timezone.utc) - started).total_seconds())
    except (OSError, subprocess.TimeoutExpired) as error:
        result = CaseResult(case_id, "Blocked", "Auto", blocker=str(error), command=" ".join(command), run_at=started.isoformat(), run_id=run_id, evidence_kind="per_case", selector=case["selector"])
    emit_result(result)
    return result.status == "Passed"


def run_all(write_sheets: bool, guest_image: str | None = None, health_url: str = "http://localhost:5080/api/health", guest_url: str = "http://localhost:5080/api/predictions") -> None:
    group_results = [run_group(group_name) for group_name in ("api", "screen", "playwright")]
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
    import_parser = subparsers.add_parser("import-results")
    import_parser.add_argument("root")
    args = parser.parse_args()
    try:
        if args.command == "sync":
            sync(args.dry_run, args.sheets)
        elif args.command == "run":
            if not run_group(args.group):
                raise SystemExit(1)
        elif args.command == "run-all":
            run_all(args.sheets, args.guest_image, args.health_url, args.guest_url)
        elif args.command == "run-case":
            if not run_case(args.case_id, args.health_url, args.guest_url, args.guest_image):
                raise SystemExit(1)
        elif args.command == "check-health":
            check_health(args.url)
        elif args.command == "import-results":
            import_results(Path(args.root))
        else:
            check_guest_prediction(args.url, args.file)
    except (RuntimeError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
