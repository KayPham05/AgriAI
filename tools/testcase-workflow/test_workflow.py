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
from workflow import (
    CaseResult,
    _parse_dashboard_int,
    aggregate_viewpoint_status,
    build_sheet_row,
    calculate_summary_counts,
    deprecated_case_ids,
    emit_result,
    main,
    map_viewpoint_overview_status,
    normalize_case,
    normalize_sheet_status,
    normalize_tab_name,
    redact_sensitive,
    run_all,
    run_case,
    run_group,
    sync,
    update_summary_dashboard,
    update_summary_list,
    upsert_row,
)
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
        row = build_sheet_row({"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "status": "Passed", "execution": "Automation", "expected_result": "ok"}, {"id": "A", "detail_tab": "B", "status": "C", "execution": "D", "expected_result": "E"})
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
                self.style_reqs = []
                self.copy_calls = []

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
                return [
                    {"title": "Report", "sheetId": 10},
                    {"title": "WEB-E2E-AUTH", "sheetId": 21},
                    {"title": "WEB-E2E-ADMIN", "sheetId": 22},
                ]

            def clear(self, *_args):
                self.cleared.append(_args)

            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return [{"copyPaste": {"destination": {"startRowIndex": start - 1, "endRowIndex": end}}}]

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"updateCells": {"row": row_number, "col": col_index, "uri": uri}}

            def batch_update(self, _sid, writes):
                self.batches.append(writes)

            def batch_requests(self, _sid, reqs):
                self.style_reqs.extend(reqs)

        client = FakeClient()
        sheet = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["screen"]
        cases = [
            {"id": "E2E-AUTH-01", "detail_tab": "WEB-E2E-AUTH", "summary_name": "Màn hình đăng nhập", "type": "Function", "status": "Not run", "execution": "Auto"},
            {"id": "E2E-ADM-01", "detail_tab": "WEB-E2E-ADMIN", "summary_name": "Màn hình quản trị", "type": "Validate", "status": "Not run", "execution": "Auto"},
        ]
        latest = {
            "E2E-AUTH-01": {"status": "Passed", "execution": "Auto"},
            "E2E-ADM-01": {"status": "Passed", "execution": "Auto"},
        }
        updates = update_summary_dashboard(client, "sheet-screen", sheet, cases, latest)
        self.assertEqual([u["row"] for u in updates], [6, 7])
        self.assertEqual([u["no"] for u in updates], [1, 2])
        writes = client.batches[0]
        row6 = next(rows[0] for _tab, rng, rows in writes if rng == "A6:P6")
        self.assertEqual(
            row6,
            [
                1,
                "WEB-E2E-AUTH",
                "Màn hình đăng nhập",
                "='WEB-E2E-AUTH'!C11",
                "='WEB-E2E-AUTH'!C4",
                "='WEB-E2E-AUTH'!C5",
                "='WEB-E2E-AUTH'!C6",
                "='WEB-E2E-AUTH'!C7",
                "='WEB-E2E-AUTH'!C8",
                "='WEB-E2E-AUTH'!C9",
                "='WEB-E2E-AUTH'!C10",
                "='WEB-E2E-AUTH'!G8",
                "='WEB-E2E-AUTH'!G9",
                "='WEB-E2E-AUTH'!G10",
                '=IF(D6=0;"To do";IF(E6+F6+G6=0;"To do";IF(H6=0;"Test Done";"Testing")))',
                "=E6/D6",
            ],
        )
        total_write = next(rows[0] for _tab, rng, rows in writes if rng == "D8:N8")
        self.assertEqual(
            total_write,
            [f"=SUM({col}6:{col}7)" for col in ("D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N")],
        )
        # Existing row 6/7 had no sheet_name beforehand, so row 7 copies from row 6; row 6 doesn't copy onto itself.
        self.assertEqual(client.copy_calls, [(10, 6, 7, 7, 17, True)])

    def test_update_summary_dashboard_api_uses_live_formulas_skips_blank_gaps_and_preserves_existing_style(self):
        class FakeClient:
            def __init__(self):
                self.batches = []
                self.copy_calls = []
                self.style_reqs = []

            def values(self, *_args):
                return [
                    ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A"],
                    [],
                    [],
                    [],
                    ["1", "[API001] POST/api/Voucher", "CreateVoucher", "111", "90", "17", "4", "0", "8", "100", "3"],
                    [],
                    ["9", "API-PRED-01 POST /api/predictions", "CreatePrediction", "3", "3", "0", "0", "0", "3", "0", "0"],
                    ["", "", "Total", "114", "93", "17", "4", "0", "11", "100", "3"],
                ]

            def sheet_metadata(self, *_args):
                return [
                    {"title": "Report bug", "sheetId": 0},
                    {"title": "API-PRED-01 POST /api/predictions", "sheetId": 51},
                    {"title": "API-HEALTH-01 GET /api/health", "sheetId": 52},
                ]

            def insert_row(self, _sid, _sheet_id, row_num):
                self.inserted = row_num

            def clear(self, *_args):
                pass

            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return [{"copyPaste": {"start": start, "end": end}}]

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "uri": uri}}

            def clear_validation_request(self, *_args):
                return {"clearValidation": True}

            def batch_update(self, _sid, writes):
                self.batches.append(writes)

            def batch_requests(self, _sid, reqs):
                self.style_reqs.extend(reqs)

        client = FakeClient()
        sheet = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        cases = [
            {"id": "API-PRED-01", "detail_tab": "API-PRED-01 POST /api/predictions", "summary_name": "CreatePrediction", "status": "Passed", "execution": "Auto"},
            {"id": "API-HEALTH-01", "detail_tab": "API-HEALTH-01 GET /api/health", "summary_name": "GetHealth", "status": "Passed", "execution": "Auto"},
        ]
        updates = update_summary_dashboard(client, "sheet-api", sheet, cases, {})
        # Blank row 6 skipped -> sequential No. is 1 ([API001]), 2 (API-PRED-01 at row 7), 3 (API-HEALTH-01 inserted at row 8)
        self.assertEqual(updates[0]["no"], 2)
        self.assertEqual(updates[0]["row"], 7)
        self.assertEqual(updates[1]["no"], 3)
        self.assertEqual(updates[1]["row"], 8)
        writes = client.batches[0]
        row7 = next(rows[0] for _tab, rng, rows in writes if rng == "A7:M7")
        self.assertEqual(
            row7,
            [
                2,
                "API-PRED-01 POST /api/predictions",
                "CreatePrediction",
                "='API-PRED-01 POST /api/predictions'!C11",
                "='API-PRED-01 POST /api/predictions'!C5",
                "='API-PRED-01 POST /api/predictions'!C6",
                "='API-PRED-01 POST /api/predictions'!C7",
                "='API-PRED-01 POST /api/predictions'!C8",
                "='API-PRED-01 POST /api/predictions'!C9",
                "='API-PRED-01 POST /api/predictions'!C10",
                '=COUNTIF(\'API-PRED-01 POST /api/predictions\'!L16:L1000;"N/A")',
                '=IF(D7=0;"To do";IF(E7+F7+G7=0;"To do";IF(H7=0;"Test Done";"Testing")))',
                "=E7/D7",
            ],
        )
        total_write = next(rows[0] for _tab, rng, rows in writes if rng == "D9:K9")
        self.assertEqual(total_write, [f"=SUM({col}5:{col}8)" for col in ("D", "E", "F", "G", "H", "I", "J", "K")])
        # Existing row 7 must NOT have style overwritten; only newly added row 8 copies style from row 5.
        self.assertEqual(client.copy_calls, [(0, 5, 8, 8, 14, True)])

    def test_upsert_appends_below_latest_occupied_row_skipping_earlier_gaps(self):
        class FakeClient:
            def values(self, *_args):
                return [["ID"]] + [[""] for _ in range(14)] + [["", "", ""], ["CASE-1", "Item", "Passed"]]

        pending = []
        cache = {}
        res = upsert_row(
            FakeClient(),
            "sheet-screen",
            "WEB-E2E-AUTH",
            {"id": "CASE-2", "detail_tab": "WEB-E2E-AUTH", "expected_result": "ok"},
            {"id": "A", "main_category": "B", "status": "C"},
            {"status": "Passed"},
            detail_mode="screen_table",
            data_start_row=15,
            pending_updates=pending,
            tab_values_cache=cache,
        )
        self.assertEqual(res["action"], "add")
        self.assertEqual(res["row"], 18)
        self.assertEqual(pending, [("WEB-E2E-AUTH", "A18:C18", [["CASE-2", "Prediction", "Passed"]])])

    def test_upsert_ignores_section_dividers_and_upgrades_stale_placeholders_preserving_manual_edits(self):
        rows = [["ID"]] + [[""] for _ in range(13)]
        rows.append(["Validate"])  # Row 15 section header
        rows.append([
            "API-PRED-01",
            "Prediction",
            "Old expected fallback",
            "System under test is available",
            "Configured fixture/input",
            "",
            "Multipart request without File",
            "4xx theo contract",
            "Old expected fallback",
            "QA custom DB invariant",
            "Passed",
            "Automation",
            "old evidence",
        ])  # Row 16
        while len(rows) < 45:
            rows.append([])
        rows.append(["Logic"])  # Row 46 section header
        while len(rows) < 66:
            rows.append([])
        rows.append(["Other"])  # Row 67 footer section header

        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z"):
                if a1 == "A16:M16":
                    return [rows[15]]
                return [list(r) for r in rows]

        mapping = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]["detail_mapping"]
        pending = []
        cache = {}
        existing_case = {
            "id": "API-PRED-01",
            "detail_tab": "API-PRED-01 POST /api/predictions",
            "item": "Prediction upload",
            "name": "Reject missing file",
            "precondition": "API host running",
            "test_data": "0-byte file",
            "params": "None",
            "request_body": "Multipart without File",
            "expected_status": "400 Bad Request",
            "expected_body": "Validation error",
            "expected_result": "Old expected fallback",
            "expected_database": "No DB write",
        }
        res_upd = upsert_row(
            FakeClient(),
            "sheet-api",
            "API-PRED-01 POST /api/predictions",
            existing_case,
            mapping,
            {"status": "Blocked", "execution": "Automation", "evidence": "run-2"},
            detail_mode="api_table",
            data_start_row=16,
            pending_updates=pending,
            tab_values_cache=cache,
        )
        self.assertEqual(res_upd["action"], "update")
        self.assertEqual(res_upd["row"], 16)
        updated_row = pending[0][2][0]
        self.assertEqual(updated_row[1], "Prediction upload")
        self.assertEqual(updated_row[2], "Reject missing file")
        self.assertEqual(updated_row[3], "API host running")
        self.assertEqual(updated_row[4], "0-byte file")
        self.assertEqual(updated_row[5], "None")
        self.assertEqual(updated_row[9], "QA custom DB invariant")
        self.assertEqual(updated_row[10], "Blocked")
        self.assertEqual(updated_row[11], "Auto")

        new_case = {**existing_case, "id": "API-PRED-03"}
        res_add = upsert_row(
            FakeClient(),
            "sheet-api",
            "API-PRED-01 POST /api/predictions",
            new_case,
            mapping,
            {"status": "Passed", "execution": "Auto"},
            detail_mode="api_table",
            data_start_row=16,
            pending_updates=pending,
            tab_values_cache=cache,
        )
        self.assertEqual(res_add["action"], "add")
        self.assertEqual(res_add["row"], 17)

    def test_sync_only_styles_newly_added_rows_and_removes_stray_i8_conditional_format(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_state = Path(tmpdir) / "state.json"
            tmp_state.write_text(json.dumps({
                "schema_version": 2,
                "cases": {
                    "WEB-PRED-01": {"id": "WEB-PRED-01", "kind": "screen", "detail_tab": "WEB-DIAG-01 Diagnosis", "expected_result": "ok"},
                    "API-HEALTH-01": {"id": "API-HEALTH-01", "kind": "api", "detail_tab": "API-HEALTH-01 GET /api/health", "expected_result": "ok"},
                },
                "latest_results": {
                    "WEB-PRED-01": {"status": "Passed", "execution": "Auto", "evidence": "ev1"},
                    "WEB-PRED-02": {"status": "Passed", "execution": "Auto", "evidence": "ev2"},
                    "API-HEALTH-01": {"status": "Passed", "execution": "Auto", "evidence": "ev3"},
                },
            }), encoding="utf-8")

            test_cases = [
                normalize_case({
                    "id": "WEB-PRED-01", "kind": "screen", "tab": "WEB-DIAG-01 Diagnosis",
                    "name": "Existing screen case", "precondition": "Ready", "test_description": "Desc 1",
                    "steps": "1. Open", "expected": "Exp 1", "type": "Function", "execution": "Auto", "summary_name": "Diag",
                }),
                normalize_case({
                    "id": "WEB-PRED-02", "kind": "screen", "tab": "WEB-DIAG-01 Diagnosis",
                    "name": "Newly added screen case", "precondition": "Ready", "test_description": "Desc 2",
                    "steps": "1. Open", "expected": "Exp 2", "type": "Validate", "execution": "Auto", "summary_name": "Diag",
                }),
                normalize_case({
                    "id": "API-HEALTH-01", "kind": "api", "tab": "API-HEALTH-01 GET /api/health",
                    "name": "Health check", "precondition": "Ready", "test_data": "GET", "params": "None",
                    "request_body": "None", "expected_status": "200 OK", "expected": "Healthy", "execution": "Auto", "summary_name": "GetHealth",
                }),
            ]
            sheets_cfg = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
            test_sheets = {"api": sheets_cfg["api"], "screen": sheets_cfg["screen"]}

            class FakeSyncClient:
                def __init__(self):
                    self.requests_by_sid = {}
                    self.updates_by_sid = {}

                def ensure_sheet(self, _sid, tab_name, _tpl=None):
                    ids = {"WEB-DIAG-01 Diagnosis": 101, "API-HEALTH-01 GET /api/health": 201}
                    return {"sheetId": ids[tab_name], "title": tab_name, "created": False}

                def values(self, _sid, tab_name, a1="A:Z"):
                    if tab_name == "WEB-DIAG-01 Diagnosis":
                        if a1 == "A13:K14":
                            return [
                                ["No.", "Main Category", "Sub Category", "Type", "Pre-Conditions", "Test Descriptions", "Steps", "Expected Result", "Testing result", "", "Remarks"],
                                ["", "", "", "", "", "", "", "", "Chrome", "Excution"],
                            ]
                        rows = [[""] for _ in range(14)]
                        rows.append(["WEB-PRED-01", "Prediction", "Diagnosis", "Function", "Ready", "Desc 1", "1. Open", "Exp 1", "Passed", "Auto", "ev1"])
                        return rows
                    if tab_name == "API-HEALTH-01 GET /api/health":
                        if a1 == "A13:M14":
                            return [
                                ["ID", "Item", "Testcase Name", "Precondition", "Test data", "Request", "", "Expected", "", "DB", "Result", "Excution", "Note"],
                                ["", "", "", "", "", "params", "body", "Status code", "Body"],
                            ]
                        rows = [[""] for _ in range(15)]
                        rows.append(["API-HEALTH-01", "Health check", "Health check", "Ready", "GET", "None", "None", "200 OK", "Healthy", "", "Passed", "Auto", "ev3"])
                        return rows
                    if tab_name == "Report":
                        return [
                            ["", "Sheet Name", "Name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Auto", "Manual", "N/A"],
                            [], [], [], [],
                            ["1", "WEB-DIAG-01 Diagnosis", "Diag", "2", "2", "0", "0", "0", "2", "0", "0"],
                            ["", "", "Total", "2", "2", "0", "0", "0", "2", "0", "0"],
                        ]
                    if tab_name == "Report bug":
                        return [
                            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A"],
                            [], [], [],
                            ["1", "API-HEALTH-01 GET /api/health", "GetHealth", "1", "1", "0", "0", "0", "1", "0", "0"],
                            ["", "", "Total", "1", "1", "0", "0", "0", "1", "0", "0"],
                        ]
                    return []

                def sheet_metadata(self, sid):
                    if sid == sheets_cfg["screen"]["id"]:
                        return [{"title": "Report", "sheetId": 0}, {"title": "WEB-DIAG-01 Diagnosis", "sheetId": 101}]
                    return [{"title": "Report bug", "sheetId": 0}, {"title": "API-HEALTH-01 GET /api/health", "sheetId": 201}]

                def conditional_formats(self, sid):
                    if sid == sheets_cfg["screen"]["id"]:
                        return {
                            101: [
                                {"ranges": [{"sheetId": 101, "startRowIndex": 14, "endRowIndex": 16, "startColumnIndex": 8, "endColumnIndex": 9}]},
                                {"ranges": [{"sheetId": 101, "startRowIndex": 7, "endRowIndex": 8, "startColumnIndex": 8, "endColumnIndex": 9}]},
                            ]
                        }
                    return {}

                @staticmethod
                def delete_conditional_format_request(sheet_id, index):
                    return {"deleteConditionalFormatRule": {"sheetId": sheet_id, "index": index}}

                @staticmethod
                def copy_row_style_requests(sheet_id, src, start, end, end_col, include_validation=True):
                    return [{"copyPaste": {"sheetId": sheet_id, "src": src, "start": start, "end": end, "end_col": end_col, "include_validation": include_validation}}]

                @staticmethod
                def set_hyperlink_request(sheet_id, row_number, col_index, uri):
                    return {"hyperlink": {"sheetId": sheet_id, "row": row_number, "uri": uri}}

                @staticmethod
                def clear_validation_request(*_args):
                    return {"clearValidation": True}

                def clear(self, *_args):
                    pass

                def batch_requests(self, sid, reqs):
                    self.requests_by_sid.setdefault(sid, []).extend(reqs)

                def batch_update(self, sid, writes):
                    self.updates_by_sid.setdefault(sid, []).extend(writes)

            fake_client = FakeSyncClient()
            with (
                patch("workflow.STATE", tmp_state),
                patch("workflow.load_cases", return_value=test_cases),
                patch("workflow.load_sheets", return_value=test_sheets),
                patch("workflow.KINDS", {"api", "screen"}),
                patch("workflow.SheetsClient", return_value=fake_client),
                patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}),
            ):
                sync(dry_run=False, write_sheets=True)

            screen_reqs = fake_client.requests_by_sid[sheets_cfg["screen"]["id"]]
            self.assertIn({"deleteConditionalFormatRule": {"sheetId": 101, "index": 1}}, screen_reqs)
            self.assertFalse(any(r.get("deleteConditionalFormatRule", {}).get("index") == 0 for r in screen_reqs))
            copy_reqs = [r["copyPaste"] for r in screen_reqs if "copyPaste" in r and r["copyPaste"]["sheetId"] == 101]
            self.assertEqual(copy_reqs, [{"sheetId": 101, "src": 15, "start": 16, "end": 16, "end_col": 11, "include_validation": True}])
            repeat_reqs = [r["repeatCell"]["range"] for r in screen_reqs if "repeatCell" in r and r["repeatCell"]["range"]["sheetId"] == 101]
            self.assertEqual(repeat_reqs, [{"sheetId": 101, "startRowIndex": 15, "endRowIndex": 16, "startColumnIndex": 0, "endColumnIndex": 11}])
            # Existing API row had no additions -> zero detail style requests emitted on API spreadsheet!
            api_reqs = [r for r in fake_client.requests_by_sid.get(sheets_cfg["api"]["id"], []) if "copyPaste" in r or "repeatCell" in r]
            self.assertEqual(api_reqs, [])
            api_c5_c11 = next(rows for _tab, rng, rows in fake_client.updates_by_sid[sheets_cfg["api"]["id"]] if rng == "C5:C11")
            self.assertEqual(api_c5_c11[2], ['=COUNTIF(K16:K1000;"Blocked")'])
            self.assertEqual(api_c5_c11[5], ['=COUNTIF(L16:L1000;"Manual")'])
            self.assertEqual(api_c5_c11[6], ['=COUNTIFS($A16:$A1000;"<>";$C16:$C1000;"<>")'])
            screen_updates = fake_client.updates_by_sid[sheets_cfg["screen"]["id"]]
            self.assertIn(("WEB-DIAG-01 Diagnosis", "A1:A2", [[""], ["WEB-DIAG-01 Diagnosis/Diag"]]), screen_updates)
            self.assertIn(("WEB-DIAG-01 Diagnosis", "C7:C7", [['=C11-SUM(C4:C6)']]), screen_updates)
            self.assertIn(
                ("WEB-DIAG-01 Diagnosis", "C10:C11", [['=COUNTIF(J15:J1108;"N/A")'], ['=COUNTIFS($A15:$A1108;"<>";$C15:$C1108;"<>")']]),
                screen_updates,
            )
            self.assertIn(
                ("WEB-DIAG-01 Diagnosis", "G9:G10", [['=COUNTIF(D15:D1108;"FUNCTION")'], ['=COUNTIF(D15:D1108;"VALIDATE")']]),
                screen_updates,
            )

    def test_update_summary_list_populates_no_screen_and_valid_viewpoint_status(self):
        class FakeClient:
            def __init__(self):
                self.batches = []
                self.cleared = []
                self.copy_calls = []
                self.style_reqs = []

            def values(self, *_args):
                return [
                    ["No.", "Sheet name", "Screen", "Status", "Remarks"],
                    ["1", "SR_001", "Màn hình cửa hàng", "Done", ""],
                    [],
                    ["9", "VP-API-01 Prediction Upload", "", "To do", "old", "", "", "stray"],
                ]

            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]

            def clear(self, *args):
                self.cleared.append(args)

            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return []

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "col": col_index, "uri": uri}}

            def batch_update(self, _sid, writes):
                self.batches.append(writes)

            def batch_requests(self, _sid, reqs):
                self.style_reqs.extend(reqs)

        client = FakeClient()
        sheet = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["viewpoint"]
        cases = [
            {"id": "VP-API-01", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Màn hình chẩn đoán bệnh cây", "status": "Done", "expected_result": "Boundary ok"},
            {"id": "VP-API-02", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Màn hình chẩn đoán bệnh cây", "status": "Not run", "expected_result": "Timeout ok"},
        ]
        updates = update_summary_list(client, "sheet-vp", sheet, cases, {"VP-API-01": {"status": "Passed", "evidence": "ev-a"}})
        # Blank row 3 skipped -> VP-API-01 at row 4 gets sequential No. = 2 and aggregated status "In progress"
        self.assertEqual(updates, [{"detail_tab": "VP-API-01 Prediction Upload", "row": 4, "no": 2, "status": "In progress"}])
        self.assertEqual(client.batches[0], [("Overview", "A4:E4", [[2, "VP-API-01 Prediction Upload", "Màn hình chẩn đoán bệnh cây", "In progress", "ev-a"]])])
        self.assertEqual(client.copy_calls, [])
        self.assertTrue(any("hyperlink" in req and req["hyperlink"]["uri"] == "#gid=99" for req in client.style_reqs))
        self.assertEqual(client.cleared, [("sheet-vp", "Overview", "F4:H4")])
        self.assertEqual(map_viewpoint_overview_status("Not run"), "To do")
        self.assertEqual(map_viewpoint_overview_status("Blocked"), "Block")
        self.assertEqual(map_viewpoint_overview_status("Failed"), "In progress")
        self.assertEqual(aggregate_viewpoint_status(["Passed", "Not run"]), "In progress")
        self.assertEqual(aggregate_viewpoint_status(["Blocked"]), "Block")

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

    def test_run_group_playwright_emits_per_case_results_and_run_summary(self):
        emitted = []

        def fake_subprocess_run(cmd, **_kwargs):
            report_idx = cmd.index("--json-report") + 1
            Path(cmd[report_idx]).write_text(json.dumps({
                "browser": "chromium-headless",
                "build_mode": "next-production",
                "total": 2,
                "passed": 2,
                "failed": 0,
                "cases": [
                    {"id": "E2E-AUTH-01", "test": "e2e.test_auth.AuthBrowserTests.test_register", "status": "Passed"},
                    {"id": "E2E-ADM-01", "test": "e2e.test_admin.AdminBrowserTests.test_admin_portal", "status": "Passed"},
                ],
            }), encoding="utf-8")
            return subprocess.CompletedProcess(cmd, 0, stdout="line1\nline2", stderr="Ran 2 tests")

        with patch("workflow.subprocess.run", side_effect=fake_subprocess_run), patch("workflow.emit_result", side_effect=emitted.append):
            ok = run_group("playwright")

        self.assertTrue(ok)
        self.assertEqual([item.id for item in emitted], ["E2E-AUTH-01", "E2E-ADM-01", "RUN-playwright"])
        self.assertNotIn("\n", emitted[0].evidence)
        self.assertIn("selector=e2e.test_auth.AuthBrowserTests.test_register", emitted[0].evidence)
        self.assertEqual(emitted[-1].status, "Passed")
        self.assertIn("2/2 Playwright E2E UI cases passed", emitted[-1].actual)

    def test_run_all_executes_api_screen_and_playwright_groups(self):
        with patch("workflow.run_group", return_value=True) as run_group_mock, patch("workflow.load_cases", return_value=[]), patch("workflow.sync") as sync_mock:
            run_all(False)
        self.assertEqual([call.args[0] for call in run_group_mock.call_args_list], ["api", "screen", "playwright"])
        sync_mock.assert_called_once_with(False, False)

    def test_local_sync_preserves_prior_auto_row_until_sheets_sync_succeeds(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_state = Path(tmpdir) / "state.json"
            old_case = normalize_case({
                "id": "API-X-01", "kind": "api", "tab": "API-X-01 GET /api/x",
                "item": "Health", "name": "Old auto name", "precondition": "Old pre",
                "test_data": "GET", "params": "None", "request_body": "None",
                "expected_status": "200 OK", "expected": "Old expected", "summary_name": "GetX",
            })
            new_case = normalize_case({
                **old_case,
                "name": "New auto name",
                "precondition": "New pre",
            })
            tmp_state.write_text(json.dumps({
                "schema_version": 2,
                "cases": {"API-X-01": old_case},
                "latest_results": {},
                "runs": [],
            }), encoding="utf-8")

            sheets_cfg = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
            test_sheets = {"api": sheets_cfg["api"]}

            class FakeSyncClient:
                def __init__(self):
                    self.updates = []
                def ensure_sheet(self, _sid, tab_name, _tpl=None):
                    return {"sheetId": 201, "title": tab_name, "created": False}
                def values(self, _sid, tab_name, a1="A:Z"):
                    if tab_name == "API-X-01 GET /api/x":
                        if a1 == "A13:M14":
                            return [["ID", "Item", "Testcase Name", "Precondition", "Test data", "Request", "", "Expected", "", "DB", "Result", "Excution", "Note"], []]
                        rows = [[""] for _ in range(15)]
                        rows.append(["API-X-01", "Health", "Old auto name", "Old pre", "GET", "None", "None", "200 OK", "Old expected", "", "Passed", "Manual", "manual note"])
                        return rows
                    if tab_name == "Report bug":
                        return [
                            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A"],
                            [], [], [],
                            ["1", "API-X-01 GET /api/x", "GetX", "1", "1", "0", "0", "0", "0", "1", "0"],
                            ["", "", "Total", "1", "1", "0", "0", "0", "0", "1", "0"],
                        ]
                    return []
                def sheet_metadata(self, _sid):
                    return [{"title": "Report bug", "sheetId": 0}, {"title": "API-X-01 GET /api/x", "sheetId": 201}]
                def conditional_formats(self, _sid):
                    raise AssertionError("conditional_formats must not be queried when no screen tab is synced")
                def delete_conditional_format_request(self, *_args): return {}
                def copy_row_style_requests(self, *_args, **_kwargs): return []
                def set_hyperlink_request(self, *_args): return {"hyperlink": True}
                def clear_validation_request(self, *_args): return {"clearValidation": True}
                def clear(self, *_args): pass
                def batch_requests(self, *_args): pass
                def batch_update(self, _sid, writes):
                    self.updates.extend(writes)

            with (
                patch("workflow.STATE", tmp_state),
                patch("workflow.load_cases", return_value=[new_case]),
                patch("workflow.load_sheets", return_value=test_sheets),
                patch("workflow.KINDS", {"api"}),
            ):
                with patch("workflow.SheetsClient", side_effect=AssertionError("dry_run must not open SheetsClient")):
                    sync(dry_run=True, write_sheets=True)
                after_dry = json.loads(tmp_state.read_text(encoding="utf-8"))
                self.assertEqual(after_dry["cases"]["API-X-01"]["name"], "Old auto name")

                sync(dry_run=False, write_sheets=False)
                after_local = json.loads(tmp_state.read_text(encoding="utf-8"))
                self.assertEqual(after_local["cases"]["API-X-01"]["name"], "Old auto name")

                failing_client = FakeSyncClient()
                def fail_batch(_sid, _writes):
                    raise RuntimeError("boom")
                failing_client.batch_update = fail_batch
                with patch("workflow.SheetsClient", return_value=failing_client), patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}):
                    with self.assertRaises(RuntimeError):
                        sync(dry_run=False, write_sheets=True)
                after_fail = json.loads(tmp_state.read_text(encoding="utf-8"))
                self.assertEqual(after_fail["cases"]["API-X-01"]["name"], "Old auto name")

                fake_client = FakeSyncClient()
                with patch("workflow.SheetsClient", return_value=fake_client), patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}):
                    sync(dry_run=False, write_sheets=True)

            row_write = next(rows[0] for tab, rng, rows in fake_client.updates if tab == "API-X-01 GET /api/x" and rng == "A16:M16")
            self.assertEqual(row_write[2], "New auto name")
            self.assertEqual(row_write[3], "New pre")
            after_sheets = json.loads(tmp_state.read_text(encoding="utf-8"))
            self.assertEqual(after_sheets["cases"]["API-X-01"]["name"], "New auto name")

    def test_upsert_preserves_existing_manual_status_when_not_in_latest_results_and_defaults_new_rows(self):
        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z"):
                if a1 == "A16:M16":
                    return [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]
                return [["ID"]] + [[""] for _ in range(14)] + [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]

        mapping = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]["detail_mapping"]
        pending = []
        cache = {}
        existing_case = {"id": "API-PRED-01", "detail_tab": "API-PRED-01 POST /api/predictions", "expected_result": "Err", "status": "Not run", "execution": "Auto"}
        res_upd = upsert_row(FakeClient(), "sheet-api", "API-PRED-01 POST /api/predictions", existing_case, mapping, result=None, detail_mode="api_table", data_start_row=16, pending_updates=pending, tab_values_cache=cache)
        self.assertEqual(res_upd["action"], "update")
        updated_row = pending[0][2][0]
        self.assertEqual(updated_row[10], "Passed")
        self.assertEqual(updated_row[11], "Manual")
        self.assertEqual(updated_row[12], "QA checked manually")

        new_case = {**existing_case, "id": "API-PRED-02"}
        res_add = upsert_row(FakeClient(), "sheet-api", "API-PRED-01 POST /api/predictions", new_case, mapping, result=None, detail_mode="api_table", data_start_row=16, pending_updates=pending, tab_values_cache=cache)
        self.assertEqual(res_add["action"], "add")
        added_row = pending[1][2][0]
        self.assertEqual(added_row[10], "Not run")

    def test_upsert_places_columns_by_mapping_index_regardless_of_key_order_or_gaps(self):
        rows = [["ID", "KeepB", "Item", "Status"]] + [[""] for _ in range(14)] + [["CASE-1", "ManualB", "OldItem", "Not run"]]

        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z"):
                if a1 == "A16:D16":
                    return [rows[15]]
                return [list(r) for r in rows]

        mapping = {"status": "D", "id": "A", "item": "C"}
        pending = []
        cache = {}
        res = upsert_row(
            FakeClient(),
            "sid",
            "TAB",
            {"id": "CASE-1", "detail_tab": "TAB", "item": "NewItem", "expected_result": "ok"},
            mapping,
            {"status": "Passed"},
            detail_mode="api_table",
            data_start_row=16,
            pending_updates=pending,
            tab_values_cache=cache,
            previous_case={"id": "CASE-1", "detail_tab": "TAB", "item": "OldItem", "expected_result": "ok"},
        )
        self.assertEqual(res["action"], "update")
        self.assertEqual(pending, [("TAB", "A16:D16", [["CASE-1", "ManualB", "NewItem", "Passed"]])])

    def test_upsert_viewpoint_table_matches_exact_token_boundary_not_prefix_substring(self):
        table = [
            ["No.", "System", "Major", "Middle", "Minor", "Confirm", "ID"],
            ["", "", "", "", "", "", ""],
            ["1", "Agri", "Pred", "Upload", "A", "Confirm A", "VP-API-010"],
            ["2", "Agri", "Pred", "Upload", "B", "Confirm B", "VP-API-02; check timeout"],
        ]

        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z"):
                if a1 == "G:G":
                    return [[r[6]] for r in table]
                return [list(r) for r in table]

        mapping = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["viewpoint"]["detail_mapping"]
        pending = []
        cache = {}
        res_02 = upsert_row(
            FakeClient(), "sid", "VP-API-01 Prediction Upload",
            {"id": "VP-API-02", "detail_tab": "VP-API-01 Prediction Upload", "expected_result": "ok"},
            mapping, None, detail_mode="viewpoint_table", data_start_row=3, pending_updates=pending, tab_values_cache=cache,
        )
        self.assertEqual(res_02, {"action": "unchanged", "tab": "VP-API-01 Prediction Upload", "row": 4})

        res_01 = upsert_row(
            FakeClient(), "sid", "VP-API-01 Prediction Upload",
            {"id": "VP-API-01", "detail_tab": "VP-API-01 Prediction Upload", "expected_result": "ok"},
            mapping, None, detail_mode="viewpoint_table", data_start_row=3, pending_updates=pending, tab_values_cache=cache,
        )
        self.assertEqual(res_01["action"], "add")
        self.assertEqual(res_01["row"], 5)

    def test_update_summary_dashboard_parses_vi_vn_thousands_separators_and_ignores_decimals(self):
        class FakeClient:
            def __init__(self, rows):
                self.rows = rows
                self.batches = []
            def values(self, *_args):
                return self.rows
            def sheet_metadata(self, *_args):
                return [{"title": "Report bug", "sheetId": 0}]
            def insert_row(self, *_args): pass
            def clear(self, *_args): pass
            def copy_row_style_requests(self, *_args, **_kwargs): return []
            def set_hyperlink_request(self, *_args): return {}
            def clear_validation_request(self, *_args): return {}
            def batch_update(self, _sid, writes): self.batches.append(writes)
            def batch_requests(self, *_args): pass

        sheet = json.loads((ROOT / "tools" / "testcase-workflow" / "config" / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        rows_thousands = [
            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A"],
            [], [], [],
            ["1", "LEGACY-A", "LegacyA", "1.250", "1.000", "250", "0", "0", "0", "1.250", "0"],
            ["", "", "Total", "1.250", "1.000", "250", "0", "0", "0", "1.250", "0"],
        ]
        client_thousands = FakeClient(rows_thousands)
        update_summary_dashboard(client_thousands, "sid", sheet, [], {})
        total_prog = next(rows[0][0] for _t, rng, rows in client_thousands.batches[0] if rng == "M6:M6")
        self.assertEqual(total_prog, "=E6/D6")

        rows_decimal = [
            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A"],
            [], [], [],
            ["1", "LEGACY-DEC", "LegacyDec", "1.5", "0", "0", "0", "0", "0", "0", "0"],
            ["", "", "Total", "1.5", "0", "0", "0", "0", "0", "0", "0"],
        ]
        client_decimal = FakeClient(rows_decimal)
        update_summary_dashboard(client_decimal, "sid", sheet, [], {})
        decimal_prog = next(rows[0][0] for _t, rng, rows in client_decimal.batches[0] if rng == "M6:M6")
        self.assertEqual(decimal_prog, 0)

    def test_calculate_summary_counts_handles_skipped_deprecated_and_blocked(self):
        cases = [
            {"id": "C1", "status": "Not run", "execution": "Auto"},
            {"id": "C2", "status": "Not run", "execution": "Auto"},
            {"id": "C3", "status": "Not run", "execution": "Manual"},
            {"id": "C4", "status": "Not run", "execution": "N/A"},
        ]
        counts = calculate_summary_counts(
            cases,
            {
                "C1": {"status": "Passed", "execution": "Auto"},
                "C2": {"status": "Skipped", "execution": "Auto"},
                "C3": {"status": "Deprecated", "execution": "N/A"},
                "C4": {"status": "Pendding", "execution": "Manual"},
            },
        )
        self.assertEqual(counts["total"], 4)
        self.assertEqual(counts["passed"], 1)
        self.assertEqual(counts["skipped"], 1)
        self.assertEqual(counts["deprecated"], 1)
        self.assertEqual(counts["blocked"], 1)
        self.assertEqual(counts["not_run"], 0)
        self.assertEqual(
            counts["passed"] + counts["failed"] + counts["blocked"] + counts["not_run"] + counts["skipped"] + counts["deprecated"],
            counts["total"],
        )
        self.assertEqual(normalize_sheet_status("Blocked", "api_table"), "Blocked")
        self.assertEqual(normalize_sheet_status("Pendding", "api_table"), "Blocked")
        self.assertEqual(normalize_sheet_status("Skipped", "screen_table"), "Not run")

    def test_update_summary_list_uses_dynamic_mapping_bounds_and_clears_wide_stray_columns(self):
        rows = [["No.", "Extra", "Sheet name", "Screen", "Status", "Remarks"]]
        for i in range(2, 105):
            rows.append([str(i - 1), "", f"LEG-{i}", "Legacy", "Done", ""])
        rows[103] = ["103", "", "VP-API-01 Prediction Upload", "", "To do", "old", "", "", "", "", "", "", "", "", "far_stray"]

        class FakeClient:
            def __init__(self):
                self.read_ranges = []
                self.batches = []
                self.cleared = []
                self.style_reqs = []
            def values(self, _sid, _tab, a1):
                self.read_ranges.append(a1)
                return [list(r) for r in rows]
            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]
            def clear(self, *args):
                self.cleared.append(args)
            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                return [{"copyPaste": {"end_col": end_col}}]
            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "col": col_index, "uri": uri}}
            def batch_update(self, _sid, writes):
                self.batches.append(writes)
            def batch_requests(self, _sid, reqs):
                self.style_reqs.extend(reqs)

        client = FakeClient()
        sheet = {
            "summary_tab": "Overview",
            "list_mapping": {
                "no_column": "A",
                "sheet_name_column": "C",
                "screen_column": "D",
                "status_column": "E",
                "remarks_column": "F",
                "data_start_row": 2,
            },
        }
        cases = [{"id": "VP-API-01", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Chẩn đoán", "status": "Done", "expected_result": "Ok"}]
        updates = update_summary_list(client, "sid", sheet, cases, {})
        self.assertEqual(client.read_ranges, ["A:Z"])
        self.assertEqual(updates, [{"detail_tab": "VP-API-01 Prediction Upload", "row": 104, "no": 103, "status": "Done"}])
        self.assertEqual(client.batches[0], [("Overview", "A104:F104", [[103, "", "VP-API-01 Prediction Upload", "Chẩn đoán", "Done", "Ok"]])])
        self.assertEqual(client.cleared, [("sid", "Overview", "G104:O104")])
        self.assertTrue(any("repeatCell" in req and req["repeatCell"]["range"]["startColumnIndex"] == 6 and req["repeatCell"]["range"]["endColumnIndex"] == 15 for req in client.style_reqs))

    def test_run_case_vitest_uses_platform_appropriate_pnpm_executable(self):
        fake_case = {
            "id": "WEB-PRED-01",
            "runner": "vitest",
            "source_path": "frontend/tests/integration/diagnosis/GuestDiagnosis.test.tsx",
            "selector": "runs anonymously",
        }
        for fake_os, expected_exec in (("posix", "pnpm"), ("nt", "pnpm.cmd")):
            with (
                patch("workflow.load_cases", return_value=[fake_case]),
                patch("workflow.os.name", fake_os),
                patch("workflow.emit_result"),
                patch("workflow.subprocess.run", return_value=subprocess.CompletedProcess([], 0, stdout="ok", stderr="")) as run_mock,
            ):
                self.assertTrue(run_case("WEB-PRED-01"))
            self.assertEqual(run_mock.call_args.args[0][0], expected_exec)

    def test_parse_dashboard_int_handles_zero_and_thousands_separators(self):
        self.assertEqual(_parse_dashboard_int(0), 0)
        self.assertEqual(_parse_dashboard_int("0"), 0)
        self.assertEqual(_parse_dashboard_int("1.250"), 1250)
        self.assertEqual(_parse_dashboard_int("1,250"), 1250)
        self.assertIsNone(_parse_dashboard_int("1.5"))
        self.assertIsNone(_parse_dashboard_int(None))

    def test_update_summary_list_handles_optional_no_and_screen_cols_and_wide_range(self):
        rows = [["KeepA", "Sheet name", "KeepC", "Status", "Remarks"]]
        rows.append(["legacyA", "VP-API-01 Prediction Upload", "legacyC", "To do", "old"])

        class FakeClient:
            def __init__(self):
                self.read_ranges = []
                self.batches = []
                self.cleared = []
            def values(self, _sid, _tab, a1):
                self.read_ranges.append(a1)
                return [list(r) for r in rows]
            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]
            def clear(self, *args):
                self.cleared.append(args)
            def batch_update(self, _sid, writes):
                self.batches.append(writes)

        client = FakeClient()
        sheet = {
            "summary_tab": "Overview",
            "list_mapping": {
                "sheet_name_column": "B",
                "status_column": "D",
                "remarks_column": "AB",
                "data_start_row": 2,
            },
        }
        cases = [{"id": "VP-API-01", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Screen", "status": "Done", "expected_result": "Ok"}]
        update_summary_list(client, "sid", sheet, cases, {})
        self.assertEqual(client.read_ranges, ["A:AB"])
        tab, rng, payload = client.batches[0][0]
        self.assertEqual((tab, rng), ("Overview", "B2:AB2"))
        self.assertEqual(payload[0][0], "VP-API-01 Prediction Upload")
        self.assertEqual(payload[0][1], "legacyC")
        self.assertEqual(payload[0][2], "Done")
        self.assertEqual(payload[0][-1], "Ok")

    def test_upsert_append_updates_tab_values_cache_when_pending_updates_none(self):
        class FakeClient:
            def __init__(self):
                self.appended = []
            def values(self, *_args):
                return [["ID"]] + [[""] for _ in range(13)]
            def append(self, _sid, _tab, row):
                self.appended.append(row)

        client = FakeClient()
        cache = {}
        mapping = {"id": "A", "main_category": "B", "status": "C"}
        res1 = upsert_row(client, "sid", "WEB-E2E-AUTH", {"id": "C1", "detail_tab": "WEB-E2E-AUTH", "expected_result": "ok"}, mapping, None, detail_mode="screen_table", data_start_row=15, pending_updates=None, tab_values_cache=cache)
        res2 = upsert_row(client, "sid", "WEB-E2E-AUTH", {"id": "C2", "detail_tab": "WEB-E2E-AUTH", "expected_result": "ok"}, mapping, None, detail_mode="screen_table", data_start_row=15, pending_updates=None, tab_values_cache=cache)
        self.assertEqual(res1["row"], 15)
        self.assertEqual(res2["row"], 16)
        self.assertEqual(len(client.appended), 2)


if __name__ == "__main__":
    unittest.main()
