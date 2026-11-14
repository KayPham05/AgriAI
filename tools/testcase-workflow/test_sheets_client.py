import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

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


if __name__ == "__main__":
    unittest.main()
