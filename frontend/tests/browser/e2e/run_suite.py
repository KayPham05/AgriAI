"""CLI runner for AgriVision AI automated browser UI / E2E Playwright tests."""

from __future__ import annotations

import argparse
import json
import sys
import unittest
from pathlib import Path

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import BrowserTestCase, DEFAULT_BASE_URL, ensure_next_server  # noqa: E402


def collect_tests(
    priorities: set[str] | None,
    case_ids: set[str] | None,
    modules: set[str] | None,
) -> tuple[unittest.TestSuite, dict[str, str]]:
    loader = unittest.TestLoader()
    discovered = loader.discover(start_dir=str(E2E_DIR), pattern="test_*.py", top_level_dir=str(BROWSER_DIR))
    selected = unittest.TestSuite()
    id_map: dict[str, str] = {}

    def walk(suite: unittest.TestSuite) -> None:
        for item in suite:
            if isinstance(item, unittest.TestSuite):
                walk(item)
                continue
            method_name = getattr(item, "_testMethodName", "")
            method = getattr(item, method_name, None)
            cid = getattr(method, "case_id", "")
            prio = getattr(method, "priority", "")
            mod_name = item.__class__.__module__.rsplit(".", 1)[-1]
            if priorities and prio not in priorities:
                continue
            if case_ids and cid not in case_ids:
                continue
            if modules and mod_name not in modules:
                continue
            selected.addTest(item)
            id_map[item.id()] = cid

    walk(discovered)
    return selected, id_map


class StructuredResult(unittest.TextTestResult):
    def __init__(self, stream, descriptions, verbosity, id_map: dict[str, str]):
        super().__init__(stream, descriptions, verbosity)
        self.id_map = id_map
        self.records: list[dict[str, str]] = []

    def addSuccess(self, test) -> None:
        super().addSuccess(test)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Passed"})

    def addFailure(self, test, err) -> None:
        super().addFailure(test, err)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Failed", "detail": self._exc_info_to_string(err, test)})

    def addError(self, test, err) -> None:
        super().addError(test, err)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Failed", "detail": self._exc_info_to_string(err, test)})

    def addSkip(self, test, reason) -> None:
        super().addSkip(test, reason)
        self.records.append({"id": self.id_map.get(test.id(), test.id()), "test": test.id(), "status": "Skipped", "detail": reason})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run AgriVision AI Playwright browser tests.")
    parser.add_argument("--priority", action="append", choices=["P0", "P1", "P2"], help="Filter by priority (repeatable)")
    parser.add_argument("--case", action="append", help="Filter by testcase ID (repeatable, e.g. E2E-AUTH-01)")
    parser.add_argument("--module", action="append", help="Filter by test module name (e.g. test_auth)")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Target frontend base URL")
    parser.add_argument("--with-server", action="store_true", help="Start `next start` automatically if server is down")
    parser.add_argument("--list", action="store_true", help="List matched tests without running")
    parser.add_argument("--json-report", type=Path, help="Optional JSON output path")
    args = parser.parse_args()

    priorities = set(args.priority) if args.priority else None
    case_ids = set(args.case) if args.case else None
    modules = set(args.module) if args.module else None

    suite, id_map = collect_tests(priorities, case_ids, modules)
    if args.list:
        for test_id, case_id in id_map.items():
            print(f"{case_id}\t{test_id}")
        print(f"Total: {len(id_map)}")
        return 0

    if suite.countTestCases() == 0:
        print("No tests matched the given filters.", file=sys.stderr)
        return 2

    BrowserTestCase.base_url = args.base_url.rstrip("/")
    with ensure_next_server(args.base_url, auto_start=args.with_server):
        def make_result(stream, descriptions, verbosity):
            return StructuredResult(stream, descriptions, verbosity, id_map)

        runner = unittest.TextTestRunner(verbosity=2, resultclass=make_result)
        result = runner.run(suite)

    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(
            json.dumps(
                {
                    "base_url": BrowserTestCase.base_url,
                    "build_mode": "next-production",
                    "browser": "chromium-headless",
                    "viewport": "1280x900 (responsive: 768x900, 375x812)",
                    "api_mode": "intercepted (ApiStub)",
                    "ai_mode": "stubbed",
                    "total": result.testsRun,
                    "passed": sum(1 for r in result.records if r["status"] == "Passed"),
                    "failed": sum(1 for r in result.records if r["status"] == "Failed"),
                    "skipped": sum(1 for r in result.records if r["status"] == "Skipped"),
                    "cases": result.records,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
