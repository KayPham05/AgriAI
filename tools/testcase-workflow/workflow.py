#!/usr/bin/env python3
"""Command line entrypoint and compatibility imports for the testcase workflow."""

from __future__ import annotations

import argparse
from contextlib import nullcontext
from pathlib import Path

from case_runners import (
    run_all,
    run_case,
    run_group,
)
from http_checks import check_guest_prediction, check_health
from registry_state import (
    CONFIG,
    CaseResult,
    artifact_execution,
    KINDS,
    ROOT,
    STATE,
    deprecated_case_ids,
    emit_result,
    import_results,
    load_cases,
    load_previous_cases_from_git,
    load_sheets,
    normalize_case,
    normalize_tab_name,
    read_json,
    record_result,
    redact_sensitive,
    state_lock,
    write_json_atomic,
)
from runner_reports import parse_trx_case_results, parse_vitest_case_results
from sheets_client import quote_sheet_name
from sheets_formulas import (
    build_detail_summary_updates,
    calculate_summary_counts,
    formula_separator_for_locale,
)
from sheets_rows import (
    build_sheet_row,
    clear_template_case_rows,
    column_name,
    column_number,
    normalize_execution_label,
    normalize_sheet_status,
    upsert_row,
    validate_detail_schema,
)
from sheets_summary import (
    aggregate_viewpoint_status,
    map_viewpoint_overview_status,
    update_summary_dashboard,
    update_summary_list,
)
from sheets_sync import sync

__all__ = [
    "CONFIG",
    "CaseResult",
    "KINDS",
    "ROOT",
    "STATE",
    "aggregate_viewpoint_status",
    "build_detail_summary_updates",
    "build_sheet_row",
    "calculate_summary_counts",
    "check_guest_prediction",
    "check_health",
    "clear_template_case_rows",
    "column_name",
    "column_number",
    "deprecated_case_ids",
    "emit_result",
    "formula_separator_for_locale",
    "import_results",
    "load_cases",
    "load_previous_cases_from_git",
    "load_sheets",
    "main",
    "map_viewpoint_overview_status",
    "normalize_case",
    "normalize_execution_label",
    "normalize_sheet_status",
    "normalize_tab_name",
    "parse_trx_case_results",
    "parse_vitest_case_results",
    "quote_sheet_name",
    "read_json",
    "record_result",
    "redact_sensitive",
    "run_all",
    "run_case",
    "run_group",
    "state_lock",
    "sync",
    "update_summary_dashboard",
    "update_summary_list",
    "upsert_row",
    "validate_detail_schema",
    "write_json_atomic",
]


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
    emits_results = args.command in {"run", "run-all", "run-case", "check-health", "check-guest-prediction"}
    try:
        with artifact_execution() if emits_results else nullcontext():
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
                if not check_health(args.url):
                    raise SystemExit(1)
            elif args.command == "import-results":
                import_results(Path(args.root))
            elif args.command == "check-guest-prediction":
                if not check_guest_prediction(args.url, args.file):
                    raise SystemExit(1)
    except (RuntimeError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
