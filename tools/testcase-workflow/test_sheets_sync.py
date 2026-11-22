import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from registry_state import CONFIG, normalize_case
from sheets_rows import build_sheet_row
from sheets_sync import sync


class SyncSnapshotFixture:
    snapshot = None

    def load_sync_snapshot(self, _sid):
        return self.snapshot

    def save_sync_snapshot(self, _sid, snapshot):
        self.snapshot = snapshot


class SheetsSyncTests(unittest.TestCase):
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
                    "RUN-screen": {"status": "Passed", "execution": "Auto", "evidence": "group summary"},
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
            sheets_cfg = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
            test_sheets = {"api": sheets_cfg["api"], "screen": sheets_cfg["screen"]}

            class FakeSyncClient(SyncSnapshotFixture):
                def __init__(self):
                    self.requests_by_sid = {}
                    self.updates_by_sid = {}

                def ensure_sheet(self, _sid, tab_name, _tpl=None, *, clear_from_row=None):
                    ids = {"WEB-DIAG-01 Diagnosis": 101, "API-HEALTH-01 GET /api/health": 201}
                    return {"sheetId": ids[tab_name], "title": tab_name, "created": False}

                def values(self, _sid, tab_name, a1="A:Z", **kwargs):
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
                            ["", "Sheet Name", "Name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Auto", "Manual", "N/A", "UI", "Function", "Validate", "Status Testing", "Progress", "Remarks"],
                            [], [], [], [],
                            ["1", "WEB-DIAG-01 Diagnosis", "Diag", "2", "2", "0", "0", "0", "2", "0", "0"],
                            ["", "", "Total", "2", "2", "0", "0", "0", "2", "0", "0"],
                        ]
                    if tab_name == "Report bug":
                        return [
                            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
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
                patch("registry_state.STATE", tmp_state),
                patch("registry_state.load_cases", return_value=test_cases),
                patch("registry_state.load_sheets", return_value=test_sheets),
                patch("registry_state.KINDS", {"api", "screen"}),
                patch("sheets_sync.SheetsClient", return_value=fake_client),
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
            self.assertEqual(api_c5_c11[2], ['=COUNTIFS(K16:K;"Blocked";$A16:$A;"<>[Moved]*";$M16:$M;"<>[Deprecated]*")'])
            self.assertEqual(api_c5_c11[5], ['=COUNTIFS(L16:L;"Manual";$A16:$A;"<>[Moved]*";$M16:$M;"<>[Deprecated]*")'])
            self.assertEqual(api_c5_c11[6], ['=COUNTIFS($A16:$A;"<>";$C16:$C;"<>";$A16:$A;"<>[Moved]*";$M16:$M;"<>[Deprecated]*")'])
            screen_updates = fake_client.updates_by_sid[sheets_cfg["screen"]["id"]]
            new_row = next(rows[0] for tab, rng, rows in screen_updates if tab == "WEB-DIAG-01 Diagnosis" and rng == "A16:K16")
            self.assertEqual(new_row[8:11], ["Not run", "Auto", ""])
            self.assertFalse(any(tab == "WEB-DIAG-01 Diagnosis" and rng == "A15:K15"
                                 for tab, rng, _ in screen_updates))
            self.assertIn(("WEB-DIAG-01 Diagnosis", "A1:A2", [[""], ["WEB-DIAG-01 Diagnosis/Diag"]]), screen_updates)
            screen_summary = next(rows for tab, rng, rows in screen_updates if tab == "WEB-DIAG-01 Diagnosis" and rng == "C4:C11")
            self.assertEqual(screen_summary[3], ['=C11-SUM(C4:C6)'])
            self.assertEqual(screen_summary[6:], [
                ['=COUNTIFS(J15:J;"N/A";$A15:$A;"<>[Moved]*";$K15:$K;"<>[Deprecated]*")'],
                ['=COUNTIFS($A15:$A;"<>";$C15:$C;"<>";$A15:$A;"<>[Moved]*";$K15:$K;"<>[Deprecated]*")'],
            ])
            screen_types = next(rows for tab, rng, rows in screen_updates if tab == "WEB-DIAG-01 Diagnosis" and rng == "G8:G10")
            self.assertEqual(screen_types, [
                ['=COUNTIFS(D15:D;"UI";$A15:$A;"<>[Moved]*";$K15:$K;"<>[Deprecated]*")'],
                ['=COUNTIFS(D15:D;"FUNCTION";$A15:$A;"<>[Moved]*";$K15:$K;"<>[Deprecated]*")'],
                ['=COUNTIFS(D15:D;"VALIDATE";$A15:$A;"<>[Moved]*";$K15:$K;"<>[Deprecated]*")'],
            ])

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

            sheets_cfg = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
            test_sheets = {"api": sheets_cfg["api"]}

            class FakeSyncClient(SyncSnapshotFixture):
                def __init__(self):
                    self.updates = []
                def ensure_sheet(self, _sid, tab_name, _tpl=None, *, clear_from_row=None):
                    return {"sheetId": 201, "title": tab_name, "created": False}
                def values(self, _sid, tab_name, a1="A:Z", **kwargs):
                    if tab_name == "API-X-01 GET /api/x":
                        if a1 == "A13:M14":
                            return [["ID", "Item", "Testcase Name", "Precondition", "Test data", "Request", "", "Expected", "", "DB", "Result", "Excution", "Note"],
                                    ["", "", "", "", "", "params", "body", "Status code", "Body"]]
                        rows = [[""] for _ in range(15)]
                        rows.append(["API-X-01", "Health", "Old auto name", "Old pre", "GET", "None", "None", "200 OK", "Old expected", "", "Passed", "Manual", "manual note"])
                        return rows
                    if tab_name == "Report bug":
                        return [
                            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
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
                patch("registry_state.STATE", tmp_state),
                patch("registry_state.load_cases", return_value=[new_case]),
                patch("registry_state.load_sheets", return_value=test_sheets),
                patch("registry_state.KINDS", {"api"}),
            ):
                with patch("sheets_sync.SheetsClient", side_effect=AssertionError("dry_run must not open SheetsClient")):
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
                with patch("sheets_sync.SheetsClient", return_value=failing_client), patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}):
                    with self.assertRaises(RuntimeError):
                        sync(dry_run=False, write_sheets=True)
                after_fail = json.loads(tmp_state.read_text(encoding="utf-8"))
                self.assertEqual(after_fail["cases"]["API-X-01"]["name"], "Old auto name")

                fake_client = FakeSyncClient()
                with patch("sheets_sync.SheetsClient", return_value=fake_client), patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}):
                    sync(dry_run=False, write_sheets=True)

            row_write = next(rows[0] for tab, rng, rows in fake_client.updates if tab == "API-X-01 GET /api/x" and rng == "A16:M16")
            self.assertEqual(row_write[2], "New auto name")
            self.assertEqual(row_write[3], "New pre")
            after_sheets = json.loads(tmp_state.read_text(encoding="utf-8"))
            self.assertEqual(after_sheets["cases"]["API-X-01"]["name"], "New auto name")

    def test_sync_reconstructs_previous_cases_from_git_when_state_empty_and_marks_deprecated_rows(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_state = Path(tmpdir) / "state.json"
            # Simulate CI after import-results: latest_results exists, cases is empty
            tmp_state.write_text(json.dumps({
                "schema_version": 2,
                "cases": {},
                "latest_results": {
                    "API-HEALTH-01": {"id": "API-HEALTH-01", "status": "Passed", "execution": "Auto", "evidence": "ok"},
                },
                "runs": [],
            }), encoding="utf-8")

            old_case = normalize_case({
                "id": "API-OLD-01", "kind": "api", "tab": "API-OLD-01 GET /api/old",
                "name": "Old endpoint", "precondition": "Ready", "test_data": "GET",
                "params": "None", "request_body": "None", "expected_status": "200 OK",
                "expected": "Deprecated soon", "summary_name": "GetOld", "execution": "Auto",
            })
            active_case = normalize_case({
                "id": "API-HEALTH-01", "kind": "api", "tab": "API-HEALTH-01 GET /api/health",
                "name": "Health", "precondition": "Ready", "test_data": "GET",
                "params": "None", "request_body": "None", "expected_status": "200 OK",
                "expected": "Healthy", "summary_name": "GetHealth",
            })
            sheets_cfg = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
            test_sheets = {"api": sheets_cfg["api"]}

            class FakeSyncClient(SyncSnapshotFixture):
                def __init__(self):
                    self.updates = []

                def ensure_sheet(self, _sid, tab_name, _tpl=None, *, clear_from_row=None):
                    return {"sheetId": 201, "title": tab_name, "created": False}

                def values(self, _sid, tab_name, a1="A:Z", **kwargs):
                    if tab_name in {"API-HEALTH-01 GET /api/health", "API-OLD-01 GET /api/old"}:
                        if a1 == "A13:M14":
                            return [["ID", "Item", "Testcase Name", "Precondition", "Test data", "Request", "", "Expected", "", "DB", "Result", "Excution", "Note"],
                                    ["", "", "", "", "", "params", "body", "Status code", "Body"]]
                        rows = [[""] for _ in range(15)]
                        cid = "API-HEALTH-01" if "health" in tab_name else "API-OLD-01"
                        evidence = "001\nReviewer evidence" if cid == "API-OLD-01" else "old"
                        rows.append([cid, "Health", cid, "Ready", "GET", "None", "None", "200 OK", "Healthy", "", "Passed", "Auto", evidence])
                        for written_tab, cell, values in self.updates:
                            if written_tab == tab_name and cell == "L16:L16":
                                rows[-1][11] = values[0][0]
                            elif written_tab == tab_name and cell == "M16:M16":
                                rows[-1][12] = values[0][0]
                        return rows
                    if tab_name == "Report bug":
                        return [
                            ["No.", "Sheet name", "API name", "Total Testcase", "Passed", "Failed", "Blocked", "Not run", "Automation", "Manual", "N/A", "Status Testing", "Progress", "Remarks"],
                            [], [], [],
                            ["1", "API-HEALTH-01 GET /api/health", "GetHealth", "1", "1", "0", "0", "0", "1", "0", "0"],
                            ["", "", "Total", "1", "1", "0", "0", "0", "1", "0", "0"],
                        ]
                    return []

                def sheet_metadata(self, _sid):
                    return [
                        {"title": "Report bug", "sheetId": 0},
                        {"title": "API-HEALTH-01 GET /api/health", "sheetId": 201},
                        {"title": "API-OLD-01 GET /api/old", "sheetId": 202},
                    ]

                def insert_row(self, *_args):
                    pass

                def copy_row_style_requests(self, *_args, **_kwargs):
                    return []

                def set_hyperlink_request(self, *_args):
                    return {"hyperlink": True}

                def clear_validation_request(self, *_args):
                    return {"clearValidation": True}

                def clear(self, *_args):
                    pass

                def batch_requests(self, *_args):
                    pass

                def batch_update(self, _sid, writes):
                    self.updates.extend(writes)

            fake_client = FakeSyncClient()
            git_prev = {"API-OLD-01": old_case, "API-HEALTH-01": active_case}
            with (
                patch("registry_state.STATE", tmp_state),
                patch("registry_state.load_cases", return_value=[active_case]) as load_cases,
                patch("registry_state.load_sheets", return_value=test_sheets),
                patch("registry_state.KINDS", {"api"}),
                patch("registry_state.load_previous_cases_from_git", return_value=git_prev),
                patch("sheets_sync.SheetsClient", return_value=fake_client),
                patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}),
            ):
                sync(dry_run=False, write_sheets=True)
                saved = json.loads(tmp_state.read_text(encoding="utf-8"))
                load_cases.return_value = [active_case, old_case]
                sync(dry_run=False, write_sheets=True)

            self.assertIn(("API-OLD-01 GET /api/old", "L16:L16", [["N/A"]]), fake_client.updates)
            self.assertIn(
                ("API-OLD-01 GET /api/old", "M16:M16", [["[Deprecated] Removed from cases.json; historical row retained.\n001\nReviewer evidence"]]),
                fake_client.updates,
            )
            # Status column K must NOT be overwritten with an invalid dropdown token
            self.assertFalse(any(tab == "API-OLD-01 GET /api/old" and rng.startswith("K") for tab, rng, _ in fake_client.updates))
            self.assertEqual(saved["latest_results"]["API-OLD-01"]["status"], "Deprecated")
            self.assertNotIn("API-OLD-01", saved["cases"])
            retired_formulas = next((rows for tab, rng, rows in fake_client.updates if tab == "API-OLD-01 GET /api/old" and rng == "C5:C11"), None)
            self.assertIsNotNone(retired_formulas)
            self.assertIn('$M16:$M;"<>[Deprecated]*"', retired_formulas[0][0])
            self.assertIn('$M16:$M;"<>[Deprecated]*"', retired_formulas[-1][0])
            restored = next(
                rows[0] for tab, rng, rows in fake_client.updates
                if tab == old_case["detail_tab"] and rng == "A16:M16"
            )
            self.assertEqual(restored[10:13], ["Not run", "Auto", "'001\nReviewer evidence"])
            current = json.loads(tmp_state.read_text(encoding="utf-8"))
            self.assertIn("API-OLD-01", current["cases"])
            self.assertNotIn("API-OLD-01", current["latest_results"])

    def test_viewpoint_retry_uses_pending_baseline_and_publishes_after_summary(self):
        config = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]
        case = normalize_case({"id": "VP-1", "kind": "viewpoint", "tab": "VP", "confirmation": "B"})
        old = dict(case, confirmation="A")
        current = dict(case, confirmation="C")
        mapping = config["viewpoint"]["detail_mapping"]
        cells = [[], [], build_sheet_row(case, mapping, detail_mode="viewpoint_table")]
        cells[2][4] = "=Reviewer!A1"
        from registry_state import CaseResult, record_result

        with (
            tempfile.TemporaryDirectory() as tmp,
            patch("registry_state.STATE", Path(tmp) / "state.json"),
            patch("registry_state.load_sheets", return_value=config),
            patch("registry_state.KINDS", {"viewpoint"}),
            patch("registry_state.load_cases", return_value=[current]),
            patch("sheets_sync.SheetsClient") as factory,
            patch("sheets_sync.validate_detail_schema"),
            patch("sheets_sync.update_summary_list") as summary,
            patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}),
        ):
            client = factory.return_value
            client.load_sync_snapshot.return_value = {"cases": {"VP-1": old}, "pending": [case]}
            client.ensure_sheet.return_value = {"sheetId": 2}
            client.values.return_value = cells
            client.spreadsheet_locale.return_value = "vi_VN"
            observed = []
            client.save_sync_snapshot.side_effect = lambda _sid, value: observed.append(value)
            def finish_summary(*_args):
                self.assertEqual(len(observed), 1)
                record_result(CaseResult("VP-1", "Passed", "Auto", run_id="concurrent-test"))

            summary.side_effect = finish_summary
            sync(False, True)
            state = json.loads((Path(tmp) / "state.json").read_text())
            self.assertEqual(state["latest_results"]["VP-1"]["run_id"], "concurrent-test")
            self.assertEqual(observed[0]["pending"], [case, current])
            self.assertEqual(observed[1], {"cases": {"VP-1": current}, "pending": []})
            client.values.assert_called_once_with(config["viewpoint"]["id"], "VP", "A:Z", formulas=True)
            client.batch_update.assert_called_once_with(config["viewpoint"]["id"], [("VP", "F3:F3", [["C"]])], raw=True)

    def test_sync_compares_with_last_publication_and_recovers_abandoned_destination(self):
        config = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        original = normalize_case({"id": "API-MOVE-01", "kind": "api", "tab": "API-OLD", "expected": "fixture"})
        moved = dict(original, detail_tab="API-NEW")
        removed = normalize_case({"id": "API-REMOVE-01", "kind": "api", "tab": "API-OLD", "expected": "fixture"})
        committed = {case["id"]: case for case in [original, removed]}
        snapshot = {"cases": committed, "pending": []}
        mapping = config["detail_mapping"]
        tabs = {"API-OLD": [[] for _ in range(15)] + [build_sheet_row(case, mapping) for case in committed.values()],
                "API-NEW": []}
        def write_rows(_sid, updates):
            for tab, a1, rows in updates:
                cell = re.fullmatch(r"([A-M])(1[67]):[A-M]1[67]", a1)
                if not cell:
                    continue
                index = int(cell[2]) - 1
                col = ord(cell[1]) - ord("A")
                while len(tabs[tab]) <= index:
                    tabs[tab].append([""] * len(mapping))
                tabs[tab][index][col:col + len(rows[0])] = rows[0]

        def save_snapshot(_sid, next_snapshot):
            snapshot.clear()
            snapshot.update(next_snapshot)

        with (
            tempfile.TemporaryDirectory() as tmpdir,
            patch("registry_state.STATE", Path(tmpdir) / "state.json"),
            patch("registry_state.load_sheets", return_value={"api": config}),
            patch("registry_state.KINDS", ["api"]),
            patch("registry_state.load_previous_cases_from_git", return_value={moved["id"]: moved}),
            patch("sheets_sync.SheetsClient") as factory,
            patch("sheets_sync.validate_detail_schema"),
            patch("sheets_sync.update_summary_dashboard") as dashboard,
            patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}),
        ):
            client = factory.return_value
            client.load_sync_snapshot.side_effect = lambda _sid: dict(snapshot)
            client.save_sync_snapshot.side_effect = save_snapshot
            client.spreadsheet_locale.return_value = "vi_VN"
            client.sheet_metadata.return_value = [{"title": tab, "sheetId": i} for i, tab in enumerate(tabs, 1)]
            client.ensure_sheet.return_value = {"sheetId": 2, "created": False}
            client.values.side_effect = lambda _sid, tab, _a1, **_kwargs: tabs[tab]
            client.batch_update.side_effect = write_rows
            dashboard.side_effect = RuntimeError("interrupted after row writes")
            with patch("registry_state.load_cases", return_value=[moved]), self.assertRaisesRegex(RuntimeError, "interrupted"):
                sync(False, True)
            client.ensure_sheet.assert_called_once_with(
                config["id"], "API-NEW", config["template_tab"], clear_from_row=16,
            )
            client.clear.assert_not_called()
            self.assertEqual(tabs["API-OLD"][15][0], "[Moved] API-MOVE-01")
            self.assertTrue(tabs["API-OLD"][16][12].startswith("[Deprecated]"))
            self.assertEqual(snapshot["cases"], committed)
            self.assertEqual(snapshot["pending"], [moved])

            dashboard.side_effect = None
            with patch("registry_state.load_cases", return_value=[original, removed]):
                sync(False, True)
            self.assertEqual(tabs["API-NEW"][15][0], "[Moved] API-MOVE-01")
            self.assertEqual(tabs["API-OLD"][15][0], "API-MOVE-01")
            self.assertEqual(tabs["API-OLD"][16][12], "")
            self.assertEqual(snapshot, {"cases": committed, "pending": []})

    def test_sync_archives_moved_source_and_reactivates_it_when_case_returns(self):
        config = json.loads((CONFIG / "sheets.json").read_text(encoding="utf-8"))["spreadsheets"]["api"]
        original_tab, new_tab = "API-OLD-01", "API-NEW-01"
        original = normalize_case({"id": "API-MOVE-01", "kind": "api", "tab": original_tab, "expected": "original"})
        moved = dict(original, detail_tab=new_tab)
        initial_row = build_sheet_row(original, config["detail_mapping"])
        initial_row[10:13] = ["Passed", "Manual", "Historical evidence"]
        tabs = {original_tab: [[] for _ in range(15)] + [initial_row], new_tab: []}
        writes = []

        def apply_values(_spreadsheet, changes):
            writes.extend(changes)
            for tab, a1, values in changes:
                if a1 not in {"A16:A16", "A16:M16", "A17:M17"}:
                    continue
                index = 16 if a1.startswith("A17") else 15
                while len(tabs[tab]) <= index:
                    tabs[tab].append([])
                row = tabs[tab][index]
                row.extend([""] * (len(values[0]) - len(row)))
                for column, value in enumerate(values[0]):
                    if value is not None:
                        row[column] = value

        with (
            tempfile.TemporaryDirectory() as tmpdir,
            patch("registry_state.STATE", Path(tmpdir) / "state.json"),
            patch("registry_state.load_sheets", return_value={"api": config}),
            patch("registry_state.KINDS", ["api"]),
            patch("registry_state.load_previous_cases_from_git", return_value={original["id"]: original}),
            patch("sheets_sync.SheetsClient") as factory,
            patch("sheets_sync.validate_detail_schema"),
            patch("sheets_sync.update_summary_dashboard"),
            patch.dict("os.environ", {"AGRIVISION_WRITE_SHEETS": "true"}),
        ):
            client = factory.return_value
            snapshot_fixture = SyncSnapshotFixture()
            client.load_sync_snapshot.side_effect = snapshot_fixture.load_sync_snapshot
            client.save_sync_snapshot.side_effect = snapshot_fixture.save_sync_snapshot
            client.ensure_sheet.return_value = {"sheetId": 2, "created": False}
            client.sheet_metadata.return_value = [{"title": name, "sheetId": index} for index, name in enumerate(tabs, 1)]
            client.spreadsheet_locale.return_value = "vi_VN"
            client.values.side_effect = lambda _sid, tab, _a1, **_kwargs: tabs[tab]
            client.batch_update.side_effect = apply_values
            with patch("registry_state.load_cases", return_value=[moved]):
                sync(False, True)
                sync(False, True)
            self.assertEqual(tabs[original_tab][15][0], "[Moved] API-MOVE-01")
            self.assertEqual(tabs[original_tab][15][10:13], ["Passed", "Manual", "Historical evidence"])
            self.assertEqual([r[0] for r in tabs[new_tab] if r], ["API-MOVE-01"])
            archive_summary = next(rows for tab, a1, rows in writes if tab == original_tab and a1 == "C5:C11")
            self.assertIn('"<>[Moved]*"', archive_summary[0][0])
            self.assertIn('"<>[Moved]*"', archive_summary[-1][0])

            with patch("registry_state.load_cases", return_value=[original]):
                sync(False, True)
            self.assertEqual([r[0] for r in tabs[original_tab] if r], ["API-MOVE-01"])
            self.assertEqual(tabs[original_tab][15][10:13], ["Passed", "Manual", "Historical evidence"])
            self.assertEqual(tabs[new_tab][15][0], "[Moved] API-MOVE-01")
