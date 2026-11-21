"""Test runner commands and per-testcase report adapters."""

from __future__ import annotations

import os
import subprocess
import tempfile
import uuid
from contextlib import nullcontext
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from stat import S_ISREG
from typing import Any

import registry_state
import sheets_sync
from http_checks import check_guest_prediction, check_health
from registry_state import CaseResult
from runner_reports import (
    REPORT_READ_ERRORS,
    PlaywrightCoverageError,
    parse_playwright_group,
    parse_trx_case_results,
    parse_vitest_case_results,
    read_playwright_report,
    report_error_reason,
)


def _emit_report_failure(
    group_cases: list[dict[str, Any]],
    run: CaseResult,
    report_command: list[str],
    case_status: str = "Blocked",
) -> bool:
    command_text = " ".join(report_command)
    for case in group_cases:
        selector = str(case.get("selector", ""))
        registry_state.emit_result(replace(
            run,
            id=case["id"],
            status=case_status,
            actual=f"{case['id']} {case_status.lower()}: {run.blocker}"[:500],
            command=command_text,
            evidence=f"run_id={run.run_id}; selector={selector}",
            blocker=run.blocker if case_status == "Blocked" else "",
            evidence_kind="per_case",
            exit_code=1,
            duration_seconds=None,
            selector=selector,
        ))
    registry_state.emit_result(run)
    return False


def _load_group_cases(case_ids: list[str]) -> list[dict[str, Any]]:
    wanted = set(case_ids)
    by_id = {case["id"]: case for case in registry_state.load_cases() if case["id"] in wanted}
    return [by_id[cid] for cid in case_ids if cid in by_id]


def _runner_report_command(command: list[str], group: str, directory: Path) -> tuple[list[str], Path]:
    if group == "api":
        report = directory / "api-results.trx"
        return [*command, "--logger", f"trx;LogFileName={report.name}", "--results-directory", str(directory)], report
    if group == "screen":
        report = directory / "vitest-results.json"
        return [*command, "--reporter=default", "--reporter=json", "--outputFile", str(report)], report
    report = directory / "playwright-results.json"
    return [*command, "--json-report", str(report)], report


def _find_runner_report(report: Path, group: str) -> Path | None:
    if report.is_file():
        return report
    if group == "api":
        return next(report.parent.rglob("*.trx"), None)
    return None


def _playwright_report_path(command: list[str], working_dir: Path) -> Path | None:
    for index in range(len(command) - 1, -1, -1):
        option, equals, value = command[index].partition("=")
        if option == "--json-report":
            if not equals and index + 1 < len(command):
                value = command[index + 1]
            return working_dir / value
    return None


def _report_mtime(report: Path) -> int | None:
    try:
        info = report.stat()
    except FileNotFoundError:
        return None
    return info.st_mtime_ns if S_ISREG(info.st_mode) else None


def _run_group_report(
    group_cases: list[dict[str, Any]],
    expected_ids: set[str],
    command: list[str],
    report: Path,
    prior_mtime: int | None,
    completed: subprocess.CompletedProcess[str],
    run: CaseResult,
) -> bool:
    group = run.group
    report_status = "Blocked" if completed.returncode == 0 else "Failed"
    failed_run = replace(run, status=report_status, exit_code=completed.returncode or 1)
    try:
        if group == "playwright":
            report_mtime = _report_mtime(report)
            actual_report = report if report_mtime is not None and report_mtime != prior_mtime else None
        else:
            actual_report = _find_runner_report(report, group)
        if actual_report is None:
            reason = "Playwright JSON report not produced" if group == "playwright" else f"{group} report not produced"
            missing = replace(failed_run, blocker=reason)
        elif group == "playwright":
            results, summary = parse_playwright_group(actual_report, expected_ids, run, completed.returncode)
        else:
            parser = parse_trx_case_results if group == "api" else parse_vitest_case_results
            results, counts = parser(actual_report, group_cases, run.run_id, run.run_at, group)
            passed = completed.returncode == 0 and bool(results) and all(item.status == "Passed" for item in results)
            summary = replace(
                run,
                status="Passed" if passed else "Failed",
                actual=f"{counts['passed']}/{counts['total']} {group} tests passed in {run.duration_seconds:.3f}s",
                evidence=f"run_id={run.run_id}; per_case_count={len(results)}; exit_code={completed.returncode}",
                exit_code=0 if passed else completed.returncode or 1,
            )
    except PlaywrightCoverageError as error:
        return _emit_report_failure(group_cases, replace(failed_run, status="Failed", blocker=str(error)), command)
    except REPORT_READ_ERRORS as error:
        invalid = replace(failed_run, blocker=report_error_reason(group, error))
        return _emit_report_failure(group_cases, invalid, command)
    if actual_report is None:
        return _emit_report_failure(group_cases, missing, command, case_status=report_status)
    for item in results:
        registry_state.emit_result(item)
    registry_state.emit_result(summary)
    return summary.status == "Passed"


