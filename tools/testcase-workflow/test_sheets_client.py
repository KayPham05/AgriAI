import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sheets_client import SheetsClient


class SheetsClientRetryTests(unittest.TestCase):
    def test_batch_update_sends_multiple_ranges_once(self):
        client = SheetsClient(access_token="test")
        with patch.object(client, "request", return_value={"totalUpdatedRanges": 2}) as request:
            result = client.batch_update("sheet", [("Tab A", "A1:B1", [["x", "y"]]), ("Tab B", "C2:C2", [["z"]])])
        self.assertEqual(result["totalUpdatedRanges"], 2)
        request.assert_called_once()
        self.assertEqual(len(request.call_args.args[2]["data"]), 2)

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
        )

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
            res = client.batch_requests("sid", [{"deleteSheet": {"sheetId": 123}}])
        self.assertEqual(res, {"replies": [{}]})
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [1, 2])

        err_400 = HTTPError("https://example.test", 400, "Bad Request", hdrs=None, fp=io.BytesIO(b"invalid"))
        with patch("sheets_client.urlopen", side_effect=err_400), patch("sheets_client.time.sleep") as sleep:
            with self.assertRaises(RuntimeError) as ctx:
                client.batch_requests("sid", [{"deleteSheet": {"sheetId": 123}}])
        self.assertIn("Google Sheets API 400: invalid", str(ctx.exception))
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
