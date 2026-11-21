"""Read runner reports and match executed tests to configured testcase IDs."""

from __future__ import annotations

import re
from dataclasses import replace
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

import registry_state
from registry_state import CaseResult

REPORT_READ_ERRORS = (OSError, ValueError, TypeError, OverflowError, LookupError, ElementTree.ParseError)


class PlaywrightCoverageError(ValueError):
    """The report is readable but its testcase IDs do not match the configured group."""


def report_error_reason(group: str, error: Exception) -> str:
    detail = registry_state.redact_sensitive(str(error))[:400]
    return f"{group} report is invalid or unreadable: {type(error).__name__}: {detail}"


def _json_report(report_path: Path) -> dict[str, Any]:
    payload = registry_state.read_json(report_path)
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    return payload


def _report_records(records: Any, field: str) -> list[dict[str, Any]]:
    if not isinstance(records, list) or any(not isinstance(record, dict) for record in records):
        raise ValueError(f"Expected an array of objects for {field}")
    return records


def read_playwright_report(report_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = _json_report(report_path)
    cases = _report_records(payload.get("cases"), "cases")
    for case in cases:
        status = str(case.get("status", "")).strip()
        if status not in {"Passed", "Failed", "Skipped"}:
            raise ValueError("Expected a Passed, Failed or Skipped Playwright outcome")
        if status == "Passed" and not str(case.get("test") or "").strip():
            raise ValueError("A passed Playwright result must identify its executed test")
    return payload, cases


def _playwright_failure_detail(detail: str) -> str:
    lines = [line.strip() for line in detail.splitlines() if line.strip()]
    for index in range(len(lines) - 1, -1, -1):
        if re.match(r"^[\w.]*(?:Error|Exception):", lines[index]):
            return " ".join(lines[index:])
    return " ".join(lines)


def parse_playwright_group(
    report: Path,
    expected_ids: set[str],
    run: CaseResult,
    returncode: int,
) -> tuple[list[CaseResult], CaseResult]:
    payload, cases = read_playwright_report(report)
    reported_ids = [str(case.get("id", "")).strip() for case in cases]
    actual_ids = set(reported_ids)
    if not expected_ids or actual_ids != expected_ids or len(reported_ids) != len(expected_ids):
        missing = sorted(expected_ids - actual_ids)
        unexpected = sorted(actual_ids - expected_ids)
        raise PlaywrightCoverageError(
            "Playwright report testcase IDs do not match configuration "
            f"(missing={missing}, unexpected={unexpected}, records={len(reported_ids)})"
        )
    duration = run.duration_seconds or 0.0
    per_case_duration = round(duration / len(cases), 3)
    results = []
    for case_id, case in zip(reported_ids, cases):
        status = str(case["status"]).strip()
        test_name = str(case.get("test", "")).strip()
        detail = str(case.get("detail", "")).strip()
        if status == "Passed":
            actual = f"{case_id} passed via {test_name}"
        else:
            reason = _playwright_failure_detail(detail)
            actual = registry_state.redact_sensitive(f"{case_id} {status.lower()} via {test_name}: {reason}")[:500]
        results.append(replace(
            run,
            id=case_id,
            status=status,
            actual=actual,
            command=f"python tests/browser/e2e/run_suite.py --case {case_id}",
            evidence=f"run_id={run.run_id}; selector={test_name}",
            evidence_kind="per_case",
            exit_code=0 if status == "Passed" else 1,
            duration_seconds=per_case_duration,
            selector=test_name,
        ))

    passed = sum(result.status == "Passed" for result in results)
    status = "Passed" if returncode == 0 and passed == len(cases) else "Failed"
    summary = replace(
        run,
        status=status,
        actual=f"{passed}/{len(cases)} Playwright E2E UI cases passed in {duration:.3f}s",
        evidence=(f"run_id={run.run_id}; browser={payload.get('browser', 'chromium-headless')}; "
                  f"build={payload.get('build_mode', 'next-production')}"),
        exit_code=0 if status == "Passed" else returncode or 1,
    )
    return results, summary


def _parse_trx_duration(raw: str) -> float:
    text = str(raw or "").strip()
    if not text:
        return 0.0
    parts = text.split(":")
    if len(parts) != 3:
        return 0.0
    try:
        hours, minutes, seconds = int(parts[0]), int(parts[1]), float(parts[2])
    except ValueError:
        return 0.0
    return hours * 3600.0 + minutes * 60.0 + seconds


def _match_dotnet_selector(selector: str, full_method_name: str, test_name: str) -> bool:
    if not selector:
        return False
    if selector.startswith("FullyQualifiedName="):
        target = selector.split("=", 1)[1]
        return full_method_name == target or test_name == target
    target = selector.split("~", 1)[1] if selector.startswith("FullyQualifiedName~") else selector
    return target in full_method_name or target in test_name


def _build_parsed_case_result(
    case_id: str,
    selector: str,
    command: str,
    evidence: str,
    matches: list[tuple[str, str]],
    runner_label: str,
    run_id: str,
    run_at: str,
    group_name: str,
    duration_seconds: float,
    failed_states: set[str],
    passed_state: str,
) -> CaseResult:
    """Aggregate matched test entries (status, message) into a single per-case CaseResult."""
    if not matches:
        return CaseResult(
            id=case_id,
            status="Blocked",
            execution="Auto",
            actual=f"{case_id} matched 0 executed tests in {runner_label} for {selector}",
            command=command,
            evidence=evidence,
            blocker=f"No matching {runner_label} result",
            run_at=run_at,
            run_id=run_id,
            evidence_kind="per_case",
            group=group_name,
            exit_code=1,
            duration_seconds=duration_seconds,
            selector=selector,
        )

    failed = [item for item in matches if item[0] in failed_states]
    non_passed = [item for item in matches if item[0] != passed_state]
    if failed:
        detail = failed[0][1].splitlines()[-1].strip() if failed[0][1] else failed[0][0]
        return CaseResult(
            id=case_id,
            status="Failed",
            execution="Auto",
            actual=registry_state.redact_sensitive(f"{case_id} failed via {selector}: {detail}"[:500]),
            command=command,
            evidence=evidence,
            run_at=run_at,
            run_id=run_id,
            evidence_kind="per_case",
            group=group_name,
            exit_code=1,
            duration_seconds=duration_seconds,
            selector=selector,
        )
    if non_passed:
        outcomes = ",".join(sorted({item[0] or "Unknown" for item in non_passed}))
        return CaseResult(
            id=case_id,
            status="Blocked",
            execution="Auto",
            actual=f"{case_id} non-passed {runner_label} outcome ({outcomes}) for {selector}",
            command=command,
            evidence=evidence,
            blocker=f"{runner_label} outcome: {outcomes}",
            run_at=run_at,
            run_id=run_id,
            evidence_kind="per_case",
            group=group_name,
            exit_code=1,
            duration_seconds=duration_seconds,
            selector=selector,
        )
    return CaseResult(
        id=case_id,
        status="Passed",
        execution="Auto",
        actual=f"{case_id} passed ({len(matches)}/{len(matches)} {runner_label} tests) via {selector}",
        command=command,
        evidence=evidence,
        run_at=run_at,
        run_id=run_id,
        evidence_kind="per_case",
        group=group_name,
        exit_code=0,
        duration_seconds=duration_seconds,
        selector=selector,
    )


def parse_trx_case_results(
    trx_path: Path,
    cases: list[dict[str, Any]],
    run_id: str,
    run_at: str,
    group_name: str,
) -> tuple[list[CaseResult], dict[str, int]]:
    """Parse a VSTest .trx XML report into per-case CaseResult items matched by selector."""
    root = ElementTree.parse(trx_path).getroot()
    if root.tag.rsplit("}", 1)[-1] != "TestRun":
        raise ValueError("Expected a TRX TestRun element")
    method_by_id: dict[str, str] = {}
    for unit_test in root.findall(".//{*}UnitTest"):
        test_id = unit_test.get("id", "")
        test_method = unit_test.find(".//{*}TestMethod")
        if test_method is not None and test_method.get("className") and test_method.get("name"):
            method_by_id[test_id] = f"{test_method.get('className')}.{test_method.get('name')}"
        elif test_id:
            method_by_id[test_id] = unit_test.get("name", "")

    entries: list[tuple[str, str, str, float, str]] = []
    for result_node in root.findall(".//{*}UnitTestResult"):
        test_id = result_node.get("testId", "")
        test_name = result_node.get("testName", "")
        full_method = method_by_id.get(test_id, test_name)
        outcome = result_node.get("outcome", "")
        duration = _parse_trx_duration(result_node.get("duration", ""))
        err_node = result_node.find(".//{*}ErrorInfo/{*}Message")
        err_msg = (err_node.text or "").strip() if err_node is not None else ""
        entries.append((full_method, test_name, outcome, duration, err_msg))

    counters = root.find(".//{*}Counters")
    counts = {
        "total": int(counters.get("total", len(entries))) if counters is not None else len(entries),
        "passed": int(counters.get("passed", sum(1 for item in entries if item[2] == "Passed"))) if counters is not None else sum(1 for item in entries if item[2] == "Passed"),
        "failed": int(counters.get("failed", sum(1 for item in entries if item[2] in {"Failed", "Error", "Timeout", "Aborted"}))) if counters is not None else sum(1 for item in entries if item[2] in {"Failed", "Error", "Timeout", "Aborted"}),
    }

    results = []
    for case in cases:
        selector = str(case.get("selector", "")).strip()
        matches = [item for item in entries if _match_dotnet_selector(selector, item[0], item[1])]
        results.append(_build_parsed_case_result(
            case_id=case["id"],
            selector=selector,
            command=f"dotnet test tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj --no-restore --filter {selector}",
            evidence=f"run_id={run_id}; selector={selector}; trx_matches={len(matches)}",
            matches=[(item[2], item[4]) for item in matches],
            runner_label="TRX",
            run_id=run_id,
            run_at=run_at,
            group_name=group_name,
            duration_seconds=round(sum(item[3] for item in matches), 3),
            failed_states={"Failed", "Error", "Timeout", "Aborted"},
            passed_state="Passed",
        ))
    return results, counts


def _match_vitest_selector(
    selector: str,
    source_path: str,
    file_name: str,
    full_name: str,
    title: str,
) -> bool:
    if not selector:
        return False
    if source_path:
        norm_source = source_path.replace("\\", "/").lstrip("./")
        norm_file = file_name.replace("\\", "/")
        if not norm_file.endswith(norm_source):
            return False
    return selector in full_name or selector in title


def parse_vitest_case_results(
    report_path: Path,
    cases: list[dict[str, Any]],
    run_id: str,
    run_at: str,
    group_name: str,
) -> tuple[list[CaseResult], dict[str, int]]:
    """Parse a Vitest JSON report into per-case CaseResult items matched by source and selector."""
    payload = _json_report(report_path)
    entries: list[tuple[str, str, str, str, float, str]] = []
    for file_result in _report_records(payload.get("testResults"), "testResults"):
        file_name = str(file_result.get("name", ""))
        for assertion in _report_records(file_result.get("assertionResults", []), "assertionResults"):
            full_name = str(assertion.get("fullName", ""))
            title = str(assertion.get("title", ""))
            status = str(assertion.get("status", "")).lower()
            duration_ms = float(assertion.get("duration") or 0.0)
            failures = assertion.get("failureMessages") or []
            if not isinstance(failures, list):
                raise ValueError("Expected an array for failureMessages")
            failure_msg = str(failures[0]).strip() if failures else ""
            entries.append((file_name, full_name, title, status, duration_ms, failure_msg))

    counts = {
        "total": int(payload.get("numTotalTests", len(entries))),
        "passed": int(payload.get("numPassedTests", sum(1 for item in entries if item[3] == "passed"))),
        "failed": int(payload.get("numFailedTests", sum(1 for item in entries if item[3] == "failed"))),
    }

    results = []
    for case in cases:
        selector = str(case.get("selector", "")).strip()
        source_path = str(case.get("source_path", "")).strip()
        matches = [
            item
            for item in entries
            if _match_vitest_selector(selector, source_path, item[0], item[1], item[2])
        ]
        rel_source = Path(source_path)
        if rel_source.parts and rel_source.parts[0].lower() == "frontend":
            rel_source = Path(*rel_source.parts[1:])
        results.append(_build_parsed_case_result(
            case_id=case["id"],
            selector=selector,
            command=f"pnpm exec vitest run {rel_source.as_posix()} -t {selector}",
            evidence=f"run_id={run_id}; selector={selector}; vitest_matches={len(matches)}",
            matches=[(item[3], item[5]) for item in matches],
            runner_label="Vitest",
            run_id=run_id,
            run_at=run_at,
            group_name=group_name,
            duration_seconds=round(sum(item[4] for item in matches) / 1000.0, 3),
            failed_states={"failed"},
            passed_state="passed",
        ))
    return results, counts
