"""Validate Cobertura branch counts and enforce a percentage threshold."""

import argparse
import math
import os
from pathlib import Path
from xml.etree import ElementTree


def read_branch_counts(report_path: Path) -> tuple[int, int]:
    coverage = ElementTree.parse(report_path).getroot()
    covered = int(coverage.get("branches-covered", "0"))
    valid = int(coverage.get("branches-valid", "0"))
    if valid <= 0 or not 0 <= covered <= valid:
        raise ValueError(f"Invalid branch counts: covered={covered}, valid={valid}")
    return covered, valid


def check_coverage(report_path: Path, minimum: float, label: str) -> None:
    if not math.isfinite(minimum) or not 0 <= minimum <= 100:
        raise ValueError("Minimum branch coverage must be between 0 and 100")
    covered, valid = read_branch_counts(report_path)
    passed = covered * 100 >= minimum * valid
    message = (
        f"{label}: branch coverage {covered}/{valid} = {covered / valid:.2%}; "
        f"required {minimum:g}% - {'PASS' if passed else 'FAIL'}"
    )
    print(message)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a", encoding="utf-8") as output:
            output.write(f"\n{message}\n")
    if not passed:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--minimum-branches", type=float, required=True)
    parser.add_argument("--label", default="Coverage")
    args = parser.parse_args()
    check_coverage(args.report, args.minimum_branches, args.label)


if __name__ == "__main__":
    main()
