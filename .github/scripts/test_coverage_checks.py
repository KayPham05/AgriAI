"""Regression checks for CI coverage and test-result validation."""

import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import check_dotnet_test_results
from check_coverage import check_coverage, read_branch_counts


class CoverageChecksTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.report = self.root / "coverage.cobertura.xml"

    def write_coverage(self, covered: int, valid: int) -> None:
        self.report.write_text(
            f'<coverage branches-covered="{covered}" branches-valid="{valid}"/>',
            encoding="utf-8",
        )

    def test_threshold_rejects_zero_and_below_minimum_and_accepts_boundary(self) -> None:
        for covered in (0, 79, 80, 100):
            with self.subTest(covered=covered), patch.dict("os.environ", {}, clear=True):
                self.write_coverage(covered, 100)
                with contextlib.redirect_stdout(io.StringIO()):
                    if covered < 80:
                        with self.assertRaises(SystemExit):
                            check_coverage(self.report, 80, "Test")
                    else:
                        check_coverage(self.report, 80, "Test")

    def test_missing_malformed_and_invalid_branch_reports_fail(self) -> None:
        with self.assertRaises(FileNotFoundError):
            read_branch_counts(self.report)
        for covered, valid in ((0, 0), (-1, 5), (6, 5)):
            with self.subTest(covered=covered, valid=valid):
                self.write_coverage(covered, valid)
                with self.assertRaises(ValueError):
                    read_branch_counts(self.report)
        self.report.write_text('<coverage branches-valid="bad"/>', encoding="utf-8")
        with self.assertRaises(ValueError):
            read_branch_counts(self.report)

    def test_dotnet_rejects_no_tests_failed_and_skipped_tests(self) -> None:
        self.write_coverage(8, 10)
        for total, passed, failed in ((0, 0, 0), (2, 1, 1), (2, 1, 0)):
            with self.subTest(total=total, passed=passed, failed=failed):
                (self.root / "results.trx").write_text(
                    '<TestRun xmlns="urn:test"><ResultSummary>'
                    f'<Counters total="{total}" passed="{passed}" failed="{failed}"/>'
                    '</ResultSummary></TestRun>', encoding="utf-8",
                )
                with patch.object(check_dotnet_test_results, "argv", ["check", str(self.root)]):
                    with self.assertRaises(SystemExit):
                        check_dotnet_test_results.main()


if __name__ == "__main__":
    unittest.main()
