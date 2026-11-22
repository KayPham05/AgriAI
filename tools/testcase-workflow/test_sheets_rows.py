import json
import unittest

from registry_state import CONFIG
from sheets_rows import build_sheet_row, upsert_row, validate_detail_schema


class SheetsRowsTests(unittest.TestCase):
    def test_detail_schema_requires_each_mapped_header_in_its_column(self):
        from unittest.mock import Mock

        layouts = {
            "api_table": [
                ["ID", "Item", "Testcase Name", "Precondition Test Case", "Test data", "Request",
                 "", "Expected Response", "", "Expected Database", "Result", "Excution", "Note"],
                ["", "", "", "", "", "params", "body", "Status code", "Body"],
            ],
            "screen_table": [
                ["No.", "Main Category", "Sub Category", "Type", "Pre-Conditions", "Test Descriptions",
                 "Steps", "Expected Result", "Testing result", "", "Remarks"],
                ["", "", "", "", "", "", "", "", "Chrome", "Excution"],
            ],
            "viewpoint_table": [
                ["No.", "Tên bộ phận/ Tên hệ thống chức năng", "Đối tượng test", "", "",
                 "Mục xác nhận", "Ghi chú"],
                ["", "", "Mục lớn", "Mục trung", "Mục nhỏ"],
            ],
        }
        for mode, headers in layouts.items():
            with self.subTest(mode=mode):
                client = Mock()
                client.values.return_value = headers
                validate_detail_schema(client, "sheet", "Case", mode)
                client.values.return_value = [row[:3] + ["Reviewer notes"] + row[3:] for row in headers]
                with self.assertRaisesRegex(RuntimeError, "schema drift at D"):
                    validate_detail_schema(client, "sheet", "Case", mode)

    def test_new_cases_skip_note_and_formula_rows_without_ids(self):
        rows = [["ID", "Evidence"], ["", "Reviewer draft"], ["", '=IF(TRUE,"","Reviewer note")'], []]
        for mode in ("api_table", "screen_table", "viewpoint_table"):
            with self.subTest(mode=mode):
                original = [list(row) for row in rows]
                writes = []
                upsert_row(None, "sheet", "Case", {"id": "NEW", "detail_tab": "Case"},
                           {"id": "A", "evidence": "B"}, detail_mode=mode, data_start_row=2,
                           pending_updates=writes, tab_values_cache={("sheet", "Case"): original})
                self.assertEqual(writes[0][1], "A4:B4")
                self.assertEqual(original[:3], rows[:3])

    def test_upsert_is_idempotent_by_stable_case_id(self):
        class FakeClient:
            def __init__(self):
                self.values_calls = 0
                self.writes = []
            def values(self, *_args, **_kwargs):
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
            def values(self, *_args, **_kwargs):
                self.calls += 1
                return [["ID"], ["API-X-01"]] if self.calls == 1 else [["API-X-01", "001", "=Reviewer!A1", "Not run", "QA note"]]
            def update(self, *args):
                self.updated = args
            def append(self, *_args):
                raise AssertionError("append should not be called")
        client = FakeClient()
        case = {"id": "API-X-01", "detail_tab": "API-X-01", "kind": "api", "expected_result": "new expected"}
        mapping = {"id": "A", "item": "B", "test_name": "C", "status": "D", "evidence": "E"}
        upsert_row(client, "sheet", "tab", case, mapping, {"status": "Passed", "evidence": "run-1"})
        merged = client.updated[3][0]
        self.assertEqual(merged[1:3], [None, None])
        self.assertEqual(merged[3:], ["Passed", "run-1"])

    def test_sheet_row_uses_explicit_column_mapping(self):
        row = build_sheet_row({"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "status": "Passed", "execution": "Automation", "expected_result": "ok"}, {"id": "A", "detail_tab": "B", "status": "C", "execution": "D", "expected_result": "E"})
        self.assertEqual(row[:5], ["API-X-01", "API-X-01 GET /api/x", "Passed", "Auto", "ok"])

    def test_upsert_multiple_new_cases_in_same_tab_assigns_distinct_rows(self):
        class FakeClient:
            def __init__(self):
                self.values_calls = 0

            def values(self, *_args, **_kwargs):
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

    def test_upsert_appends_below_latest_occupied_row_skipping_earlier_gaps(self):
        class FakeClient:
            def values(self, *_args, **_kwargs):
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
            def values(self, _sid, _tab, a1="A:Z", **kwargs):
                if a1 == "A16:M16":
                    return [rows[15]]
                return [list(r) for r in rows]

        mapping = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]["detail_mapping"]
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
        self.assertIsNone(updated_row[9])
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

    def test_upsert_preserves_existing_manual_status_when_not_in_latest_results_and_defaults_new_rows(self):
        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z", **kwargs):
                if a1 == "A16:M16":
                    return [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]
                return [["ID"]] + [[""] for _ in range(14)] + [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]

        mapping = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]["detail_mapping"]
        pending = []
        cache = {}
        existing_case = {"id": "API-PRED-01", "detail_tab": "API-PRED-01 POST /api/predictions", "expected_result": "Err", "status": "Not run", "execution": "Auto"}
        res_upd = upsert_row(FakeClient(), "sheet-api", "API-PRED-01 POST /api/predictions", existing_case, mapping, result=None, detail_mode="api_table", data_start_row=16, pending_updates=pending, tab_values_cache=cache)
        self.assertEqual(res_upd["action"], "unchanged")
        self.assertEqual(pending, [])

        new_case = {**existing_case, "id": "API-PRED-02"}
        res_add = upsert_row(FakeClient(), "sheet-api", "API-PRED-01 POST /api/predictions", new_case, mapping, result=None, detail_mode="api_table", data_start_row=16, pending_updates=pending, tab_values_cache=cache)
        self.assertEqual(res_add["action"], "add")
        added_row = pending[0][2][0]
        self.assertEqual(added_row[10], "Not run")

    def test_upsert_places_columns_by_mapping_index_regardless_of_key_order_or_gaps(self):
        rows = [["ID", "KeepB", "Item", "Status"]] + [[""] for _ in range(14)] + [["CASE-1", "ManualB", "OldItem", "Not run"]]

        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z", **kwargs):
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
        self.assertEqual(pending, [("TAB", "A16:D16", [[None, None, "NewItem", "Passed"]])])

    def test_viewpoint_updates_generated_cells_and_preserves_edits_on_reactivation(self):
        case = {"id": "VP-1", "detail_tab": "VP", "minor": "Old", "confirmation": "Old"}
        for prefix in ("", "[Moved] "):
            with self.subTest(prefix=prefix):
                data = [[], [], ["manual", "Old", prefix + "VP-1; reviewer note", "extra"]]
                writes = []
                upsert_row(None, "sid", "VP", dict(case, minor="New", confirmation="New"),
                           {"minor": "A", "confirmation": "B", "id": "C"},
                           detail_mode="viewpoint_table", data_start_row=3, pending_updates=writes,
                           tab_values_cache={("sid", "VP"): data}, previous_case=case)
                self.assertEqual(data[2], ["manual", "New", "VP-1; reviewer note", "extra"])
                self.assertEqual([w[1] for w in writes], ["B3:B3", "C3:C3"] if prefix else ["B3:B3"])

    def test_viewpoint_recovers_unpublished_baseline_and_preserves_formula(self):
        case = {"id": "VP", "detail_tab": "Tab", "confirmation": "C"}
        mapping = {"id": "A", "confirmation": "B", "minor": "C"}
        data = [["VP", "B", "=Reviewer!A1"]]
        writes = []
        upsert_row(None, "sheet", "Tab", case, mapping, detail_mode="viewpoint_table",
                   previous_case=dict(case, confirmation="A"), pending_baselines=(dict(case, confirmation="B"),),
                   pending_updates=writes, tab_values_cache={("sheet", "Tab"): data})
        self.assertEqual(writes, [("Tab", "B1:B1", [["C"]])])
        self.assertEqual(data[0][2], "=Reviewer!A1")

    def test_viewpoint_compares_legacy_typed_values_with_canonical_baseline_only(self):
        cases = [(1, "1", True), (1.0, "1", True), (1.25, "1.25", True),
                 (True, "TRUE", True), (False, "TRUE", False),
                 (1, "01", False), (2, "1", False), ("=1", "1", False)]
        for sheet_value, old_text, should_write in cases:
            with self.subTest(sheet_value=sheet_value, old_text=old_text):
                old = {"id": "VP", "detail_tab": "Tab", "confirmation": old_text}
                writes = []
                cache = {("sheet", "Tab"): [["VP", sheet_value]]}
                upsert_row(None, "sheet", "Tab", dict(old, confirmation="3"),
                           {"id": "A", "confirmation": "B"}, detail_mode="viewpoint_table",
                           previous_case=old, pending_updates=writes, tab_values_cache=cache)
                self.assertEqual(writes, [("Tab", "B1:B1", [["3"]])] if should_write else [])

    def test_viewpoint_appends_literal_business_text_with_numeric_row_number(self):
        from unittest.mock import Mock

        client = Mock()
        client.values.return_value = []
        case = {"id": "VP", "detail_tab": "Tab", "confirmation": "001"}
        upsert_row(client, "sheet", "Tab", case, {"no": "A", "confirmation": "B", "id": "C"},
                   detail_mode="viewpoint_table")
        client.append.assert_called_once_with("sheet", "Tab", [1, "001", "VP"], raw=True)

    def test_upsert_viewpoint_table_matches_exact_token_boundary_not_prefix_substring(self):
        table = [
            ["No.", "System", "Major", "Middle", "Minor", "Confirm", "ID"],
            ["", "", "", "", "", "", ""],
            ["1", "Agri", "Pred", "Upload", "A", "Confirm A", "VP-API-010"],
            ["2", "Agri", "Pred", "Upload", "B", "Confirm B", "VP-API-02; check timeout"],
        ]

        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z", **kwargs):
                if a1 == "G:G":
                    return [[r[6]] for r in table]
                return [list(r) for r in table]

        mapping = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["viewpoint"]["detail_mapping"]
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

    def test_upsert_append_updates_tab_values_cache_when_pending_updates_none(self):
        class FakeClient:
            def __init__(self):
                self.appended = []
            def values(self, *_args, **_kwargs):
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
