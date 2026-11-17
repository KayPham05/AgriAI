import json
import subprocess
import sys
import unittest
import tempfile
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "tools" / "testcase-workflow" / "workflow.py"
sys.path.insert(0, str(WORKFLOW.parent))
from workflow import CaseResult, deprecated_case_ids, emit_result, main, normalize_case, redact_sensitive, normalize_tab_name, build_sheet_row, calculate_summary_counts, run_all, update_summary_dashboard, upsert_row
from validate_results import validate_results


class WorkflowSmokeTests(unittest.TestCase):
    def test_case_loader_accepts_legacy_and_canonical_fields(self):
        normalized = normalize_case({
            "id": "API-X-01",
            "kind": "API",
            "tab": "API-X-01 POST /api/x",
            "requirement": ["FR-1"],
            "expected": "ok",
        })
        self.assertEqual(normalized["kind"], "api")
        self.assertEqual(normalized["detail_tab"], "API-X-01 POST /api/x")
        self.assertEqual(normalized["expected_result"], "ok")

    def test_deprecated_case_ids_preserve_history(self):
        self.assertEqual(deprecated_case_ids({"OLD-1": {}, "KEEP-1": {}}, [{"id": "KEEP-1"}]), ["OLD-1"])

    def test_run_command_propagates_group_failure(self):
        with patch.object(sys, "argv", ["workflow.py", "run", "playwright"]), patch("workflow.run_group", return_value=False):
            with self.assertRaises(SystemExit) as error:
                main()
            self.assertEqual(error.exception.code, 1)

    def test_sensitive_values_are_redacted_from_evidence(self):
        value = redact_sensitive("guestToken=secret-value; Authorization: Bearer abc")
        self.assertNotIn("secret-value", value)
        self.assertNotIn("abc", value)
        self.assertIn("[REDACTED]", value)

    def test_sensitive_credentials_are_redacted(self):
        value = redact_sensitive("access_token=token-value; private_key=key-value")
        self.assertNotIn("token-value", value)
        self.assertNotIn("key-value", value)

    def test_summary_counts_are_derived_without_dashboard_rows(self):
        cases = [{"id": "API-1", "status": "Not run", "execution": "N/A"}, {"id": "API-2", "status": "Not run", "execution": "Auto"}]
        counts = calculate_summary_counts(cases, {"API-1": {"status": "Passed", "execution": "Auto"}})
        self.assertEqual(counts["total"], 2)
        self.assertEqual(counts["passed"], 1)
        self.assertEqual(counts["not_run"], 1)
        self.assertEqual(counts["automation"], 2)

    def test_upsert_is_idempotent_by_stable_case_id(self):
        class FakeClient:
            def __init__(self):
                self.values_calls = 0
                self.writes = []
            def values(self, *_args):
                self.values_calls += 1
                return [["ID"], ["API-X-01"]]
            def update(self, *args):
                self.writes.append(("update", args))
            def append(self, *args):
                self.writes.append(("append", args))
        client = FakeClient()
        case = {"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "kind": "api", "expected_result": "ok"}
        result = upsert_row(client, "sheet", case["detail_tab"], case, {"id": "A", "detail_tab": "B", "expected_result": "C"})
        self.assertEqual(result["action"], "update")
        self.assertEqual(len(client.writes), 1)

    def test_upsert_preserves_manual_business_columns(self):
        class FakeClient:
            def __init__(self):
                self.calls = 0
            def values(self, *_args):
                self.calls += 1
                return [["ID"], ["API-X-01"]] if self.calls == 1 else [["API-X-01", "QA item", "QA description", "Not run", "QA note"]]
            def update(self, *args):
                self.updated = args
            def append(self, *_args):
                raise AssertionError("append should not be called")
        client = FakeClient()
        case = {"id": "API-X-01", "detail_tab": "API-X-01", "kind": "api", "expected_result": "new expected"}
        mapping = {"id": "A", "item": "B", "test_name": "C", "status": "D", "evidence": "E"}
        upsert_row(client, "sheet", "tab", case, mapping, {"status": "Passed", "evidence": "run-1"})
        merged = client.updated[3][0]
        self.assertEqual(merged[1:3], ["QA item", "QA description"])
        self.assertEqual(merged[3:], ["Passed", "run-1"])

    def test_tab_name_is_trimmed_to_sheets_limit(self):
        name = normalize_tab_name("API-X-01 " + "x" * 200)
        self.assertLessEqual(len(name), 100)
        self.assertTrue(name.startswith("API-X-01"))

    def test_sheet_row_uses_explicit_column_mapping(self):
        row = build_sheet_row({"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "status": "Passed", "execution": "Auto", "expected_result": "ok"}, {"id": "A", "detail_tab": "B", "status": "C", "execution": "D", "expected_result": "E"})
        self.assertEqual(row[:5], ["API-X-01", "API-X-01 GET /api/x", "Passed", "Auto", "ok"])
    def test_dry_run_reports_all_configured_cases_without_writing_state(self):
        result = subprocess.run(
            [sys.executable, str(WORKFLOW), "sync", "--dry-run"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        payload = json.loads(result.stdout)
        cases = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "cases.json").read_text(encoding="utf-8"))["cases"]
        self.assertEqual(payload["case_count"], len(cases))
        self.assertTrue(payload["dry_run"])

    def test_test_groups_include_playwright(self):
        config_path = ROOT / "tools" / "testcase-workflow" / "config" / "test-groups.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertIn("playwright", config["groups"])
        self.assertEqual(config["groups"]["playwright"]["command"], "python")
        cases_by_id = {
            c["id"]: c
            for c in json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "cases.json").read_text(encoding="utf-8"))["cases"]
        }
        pw_ids = config["groups"]["playwright"]["case_ids"]
        self.assertGreater(len(pw_ids), 0)
        for cid in pw_ids:
            self.assertIn(cid, cases_by_id)
            self.assertEqual(cases_by_id[cid].get("runner"), "playwright")

    def test_ci_workflow_requires_live_contract_artifacts(self):
        workflow_text = (ROOT / ".github/workflows/testcase-workflow.yml").read_text(encoding="utf-8")
        for marker in (
            "  live-contract:",
            "needs: [backend-tests, frontend-tests, playwright-contract, live-contract]",
            "--expected-id RUN-api",
            "--expected-id RUN-screen",
            "--expected-id RUN-playwright",
            "--expected-id API-HEALTH-01",
            "--expected-id API-PRED-GUEST-01",
        ):
            self.assertIn(marker, workflow_text, f"missing CI contract marker: {marker}")
    def test_case_metadata_sources_exist(self):
        cases = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "cases.json").read_text(encoding="utf-8"))["cases"]
        for case in cases:
            source = case.get("source_test")
            if source:
                self.assertTrue((ROOT / source).is_file(), f"missing source_test for {case['id']}: {source}")
            if case.get("runner") in {"dotnet", "vitest", "playwright"}:
                self.assertTrue(case.get("selector"), f"missing selector for {case['id']}")
                source_text = (ROOT / case["source_test"]).read_text(encoding="utf-8")
                selector = case["selector"].split("~", 1)[-1]
                if case["runner"] == "dotnet":
                    selector = selector.rsplit(".", 1)[-1]
                self.assertIn(selector, source_text, f"stale selector for {case['id']}: {case['selector']}")

    def test_automated_e2e_and_manual_cases_are_strictly_separated(self):
        import re
        auto_doc = (ROOT / "docs" / "reports" / "AGRI-145" / "frontend_e2e_test_specification.md").read_text(encoding="utf-8")
        manual_doc = (ROOT / "docs" / "reports" / "AGRI-145" / "manual_e2e_test_cases.md").read_text(encoding="utf-8")
        auto_ids = set(re.findall(r"E2E-[A-Z0-9-]+", auto_doc))
        manual_ids = set(re.findall(r"E2E-[A-Z0-9-]+", manual_doc))
        self.assertEqual(len(auto_ids), 40)
        self.assertEqual(len(manual_ids), 10)
        self.assertEqual(auto_ids & manual_ids, set(), "Automated E2E spec and Manual spec must not share any testcase ID")

        cases = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "cases.json").read_text(encoding="utf-8"))["cases"]
        cfg_e2e_ids = {c["id"] for c in cases if c["id"].startswith("E2E-")}
        group_ids = set(json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "test-groups.json").read_text(encoding="utf-8"))["groups"]["playwright"]["case_ids"])
        self.assertEqual(cfg_e2e_ids, auto_ids)
        self.assertEqual(group_ids, auto_ids)
        self.assertEqual(cfg_e2e_ids & manual_ids, set())

        for py_file in (ROOT / "frontend" / "tests" / "browser" / "e2e").glob("*.py"):
            content = py_file.read_text(encoding="utf-8")
            found = set(re.findall(r"E2E-[A-Z0-9-]+", content))
            self.assertEqual(found & manual_ids, set(), f"Manual testcase IDs leaked into automation code {py_file.name}: {found & manual_ids}")
            self.assertNotIn("wait_for_timeout", content, f"Hardcoded sleep wait_for_timeout found in {py_file.name}")
            self.assertNotIn("page.pause", content, f"Interactive page.pause found in {py_file.name}")

        spec_priorities = dict(re.findall(r"\|\s*`(E2E-[A-Z0-9-]+)`\s*\|\s*\*\*(P[012])\*\*", auto_doc))
        code_priorities = {}
        for py_file in (ROOT / "frontend" / "tests" / "browser" / "e2e").glob("test_*.py"):
            for cid, prio in re.findall(r'@case_meta\("([^"]+)",\s*"(P[012])"\)', py_file.read_text(encoding="utf-8")):
                code_priorities[cid] = prio
        self.assertEqual(code_priorities, spec_priorities, "Priority mismatch between frontend_e2e_test_specification.md and @case_meta in test_*.py")

        live_suite_text = (ROOT / "frontend" / "tests" / "browser" / "e2e" / "run_live_suite.py").read_text(encoding="utf-8")
        live_ids = re.findall(r'"(E2E-[A-Z0-9-]+)"', live_suite_text)
        self.assertEqual(len(live_ids), 40)
        self.assertEqual(set(live_ids), auto_ids)


    def test_result_artifact_validator_accepts_unique_cases(self):
        path = Path("results.json")
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps({"cases": [{"id": "API-1", "status": "Passed", "execution": "Auto"}]})):
            summary = validate_results(Path("artifacts"))
        self.assertEqual(summary["case_count"], 1)

    def test_result_artifact_validator_rejects_duplicate_cases(self):
        path = Path("results.json")
        payload = {"cases": [
            {"id": "API-1", "status": "Passed", "execution": "Auto"},
            {"id": "API-1", "status": "Failed", "execution": "Auto"},
        ]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"))

    def test_result_artifact_validator_rejects_invalid_status(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Unknown", "execution": "Auto"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"))

    def test_result_artifact_validator_reports_failed_cases(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Blocked", "execution": "Auto"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            self.assertEqual(validate_results(Path("artifacts"))["failed_cases"], ["API-1"])

    def test_result_artifact_validator_rejects_missing_expected_case(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Passed", "execution": "Auto"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"), {"API-1", "API-2"})

    def test_emit_result_appends_cases_to_artifact(self):
        directory = "artifact-output"
        stored = {}
        def capture(path, payload):
            stored["payload"] = payload
        with patch.dict("os.environ", {"AGRIVISION_RESULT_DIR": directory}), patch("workflow.record_result"), patch("workflow.Path.mkdir"), patch("workflow.Path.exists", side_effect=[False, True]), patch("workflow.read_json", return_value={"schema_version": 1, "run_id": "run-1", "cases": [{"id": "A", "status": "Passed", "execution": "Auto"}]}), patch("workflow.write_json_atomic", side_effect=capture):
            emit_result(CaseResult("A", "Passed", "Auto", run_id="run-1"))
            emit_result(CaseResult("B", "Failed", "Auto", run_id="run-1"))
            self.assertEqual([case["id"] for case in stored["payload"]["cases"]], ["A", "B"])

    def test_upsert_multiple_new_cases_in_same_tab_assigns_distinct_rows(self):
        class FakeClient:
            def __init__(self):
                self.values_calls = 0

            def values(self, *_args):
                self.values_calls += 1
                return [["No.", "Category", "Status"]] + [[""] for _ in range(13)] + [[], []]

        client = FakeClient()
        pending = []
        cache = {}
        mapping = {"id": "A", "main_category": "B", "status": "C"}
        for idx in (1, 2, 3):
            case = {"id": f"E2E-AUTH-0{idx}", "detail_tab": "WEB-E2E-AUTH", "kind": "screen", "expected_result": "ok"}
            res = upsert_row(
                client,
                "sheet-screen",
                "WEB-E2E-AUTH",
                case,
                mapping,
                {"status": "Passed"},
                detail_mode="screen_table",
                data_start_row=15,
                pending_updates=pending,
                tab_values_cache=cache,
            )
            self.assertEqual(res["action"], "add")
            self.assertEqual(res["row"], 14 + idx)
        self.assertEqual([rng for _, rng, _ in pending], ["A15:C15", "A16:C16", "A17:C17"])
        self.assertEqual(client.values_calls, 2)

    def test_update_summary_dashboard_assigns_distinct_rows_and_sums_updated_counts(self):
        class FakeClient:
            def __init__(self):
                self.batches = []
                self.cleared = []

            def values(self, *_args):
                return [
                    ["", "Sheet Name", "Name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Auto", "Manual", "N/A"],
                    [],
                    [],
                    [],
                    [],
                    ["", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "Total", "0", "0", "0", "0", "0", "0", "0", "0"],
                ]

            def sheet_metadata(self, *_args):
                return [{"title": "Report", "sheetId": 10}]

            def clear(self, *_args):
                self.cleared.append(_args)

            def batch_update(self, _sid, writes):
                self.batches.append(writes)

        client = FakeClient()
        sheet = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["screen"]
        cases = [
            {"id": "E2E-AUTH-01", "detail_tab": "WEB-E2E-AUTH", "status": "Not run", "execution": "Auto"},
            {"id": "E2E-ADM-01", "detail_tab": "WEB-E2E-ADMIN", "status": "Not run", "execution": "Auto"},
        ]
        latest = {
            "E2E-AUTH-01": {"status": "Passed", "execution": "Auto"},
            "E2E-ADM-01": {"status": "Passed", "execution": "Auto"},
        }
        updates = update_summary_dashboard(client, "sheet-screen", sheet, cases, latest)
        self.assertEqual([u["row"] for u in updates], [6, 7])
        writes = client.batches[0]
        total_write = next(rows[0] for _tab, rng, rows in writes if rng == "D8:K8")
        self.assertEqual(total_write[:5], [2, 2, 0, 0, 0])

    def test_run_all_executes_api_screen_and_playwright_groups(self):
        with patch("workflow.run_group", return_value=True) as run_group_mock, patch("workflow.load_cases", return_value=[]), patch("workflow.sync") as sync_mock:
            run_all(False)
        self.assertEqual([call.args[0] for call in run_group_mock.call_args_list], ["api", "screen", "playwright"])
        sync_mock.assert_called_once_with(False, False)


if __name__ == "__main__":
    unittest.main()
