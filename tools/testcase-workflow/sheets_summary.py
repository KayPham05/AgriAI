"""Write Google Sheets dashboards and Viewpoint summaries."""

from __future__ import annotations

import re
from typing import Any

import registry_state
from sheets_client import SheetsClient, quote_sheet_name
from sheets_formulas import _resolve_formula_separator, _summary_ref_formula, calculate_summary_counts
from sheets_rows import column_name, column_number


def _numbered_rows(
    values: list[list[str]], sheet_column: int, start_row: int, end_row: int,
) -> dict[int, int]:
    occupied_rows = [
        row_number
        for row_number, row in enumerate(values[start_row - 1:end_row - 1], start=start_row)
        if len(row) > sheet_column and str(row[sheet_column]).strip()
    ]
    return {row_number: number for number, row_number in enumerate(occupied_rows, start=1)}


def _row_format_requests(
    client: SheetsClient,
    sheet_id: int,
    start_row: int,
    row_number: int,
    width: int,
    sheet_column: int,
    target_gid: int | None,
    was_existing: bool,
) -> list[dict[str, Any]]:
    requests = []
    if not was_existing and row_number > start_row and hasattr(client, "copy_row_style_requests"):
        requests.extend(client.copy_row_style_requests(
            sheet_id, start_row, row_number, row_number, width, include_validation=True,
        ))
    if hasattr(client, "set_hyperlink_request"):
        uri = f"#gid={target_gid}" if target_gid is not None else None
        requests.append(client.set_hyperlink_request(sheet_id, row_number, sheet_column, uri))
    return requests


def _parse_dashboard_int(value: Any) -> int | None:
    text = "" if value is None else str(value).strip()
    if not text:
        return None
    if re.fullmatch(r"\d+", text):
        return int(text)
    if re.fullmatch(r"\d{1,3}(?:,\d{3})+", text) or re.fullmatch(r"\d{1,3}(?:\.\d{3})+", text):
        return int(text.replace(",", "").replace(".", ""))
    return None


def update_summary_dashboard(
    client: SheetsClient, spreadsheet_id: str, sheet: dict[str, Any],
    cases: list[dict[str, Any]], latest: dict[str, Any], moved_source_tabs: set[str] | None = None,
) -> list[dict[str, Any]]:
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
    for detail_tab in moved_source_tabs or ():
        if detail_tab in used_rows:
            grouped.setdefault(detail_tab, [])
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
    formula_sep = _resolve_formula_separator(client, spreadsheet_id, sheet)
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

    seq_by_row = _numbered_rows(values, sheet_col_idx, data_start_row, total_row)

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
        label_case = detail_cases[0] if detail_cases else {}
        name = label_case.get("summary_name") or label_case.get("test_selector")
        if not detail_cases:
            name_index = column_number(mapping["name_column"]) - 1
            name = values[row_number - 1][name_index] if len(values[row_number - 1]) > name_index else ""
        name = name or detail_tab
        active_tab_total = counts["total"] - counts["deprecated"]
        executed = counts["passed"] + counts["failed"] + counts["blocked"]
        remaining = counts["not_run"] + counts["skipped"]
        progress = f"={mapping['passed_column']}{row_number}/{mapping['total_column']}{row_number}" if active_tab_total else 0
        if not detail_cases:
            progress = f"=IFERROR({mapping['passed_column']}{row_number}/{mapping['total_column']}{row_number}{formula_sep}0)"
        status = "To do" if active_tab_total == 0 or executed == 0 else "Test Done" if remaining == 0 else "Testing"
        status_formula = (
            f'=IF({mapping["total_column"]}{row_number}=0{formula_sep}"To do"{formula_sep}'
            f'IF({mapping["passed_column"]}{row_number}+{mapping["failed_column"]}{row_number}+{mapping["blocked_column"]}{row_number}=0{formula_sep}"To do"{formula_sep}'
            f'IF({mapping["not_run_column"]}{row_number}=0{formula_sep}"Test Done"{formula_sep}"Testing")))'
        )
        no_value = seq_by_row.get(row_number, row_number - data_start_row + 1)
        quoted_tab = quote_sheet_name(detail_tab)
        row_cells: list[Any] = []
        if no_col:
            row_cells.append(no_value)
        row_cells.extend([
            detail_tab,
            name,
            _summary_ref_formula(quoted_tab, "total", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "passed", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "failed", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "blocked", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "not_run", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "automation", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "manual", cell_refs, sheet, formula_sep),
            _summary_ref_formula(quoted_tab, "na", cell_refs, sheet, formula_sep),
        ])
        if has_type_cols:
            row_cells.extend([
                _summary_ref_formula(quoted_tab, "ui", cell_refs, sheet, formula_sep),
                _summary_ref_formula(quoted_tab, "function", cell_refs, sheet, formula_sep),
                _summary_ref_formula(quoted_tab, "validate", cell_refs, sheet, formula_sep),
            ])
        if mapping.get("status_column"):
            row_cells.append(status_formula)
        if mapping.get("progress_column"):
            row_cells.append(progress)
        start_col_letter = no_col or mapping["sheet_name_column"]
        write_end_col = mapping.get("progress_column") or mapping.get("status_column") or (mapping.get("validate_column") if has_type_cols else mapping["na_column"])
        pending_writes.append((tab_name, f"{start_col_letter}{row_number}:{write_end_col}{row_number}", [row_cells]))
        style_requests.extend(_row_format_requests(
            client, summary_sheet_id, data_start_row, row_number, end_col_count,
            sheet_col_idx, gid_by_title.get(detail_tab), was_existing,
        ))
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
    if moved_source_tabs:
        total_progress = f"=IFERROR({mapping['passed_column']}{total_row}/{mapping['total_column']}{total_row}{formula_sep}0)"
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
        pct_formulas = [f"=IFERROR({col}{total_row}/{mapping['total_column']}{total_row}{formula_sep}0)" for col in pct_cols]
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

    seq_by_row = _numbered_rows(values, sheet_column, data_start_row, len(values) + 1)

    # Pass 2: write aggregated rows while preserving existing row styles
    for detail_tab, tab_cases in grouped.items():
        statuses = [latest.get(item["id"], {}).get("status", item.get("status", "Not run")) for item in tab_cases]
        status = aggregate_viewpoint_status(statuses)
        evidences = list(dict.fromkeys(
            registry_state.redact_sensitive(latest.get(item["id"], {}).get("evidence", item.get("evidence", ""))).strip()
            for item in tab_cases
            if registry_state.redact_sensitive(latest.get(item["id"], {}).get("evidence", item.get("evidence", ""))).strip()
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
        if summary_sheet_id is not None:
            style_requests.extend(_row_format_requests(
                client, summary_sheet_id, data_start_row, row_number, table_width,
                sheet_column, gid_by_title.get(detail_tab), was_existing,
            ))
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
