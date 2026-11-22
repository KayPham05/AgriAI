import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sheets_client import SheetsClient


class SheetsClientRetryTests(unittest.TestCase):
    def test_sync_snapshot_writes_a_hidden_tab_and_reads_only_current_chunks(self):
        client = SheetsClient(access_token="test")
        snapshot = {"cases": {"API-01": {"expected": "ảnh" * 9000}}, "pending": []}
        with patch.object(client, "sheet_metadata", return_value=[{"sheetId": 0, "title": "Report bug"}]), patch.object(client, "batch_requests") as batch:
            self.assertIsNone(client.load_sync_snapshot("sheet"))
            client.save_sync_snapshot("sheet", snapshot)
        created, wrote = batch.call_args.args[1]
        props = created["addSheet"]["properties"]
        self.assertTrue(props["hidden"])
        cells = wrote["updateCells"]
        self.assertEqual(cells["start"]["sheetId"], props["sheetId"])
        rows = [[row["values"][0]["userEnteredValue"]["stringValue"]] for row in cells["rows"]]
        self.assertGreater(len(rows), 2)
        with patch.object(client, "sheet_metadata", return_value=[props]), patch.object(client, "values", return_value=[*rows, ["stale"]]):
            self.assertEqual(client.load_sync_snapshot("sheet"), snapshot)

        smaller = {**props, "gridProperties": {"rowCount": 2}}
        with patch.object(client, "sheet_metadata", return_value=[smaller]), patch.object(client, "batch_requests") as grow:
            client.save_sync_snapshot("sheet", snapshot)
        self.assertEqual(grow.call_args.args[1][0], {
            "appendDimension": {"sheetId": props["sheetId"], "dimension": "ROWS", "length": len(rows) - 2},
        })

        with (
            patch.object(client, "sheet_metadata", return_value=[props]),
            patch.object(client, "values", return_value=rows[:2]),
            self.assertRaisesRegex(RuntimeError, "Invalid sync snapshot"),
        ):
            client.load_sync_snapshot("sheet")

    def test_batch_update_sends_multiple_ranges_once(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={"totalUpdatedRanges": 2}) as request:
            result = client.batch_update("sheet", [("Tab A", "A1:B1", [["x", "y"]]), ("Tab B", "C2:C2", [["z"]])])
        self.assertEqual(result["totalUpdatedRanges"], 2)
        request.assert_called_once()
        self.assertEqual(len(request.call_args.args[2]["data"]), 2)

    def test_raw_viewpoint_writes_keep_number_like_text(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={}) as request:
            client.update("sheet", "VP", "B3", [["001"]], raw=True)
            client.append("sheet", "VP", ["001"], raw=True)
            client.batch_update("sheet", [("VP", "B3", [["001"]])], raw=True)
        update, append, batch = request.call_args_list
        self.assertIn("valueInputOption=RAW", update.args[1])
        self.assertIn("valueInputOption=RAW", append.args[1])
        self.assertEqual(batch.args[2]["valueInputOption"], "RAW")
        self.assertEqual(batch.args[2]["data"][0]["values"], [["001"]])

    def test_value_requests_escape_apostrophes_in_tab_names(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={}) as request:
            client.values("sheet", "QA's cases", "A1")
            client.update("sheet", "QA's cases", "A1", [["value"]])
            client.batch_update("sheet", [("QA's cases", "A1", [["value"]])])

        expected_range = "'QA''s cases'!A1"
        read, write, batch = request.call_args_list
        self.assertTrue(unquote(read.args[1]).endswith(f"/values/{expected_range}"))
        self.assertIn(f"/values/{expected_range}?", unquote(write.args[1]))
        self.assertEqual(write.args[2]["range"], expected_range)
        self.assertEqual(batch.args[2]["data"][0]["range"], expected_range)

    def test_retries_network_error_then_succeeds(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *_args): return False
            def read(self): return json.dumps({"ok": True}).encode()

        client = SheetsClient(access_token="test")
        with patch("sheets_client.urlopen", side_effect=[URLError("temporary"), Response()]), patch("sheets_client.time.sleep") as sleep:
            self.assertEqual(client.request("GET", "https://example.test"), {"ok": True})
            sleep.assert_called_once_with(1)

    def test_retries_rate_limit_four_times_then_fails(self):
        error = URLError("temporary")
        client = SheetsClient(access_token="test")
        with patch("sheets_client.urlopen", side_effect=error), patch("sheets_client.time.sleep") as sleep:
            with self.assertRaises(RuntimeError):
                client.request("GET", "https://example.test")
            self.assertEqual(sleep.call_count, 3)

    def test_conditional_formats_extracts_rules_by_sheet_id(self):
        client = SheetsClient(access_token="test")
        payload = {
            "sheets": [
                {"properties": {"sheetId": 10, "title": "WEB-E2E-AUTH"}, "conditionalFormats": [{"ranges": [{"startRowIndex": 7}]}]},
                {"properties": {"sheetId": 20, "title": "Report"}},
            ]
        }
        with patch.object(client, "request", return_value=payload):
            rules = client.conditional_formats("sheet-id")
        self.assertEqual(rules, {10: [{"ranges": [{"startRowIndex": 7}]}], 20: []})

    def test_delete_conditional_format_request_builds_expected_payload(self):
        self.assertEqual(
            SheetsClient.delete_conditional_format_request(1581847892, 1),
            {"deleteConditionalFormatRule": {"sheetId": 1581847892, "index": 1}},
        )

    def test_copy_row_style_requests_builds_format_and_validation_requests(self):
        self.assertEqual(SheetsClient.copy_row_style_requests(10, 15, 18, 16, 11), [])
        both = SheetsClient.copy_row_style_requests(10, 15, 16, 18, 11, include_validation=True)
        self.assertEqual(len(both), 2)
        self.assertEqual(both[0]["copyPaste"]["pasteType"], "PASTE_FORMAT")
        self.assertEqual(both[1]["copyPaste"]["pasteType"], "PASTE_DATA_VALIDATION")
        self.assertEqual(
            both[0]["copyPaste"]["source"],
            {"sheetId": 10, "startRowIndex": 14, "endRowIndex": 15, "startColumnIndex": 0, "endColumnIndex": 11},
        )
        self.assertEqual(
            both[0]["copyPaste"]["destination"],
            {"sheetId": 10, "startRowIndex": 15, "endRowIndex": 18, "startColumnIndex": 0, "endColumnIndex": 11},
        )
        fmt_only = SheetsClient.copy_row_style_requests(10, 15, 16, 16, 11, include_validation=False)
        self.assertEqual(len(fmt_only), 1)
        self.assertEqual(fmt_only[0]["copyPaste"]["pasteType"], "PASTE_FORMAT")

    def test_set_hyperlink_request_sets_uri_and_resets_link_format_on_none(self):
        set_req = SheetsClient.set_hyperlink_request(7, 6, 1, "#gid=99")["updateCells"]
        self.assertEqual(
            set_req["range"],
            {"sheetId": 7, "startRowIndex": 5, "endRowIndex": 6, "startColumnIndex": 1, "endColumnIndex": 2},
        )
        self.assertEqual(set_req["fields"], "textFormatRuns")
        self.assertEqual(
            set_req["rows"][0]["values"][0]["textFormatRuns"],
            [{"startIndex": 0, "format": {"link": {"uri": "#gid=99"}}}],
        )

        clear_req = SheetsClient.set_hyperlink_request(7, 6, 1, None)["updateCells"]
        cell = clear_req["rows"][0]["values"][0]
        self.assertEqual(cell["textFormatRuns"], [])
        text_fmt = cell["userEnteredFormat"]["textFormat"]
        self.assertFalse(text_fmt["underline"])
        self.assertEqual(text_fmt["foregroundColor"], {"red": 0, "green": 0, "blue": 0})
        self.assertNotIn("link", text_fmt)
        self.assertIn("textFormatRuns", clear_req["fields"])
        self.assertIn("underline", clear_req["fields"])
        self.assertIn("foregroundColor", clear_req["fields"])
        self.assertIn("link", clear_req["fields"])

    def test_clear_validation_request_clears_cell_rule(self):
        req = SheetsClient.clear_validation_request(12, 8, 14)
        self.assertEqual(
            req,
            {
                "setDataValidation": {
                    "range": {"sheetId": 12, "startRowIndex": 7, "endRowIndex": 8, "startColumnIndex": 14, "endColumnIndex": 15},
                    "rule": None,
                }
            },
        )

    def test_ensure_sheet_handles_existing_template_duplicate_and_blank_add(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "sheet_metadata", return_value=[{"sheetId": 5, "title": "WEB-E2E-AUTH"}]), patch.object(client, "request") as req:
            existing = client.ensure_sheet("sid", "WEB-E2E-AUTH", "WEB-DIAG-01 Diagnosis")
        self.assertFalse(existing["created"])
        self.assertEqual(existing["sheetId"], 5)
        req.assert_not_called()

        with (
            patch.object(client, "sheet_metadata", return_value=[{"sheetId": 11, "title": "Template\xa0"}]),
            patch.object(client, "request", return_value={"replies": [{"duplicateSheet": {"properties": {"sheetId": 22, "title": "API-X-01"}}}]}) as req,
        ):
            created = client.ensure_sheet("sid", "API-X-01", "Template")
        self.assertTrue(created["created"])
        self.assertEqual(created["sheetId"], 22)
        self.assertEqual(
            req.call_args.args[2],
            {"requests": [{"duplicateSheet": {"sourceSheetId": 11, "newSheetName": "API-X-01"}}]},
        )

        with (
            patch.object(client, "sheet_metadata", return_value=[{"sheetId": 1, "title": "Other"}]),
            patch.object(client, "request", return_value={"replies": [{"addSheet": {"properties": {"sheetId": 33, "title": "NEW-TAB"}}}]}) as req,
        ):
            added = client.ensure_sheet("sid", "NEW-TAB", "MissingTemplate")
        self.assertTrue(added["created"])
        self.assertEqual(req.call_args.args[2], {"requests": [{"addSheet": {"properties": {"title": "NEW-TAB"}}}]})

    def test_insert_row_builds_zero_based_insert_dimension(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={"replies": [{}]}) as req:
            client.insert_row("sid", 99, 8)
        req.assert_called_once_with(
            "POST",
            "https://sheets.googleapis.com/v4/spreadsheets/sid:batchUpdate",
            {
                "requests": [
                    {
                        "insertDimension": {
                            "range": {"sheetId": 99, "dimension": "ROWS", "startIndex": 7, "endIndex": 8},
                            "inheritFromBefore": True,
                        }
                    }
                ]
            },
            replay_safe=False,
        )

    def test_template_duplicate_clears_case_values_in_same_batch_and_preserves_existing_tab_on_retry(self):
        client = SheetsClient(access_token="test")
        template = {
            "sheetId": 11,
            "title": "WEB-DIAG-01 Diagnosis",
            "gridProperties": {"rowCount": 100, "columnCount": 11},
        }
        target = {"sheetId": 1, "title": "WEB-FIXTURE"}
        with (
            patch.object(client, "sheet_metadata", side_effect=[[{"sheetId": 0}, template], [template, target]]),
            patch.object(client, "request", side_effect=RuntimeError("lost response after committed batch")) as request,
        ):
            with self.assertRaisesRegex(RuntimeError, "lost response"):
                client.ensure_sheet("sid", target["title"], template["title"], clear_from_row=15)
            retried = client.ensure_sheet("sid", target["title"], template["title"], clear_from_row=15)

        request.assert_called_once_with(
            "POST",
            "https://sheets.googleapis.com/v4/spreadsheets/sid:batchUpdate",
            {"requests": [
                {"duplicateSheet": {
                    "sourceSheetId": 11,
                    "newSheetId": 1,
                    "newSheetName": "WEB-FIXTURE",
                }},
                {"updateCells": {
                    "range": {
                        "sheetId": 1,
                        "startRowIndex": 14,
                        "endRowIndex": 100,
                        "startColumnIndex": 0,
                        "endColumnIndex": 11,
                    },
                    "fields": "userEnteredValue",
                }},
            ]},
            replay_safe=False,
        )
        self.assertFalse(retried["created"])
        self.assertEqual(retried["sheetId"], 1)

    def test_batch_requests_handles_empty_and_retries_http_errors_with_backoff(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request") as req:
            self.assertEqual(client.batch_requests("sid", []), {})
        req.assert_not_called()

        class Response:
            def __enter__(self): return self
            def __exit__(self, *_args): return False
            def read(self): return json.dumps({"replies": [{}]}).encode()

        err_429 = HTTPError("https://example.test", 429, "Too Many Requests", hdrs=None, fp=io.BytesIO(b"quota"))
        err_503 = HTTPError("https://example.test", 503, "Unavailable", hdrs=None, fp=io.BytesIO(b"busy"))
        with patch("sheets_client.urlopen", side_effect=[err_429, err_503, Response()]), patch("sheets_client.time.sleep") as sleep:
            res = client.batch_requests("sid", [{"updateCells": {"fields": "userEnteredValue"}}])
        self.assertEqual(res, {"replies": [{}]})
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [1, 2])

        err_400 = HTTPError("https://example.test", 400, "Bad Request", hdrs=None, fp=io.BytesIO(b"invalid"))
        with patch("sheets_client.urlopen", side_effect=err_400), patch("sheets_client.time.sleep") as sleep:
            with self.assertRaises(RuntimeError) as ctx:
                client.batch_requests("sid", [{"deleteSheet": {"sheetId": 123}}])
        self.assertIn("Google Sheets API 400: invalid", str(ctx.exception))
        sleep.assert_not_called()

    def test_uncertain_structural_writes_are_never_replayed(self):
        client = SheetsClient(access_token="test")
        mutations = (
            lambda: client.insert_row("fixture", 5, 60),
            lambda: client.append("fixture", "Cases", ["NEW"]),
            lambda: client.batch_requests("fixture", [{"deleteConditionalFormatRule": {"sheetId": 5, "index": 0}}]),
        )
        for mutate in mutations:
            for error in (URLError("connection lost after commit"), TimeoutError("timeout after commit"),
                          HTTPError("https://example.test", 503, "Unavailable", None, io.BytesIO(b"busy"))):
                with (
                    self.subTest(mutation=mutate, error=type(error).__name__),
                    patch("sheets_client.urlopen", side_effect=error) as send,
                    patch("sheets_client.time.sleep") as sleep,
                ):
                    with self.assertRaisesRegex(RuntimeError, "write may have applied"):
                        mutate()
                    send.assert_called_once()
                    sleep.assert_not_called()

    def test_structural_write_can_retry_after_explicit_quota_rejection(self):
        client = SheetsClient(access_token="test")
        quota = HTTPError("https://example.test", 429, "Too Many Requests", None, io.BytesIO(b"quota"))
        from unittest.mock import MagicMock

        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"replies":[{}]}'
        with patch("sheets_client.urlopen", side_effect=[quota, response]) as send, patch("sheets_client.time.sleep"):
            self.assertEqual(client.insert_row("fixture", 5, 60), {"replies": [{}]})
        self.assertEqual(send.call_count, 2)

    def test_spreadsheet_locale_reads_properties_locale(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={"properties": {"locale": "en_US"}}) as req:
            self.assertEqual(client.spreadsheet_locale("sid"), "en_US")
        req.assert_called_once_with("GET", "https://sheets.googleapis.com/v4/spreadsheets/sid?fields=properties.locale")


if __name__ == "__main__":
    unittest.main()