def run_group(group_name: str) -> bool:
    group = registry_state.read_json(registry_state.CONFIG / "test-groups.json")["groups"][group_name]
    executable = group["command"]
    if executable == "pnpm.cmd" and os.name != "nt":
        executable = "pnpm"
    command = [executable, *group["args"]]
    working_dir = registry_state.ROOT / group["working_directory"]
    timeout = group.get("timeout_seconds", 600)
    case_ids = group.get("case_ids", [])
    expected_ids = set(case_ids)
    group_cases = _load_group_cases(case_ids)
    started = datetime.now(timezone.utc)
    run = CaseResult(
        f"RUN-{group_name}", "Blocked", "Auto", command=" ".join(command),
        run_at=started.isoformat(), run_id=uuid.uuid4().hex, group=group_name,
    )
    needs_report = group_name in {"api", "screen", "playwright"}
    if needs_report:
        unknown_ids = expected_ids - {case["id"] for case in group_cases}
        if unknown_ids:
            reason = f"{group_name} group references testcase IDs missing from the registry: {', '.join(sorted(unknown_ids))}"
        elif not case_ids or len(expected_ids) != len(case_ids):
            reason = f"{group_name} group must configure non-empty, unique testcase IDs"
        else:
            reason = ""
        if reason:
            # Artifacts must contain each configured ID only once.
            unique_cases = list({case["id"]: case for case in group_cases}.values())
            return _emit_report_failure(unique_cases, replace(run, blocker=reason, exit_code=1), command)
    explicit_report = _playwright_report_path(command, working_dir) if group_name == "playwright" else None
    with tempfile.TemporaryDirectory() if needs_report and explicit_report is None else nullcontext() as tmp_dir:
        full_command, report = command, explicit_report
        if tmp_dir is not None:
            full_command, report = _runner_report_command(command, group_name, Path(tmp_dir))

        try:
            prior_mtime = _report_mtime(explicit_report) if explicit_report is not None else None
        except OSError as error:
            return _emit_report_failure(group_cases, replace(run, blocker=report_error_reason(group_name, error), exit_code=1), full_command)
        try:
            completed = subprocess.run(
                full_command, cwd=working_dir, text=True, errors="replace",
                capture_output=True, check=False, timeout=timeout,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            reason = str(error)
            actual = ""
            if isinstance(error, subprocess.TimeoutExpired):
                reason = f"timeout after {timeout} seconds"
                stdout = str(error.stdout or "")
                actual = " ".join(stdout.splitlines())[-500:] if group_name == "playwright" else stdout[-4000:]
            blocked = replace(
                run, blocker=registry_state.redact_sensitive(reason), actual=registry_state.redact_sensitive(actual),
                command=" ".join(full_command), duration_seconds=(datetime.now(timezone.utc) - started).total_seconds(),
                exit_code=1,
            )
            return _emit_report_failure(group_cases if needs_report else [], blocked, full_command)

        stdout = registry_state.redact_sensitive((completed.stdout or "")[-4000:])
        stderr = registry_state.redact_sensitive((completed.stderr or "")[-4000:])
        evidence = f"run_id={run.run_id}; stderr={stderr}"
        if group_name == "playwright":
            stdout = " ".join(stdout.splitlines())[-500:]
            stderr = " ".join(stderr.splitlines())[-500:]
            evidence = f"run_id={run.run_id}; exit_code={completed.returncode}"
            if stderr:
                evidence += f"; error={stderr}"
        run = replace(
            run, actual=stdout, evidence=evidence, exit_code=completed.returncode,
            duration_seconds=(datetime.now(timezone.utc) - started).total_seconds(),
        )
        if report is not None:
            return _run_group_report(group_cases, expected_ids, full_command, report, prior_mtime, completed, run)

        result = replace(run, status="Passed" if completed.returncode == 0 else "Failed")
        registry_state.emit_result(result)
        return result.status == "Passed"


def run_case(case_id: str, health_url: str | None = None, guest_url: str | None = None, guest_image: str | None = None) -> bool:
    case = next((item for item in registry_state.load_cases() if item["id"] == case_id), None)
    if case is None:
        raise ValueError(f"unknown testcase ID: {case_id}")
    runner = case.get("runner")
    if runner == "health":
        return check_health(health_url or registry_state.read_json(registry_state.CONFIG / "runtime.json")["health_url"])
    if runner == "guest_prediction":
        runtime = registry_state.read_json(registry_state.CONFIG / "runtime.json")
        image = guest_image or runtime["guest_fixture"]
        return check_guest_prediction(guest_url or runtime["guest_prediction_url"], image)
    if runner == "dotnet":
        group = "api"
        command = ["dotnet", "test", "tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj", "--no-restore", "--filter", case["selector"], "--logger", "console;verbosity=minimal"]
        cwd = registry_state.ROOT / "backend"
    elif runner == "vitest":
        group = "screen"
        source_path = Path(case["source_path"])
        if source_path.parts and source_path.parts[0].lower() == "frontend":
            source_path = Path(*source_path.parts[1:])
        pnpm_exec = "pnpm.cmd" if os.name == "nt" else "pnpm"
        command = [pnpm_exec, "exec", "vitest", "run", str(source_path), "-t", case["selector"]]
        cwd = registry_state.ROOT / "frontend"
    elif runner == "playwright":
        group = "playwright"
        command = ["python", "tests/browser/e2e/run_suite.py", "--case", case["id"]]
        cwd = registry_state.ROOT / "frontend"
    else:
        raise RuntimeError(f"case {case_id} has no explicit runner adapter; group exit cannot mark it Passed")
    started = datetime.now(timezone.utc).isoformat()
    run_id = uuid.uuid4().hex
    result = CaseResult(
        case_id, "Blocked", "Auto", command=" ".join(command), run_at=started,
        run_id=run_id, evidence_kind="per_case", selector=case["selector"], exit_code=1,
    )
    with tempfile.TemporaryDirectory() as tmp_dir:
        full_command, report = _runner_report_command(command, group, Path(tmp_dir))
        try:
            completed = subprocess.run(
                full_command, cwd=cwd, text=True, errors="replace", capture_output=True, check=False, timeout=900,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            result = replace(result, blocker=registry_state.redact_sensitive(str(error)))
        else:
            try:
                report = _find_runner_report(report, group)
                if report is None:
                    result = replace(result, blocker=f"{group} report not produced")
                elif group == "api":
                    [result], _ = parse_trx_case_results(report, [case], run_id, started, "")
                elif group == "screen":
                    [result], _ = parse_vitest_case_results(report, [case], run_id, started, "")
                else:
                    _, records = read_playwright_report(report)
                    matches = [record for record in records if str(record.get("id", "")).strip() == case_id]
                    status = str(matches[0]["status"]).strip() if len(matches) == 1 else "Unknown"
                    result = replace(
                        result, status=status if status in {"Passed", "Failed"} else "Blocked",
                        actual=f"{case_id} Playwright outcome: {status}",
                        evidence=f"run_id={run_id}; Playwright outcome={status}; matches={len(matches)}",
                        blocker="" if status in {"Passed", "Failed"} else f"Playwright returned no unique executed result ({status})",
                        exit_code=0 if status == "Passed" else 1,
                    )
            except REPORT_READ_ERRORS as error:
                result = replace(result, blocker=report_error_reason(group, error))
            if completed.returncode:
                stderr = registry_state.redact_sensitive((completed.stderr or "")[-4000:])
                result = replace(
                    result, status="Failed", exit_code=completed.returncode,
                    actual=(f"{group} exited with code {completed.returncode}" if result.status == "Passed" else result.actual),
                    evidence=f"{result.evidence}; stderr={stderr}" if stderr else result.evidence,
                )
    registry_state.emit_result(result)
    return result.status == "Passed"


def run_all(write_sheets: bool, guest_image: str | None = None, health_url: str = "http://localhost:5080/api/health", guest_url: str = "http://localhost:5080/api/predictions") -> None:
    group_results = [run_group(group_name) for group_name in ("api", "screen", "playwright")]
    success = all(group_results)
    groups = registry_state.read_json(registry_state.CONFIG / "test-groups.json")["groups"]
    grouped_ids = {cid for group in groups.values() for cid in group.get("case_ids", [])}
    runtime = registry_state.read_json(registry_state.CONFIG / "runtime.json")
    fixture = guest_image or runtime["guest_fixture"]
    for case in registry_state.load_cases():
        if case.get("runner") == "health":
            success = run_case(case["id"], health_url=health_url) and success
        elif case.get("runner") == "guest_prediction":
            success = run_case(case["id"], guest_url=guest_url, guest_image=fixture) and success
        elif case.get("runner") in {"dotnet", "vitest"} and case["id"] not in grouped_ids:
            success = run_case(case["id"]) and success
    sheets_sync.sync(False, write_sheets)
    if not success:
        raise SystemExit(1)
