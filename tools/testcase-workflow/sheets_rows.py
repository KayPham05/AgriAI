"""Testcase row matching, normalization and updates."""

from __future__ import annotations

import re
from typing import Any

import registry_state
from sheets_client import SheetsClient


MOVED_CASE_PREFIX = "[Moved] "
DEPRECATED_CASE_PREFIX = "[Deprecated]"
DEPRECATED_CASE_NOTICE = f"{DEPRECATED_CASE_PREFIX} Removed from cases.json; historical row retained."
STALE_PLACEHOLDERS = {
    "System under test is available",
    "Configured fixture/input",
    "Execute configured testcase",
}
STALE_FALLBACK_ITEMS = {"Prediction"}


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
        "actual": registry_state.redact_sensitive(result.get("actual", case.get("actual", ""))),
        "evidence": registry_state.redact_sensitive(result.get("evidence", case.get("evidence", ""))),
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


def _viewpoint_baseline_text(value: Any) -> str:
    # Older USER_ENTERED writes coerced numbers and booleans. Match only the canonical spelling.
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


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
    pending_baselines: tuple[dict[str, Any], ...] = (),
) -> dict[str, Any]:
    is_viewpoint = detail_mode == "viewpoint_table"
    read_options = {"formulas": True} if detail_mode in {"api_table", "screen_table", "viewpoint_table"} else {}
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
    row: list[Any] = build_sheet_row(case, mapping, result, detail_mode=detail_mode)
    prior_auto_row = (
        build_sheet_row(previous_case, mapping, None, detail_mode=detail_mode)
        if previous_case is not None
        else None
    )
    end_column = column_name(max(len(row), 1))
    matches = [
        (n, value) for n, value in rows
        if n >= data_start_row and _matches_case_id(value.removeprefix(MOVED_CASE_PREFIX), case["id"], detail_mode)
    ]
    matches.sort(key=lambda match: match[1].startswith(MOVED_CASE_PREFIX))
    if matches:
        row_number, value = matches[0]
        was_moved = value.startswith(MOVED_CASE_PREFIX)
        if cached_sheet is not None:
            prior = list(cached_sheet[row_number - 1]) if row_number <= len(cached_sheet) else []
        else:
            existing = client.values(spreadsheet_id, tab_name, f"A{row_number}:{end_column}{row_number}", **read_options)
            prior = existing[0] if existing else []
        if is_viewpoint:
            baselines = [build_sheet_row(item, mapping, detail_mode=detail_mode) for item in pending_baselines]
            if prior_auto_row is not None:
                baselines.append(prior_auto_row)
            writes = []
            for field, column in mapping.items():
                index = column_number(column) - 1
                current = prior[index] if index < len(prior) else ""
                baseline_text = _viewpoint_baseline_text(current)
                if field == "id" and was_moved:
                    updated = value.removeprefix(MOVED_CASE_PREFIX)
                elif (field in {"id", "no"} or baseline_text.startswith("=")
                      or not any(baseline_text == old[index] for old in baselines)):
                    continue
                else:
                    updated = row[index]
                if updated != baseline_text:
                    writes.append((tab_name, f"{column}{row_number}:{column}{row_number}", [[updated]]))
                    if cached_sheet is not None:
                        target = cached_sheet[row_number - 1]
                        target.extend([""] * (index + 1 - len(target)))
                        target[index] = updated
            if pending_updates is not None:
                pending_updates.extend(writes)
            else:
                for tab, cell, data in writes:
                    client.update(spreadsheet_id, tab, cell, data, raw=True)
            return {"action": "update" if writes else "unchanged", "tab": tab_name, "row": row_number}
        evidence_column = mapping.get("evidence")
        evidence_index = column_number(evidence_column) - 1 if evidence_column else len(prior)
        prior_evidence = str(prior[evidence_index]) if len(prior) > evidence_index else ""
        was_deprecated = prior_evidence.startswith(DEPRECATED_CASE_PREFIX)
        archive_prefix = DEPRECATED_CASE_NOTICE + "\n"
        archived_evidence = prior_evidence.removeprefix(archive_prefix) if prior_evidence.startswith(archive_prefix) else ""
        result_fields = ("status", "execution", "actual", "evidence", "run_id", "run_at")
        authoritative_result_fields = {
            field
            for field in result_fields
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
            if field == "id" and was_moved:
                prior_value = value.removeprefix(MOVED_CASE_PREFIX)
            new_value = row[index] if index < len(row) else ""
            if was_deprecated and field in result_fields:
                if field == "evidence" and field not in authoritative_result_fields and archived_evidence:
                    merged[index] = archived_evidence
                else:
                    merged[index] = new_value
                continue
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
        changed = [
            value if value != (prior[index] if index < len(prior) else "") else None
            for index, value in enumerate(merged)
        ]
        if archived_evidence and "evidence" not in authoritative_result_fields and not archived_evidence.startswith("="):
            # Evidence is text even if it resembles a number or date.
            changed[evidence_index] = "'" + archived_evidence
        if all(value is None for value in changed):
            return {"action": "unchanged", "tab": tab_name, "row": row_number}
        if cached_sheet is not None:
            while len(cached_sheet) < row_number:
                cached_sheet.append([])
            cached_sheet[row_number - 1] = merged + prior[len(merged):]
        cell_range = f"A{row_number}:{end_column}{row_number}"
        if pending_updates is not None:
            pending_updates.append((tab_name, cell_range, [changed]))
        else:
            client.update(spreadsheet_id, tab_name, cell_range, [changed])
        return {"action": "update", "tab": tab_name, "row": row_number}
    if cached_sheet is not None:
        full_values = cached_sheet
    else:
        full_values = [list(r) for r in client.values(spreadsheet_id, tab_name, "A:Z", **read_options)]
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
    while target_row <= len(full_values) and any(str(cell).strip() for cell in full_values[target_row - 1]):
        target_row += 1
    write_options = {"raw": True} if is_viewpoint else {}
    if mapping.get("no"):
        no_idx = column_number(mapping["no"]) - 1
        seq_count = len({*occupied_rows, *(r for r in claimed_rows if r >= data_start_row)}) + 1
        row[no_idx] = seq_count if is_viewpoint else str(seq_count)
    if pending_updates is not None or target_row <= len(full_values):
        while len(full_values) < target_row:
            full_values.append([])
        full_values[target_row - 1] = list(row)
        if pending_updates is not None:
            pending_updates.append((tab_name, f"A{target_row}:{end_column}{target_row}", [row]))
        else:
            client.update(spreadsheet_id, tab_name, f"A{target_row}:{end_column}{target_row}", [row], **write_options)
        return {"action": "add", "tab": tab_name, "row": target_row}
    while len(full_values) < target_row:
        full_values.append([])
    full_values[target_row - 1] = list(row)
    client.append(spreadsheet_id, tab_name, row, **write_options)
    return {"action": "add", "tab": tab_name, "row": target_row}


def validate_detail_schema(client: SheetsClient, spreadsheet_id: str, tab_name: str, mode: str) -> None:
    layouts = {
        "api_table": ("A13:M14", (
            "id", "item", "testcase name", "precondition test case|precondition", "test data",
            "params", "body", "status code", "body", "expected database|db",
            "result", "excution|execution", "note|remarks",
        )),
        "screen_table": ("A13:K14", (
            "no.|id", "main category", "sub category", "type", "pre-conditions",
            "test descriptions", "steps", "expected result", "testing result",
            "excution|execution", "remarks",
        )),
        "viewpoint_table": ("A1:G2", (
            "no.", "tên bộ phận/ tên hệ thống chức năng", "mục lớn", "mục trung",
            "mục nhỏ", "mục xác nhận", "ghi chú",
        )),
    }
    if mode not in layouts:
        return
    a1, columns = layouts[mode]
    values = client.values(spreadsheet_id, tab_name, a1)
    for index, allowed in enumerate(columns):
        labels = {str(row[index]).strip().casefold() for row in values if index < len(row)}
        if not labels.intersection(allowed.split("|")):
            column = column_name(index + 1)
            raise RuntimeError(f"Detail tab {tab_name!r} schema drift at {column} for {mode}; refusing to write")


def clear_template_case_rows(client: SheetsClient, spreadsheet_id: str, tab_name: str, start_row: int) -> None:
    values = client.values(spreadsheet_id, tab_name, "A:Z")
    if len(values) >= start_row:
        client.clear(spreadsheet_id, tab_name, f"A{start_row}:Z{len(values)}")
