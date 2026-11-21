"""Counts and formulas for Google Sheets testcase summaries."""

from __future__ import annotations

import re
from typing import Any

from sheets_rows import DEPRECATED_CASE_PREFIX, MOVED_CASE_PREFIX


_COMMA_DECIMAL_LOCALES = ("en", "ja", "ko", "zh", "th", "hi", "ms")


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


def formula_separator_for_locale(locale: str) -> str:
    """Return Google Sheets formula argument separator (',' or ';') for spreadsheet locale."""
    clean = str(locale or "").strip().lower()
    if not clean:
        return ";"
    if clean.startswith(_COMMA_DECIMAL_LOCALES):
        return ","
    return ";"


def _resolve_formula_separator(client: Any, spreadsheet_id: str, sheet: dict[str, Any]) -> str:
    explicit = str(sheet.get("formula_separator", "")).strip()
    if explicit in {",", ";"}:
        return explicit
    if hasattr(client, "spreadsheet_locale"):
        return formula_separator_for_locale(client.spreadsheet_locale(spreadsheet_id))
    return ";"


def _summary_ref_formula(
    quoted_tab: str,
    metric: str,
    cell_refs: dict[str, str],
    sheet: dict[str, Any] | None = None,
    formula_sep: str = ";",
) -> str:
    if metric == "na" and "na_formula" in cell_refs and "na" not in cell_refs:
        mapping = (sheet or {}).get("detail_mapping", {})
        start_row = int((sheet or {}).get("detail_data_start_row", 16))
        exec_col = mapping.get("execution", "L")
        raw = str(cell_refs["na_formula"])
        if "{sep}" not in raw and formula_sep == ",":
            raw = raw.replace(";", ",")
        return "=" + raw.format(
            tab=quoted_tab,
            exec_col=exec_col,
            id_col=mapping.get("id", "A"),
            evidence_col=mapping.get("evidence", "M"),
            moved_criterion=f"<>{MOVED_CASE_PREFIX.rstrip()}*",
            deprecated_criterion=f"<>{DEPRECATED_CASE_PREFIX}*",
            start_row=start_row,
            sep=formula_sep,
        )
    return f"={quoted_tab}!{cell_refs[metric]}"


def _parse_cell_ref(cell_ref: str) -> tuple[str, int]:
    match = re.fullmatch(r"([A-Za-z]+)(\d+)", str(cell_ref).strip())
    if not match:
        raise ValueError(f"invalid A1 cell reference: {cell_ref!r}")
    return match.group(1).upper(), int(match.group(2))


def _format_sum_ref_expr(cell_refs: dict[str, str], keys: tuple[str, ...], formula_sep: str) -> str:
    parsed = [_parse_cell_ref(cell_refs[k]) for k in keys]
    cols = {col for col, _ in parsed}
    rows = [row for _, row in parsed]
    if len(cols) == 1 and rows == list(range(rows[0], rows[0] + len(rows))):
        return f"SUM({cell_refs[keys[0]]}:{cell_refs[keys[-1]]})"
    return f"SUM({formula_sep.join(cell_refs[k] for k in keys)})"


def build_detail_summary_updates(
    detail_tab: str,
    summary_label: str,
    sheet: dict[str, Any],
    formula_sep: str = ";",
) -> list[tuple[str, str, list[list[Any]]]]:
    """Build config-driven detail header and dynamic open-ended summary formula updates."""
    updates: list[tuple[str, str, list[list[Any]]]] = []
    detail_header = sheet.get("detail_header") or {}
    for range_key, a1_range in detail_header.items():
        if not range_key.endswith("_range"):
            continue
        rows_key = range_key[:-6] + "_rows"
        raw_rows = detail_header.get(rows_key)
        if not raw_rows:
            continue
        formatted_rows = [
            [
                cell.format(detail_tab=detail_tab, summary_label=summary_label) if isinstance(cell, str) else cell
                for cell in row
            ]
            for row in raw_rows
        ]
        updates.append((detail_tab, str(a1_range), formatted_rows))

    refs = sheet.get("summary_cell_refs") or {}
    mapping = sheet.get("detail_mapping") or {}
    start_row = int(sheet.get("detail_data_start_row", 1))
    id_col = mapping.get("id", "A")
    count_field = sheet.get("detail_count_field") or ("test_name" if "test_name" in mapping else "sub_category")
    count_col = mapping.get(count_field, id_col)
    status_col = mapping.get("status", "")
    exec_col = mapping.get("execution", "")
    type_col = mapping.get("type", "")
    id_range = f"${id_col}{start_row}:${id_col}"
    active_rows = f'{id_range}{formula_sep}"<>{MOVED_CASE_PREFIX.rstrip()}*"'
    evidence_col = mapping.get("evidence")
    if evidence_col:
        active_rows += f'{formula_sep}${evidence_col}{start_row}:${evidence_col}{formula_sep}"<>{DEPRECATED_CASE_PREFIX}*"'

    def count_active(column: str, value: str) -> str:
        return f'=COUNTIFS({column}{start_row}:{column}{formula_sep}"{value}"{formula_sep}{active_rows})'

    formulas: dict[str, str] = {}
    if status_col:
        formulas["passed"] = count_active(status_col, "Passed")
        formulas["failed"] = count_active(status_col, "Failed")
        formulas["blocked"] = count_active(status_col, "Blocked")
    if exec_col:
        formulas["automation"] = count_active(exec_col, "Auto")
        formulas["manual"] = count_active(exec_col, "Manual")
        formulas["na"] = count_active(exec_col, "N/A")
    if type_col:
        formulas["ui"] = count_active(type_col, "UI")
        formulas["function"] = count_active(type_col, "FUNCTION")
        formulas["validate"] = count_active(type_col, "VALIDATE")
    formulas["total"] = f'=COUNTIFS({id_range}{formula_sep}"<>"{formula_sep}${count_col}{start_row}:${count_col}{formula_sep}"<>"{formula_sep}{active_rows})'
    if "total" in refs and {"passed", "failed", "blocked"}.issubset(refs):
        formulas["not_run"] = f'={refs["total"]}-{_format_sum_ref_expr(refs, ("passed", "failed", "blocked"), formula_sep)}'

    metrics = sheet.get("detail_formula_metrics") or []
    by_col: dict[str, list[tuple[int, str]]] = {}
    for metric in metrics:
        if metric in refs and metric in formulas:
            col, row_num = _parse_cell_ref(refs[metric])
            by_col.setdefault(col, []).append((row_num, formulas[metric]))

    for col, items in by_col.items():
        ordered = sorted(items, key=lambda pair: pair[0])
        span_start = span_end = ordered[0][0]
        span_rows = [[ordered[0][1]]]
        for row_num, expr in ordered[1:]:
            if row_num == span_end + 1:
                span_end = row_num
                span_rows.append([expr])
            else:
                updates.append((detail_tab, f"{col}{span_start}:{col}{span_end}", span_rows))
                span_start = span_end = row_num
                span_rows = [[expr]]
        updates.append((detail_tab, f"{col}{span_start}:{col}{span_end}", span_rows))
    return updates
