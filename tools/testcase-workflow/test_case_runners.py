import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "tools" / "testcase-workflow" / "workflow.py"
sys.path.insert(0, str(WORKFLOW.parent))
from case_runners import (
    parse_trx_case_results,
    parse_vitest_case_results,
    run_all,
    run_case,
    run_group,
)


class CaseRunnerTests(unittest.TestCase):
    def test_run_group_playwright_emits_per_case_results_and_run_summary(self):
        emitted = []
        config = json.loads((WORKFLOW.parent / "config/test-groups.json").read_text(encoding="utf-8"))
        expected_ids = config["groups"]["playwright"]["case_ids"]

        def fake_subprocess_run(cmd, **_kwargs):
            report_idx = cmd.index("--json-report") + 1
            cases = [
                {"id": "E2E-AUTH-01", "test": "e2e.test_auth.AuthBrowserTests.test_register", "status": "Passed"},
                {"id": "E2E-ADM-01", "test": "e2e.test_admin.AdminBrowserTests.test_admin_portal", "status": "Passed"},
            ]
            cases.extend({"id": cid, "test": "e2e.fixture", "status": "Passed"} for cid in expected_ids if cid not in {"E2E-AUTH-01", "E2E-ADM-01"})
            Path(cmd[report_idx]).write_text(json.dumps({
                "browser": "chromium-headless",
                "build_mode": "next-production",
                "total": len(cases),
                "passed": len(cases),
                "failed": 0,
                "cases": cases,
            }), encoding="utf-8")
            return subprocess.CompletedProcess(cmd, 0, stdout="line1\nline2", stderr="Ran 2 tests")

        with patch("case_runners.subprocess.run", side_effect=fake_subprocess_run), patch("registry_state.emit_result", side_effect=emitted.append):
            ok = run_group("playwright")

        self.assertTrue(ok)
        self.assertEqual([item.id for item in emitted[:2]], ["E2E-AUTH-01", "E2E-ADM-01"])
        self.assertEqual({item.id for item in emitted[:-1]}, set(expected_ids))
        self.assertEqual(emitted[-1].id, "RUN-playwright")
        self.assertNotIn("\n", emitted[0].evidence)
        self.assertIn("selector=e2e.test_auth.AuthBrowserTests.test_register", emitted[0].evidence)
        self.assertEqual(emitted[-1].status, "Passed")
        self.assertIn("40/40 Playwright E2E UI cases passed", emitted[-1].actual)

    def test_run_group_playwright_rejects_partial_report_with_successful_exit(self):
        def fake_subprocess_run(cmd, **_kwargs):
            Path(cmd[-1]).write_text(json.dumps({
                "total": 1, "passed": 1, "failed": 0,
                "cases": [{"id": "E2E-AUTH-01", "test": "e2e.test_auth", "status": "Passed"}],
            }), encoding="utf-8")
            return subprocess.CompletedProcess(cmd, 0)

        with patch("case_runners.subprocess.run", side_effect=fake_subprocess_run), patch("registry_state.emit_result") as emit:
            self.assertFalse(run_group("playwright"))
        results = {call.args[0].id: call.args[0] for call in emit.call_args_list}
        self.assertEqual(results["RUN-playwright"].status, "Failed")
        self.assertEqual(results["E2E-ADM-01"].status, "Blocked")

    def test_run_all_executes_api_screen_and_playwright_groups(self):
        with patch("case_runners.run_group", return_value=True) as run_group_mock, patch("registry_state.load_cases", return_value=[]), patch("sheets_sync.sync") as sync_mock:
            run_all(False)
        self.assertEqual([call.args[0] for call in run_group_mock.call_args_list], ["api", "screen", "playwright"])
        sync_mock.assert_called_once_with(False, False)

    def test_run_case_vitest_uses_platform_appropriate_pnpm_executable(self):
        fake_case = {
            "id": "WEB-PRED-01",
            "runner": "vitest",
            "source_path": "frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx",
            "selector": "runs anonymously",
        }

        def start_vitest(command, **_kwargs):
            Path(command[command.index("--outputFile") + 1]).write_text(json.dumps({
                "testResults": [{
                    "name": fake_case["source_path"],
                    "assertionResults": [{"title": fake_case["selector"], "status": "passed"}],
                }],
            }), encoding="utf-8")
            return subprocess.CompletedProcess(command, 0, stdout="ok", stderr="")

        for fake_os, expected_exec in (("posix", "pnpm"), ("nt", "pnpm.cmd")):
            with (
                patch("registry_state.load_cases", return_value=[fake_case]),
                patch("case_runners.os", SimpleNamespace(name=fake_os)),
                patch("registry_state.emit_result"),
                patch("case_runners.subprocess.run", side_effect=start_vitest) as run_mock,
            ):
                self.assertTrue(run_case("WEB-PRED-01"))
            self.assertEqual(run_mock.call_args.args[0][0], expected_exec)

    def test_run_case_requires_report_evidence_when_process_exits_zero(self):
        for runner, expected_evidence in (("vitest", "vitest_matches=0"), ("dotnet", "trx_matches=0"), ("playwright", "Skipped")):
            with self.subTest(runner=runner):
                case = {
                    "id": "CASE-01",
                    "runner": runner,
                    "source_path": "frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx",
                    "selector": "missing",
                }

                def run_without_execution(command, **_kwargs):
                    if "--outputFile" in command:
                        Path(command[-1]).write_text('{"testResults": []}', encoding="utf-8")
                    elif "--results-directory" in command:
                        filename = next(arg.split("=", 1)[1] for arg in command if arg.startswith("trx;LogFileName="))
                        (Path(command[-1]) / filename).write_text("<TestRun/>", encoding="utf-8")
                    elif "--json-report" in command:
                        Path(command[-1]).write_text('{"cases": [{"id": "CASE-01", "status": "Skipped"}]}', encoding="utf-8")
                    return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

                with (
                    patch("registry_state.load_cases", return_value=[case]),
                    patch("case_runners.subprocess.run", side_effect=run_without_execution),
                    patch("registry_state.emit_result") as emit,
                ):
                    self.assertFalse(run_case(case["id"]))
                result = emit.call_args.args[0]
                self.assertEqual(result.status, "Blocked")
                self.assertIn(expected_evidence, result.evidence)
                self.assertNotEqual(result.exit_code, 0)

    def test_run_group_api_parses_trx_per_case_for_theory_failure_and_non_executed(self):
        trx_xml = """<?xml version="1.0" encoding="utf-8"?>
<TestRun xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
  <TestDefinitions>
    <UnitTest id="t1" name="InvalidGuestUpload">
      <TestMethod className="AgriVision.ApiTests.Controllers.GuestPredictionsControllerTests" name="InvalidGuestUpload_ShouldFailBeforeInferenceOrStorage" />
    </UnitTest>
    <UnitTest id="t2" name="InvalidExtension">
      <TestMethod className="AgriVision.ApiTests.Controllers.PredictionsControllerTests" name="CreatePrediction_ShouldReturnBadRequest_WhenFileExtensionIsInvalid" />
    </UnitTest>
  </TestDefinitions>
  <Results>
    <UnitTestResult testId="t1" testName="InvalidGuestUpload(null, true)" outcome="Passed" duration="00:00:00.1000000" />
    <UnitTestResult testId="t1" testName="InvalidGuestUpload('', false)" outcome="Passed" duration="00:00:00.2000000" />
    <UnitTestResult testId="t2" testName="CreatePrediction_ShouldReturnBadRequest_WhenFileExtensionIsInvalid" outcome="Failed" duration="00:00:00.0500000">
      <Output><ErrorInfo><Message>Expected 400 BadRequest but found 500</Message></ErrorInfo></Output>
    </UnitTestResult>
  </Results>
  <ResultSummary outcome="Failed">
    <Counters total="3" executed="3" passed="2" failed="1" />
  </ResultSummary>
</TestRun>"""
        emitted = []

        def fake_run(cmd, **_kwargs):
            res_dir = Path(cmd[cmd.index("--results-directory") + 1])
            (res_dir / "api-results.trx").write_text(trx_xml, encoding="utf-8")
            return subprocess.CompletedProcess(cmd, 1, stdout="failed", stderr="")

        with patch("case_runners.subprocess.run", side_effect=fake_run), patch("registry_state.emit_result", side_effect=emitted.append):
            ok = run_group("api")

        self.assertFalse(ok)
        by_id = {item.id: item for item in emitted}
        self.assertEqual(by_id["API-PRED-01"].status, "Passed")
        self.assertEqual(by_id["API-PRED-01"].evidence_kind, "per_case")
        self.assertIn("trx_matches=2", by_id["API-PRED-01"].evidence)
        self.assertEqual(by_id["API-PRED-02"].status, "Failed")
        self.assertIn("Expected 400 BadRequest", by_id["API-PRED-02"].actual)
        self.assertEqual(by_id["RUN-api"].status, "Failed")
        self.assertIn("2/3 api tests passed", by_id["RUN-api"].actual)

        # NonExecuted outcome or missing selector must mark Blocked, never Passed
        with tempfile.TemporaryDirectory() as tmpdir:
            trx_path = Path(tmpdir) / "sample.trx"
            trx_path.write_text(
                trx_xml.replace('outcome="Failed"', 'outcome="NotExecuted"'),
                encoding="utf-8",
            )
            cases = [
                {"id": "API-PRED-02", "selector": "FullyQualifiedName~PredictionsControllerTests.CreatePrediction_ShouldReturnBadRequest_WhenFileExtensionIsInvalid"},
                {"id": "API-MISSING", "selector": "FullyQualifiedName~MissingMethod"},
            ]
            parsed, _counts = parse_trx_case_results(trx_path, cases, "r1", "2026-11-18T00:00:00Z", "api")
            self.assertEqual([c.status for c in parsed], ["Blocked", "Blocked"])

    def test_run_group_screen_parses_vitest_json_per_case_by_source_and_selector(self):
        emitted = []

        def fake_run(cmd, **_kwargs):
            out_file = Path(cmd[cmd.index("--outputFile") + 1])
            out_file.write_text(json.dumps({
                "numTotalTests": 2,
                "numPassedTests": 1,
                "numFailedTests": 1,
                "testResults": [
                    {
                        "name": "E:/AgriAI/frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx",
                        "assertionResults": [
                            {
                                "fullName": "guest diagnosis runs anonymously, retains the tab result, and saves it",
                                "title": "runs anonymously, retains the tab result, and saves it",
                                "status": "passed",
                                "duration": 120.5,
                                "failureMessages": [],
                            },
                        ],
                    },
                    {
                        "name": "E:/AgriAI/frontend/tests/integration/diagnosis/LandingPrediction.test.tsx",
                        "assertionResults": [
                            {
                                "fullName": "landing shows a server error and retries with the same selected image",
                                "title": "shows a server error and retries with the same selected image",
                                "status": "failed",
                                "duration": 88.0,
                                "failureMessages": ["AssertionError: expected alert to be visible"],
                            },
                        ],
                    },
                ],
            }), encoding="utf-8")
            return subprocess.CompletedProcess(cmd, 1, stdout="vitest out", stderr="")

        with patch("case_runners.subprocess.run", side_effect=fake_run), patch("registry_state.emit_result", side_effect=emitted.append):
            ok = run_group("screen")

        self.assertFalse(ok)
        by_id = {item.id: item for item in emitted}
        self.assertEqual(by_id["WEB-PRED-01"].status, "Passed")
        self.assertEqual(by_id["WEB-PRED-01"].evidence_kind, "per_case")
        self.assertIn("vitest_matches=1", by_id["WEB-PRED-01"].evidence)
        self.assertEqual(by_id["WEB-PRED-02"].status, "Failed")
        self.assertIn("AssertionError: expected alert to be visible", by_id["WEB-PRED-02"].actual)
        self.assertEqual(by_id["RUN-screen"].status, "Failed")

        # Skipped Vitest test must be Blocked, never Passed
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "vitest.json"
            report.write_text(json.dumps({
                "numTotalTests": 1,
                "numPassedTests": 0,
                "numFailedTests": 0,
                "testResults": [{
                    "name": "/repo/frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx",
                    "assertionResults": [{
                        "fullName": "runs anonymously, retains the tab result",
                        "title": "runs anonymously, retains the tab result",
                        "status": "skipped",
                        "duration": 0,
                        "failureMessages": [],
                    }],
                }],
            }), encoding="utf-8")
            parsed, _ = parse_vitest_case_results(
                report,
                [{"id": "WEB-PRED-01", "source_path": "frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx", "selector": "runs anonymously, retains the tab result"}],
                "r2",
                "2026-11-18T00:00:00Z",
                "screen",
            )
            self.assertEqual(parsed[0].status, "Blocked")

    def test_run_group_emits_fallback_per_case_when_report_is_missing(self):
        emitted = []
        with patch("case_runners.subprocess.run", return_value=subprocess.CompletedProcess(["dotnet"], 1, stdout="", stderr="build failed")), patch("registry_state.emit_result", side_effect=emitted.append):
            ok = run_group("api")
        self.assertFalse(ok)
        by_id = {item.id: item for item in emitted}
        self.assertEqual(by_id["API-PRED-01"].status, "Failed")
        self.assertEqual(by_id["API-PRED-02"].status, "Failed")
        self.assertEqual(by_id["RUN-api"].status, "Failed")

    def test_run_group_does_not_pass_when_report_is_missing_after_exit_zero(self):
        for group_name, case_id in (("api", "API-PRED-01"), ("screen", "WEB-PRED-01"), ("playwright", "E2E-AUTH-01")):
            with self.subTest(group=group_name):
                completed = subprocess.CompletedProcess([], 0, stdout="", stderr="")
                with patch("case_runners.subprocess.run", return_value=completed), patch("registry_state.emit_result") as emit:
                    self.assertFalse(run_group(group_name))
                results = {call.args[0].id: call.args[0] for call in emit.call_args_list}
                self.assertEqual(results[case_id].status, "Blocked")
                self.assertEqual(results[f"RUN-{group_name}"].status, "Blocked")
                self.assertNotEqual(results[f"RUN-{group_name}"].exit_code, 0)

    def test_run_group_records_blocked_artifacts_for_invalid_reports(self):
        fixtures = (
            ("api", b"<TestRun", 0),
            ("api", b'<TestRun><Counters total="unknown"/></TestRun>', 1),
            ("screen", b'{"testResults":', 0),
            ("screen", b'{"testResults":[null]}', 0),
            ("screen", b"\xff", 0),
            ("playwright", b'{"cases":', 0),
            ("playwright", b'{"cases":[null]}', 0),
        )
        groups = json.loads((WORKFLOW.parent / "config/test-groups.json").read_text(encoding="utf-8"))["groups"]

        for group, payload, returncode in fixtures:
            with self.subTest(group=group, payload=payload, returncode=returncode):
                def write_invalid_report(command, **_kwargs):
                    destination = Path(command[-1])
                    if group == "api":
                        destination /= "api-results.trx"
                    destination.write_bytes(payload)
                    return subprocess.CompletedProcess(command, returncode)

                with (
                    patch("case_runners.subprocess.run", side_effect=write_invalid_report),
                    patch("registry_state.emit_result") as emit,
                ):
                    try:
                        self.assertFalse(run_group(group))
                    except (ValueError, AttributeError, SyntaxError) as error:
                        self.fail(f"Invalid report escaped the runner: {type(error).__name__}")

                results = [call.args[0] for call in emit.call_args_list]
                self.assertCountEqual([result.id for result in results], [*groups[group]["case_ids"], f"RUN-{group}"])
                self.assertTrue(all(result.blocker and result.exit_code != 0 for result in results))
                self.assertTrue(all(result.status == "Blocked" for result in results[:-1]))
                self.assertEqual(results[-1].status, "Failed" if returncode else "Blocked")
                self.assertIn("report is invalid or unreadable", results[-1].blocker)

    def test_run_case_blocks_unreadable_playwright_report(self):
        case = {"id": "CASE-01", "runner": "playwright", "selector": "fixture"}

        def write_report(command, **_kwargs):
            Path(command[-1]).write_text('{"cases": [null]}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        with (
            patch("registry_state.load_cases", return_value=[case]),
            patch("case_runners.subprocess.run", side_effect=write_report),
            patch("registry_state.emit_result") as emit,
        ):
            try:
                self.assertFalse(run_case(case["id"]))
            except AttributeError:
                self.fail("Invalid Playwright records escaped the single-case runner")

        result = emit.call_args.args[0]
        self.assertEqual(result.status, "Blocked")
        self.assertEqual(result.selector, case["selector"])
        self.assertIn("report is invalid or unreadable", result.blocker)

    def test_run_group_blocks_incomplete_case_configuration(self):
        with (
            patch("registry_state.load_cases", return_value=[]),
            patch("case_runners.subprocess.run") as start,
            patch("registry_state.emit_result") as emit,
        ):
            self.assertFalse(run_group("screen"))

        start.assert_not_called()
        run = emit.call_args.args[0]
        self.assertEqual((run.id, run.status, run.exit_code), ("RUN-screen", "Blocked", 1))
        self.assertIn("WEB-PRED-01", run.blocker)
        self.assertIn("WEB-PRED-02", run.blocker)

    def test_run_group_playwright_reads_only_fresh_explicit_report(self):
        config = json.loads((WORKFLOW.parent / "config/test-groups.json").read_text(encoding="utf-8"))
        group = config["groups"]["playwright"]
        records = [{"id": cid, "test": "e2e.fixture", "status": "Passed"} for cid in group["case_ids"]]
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "playwright.json"
            payload = json.dumps({"cases": records})
            report_path.write_text(payload, encoding="utf-8")
            group["args"] += ["--json-report", str(report_path)]

            def fake_read_json(path):
                return config if path.name == "test-groups.json" else json.loads(path.read_text(encoding="utf-8"))

            def fresh_run(cmd, **_kwargs):
                Path(cmd[-1]).write_text(payload + "\n", encoding="utf-8")
                return subprocess.CompletedProcess(cmd, 0)

            def stale_run(cmd, **_kwargs):
                existing = report_path.stat()
                os.utime(report_path, ns=(existing.st_atime_ns + 10_000_000_000, existing.st_mtime_ns))
                return subprocess.CompletedProcess(cmd, 0)

            with patch("registry_state.read_json", side_effect=fake_read_json):
                with patch("case_runners.subprocess.run", side_effect=stale_run), patch("registry_state.emit_result"):
                    self.assertFalse(run_group("playwright"))
                with patch("case_runners.subprocess.run", side_effect=fresh_run), patch("registry_state.emit_result") as emit:
                    self.assertTrue(run_group("playwright"))
            self.assertEqual({call.args[0].id for call in emit.call_args_list}, set(group["case_ids"]) | {"RUN-playwright"})

    def test_run_all_skips_redundant_run_case_for_grouped_dotnet_and_vitest(self):
        cases = [
            {"id": "API-PRED-01", "runner": "dotnet"},
            {"id": "API-UNGROUPED", "runner": "dotnet"},
            {"id": "WEB-PRED-01", "runner": "vitest"},
            {"id": "API-HEALTH-01", "runner": "health"},
        ]
        with (
            patch("case_runners.run_group", return_value=True),
            patch("registry_state.load_cases", return_value=cases),
            patch("case_runners.run_case", return_value=True) as run_case_mock,
            patch("sheets_sync.sync"),
        ):
            run_all(False)
        called_ids = [call.args[0] for call in run_case_mock.call_args_list]
        self.assertEqual(called_ids, ["API-UNGROUPED", "API-HEALTH-01"])


if __name__ == "__main__":
    unittest.main()
