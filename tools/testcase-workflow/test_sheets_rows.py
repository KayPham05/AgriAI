import json
import unittest

from registry_state import CONFIG
from sheets_rows import build_sheet_row, upsert_row


class SheetsRowsTests(unittest.TestCase):
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

    def test_sheet_row_uses_explicit_column_mapping(self):
        row = build_sheet_row({"id": "API-X-01", "detail_tab": "API-X-01 GET /api/x", "status": "Passed", "execution": "Automation", "expected_result": "ok"}, {"id": "A", "detail_tab": "B", "status": "C", "execution": "D", "expected_result": "E"})
        self.assertEqual(row[:5], ["API-X-01", "API-X-01 GET /api/x", "Passed", "Auto", "ok"])

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

    def test_upsert_preserves_existing_manual_status_when_not_in_latest_results_and_defaults_new_rows(self):
        class FakeClient:
            def values(self, _sid, _tab, a1="A:Z"):
                if a1 == "A16:M16":
                    return [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]
                return [["ID"]] + [[""] for _ in range(14)] + [["API-PRED-01", "Prediction upload", "Reject", "Pre", "Data", "None", "Body", "400", "Err", "No DB", "Passed", "Manual", "QA checked manually"]]

        mapping = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]["detail_mapping"]
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
