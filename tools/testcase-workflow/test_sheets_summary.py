import json
import unittest

from registry_state import CONFIG
from sheets_formulas import build_detail_summary_updates, calculate_summary_counts, formula_separator_for_locale
from sheets_rows import normalize_sheet_status
from sheets_summary import (
    _parse_dashboard_int,
    aggregate_viewpoint_status,
    map_viewpoint_overview_status,
    update_summary_dashboard,
    update_summary_list,
)


class SummaryClientFixture:
    def __init__(self):
        self.batches = []
        self.cleared = []
        self.style_reqs = []

    def batch_update(self, _sid, writes):
        self.batches.append(writes)

    def batch_requests(self, _sid, requests):
        self.style_reqs.extend(requests)

    def clear(self, *args):
        self.cleared.append(args)


class SheetsSummaryTests(unittest.TestCase):
    def test_summary_counts_are_derived_without_dashboard_rows(self):
        cases = [{"id": "API-1", "status": "Not run", "execution": "N/A"}, {"id": "API-2", "status": "Not run", "execution": "Auto"}]
        counts = calculate_summary_counts(cases, {"API-1": {"status": "Passed", "execution": "Auto"}})
        self.assertEqual(counts["total"], 2)
        self.assertEqual(counts["passed"], 1)
        self.assertEqual(counts["not_run"], 1)
        self.assertEqual(counts["automation"], 2)

    def test_update_summary_dashboard_assigns_distinct_rows_and_sums_updated_counts(self):
        class FakeClient(SummaryClientFixture):
            def __init__(self):
                super().__init__()
                self.copy_calls = []

            def values(self, *_args, **_kwargs):
                return [
                    ["", "Sheet Name", "Name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Auto", "Manual", "N/A", "UI", "Function", "Validate", "Status Testing", "Progress", "Remarks"],
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


            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return [{"copyPaste": {"destination": {"startRowIndex": start - 1, "endRowIndex": end}}}]

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"updateCells": {"row": row_number, "col": col_index, "uri": uri}}

        client = FakeClient()
        sheet = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["screen"]
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
        class FakeClient(SummaryClientFixture):
            def __init__(self):
                super().__init__()
                self.copy_calls = []

            def values(self, *_args, **_kwargs):
                return [
                    ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
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


            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return [{"copyPaste": {"start": start, "end": end}}]

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "uri": uri}}

            def clear_validation_request(self, *_args):
                return {"clearValidation": True}

        client = FakeClient()
        sheet = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
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
                '=COUNTIFS(\'API-PRED-01 POST /api/predictions\'!L16:L;"N/A";\'API-PRED-01 POST /api/predictions\'!A16:A;"<>[Moved]*";\'API-PRED-01 POST /api/predictions\'!M16:M;"<>[Deprecated]*")',
                '=IF(D7=0;"To do";IF(E7+F7+G7=0;"To do";IF(H7=0;"Test Done";"Testing")))',
                "=E7/D7",
            ],
        )
        total_write = next(rows[0] for _tab, rng, rows in writes if rng == "D9:K9")
        self.assertEqual(total_write, [f"=SUM({col}5:{col}8)" for col in ("D", "E", "F", "G", "H", "I", "J", "K")])
        # Existing row 7 must NOT have style overwritten; only newly added row 8 copies style from row 5.
        self.assertEqual(client.copy_calls, [(0, 5, 8, 8, 14, True)])

    def test_dashboard_refuses_shifted_columns_before_any_mutation(self):
        from unittest.mock import Mock
        sheets = json.loads((CONFIG / "sheets.json").read_text())["spreadsheets"]
        for kind in ("api", "screen"):
            for offset in (3, 10):
                with self.subTest(kind=kind, shifted_column=offset + 1):
                    sheet = sheets[kind]
                    header = ["No.", "Sheet name", "Name", "Total Testcase", "Passed", "Failed",
                              "Blocked", "Not run", "Auto", "Manual", "N/A"]
                    if kind == "screen":
                        header.extend(["UI", "Function", "Validate"])
                    header.extend(["Status Testing", "Progress", "Remarks"])
                    header.insert(offset, "Reviewer notes")
                    client = Mock()
                    client.values.return_value = [header, [], [], [], ["", "", "Total"]]
                    with self.assertRaisesRegex(RuntimeError, "header schema drift"):
                        update_summary_dashboard(client, "sheet", sheet, [{"id": "T", "detail_tab": "Case"}], {})
                    client.insert_row.assert_not_called()
                    client.clear.assert_not_called()
                    client.batch_update.assert_not_called()
                    client.batch_requests.assert_not_called()

    def test_dashboard_can_grow_past_sixty_rows_and_preserves_notes_in_unnamed_rows(self):
        from unittest.mock import Mock
        sheets = json.loads((CONFIG / "sheets.json").read_text())["spreadsheets"]
        for kind, expected_range in (("api", "A:N"), ("screen", "A:Q")):
            with self.subTest(kind=kind):
                sheet = sheets[kind]
                mapping = sheet["dashboard_mapping"]
                header = ["No.", "Sheet name", "Name", "Total Testcase", "Passed", "Failed",
                          "Blocked", "Not run", "Auto", "Manual", "N/A"]
                if kind == "screen":
                    header.extend(["UI", "Function", "Validate"])
                header.extend(["Status Testing", "Progress", "Remarks"])
                rows = [header] + [[] for _ in range(mapping["data_start_row"] - 2)]
                rows += [[str(i), f"Legacy {i}", "Name", 1] for i in range(59 - len(rows) - 1)]
                rows += [[""] * (len(header) - 1) + ["Manual review evidence"], ["", "", "Total"]]
                self.assertEqual(len(rows), 60)
                client = Mock()
                client.values.side_effect = lambda _sid, _tab, a1: rows if a1 == expected_range else rows[:60]
                client.insert_row.side_effect = lambda _sid, _gid, row: rows.insert(row - 1, [])
                client.sheet_metadata.return_value = [{"title": sheet["summary_tab"], "sheetId": 1}]
                client.copy_row_style_requests.return_value = []
                client.spreadsheet_locale.return_value = "en_US"
                cases = [{"id": "T", "detail_tab": "Case"}]
                result = update_summary_dashboard(client, "sheet", sheet, cases, {})
                self.assertEqual(result[0]["row"], 60)
                self.assertEqual(rows[58][-1], "Manual review evidence")
                self.assertTrue(all("59" not in a1 for _, a1, _ in client.batch_update.call_args.args[1]))
                self.assertEqual(rows[60][2], "Total")
                rows[59] = ["", "Case", "Name"]
                client.insert_row.reset_mock()
                result = update_summary_dashboard(client, "sheet", sheet, cases, {})
                self.assertEqual(result[0]["row"], 60)
                client.insert_row.assert_not_called()
                self.assertEqual(client.values.call_args.args[-1], expected_range)

    def test_dashboard_rerun_reuses_row_after_lost_insert_response(self):
        from unittest.mock import Mock

        sheet = json.loads((CONFIG / "sheets.json").read_text())["spreadsheets"]["api"]
        rows = [
            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked",
             "Not run", "Auto", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
            [], [], [], ["1", "Legacy", "Old"], ["", "", "Total"],
        ]
        client = Mock()
        client.values.side_effect = lambda *_args: rows
        client.sheet_metadata.return_value = [{"title": "Report bug", "sheetId": 1}]
        client.copy_row_style_requests.return_value = []
        client.spreadsheet_locale.return_value = "en_US"

        def insert_then_lose_response(_sheet, _gid, row):
            rows.insert(row - 1, [])
            raise RuntimeError("write may have applied")

        client.insert_row.side_effect = insert_then_lose_response
        cases = [{"id": "T", "detail_tab": "Case"}]
        with self.assertRaisesRegex(RuntimeError, "write may have applied"):
            update_summary_dashboard(client, "sheet", sheet, cases, {})
        client.batch_update.assert_not_called()
        result = update_summary_dashboard(client, "sheet", sheet, cases, {})
        self.assertEqual(result[0]["row"], 6)
        self.assertEqual(rows[6][2], "Total")
        client.insert_row.assert_called_once_with("sheet", 1, 6)
        client.batch_update.assert_called_once()

    def test_update_summary_list_populates_no_screen_and_valid_viewpoint_status(self):
        class FakeClient(SummaryClientFixture):
            def __init__(self):
                super().__init__()
                self.copy_calls = []

            def values(self, *_args, **_kwargs):
                return [
                    ["No.", "Sheet name", "Screen", "Status", "Remarks"],
                    ["1", "SR_001", "Màn hình cửa hàng", "Done", ""],
                    [],
                    ["9", "VP-API-01 Prediction Upload", "", "To do", "old", "", "", "stray"],
                ]

            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]


            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                self.copy_calls.append((sheet_id, src, start, end, end_col, include_validation))
                return []

            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "col": col_index, "uri": uri}}

        client = FakeClient()
        sheet = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["viewpoint"]
        cases = [
            {"id": "VP-API-01", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Màn hình chẩn đoán bệnh cây", "status": "Done", "expected_result": "Boundary ok"},
            {"id": "VP-API-02", "detail_tab": "VP-API-01 Prediction Upload", "summary_name": "Màn hình chẩn đoán bệnh cây", "status": "Not run", "expected_result": "Timeout ok"},
        ]
        updates = update_summary_list(client, "sheet-vp", sheet, cases, {"VP-API-01": {"status": "Passed", "evidence": "ev-a"}})
        # Blank row 3 skipped -> VP-API-01 at row 4 gets sequential No. = 2 and aggregated status "In progress"
        self.assertEqual(updates, [{"detail_tab": "VP-API-01 Prediction Upload", "row": 4, "no": 2, "status": "In progress"}])
        self.assertEqual(client.batches[0], [("Overview", f"{col}4:{col}4", [[v]]) for col, v in zip("ABCDE", [2, "VP-API-01 Prediction Upload", "Màn hình chẩn đoán bệnh cây", "In progress", "ev-a"])])
        self.assertEqual(client.copy_calls, [])
        self.assertTrue(any("hyperlink" in req and req["hyperlink"]["uri"] == "#gid=99" for req in client.style_reqs))
        self.assertEqual(client.cleared, [])
        self.assertEqual(map_viewpoint_overview_status("Not run"), "To do")
        self.assertEqual(map_viewpoint_overview_status("Blocked"), "Block")
        self.assertEqual(map_viewpoint_overview_status("Failed"), "In progress")
        self.assertEqual(aggregate_viewpoint_status(["Passed", "Not run"]), "In progress")
        self.assertEqual(aggregate_viewpoint_status(["Blocked"]), "Block")

    def test_update_summary_dashboard_parses_vi_vn_thousands_separators_and_ignores_decimals(self):
        class FakeClient(SummaryClientFixture):
            def __init__(self, rows):
                super().__init__()
                self.rows = rows
            def values(self, *_args, **_kwargs):
                return self.rows
            def sheet_metadata(self, *_args):
                return [{"title": "Report bug", "sheetId": 0}]
            def insert_row(self, *_args): pass
            def copy_row_style_requests(self, *_args, **_kwargs): return []
            def set_hyperlink_request(self, *_args): return {}
            def clear_validation_request(self, *_args): return {}

        sheet = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        rows_thousands = [
            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
            [], [], [],
            ["1", "LEGACY-A", "LegacyA", "1.250", "1.000", "250", "0", "0", "0", "1.250", "0"],
            ["", "", "Total", "1.250", "1.000", "250", "0", "0", "0", "1.250", "0"],
        ]
        client_thousands = FakeClient(rows_thousands)
        update_summary_dashboard(client_thousands, "sid", sheet, [], {})
        total_prog = next(rows[0][0] for _t, rng, rows in client_thousands.batches[0] if rng == "M6:M6")
        self.assertEqual(total_prog, "=E6/D6")

        rows_decimal = [
            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
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

    def test_update_summary_list_uses_dynamic_mapping_bounds_and_preserves_legacy_notes_and_unmapped_columns(self):
        rows = [["No.", "Extra", "Sheet name", "Screen", "Status", "Remarks", "Reviewer notes"]]
        for i in range(2, 105):
            rows.append([str(i - 1), "", f"LEG-{i}", "Legacy", "Done", ""])
        rows[1] = ["99", "", "Legacy Project", "", "", "", "Manual review evidence"]
        rows[103] = ["103", "", "VP-API-01 Prediction Upload", "", "To do", "old", "", "", "", "", "", "", "", "", "far_stray"]

        class FakeClient(SummaryClientFixture):
            def __init__(self):
                super().__init__()
                self.read_ranges = []
            def values(self, _sid, _tab, a1, **_kwargs):
                self.read_ranges.append(a1)
                return [list(r) for r in rows]
            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]
            def copy_row_style_requests(self, sheet_id, src, start, end, end_col, include_validation=True):
                return [{"copyPaste": {"end_col": end_col}}]
            def set_hyperlink_request(self, sheet_id, row_number, col_index, uri):
                return {"hyperlink": {"row": row_number, "col": col_index, "uri": uri}}

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
        self.assertEqual(client.batches[0], [("Overview", f"{col}104:{col}104", [[v]]) for col, v in zip("ACDEF", [103, "VP-API-01 Prediction Upload", "Chẩn đoán", "Done", "Ok"])])
        self.assertEqual(client.cleared, [])
        client = FakeClient()
        update_summary_list(client, "sid", sheet, [], {})
        self.assertEqual((client.batches, client.cleared, client.style_reqs), ([], [], []))

    def test_overview_keeps_existing_screen_formula(self):
        client = SummaryClientFixture()
        client.values = lambda *args, **kwargs: [
            ["No.", "Sheet name", "Screen", "Status", "Remarks"],
            ["1", "VP", '=IF(TRUE,"","Manual")', "To do", ""],
        ] if kwargs == {"formulas": True} else [
            ["No.", "Sheet name", "Screen", "Status", "Remarks"],
            ["1", "VP", "", "To do", ""],
        ]
        sheet = json.loads((CONFIG / "sheets.json").read_text())["spreadsheets"]["viewpoint"]
        update_summary_list(client, "sid", sheet, [{"id": "VP", "detail_tab": "VP"}], {})
        self.assertNotIn("C2:C2", [cell for _, cell, _ in client.batches[0]])

    def test_overview_refuses_shifted_header_before_writing(self):
        client = SummaryClientFixture()
        client.values = lambda *args, **kwargs: [
            ["No.", "Sheet name", "Screen", "Reviewer notes", "Status", "Remarks"],
            ["1", "VP", "Manual screen", "Manual evidence", "Done", ""],
        ]
        sheet = json.loads((CONFIG / "sheets.json").read_text())["spreadsheets"]["viewpoint"]
        with self.assertRaisesRegex(RuntimeError, "schema drift"):
            update_summary_list(client, "sid", sheet, [{"id": "VP", "detail_tab": "VP"}], {})
        self.assertEqual((client.batches, client.cleared), ([], []))

    def test_parse_dashboard_int_handles_zero_and_thousands_separators(self):
        self.assertEqual(_parse_dashboard_int(0), 0)
        self.assertEqual(_parse_dashboard_int("0"), 0)
        self.assertEqual(_parse_dashboard_int("1.250"), 1250)
        self.assertEqual(_parse_dashboard_int("1,250"), 1250)
        self.assertIsNone(_parse_dashboard_int("1.5"))
        self.assertIsNone(_parse_dashboard_int(None))

    def test_update_summary_list_handles_optional_no_and_screen_cols_and_wide_range(self):
        rows = [["KeepA", "Sheet name", "KeepC", "Status"] + [""] * 23 + ["Remarks"]]
        rows.append(["legacyA", "VP-API-01 Prediction Upload", "legacyC", "To do", "old"])

        class FakeClient(SummaryClientFixture):
            def __init__(self):
                super().__init__()
                self.read_ranges = []
            def values(self, _sid, _tab, a1, **_kwargs):
                self.read_ranges.append(a1)
                return [list(r) for r in rows]
            def sheet_metadata(self, *_args):
                return [{"title": "Overview", "sheetId": 0}, {"title": "VP-API-01 Prediction Upload", "sheetId": 99}]

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
        self.assertEqual(client.batches[0], [
            ("Overview", "B2:B2", [["VP-API-01 Prediction Upload"]]),
            ("Overview", "D2:D2", [["Done"]]),
            ("Overview", "AB2:AB2", [["Ok"]]),
        ])

    def test_formula_separator_and_detail_summary_adapt_to_locale_and_custom_layout(self):
        self.assertEqual(formula_separator_for_locale("en_US"), ",")
        self.assertEqual(formula_separator_for_locale("ja_JP"), ",")
        self.assertEqual(formula_separator_for_locale("vi_VN"), ";")
        self.assertEqual(formula_separator_for_locale("fr_FR"), ";")
        self.assertEqual(formula_separator_for_locale(""), ";")

        custom_sheet = {
            "detail_data_start_row": 20,
            "detail_mapping": {"id": "B", "test_name": "D", "status": "M", "execution": "N", "type": "E"},
            "detail_count_field": "test_name",
            "detail_formula_metrics": ["passed", "failed", "blocked", "not_run", "total"],
            "summary_cell_refs": {"passed": "E3", "failed": "E4", "blocked": "E5", "not_run": "E6", "total": "E8"},
            "detail_header": {"meta_range": "A1:A1", "meta_rows": [["{summary_label}"]]},
        }
        updates = build_detail_summary_updates("API-CUSTOM", "CustomSummary", custom_sheet, formula_sep=",")
        by_range = {rng: rows for _tab, rng, rows in updates}
        self.assertEqual(by_range["A1:A1"], [["CustomSummary"]])
        self.assertEqual(
            by_range["E3:E6"],
            [
                ['=COUNTIFS(M20:M,"Passed",$B20:$B,"<>[Moved]*")'],
                ['=COUNTIFS(M20:M,"Failed",$B20:$B,"<>[Moved]*")'],
                ['=COUNTIFS(M20:M,"Blocked",$B20:$B,"<>[Moved]*")'],
                ["=E8-SUM(E3:E5)"],
            ],
        )
        self.assertEqual(by_range["E8:E8"], [['=COUNTIFS($B20:$B,"<>",$D20:$D,"<>",$B20:$B,"<>[Moved]*")']])

        class EnUsClient(SummaryClientFixture):
            def spreadsheet_locale(self, _sid):
                return "en_US"
            def values(self, *_args, **_kwargs):
                return [
                    ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
                    [], [], [],
                    ["1", "API-X-01", "GetX", "1", "1", "0", "0", "0", "1", "0", "0"],
                    ["", "", "Total", "1", "1", "0", "0", "0", "1", "0", "0"],
                ]
            def sheet_metadata(self, *_args):
                return [{"title": "Report bug", "sheetId": 0}, {"title": "API-X-01", "sheetId": 77}]
            def clear_validation_request(self, *_args): return {}
            def copy_row_style_requests(self, *_args, **_kwargs): return []
            def set_hyperlink_request(self, *_args): return {}

        api_sheet = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        en_client = EnUsClient()
        update_summary_dashboard(en_client, "sid", api_sheet, [{"id": "API-X-01", "detail_tab": "API-X-01", "summary_name": "GetX"}], {})
        row5 = next(rows[0] for _tab, rng, rows in en_client.batches[0] if rng == "A5:M5")
        self.assertEqual(row5[10], "=COUNTIFS('API-X-01'!L16:L,\"N/A\",'API-X-01'!A16:A,\"<>[Moved]*\",'API-X-01'!M16:M,\"<>[Deprecated]*\")")
        self.assertEqual(row5[11], '=IF(D5=0,"To do",IF(E5+F5+G5=0,"To do",IF(H5=0,"Test Done","Testing")))')
        update_summary_dashboard(en_client, "sid", api_sheet, [], {}, {"API-X-01"})
        old_tab_row = next(rows[0] for _tab, rng, rows in en_client.batches[-1] if rng == "A5:M5")
        self.assertEqual(old_tab_row[2], "GetX")
        self.assertEqual(old_tab_row[-1], "=IFERROR(E5/D5,0)")
