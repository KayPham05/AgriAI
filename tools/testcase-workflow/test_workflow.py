import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "tools" / "testcase-workflow" / "workflow.py"
sys.path.insert(0, str(WORKFLOW.parent))
from workflow import normalize_case, redact_sensitive, normalize_tab_name, build_sheet_row, calculate_summary_counts, upsert_row


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


if __name__ == "__main__":
    unittest.main()
