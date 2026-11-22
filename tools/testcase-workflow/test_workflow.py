import json
import re
import subprocess
import sys
import time
import unittest
import tempfile
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "tools" / "testcase-workflow" / "workflow.py"
sys.path.insert(0, str(WORKFLOW.parent))
from workflow import (
    CaseResult,
    deprecated_case_ids,
    emit_result,
    load_previous_cases_from_git,
    main,
    normalize_case,
    normalize_tab_name,
    redact_sensitive,
)
from validate_results import main as validate_main, validate_results


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

    def test_direct_checks_propagate_failure_and_return_normally_on_success(self):
        checks = [
            (["check-health"], "workflow.check_health"),
            (["check-guest-prediction", "--file", "fixture.jpg"], "workflow.check_guest_prediction"),
        ]
        for args, adapter in checks:
            with self.subTest(command=args[0]), patch.object(sys, "argv", ["workflow.py", *args]):
                with patch(adapter, return_value=False), self.assertRaises(SystemExit) as error:
                    main()
                self.assertEqual(error.exception.code, 1)
                with patch(adapter, return_value=True):
                    self.assertIsNone(main())

    def test_sensitive_values_are_redacted_from_evidence(self):
        value = redact_sensitive("guestToken=secret-value; Authorization: Bearer abc")
        self.assertNotIn("secret-value", value)
        self.assertNotIn("abc", value)
        self.assertIn("[REDACTED]", value)

    def test_sensitive_credentials_are_redacted(self):
        value = redact_sensitive("access_token=token-value; private_key=key-value")
        self.assertNotIn("token-value", value)
        self.assertNotIn("key-value", value)

    def test_tab_name_is_trimmed_to_sheets_limit(self):
        name = normalize_tab_name("API-X-01 " + "x" * 200)
        self.assertLessEqual(len(name), 100)
        self.assertTrue(name.startswith("API-X-01"))

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
            "--expected-cases tools/testcase-workflow/config/cases.json",
            "--expected-id RUN-api",
            "--expected-id RUN-screen",
            "--expected-id RUN-playwright",
            "--expected-id API-HEALTH-01",
            "--expected-id API-PRED-GUEST-01",
            "E2E_BASE_URL: http://127.0.0.1:3000",
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

    def test_artifact_gate_uses_normalized_status_and_requires_pass_for_mandatory_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            for status in (" Failed ", "Skipped", "Deprecated"):
                with self.subTest(status=status):
                    (path / "results.json").write_text(json.dumps({"cases": [
                        {"id": " REQUIRED ", "status": status, "execution": " Auto "},
                        {"id": "OPTIONAL", "status": "Skipped", "execution": "Auto"},
                    ]}), encoding="utf-8")
                    summary = validate_results(path, {"REQUIRED"})
                    self.assertEqual(summary["failed_cases"], ["REQUIRED"])
                    self.assertEqual(summary["cases"][0]["status"], status.strip())

    def test_result_artifact_validator_rejects_missing_expected_case(self):
        path = Path("results.json")
        payload = {"cases": [{"id": "API-1", "status": "Passed", "execution": "Auto"}]}
        with patch.object(Path, "rglob", return_value=[path]), patch.object(Path, "read_text", return_value=json.dumps(payload)):
            with self.assertRaises(ValueError):
                validate_results(Path("artifacts"), {"API-1", "API-2"})

    def test_result_artifact_validator_requires_explicit_ids_with_catalogue(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            catalogue = root / "cases.json"
            catalogue.write_text(json.dumps({"cases": [{"id": "E2E-1", "runner": "playwright"}]}), encoding="utf-8")
            artifact = root / "results.json"
            cases = [{"id": "E2E-1", "status": "Passed", "execution": "Auto"}]
            artifact.write_text(json.dumps({"cases": cases}), encoding="utf-8")
            with patch.object(sys, "argv", ["validate_results.py", tmpdir, "--expected-cases", str(catalogue), "--expected-id", "RUN-playwright"]):
                with patch("sys.stderr") as stderr, self.assertRaises(SystemExit):
                    validate_main()
                self.assertIn("missing testcase results: ['RUN-playwright']", "".join(call.args[0] for call in stderr.write.call_args_list))
                cases.append({"id": "RUN-playwright", "status": "Passed", "execution": "Auto"})
                artifact.write_text(json.dumps({"cases": cases}), encoding="utf-8")
                self.assertEqual(validate_main(), 0)

    def test_emit_result_appends_cases_to_artifact(self):
        with tempfile.TemporaryDirectory() as tmp, patch("registry_state.record_result"), patch.dict(
            "os.environ", {"AGRIVISION_RESULT_DIR": tmp}, clear=True
        ):
            for cid, status in (("A", "Failed"), ("B", "Passed"), ("A", "Passed")):
                emit_result(CaseResult(cid, status, "Auto", run_id="one"))
            self.assertEqual(validate_results(Path(tmp), {"A", "B"})["failed_cases"], [])
            emit_result(CaseResult("A", "Passed", "Auto", run_id="two"))
            payload = json.loads((Path(tmp) / "results.json").read_text())
            self.assertEqual(payload["run_id"], "two")
            self.assertEqual(validate_results(Path(tmp), {"A"})["case_count"], 1)

    def test_cli_replaces_previous_execution_and_keeps_results_within_run_all(self):
        def run_fixture(*_args):
            emit_result(CaseResult("A", "Passed", "Auto", run_id="subgroup1"))
            emit_result(CaseResult("B", "Passed", "Auto", run_id="subgroup2"))

        with tempfile.TemporaryDirectory() as tmp, patch("registry_state.record_result"), patch.dict(
            "os.environ", {"AGRIVISION_RESULT_DIR": tmp}, clear=True
        ), patch.object(sys, "argv", ["workflow.py", "run-all"]):
            path = Path(tmp) / "results.json"
            with patch("workflow.run_all", side_effect=run_fixture):
                main()
            self.assertEqual(validate_results(Path(tmp), {"A", "B"})["case_count"], 2)
            first = json.loads(path.read_text())
            with patch("workflow.run_all", side_effect=SystemExit(1)), self.assertRaises(SystemExit):
                main()
            second = json.loads(path.read_text())
            self.assertNotEqual(first["run_id"], second["run_id"])
            self.assertEqual(second["cases"], [])

    def test_execution_lock_blocks_active_writer_and_recovers_after_process_kill(self):
        from registry_state import artifact_execution

        with tempfile.TemporaryDirectory() as tmp, patch.dict(
            "os.environ", {"AGRIVISION_RESULT_DIR": tmp, "AGRIVISION_EXECUTION_ID": "", "GITHUB_RUN_ID": ""}
        ):
            path = Path(tmp) / "results.json"
            script = (
                "from registry_state import artifact_execution; import time\n"
                "with artifact_execution(): time.sleep(30)"
            )
            with subprocess.Popen([sys.executable, "-c", script], cwd=WORKFLOW.parent) as child:
                try:
                    deadline = time.monotonic() + 5
                    while not path.exists() and child.poll() is None and time.monotonic() < deadline:
                        time.sleep(0.01)
                    self.assertTrue(path.exists(), "Child must acquire its lock and initialize the artifact")
                    first_id = json.loads(path.read_text())["run_id"]
                    with self.assertRaisesRegex(RuntimeError, "state lock is held"), artifact_execution():
                        self.fail("A second writer must fail while the first process holds the lock")
                finally:
                    if child.poll() is None:
                        child.kill()
                    child.wait(timeout=5)
            self.assertTrue((Path(tmp) / "execution.lock").exists())
            with artifact_execution():
                self.assertNotEqual(json.loads(path.read_text())["run_id"], first_id)

    def test_ci_artifact_keeps_both_commands_and_resets_on_attempt_change(self):
        with tempfile.TemporaryDirectory() as tmp, patch("registry_state.record_result"), patch.dict(
            "os.environ", {"AGRIVISION_RESULT_DIR": tmp, "GITHUB_RUN_ID": "42",
                           "GITHUB_RUN_ATTEMPT": "1", "GITHUB_SHA": "old", "GITHUB_JOB": "live-contract"}, clear=True
        ):
            for case_id in ("API-HEALTH-01", "API-PRED-GUEST-01"):
                with patch.object(sys, "argv", ["workflow.py", "run-case", case_id]), patch(
                    "workflow.run_case", side_effect=lambda cid, *_args: emit_result(CaseResult(cid, "Passed", "Auto")) or True
                ):
                    main()
            self.assertEqual(validate_results(Path(tmp), {"API-HEALTH-01", "API-PRED-GUEST-01"})["case_count"], 2)
            with patch.dict("os.environ", {"GITHUB_RUN_ATTEMPT": "2", "GITHUB_SHA": "new"}):
                emit_result(CaseResult("API-HEALTH-01", "Passed", "Auto"))
            payload = json.loads((Path(tmp) / "results.json").read_text())
            self.assertEqual((payload["run_id"], payload["run_attempt"], payload["commit_sha"]), ("42", "2", "new"))
            self.assertEqual([item["id"] for item in payload["cases"]], ["API-HEALTH-01"])

    def test_ci_accepts_source_only_pull_requests_and_pushes(self):
        workflow = (ROOT / ".github/workflows/testcase-workflow.yml").read_text()
        self.assertRegex(workflow, r"(?m)^on:\s*\n  pull_request:\n  push:\n  workflow_dispatch:")

    def test_cases_json_schema_guards(self):
        cases = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "cases.json").read_text(encoding="utf-8"))["cases"]
        naming_rules = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "naming-rules.json").read_text(encoding="utf-8"))
        reserved_tabs = set(naming_rules["reserved_tabs"])
        placeholders = {"System under test is available", "Configured fixture/input", "Execute configured testcase"}

        for case in cases:
            cid = case["id"]
            self.assertNotIn(case["tab"], reserved_tabs, f"{cid} tab collides with reserved_tabs")
            self.assertTrue(str(case.get("name", "")).strip(), f"{cid} missing non-empty name")
            if case["kind"] == "screen":
                self.assertIn(case.get("type"), {"UI", "Function", "Validate"}, f"{cid} invalid type: {case.get('type')!r}")
                for field in ("precondition", "steps", "test_description"):
                    val = str(case.get(field, "")).strip()
                    self.assertTrue(val, f"{cid} missing {field}")
                    self.assertNotIn(val, placeholders, f"{cid} {field} still uses generic placeholder")
                self.assertNotEqual(case["test_description"].strip(), case["expected"].strip(), f"{cid} test_description duplicates expected")
            elif case["kind"] == "api":
                for field in ("expected_status", "params", "request_body", "test_data", "expected_body"):
                    self.assertTrue(str(case.get(field, "")).strip(), f"{cid} missing {field}")
                self.assertNotEqual(case["name"].strip(), case["expected_body"].strip(), f"{cid} name duplicates expected_body")

    def test_load_previous_cases_from_git_reads_head_when_dirty_and_parent_when_clean(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            repo = Path(tmpdir)
            cfg_file = repo / "tools" / "testcase-workflow" / "config" / "cases.json"
            cfg_file.parent.mkdir(parents=True, exist_ok=True)
            git = lambda *args: subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)
            git("init", "--initial-branch=main")
            git("config", "user.name", "Test")
            git("config", "user.email", "test@example.invalid")
            git("config", "commit.gpgsign", "false")

            v1 = {"cases": [{"id": "API-V1", "kind": "api", "tab": "API-V1", "expected": "v1"}]}
            cfg_file.write_text(json.dumps(v1), encoding="utf-8")
            git("add", ".")
            git("commit", "-m", "v1")
            before_push = git("rev-parse", "HEAD").stdout.strip()

            v2 = {"cases": [{"id": "API-V2", "kind": "api", "tab": "API-V2", "expected": "v2"}]}
            cfg_file.write_text(json.dumps(v2), encoding="utf-8")
            git("add", ".")
            git("commit", "-m", "v2")

            with patch("registry_state.ROOT", repo):
                clean_prev = load_previous_cases_from_git()
                self.assertEqual(list(clean_prev.keys()), ["API-V1"])

                cfg_file.write_text(json.dumps({"cases": [{"id": "API-V3", "kind": "api", "tab": "API-V3", "expected": "v3"}]}), encoding="utf-8")
                dirty_prev = load_previous_cases_from_git()
                self.assertEqual(list(dirty_prev.keys()), ["API-V2"])

            git("restore", str(cfg_file.relative_to(repo)))
            (repo / "notes.txt").write_text("Unrelated change in the same push", encoding="utf-8")
            git("add", "notes.txt")
            git("commit", "-m", "update notes")

            with patch("registry_state.ROOT", repo), patch.dict("os.environ", {"AGRIVISION_CASES_BEFORE_SHA": before_push}):
                previous = load_previous_cases_from_git()
                self.assertEqual(deprecated_case_ids(previous, v2["cases"]), ["API-V1"])
            with patch("registry_state.ROOT", repo), patch.dict("os.environ", {"AGRIVISION_CASES_BEFORE_SHA": "0" * 40}):
                self.assertEqual(load_previous_cases_from_git(), {})
            with patch("registry_state.ROOT", repo), patch.dict("os.environ", {"AGRIVISION_CASES_BEFORE_SHA": "1" * 40}):
                with self.assertRaisesRegex(RuntimeError, "previous push commit"):
                    load_previous_cases_from_git()

if __name__ == "__main__":
    unittest.main()
