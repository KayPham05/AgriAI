"""Cross the JSON boundary with real runners and the workflow parser."""

import io
import sys
import tempfile
import unittest
from contextlib import ExitStack, nullcontext, redirect_stderr
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from registry_state import CaseResult
from runner_reports import parse_playwright_group, read_playwright_report

BROWSER = Path(__file__).resolve().parents[2] / "frontend/tests/browser"
sys.path.insert(0, str(BROWSER))
from e2e import run_live_suite
from e2e.live_resources import created_resource


class BrowserReportTests(unittest.TestCase):
    def test_live_reports_only_executed_journeys_and_identifies_failing_catalog(self):
        def catalog(route):
            if route == "plants":
                raise AssertionError("catalog is empty")

        modules = {
            f"e2e.{name}": SimpleNamespace(run=lambda: None, run_catalog=catalog, run_healthy=lambda: None)
            for name in run_live_suite.JOURNEYS.values()
        }
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, modules), redirect_stderr(io.StringIO()):
            path = Path(tmp) / "live.json"
            with patch.object(sys, "argv", ["live", "--json-report", str(path)]):
                self.assertEqual(run_live_suite.main(), 1)
            report, cases = read_playwright_report(path)
            self.assertEqual((report["total"], report["failed"]), (13, 1))
            self.assertEqual(len({r["test"] for r in cases}), 13)
            self.assertTrue(all(r["id"].startswith("LIVE-") for r in cases))
            failed, = [r for r in cases if r["status"] == "Failed"]
            self.assertEqual(failed["id"], "LIVE-CATALOG-PLANTS")
            self.assertIn("catalog is empty", failed["detail"])
            run = CaseResult("RUN-live", "Passed", "Auto", command="python run_live_suite.py", duration_seconds=1)
            outcomes, summary = parse_playwright_group(path, {case["id"] for case in cases}, run, 1)
            self.assertTrue(all(case.command == run.command for case in outcomes))
            self.assertIn("12/13 Live Playwright journeys passed", summary.actual)
            self.assertEqual(summary.status, "Failed")

    def test_live_runner_returns_failure_for_skipped_journey(self):
        def skip():
            raise unittest.SkipTest("fixture unavailable")

        modules = {f"e2e.{name}": SimpleNamespace(
            run=skip if name == "live_admin" else lambda: None,
            run_catalog=lambda _route: None, run_healthy=lambda: None,
        ) for name in run_live_suite.JOURNEYS.values()}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, modules), redirect_stderr(io.StringIO()):
            report = Path(tmp) / "live.json"
            with patch.object(sys, "argv", ["live", "--json-report", str(report)]):
                self.assertEqual(run_live_suite.main(), 1)
            payload, cases = read_playwright_report(report)
            self.assertEqual((payload["passed"], payload["skipped"]), (12, 1))
            skipped, = [case for case in cases if case["status"] == "Skipped"]
            self.assertEqual(skipped["id"], "LIVE-ADMIN-NAVIGATION-SEARCH")

    def test_browser_runner_emits_parser_compatible_executed_test(self):
        support = SimpleNamespace(
            BrowserTestCase=type("Browser", (), {}), DEFAULT_BASE_URL="http://localhost",
            ensure_next_server=lambda *a, **kw: nullcontext(),
        )
        with patch.dict(sys.modules, {"e2e.support": support}):
            from e2e import run_suite
            test = unittest.FunctionTestCase(lambda: None)
            suite = unittest.TestSuite([test])
            with tempfile.TemporaryDirectory() as tmp, redirect_stderr(io.StringIO()):
                path = Path(tmp) / "browser.json"
                with patch.object(sys, "argv", ["ui", "--json-report", str(path)]), patch.object(
                    run_suite, "collect_tests", return_value=(suite, {test.id(): "CASE-1"})
                ):
                    self.assertEqual(run_suite.main(), 0)
                _, cases = read_playwright_report(path)
                self.assertEqual(cases, [{"id": "CASE-1", "test": test.id(), "status": "Passed"}])

    def test_cleanup_deletes_only_returned_ids_even_after_assertion_failure(self):
        own = "6d1b3e70-6077-40a3-81ab-2b9009535182"
        for path, target in (("/api/plants", "/api/admin/catalog/plants"),
                             ("/api/agricultural-profiles", "/api/agricultural-profiles"),
                             ("/api/predictions", "/api/predictions")):
            with self.subTest(path=path):
                response = Mock(url=f"http://localhost{path}", ok=True)
                response.json.return_value = {"id": own, "name": "System E2E Plant current"}
                response.request.method = "POST"
                response.request.url = response.url
                page = Mock()
                page.expect_response.return_value = nullcontext(SimpleNamespace(value=response))
                with self.assertRaisesRegex(AssertionError, "fixture failed"), ExitStack() as cleanup:
                    with created_resource(page, cleanup, "token", path, target):
                        track_request = page.on.call_args.args[1]
                        track_request(response.request)
                        self.assertTrue(page.expect_response.call_args.args[0](response))
                    raise AssertionError("fixture failed")
                page.request.delete.assert_called_once_with(
                    f"http://localhost{target}/{own}", headers={"Authorization": "Bearer token"}, max_redirects=0
                )
                page.request.get.assert_not_called()

    def test_cleanup_drains_in_flight_post_when_create_action_raises(self):
        from contextlib import contextmanager

        own = "6d1b3e70-6077-40a3-81ab-2b9009535182"
        path = "/api/agricultural-profiles"
        request = SimpleNamespace(url=f"http://localhost{path}", method="POST")
        response = SimpleNamespace(ok=True, url=request.url, request=request, json=lambda: {"id": own})

        for sent in (False, True):
            with self.subTest(sent=sent):
                page = Mock()
                @contextmanager
                def response_waiter(matches, *, timeout):
                    event = SimpleNamespace()
                    yield event
                    self.assertTrue(matches(response))
                    event.value = response
                page.expect_response.side_effect = response_waiter
                with self.assertRaisesRegex(RuntimeError, "UI action failed"), ExitStack() as cleanup:
                    with created_resource(page, cleanup, "token", path):
                        if sent:
                            page.on.call_args.args[1](request)
                        raise RuntimeError("UI action failed")
                if sent:
                    page.request.delete.assert_called_once_with(
                        f"{request.url}/{own}", headers={"Authorization": "Bearer token"}, max_redirects=0
                    )
                else:
                    page.request.delete.assert_not_called()
                page.remove_listener.assert_called_once_with("request", page.on.call_args.args[1])

    def test_cleanup_surfaces_unexpected_http_errors(self):
        from e2e.live_resources import delete_created
        request = Mock()
        request.delete.return_value = SimpleNamespace(ok=False, status=404)
        delete_created(request, "http://localhost/own-id", "token")
        request.delete.return_value.status = 403
        with self.assertRaisesRegex(AssertionError, "403"):
            delete_created(request, "http://localhost/own-id", "token")
