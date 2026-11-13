import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "tools" / "testcase-workflow" / "workflow.py"


class WorkflowSmokeTests(unittest.TestCase):
    def test_dry_run_reports_all_configured_cases_without_writing_state(self):
        result = subprocess.run(
            [sys.executable, str(WORKFLOW), "sync", "--dry-run"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        payload = json.loads(result.stdout)
        self.assertEqual(payload["case_count"], 6)
        self.assertTrue(payload["dry_run"])

    def test_test_groups_include_playwright(self):
        config_path = ROOT / "tools" / "testcase-workflow" / "config" / "test-groups.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertIn("playwright", config["groups"])
        self.assertEqual(config["groups"]["playwright"]["command"], "python")


if __name__ == "__main__":
    unittest.main()
