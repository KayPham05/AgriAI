import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from http_checks import check_guest_prediction, check_health


class HttpResponse(io.BytesIO):
    status = 200


class HttpCheckTests(unittest.TestCase):
    def test_health_requires_healthy_database_payload(self):
        responses = (
            (b'<html>Wrong service</html>', "Failed"),
            (b'{"status":"Healthy","checks":{"database":"Unhealthy"}}', "Failed"),
            (b'{"status":"Healthy","checks":{"database":"Healthy"}}', "Passed"),
        )
        for payload, expected_status in responses:
            with (
                self.subTest(payload=payload),
                patch("http_checks.urlopen", return_value=HttpResponse(payload)),
                patch("registry_state.emit_result") as emit,
            ):
                self.assertEqual(check_health("http://fixture/api/health"), expected_status == "Passed")
                self.assertEqual(emit.call_args.args[0].status, expected_status)

    def test_guest_prediction_requires_the_documented_response_fields(self):
        complete = {
            "predictedPlantDisease": {"className": "test class"},
            "confidence": 0.0,
            "predictionDetails": [],
            "guestToken": "test-token-content",
            "guestExpiresAt": "2026-11-21T15:00:00Z",
        }
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "fixture.jpg"
            image.write_bytes(b"image fixture")
            for payload, expected_status in (
                ({"guestToken": complete["guestToken"]}, "Failed"),
                ([], "Failed"),
                ({**complete, "guestExpiresAt": "not a date"}, "Failed"),
                (complete, "Passed"),
            ):
                with (
                    self.subTest(payload=payload),
                    patch("http_checks.urlopen", return_value=HttpResponse(json.dumps(payload).encode())),
                    patch("registry_state.emit_result") as emit,
                ):
                    try:
                        self.assertEqual(check_guest_prediction("http://fixture/api/predictions", str(image)), expected_status == "Passed")
                    except AttributeError:
                        self.fail("Malformed response escaped the live guest adapter")
                    result = emit.call_args.args[0]
                    self.assertEqual(result.status, expected_status)
                    self.assertNotIn(complete["guestToken"], repr(result))

    def test_guest_prediction_missing_fixture_emits_blocked_result(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch("http_checks.urlopen") as request,
            patch("registry_state.emit_result") as emit,
        ):
            image = Path(directory) / "missing.jpg"
            try:
                self.assertFalse(check_guest_prediction("http://fixture/api/predictions", str(image)))
            except FileNotFoundError:
                self.fail("Missing test image escaped the live guest adapter")

        request.assert_not_called()
        result = emit.call_args.args[0]
        self.assertEqual(result.status, "Blocked")
        self.assertIn("fixture", result.blocker)


if __name__ == "__main__":
    unittest.main()
