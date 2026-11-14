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
from workflow import CaseResult, deprecated_case_ids, emit_result, main, normalize_case, redact_sensitive, normalize_tab_name, build_sheet_row, calculate_summary_counts, upsert_row
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
        cases = [{"id": "API-1", "status": "Not run", "execution": "N/A"}, {"id": "API-2", "status": "Not run", "execution": "Automation"}]
        counts = calculate_summary_counts(cases, {"API-1": {"status": "Passed", "execution": "Automation"}})
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
        row = build_sheet_row({"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "status": "Passed", "execution": "Automation", "expected_result": "ok"}, {"id": "A", "detail_tab": "B", "status": "C", "execution": "D", "expected_result": "E"})
        self.assertEqual(row[:5], ["API-X-01", "API-X-01 GET /api/x", "Passed", "Automation", "ok"])
    def test_dry_run_reports_all_configured_cases_without_writing_state(self):
        result = subprocess.run(
            [sys.executable, str(WORKFLOW), "sync", "--dry-run"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        payload = json.loads(result.stdout)
        self.assertEqual(payload["case_count"], 7)
        self.assertTrue(payload["dry_run"])

    def test_test_groups_include_playwright(self):
        config_path = ROOT / "tools" / "testcase-workflow" / "config" / "test-groups.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertIn("playwright", config["groups"])
        self.assertEqual(config["groups"]["playwright"]["command"], "python")

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
            if case.get("runner") in {"dotnet", "vitest"}:
                self.assertTrue(case.get("selector"), f"missing selector for {case['id']}")
                source_text = (ROOT / case["source_test"]).read_text(encoding="utf-8")
                selector = case["selector"].split("~", 1)[-1]
                if case["runner"] == "dotnet":
                    selector = selector.rsplit(".", 1)[-1]
                self.assertIn(selector, source_text, f"stale selector for {case['id']}: {case['selector']}")

    def test_result_artifact_validator_accepts_unique_cases(self):
        path = Path("results.json")
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps({"cases": [{"id": "API-1", "status": "Passed", "execution": "Automation"}]})):
            summary = validate_results(Path("artifacts"))
        self.assertEqual(summary["case_count"], 1)

    def test_result_artifact_validator_rejects_duplicate_cases(self):
        path = Path("results.json")
        payload = {"cases": [
            {"id": "API-1", "status": "Passed", "execution": "Automation"},
            {"id": "API-1", "status": "Failed", "execution": "Automation"},
        ]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"))

    def test_result_artifact_validator_rejects_invalid_status(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Unknown", "execution": "Automation"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"))

    def test_result_artifact_validator_reports_failed_cases(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Blocked", "execution": "Automation"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            self.assertEqual(validate_results(Path("artifacts"))["failed_cases"], ["API-1"])

    def test_result_artifact_validator_rejects_missing_expected_case(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Passed", "execution": "Automation"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"), {"API-1", "API-2"})

    def test_emit_result_appends_cases_to_artifact(self):
        directory = "artifact-output"
        stored = {}
        def capture(path, payload):
            stored["payload"] = payload
        with patch.dict("os.environ", {"AGRIVISION_RESULT_DIR": directory}), patch("workflow.record_result"), patch("workflow.Path.mkdir"), patch("workflow.Path.exists", side_effect=[False, True]), patch("workflow.read_json", return_value={"schema_version": 1, "run_id": "run-1", "cases": [{"id": "A", "status": "Passed", "execution": "Automation"}]}), patch("workflow.write_json_atomic", side_effect=capture):
            emit_result(CaseResult("A", "Passed", "Automation", run_id="run-1"))
            emit_result(CaseResult("B", "Failed", "Automation", run_id="run-1"))
            self.assertEqual([case["id"] for case in stored["payload"]["cases"]], ["A", "B"])


if __name__ == "__main__":
    unittest.main()
