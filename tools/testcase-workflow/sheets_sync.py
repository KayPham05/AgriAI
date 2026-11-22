"""Publish testcase rows and preserve recoverable Google Sheets snapshots."""

from __future__ import annotations

import json
import os
from typing import Any

import registry_state
from sheets_client import SYNC_SNAPSHOT_TAB, SheetsClient
from sheets_formulas import _resolve_formula_separator, build_detail_summary_updates
from sheets_rows import (
    DEPRECATED_CASE_NOTICE,
    DEPRECATED_CASE_PREFIX,
    MOVED_CASE_PREFIX,
    _matches_case_id,
    column_number,
    upsert_row,
    validate_detail_schema,
)
from sheets_summary import update_summary_dashboard, update_summary_list


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


def _case_location(case: dict[str, Any]) -> tuple[str, str, str]:
    return case["id"], case["kind"], case.get("detail_tab") or case["tab"]


def _archive_obsolete_rows(
    client: SheetsClient,
    sheets: dict[str, dict[str, Any]],
    obsolete_cases: list[dict[str, Any]],
    active_ids: set[str],
    tab_values_cache: dict[tuple[str, str], list[list[str]]],
) -> dict[str, set[str]]:
    """Archive obsolete locations after destination writes, keeping historical statuses."""
    titles_by_kind: dict[str, set[str]] = {}
    sources_by_kind: dict[str, set[str]] = {}
    updates_by_kind: dict[str, list[tuple[str, str, list[list[Any]]]]] = {}
    for previous in obsolete_cases:
        case_id, kind, tab = _case_location(previous)
        sheet = sheets[kind]
        sid = sheet["id"]
        moved = case_id in active_ids
        if not moved and sheet["detail_mode"] == "viewpoint_table":
            continue
        if kind not in titles_by_kind:
            titles_by_kind[kind] = {item["title"] for item in client.sheet_metadata(sid)}
        if tab not in titles_by_kind[kind]:
            continue
        key = (sid, tab)
        rows = tab_values_cache.get(key)
        if rows is None:
            validate_detail_schema(client, sid, tab, sheet["detail_mode"])
            rows = [list(row) for row in client.values(sid, tab, "A:Z", formulas=True)]
            tab_values_cache[key] = rows
        column = sheet["detail_mapping"]["id"]
        index = column_number(column) - 1
        start_row = int(sheet["detail_data_start_row"])
        for row_number, row in enumerate(rows[start_row - 1:], start=start_row):
            if len(row) <= index:
                continue
            value = str(row[index]).strip()
            if not _matches_case_id(value.removeprefix(MOVED_CASE_PREFIX), case_id, sheet["detail_mode"]):
                continue
            sources_by_kind.setdefault(kind, set()).add(tab)
            if value.startswith(MOVED_CASE_PREFIX):
                continue
            updates = updates_by_kind.setdefault(kind, [])
            if moved:
                updates.append((tab, f"{column}{row_number}:{column}{row_number}", [[MOVED_CASE_PREFIX + value]]))
            else:
                mapping = sheet["detail_mapping"]
                if execution_column := mapping.get("execution"):
                    updates.append((tab, f"{execution_column}{row_number}:{execution_column}{row_number}", [["N/A"]]))
                if evidence_column := mapping.get("evidence"):
                    evidence_index = column_number(evidence_column) - 1
                    evidence = str(row[evidence_index]) if len(row) > evidence_index else ""
                    if not evidence.startswith(DEPRECATED_CASE_PREFIX):
                        archived = f"{DEPRECATED_CASE_NOTICE}\n{evidence}" if evidence else DEPRECATED_CASE_NOTICE
                        updates.append((tab, f"{evidence_column}{row_number}:{evidence_column}{row_number}", [[archived]]))

    for kind, tabs in sources_by_kind.items():
        sheet = sheets[kind]
        sid = sheet["id"]
        updates = updates_by_kind.setdefault(kind, [])
        if sheet.get("summary_mode") == "dashboard":
            formula_sep = _resolve_formula_separator(client, sid, sheet)
            for tab in sorted(tabs):
                updates.extend(build_detail_summary_updates(tab, tab, {**sheet, "detail_header": {}}, formula_sep))
        if updates:
            client.batch_update(sid, updates)
    return sources_by_kind


def sync(dry_run: bool, write_sheets: bool) -> None:
    if write_sheets and not dry_run:
        with registry_state.state_lock(registry_state.STATE.with_name("sheets-sync.lock")):
            _sync(dry_run, write_sheets)
    else:
        _sync(dry_run, write_sheets)


def _sync(dry_run: bool, write_sheets: bool) -> None:
    cases = registry_state.load_cases()
    if any(case["detail_tab"] == SYNC_SNAPSHOT_TAB for case in cases):
        raise ValueError(f"Testcases cannot use the reserved snapshot tab {SYNC_SNAPSHOT_TAB!r}")
    sheets = registry_state.load_sheets()
    state = registry_state.load_state()
    effective_latest = dict(state.get("latest_results", {}))
    client = None
    snapshot = None
    if write_sheets and not dry_run:
        if os.getenv("AGRIVISION_WRITE_SHEETS", "").lower() != "true":
            raise RuntimeError("Sheets write blocked. Set AGRIVISION_WRITE_SHEETS=true explicitly.")
        client = SheetsClient()
        snapshot = client.load_sync_snapshot(sheets["api"]["id"])
    previous_cases = snapshot["cases"] if snapshot is not None else state.get("cases") or registry_state.load_previous_cases_from_git()
    pending_cases = snapshot["pending"] if snapshot is not None else []
    active_cases = {case["id"]: case for case in cases}
    active_ids = set(active_cases)
    current_locations = {_case_location(case): case for case in cases}
    published_locations = {
        _case_location(case): case
        for case in previous_cases.values()
        if case.get("kind") in sheets and (case.get("detail_tab") or case.get("tab"))
    }
    pending_by_location: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for pending in pending_cases:
        pending_by_location.setdefault(_case_location(pending), []).append(pending)
    pending_locations = {location: candidates[-1] for location, candidates in pending_by_location.items()}
    previous_locations = published_locations | pending_locations
    obsolete_cases = [case for location, case in previous_locations.items() if location not in current_locations]
    deprecated_ids = registry_state.deprecated_case_ids({**previous_cases, **{case["id"]: case for case in pending_cases}}, cases)
    changes = []
    moved_ids = {case["id"] for case in obsolete_cases} & active_ids
    for case in cases:
        sheet = sheets[case["kind"]]
        previous = previous_cases.get(case["id"])
        action = "unchanged"
        if previous is None:
            action = "add"
        elif case["id"] in moved_ids:
            action = "move"
        else:
            previous_kind = previous.get("kind") or case["kind"]
            previous_tab = previous.get("detail_tab") or previous.get("tab")
            if (previous_kind, previous_tab) != (case["kind"], case["detail_tab"]):
                action = "move"
        changes.append({"id": case["id"], "kind": case["kind"], "detail_tab": case["detail_tab"], "summary_tab": sheet["summary_tab"], "action": action})
    print(json.dumps({"dry_run": dry_run, "case_count": len(cases), "deprecated_ids": deprecated_ids, "changes": changes}, ensure_ascii=False, indent=2))
    if dry_run:
        return
    if client is None:
        with registry_state.state_lock(wait=True):
            state = registry_state.load_state()
            state["schema_version"] = 2
            registry_state.write_json_atomic(registry_state.STATE, state)
        return
    # Journal possible destination rows before any of the workbooks can change.
    attempted = list(pending_cases)
    for location, case in current_locations.items():
        published_case = published_locations.get(location)
        if published_case is None or (case["kind"] == "viewpoint" and case != published_case):
            if case not in attempted:
                attempted.append(case)
    journal = {"cases": previous_cases, "pending": attempted}
    snapshot_sid = sheets["api"]["id"]
    if journal != snapshot:
        client.save_sync_snapshot(snapshot_sid, journal)
    for case_id in active_ids:
        if effective_latest.get(case_id, {}).get("status") == "Deprecated":
            del effective_latest[case_id]
    grouped = {kind: [case for case in cases if case["kind"] == kind] for kind in registry_state.KINDS}
    pending_updates: dict[str, list[tuple[str, str, list[list[str]]]]] = {kind: [] for kind in registry_state.KINDS}
    viewpoint_updates: list[tuple[str, str, list[list[Any]]]] = []
    detail_style_requests: dict[str, list[dict[str, Any]]] = {kind: [] for kind in registry_state.KINDS}
    prepared_tabs: dict[tuple[str, str], int] = {}
    tab_config: dict[tuple[str, str], tuple[str, int, int]] = {}
    added_rows_by_tab: dict[tuple[str, str], list[int]] = {}
    tab_values_cache: dict[tuple[str, str], list[list[str]]] = {}
    formula_sep_by_kind: dict[str, str] = {}
    for case in cases:
        sheet = sheets[case["kind"]]
        result = effective_latest.get(case["id"])
        tab_key = (sheet["id"], case["detail_tab"])
        start_row = int(sheet.get("detail_data_start_row", 1))
        end_col_count = max(column_number(c) for c in sheet["detail_mapping"].values())
        if tab_key not in prepared_tabs:
            detail_meta = client.ensure_sheet(
                sheet["id"],
                case["detail_tab"],
                sheet.get("template_tab"),
                clear_from_row=start_row,
            )
            validate_detail_schema(client, sheet["id"], case["detail_tab"], sheet.get("detail_mode", "table"))
            tab_values_cache[tab_key] = [list(r) for r in client.values(sheet["id"], case["detail_tab"], "A:Z", formulas=True)]
            prepared_tabs[tab_key] = int(detail_meta["sheetId"])
            tab_config[tab_key] = (case["kind"], start_row, end_col_count)
            if case["kind"] not in formula_sep_by_kind:
                formula_sep_by_kind[case["kind"]] = _resolve_formula_separator(client, sheet["id"], sheet)
            summary_label = case.get("summary_name") or case["detail_tab"]
            pending_updates[case["kind"]].extend(
                build_detail_summary_updates(
                    case["detail_tab"],
                    summary_label,
                    sheet,
                    formula_sep_by_kind[case["kind"]],
                )
            )
        location = _case_location(case)
        is_viewpoint = case["kind"] == "viewpoint"
        upserted = upsert_row(
            client,
            sheet["id"],
            case["detail_tab"],
            case,
            sheet["detail_mapping"],
            result,
            sheet.get("detail_mode", "table"),
            start_row,
            viewpoint_updates if is_viewpoint else pending_updates[case["kind"]],
            tab_values_cache,
            previous_case=published_locations.get(location) if is_viewpoint else previous_cases.get(case["id"]),
            pending_baselines=tuple(pending_by_location.get(location, ())) if is_viewpoint else (),
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
    if viewpoint_updates:
        client.batch_update(sheets["viewpoint"]["id"], viewpoint_updates, raw=True)
    archived_tabs = _archive_obsolete_rows(client, sheets, obsolete_cases, active_ids, tab_values_cache)
    for kind, kind_cases in grouped.items():
        sheet = sheets[kind]
        if sheet.get("summary_mode") == "list":
            update_summary_list(client, sheet["id"], sheet, kind_cases, effective_latest)
        else:
            update_summary_dashboard(client, sheet["id"], sheet, kind_cases, effective_latest, archived_tabs.get(kind))
    published = {"cases": active_cases, "pending": []}
    if published != journal:
        client.save_sync_snapshot(snapshot_sid, published)
    with registry_state.state_lock(wait=True):
        # Results can arrive while the remote Sheets writes are in progress.
        state = registry_state.load_state()
        state["schema_version"] = 2
        state["cases"] = active_cases
        latest = state.setdefault("latest_results", {})
        for case_id in active_ids:
            if latest.get(case_id, {}).get("status") == "Deprecated":
                del latest[case_id]
        for case_id in deprecated_ids:
            latest[case_id] = {
                "id": case_id, "status": "Deprecated", "execution": "N/A",
                "evidence": "Removed from cases.json; historical row retained.",
            }
        registry_state.write_json_atomic(registry_state.STATE, state)
