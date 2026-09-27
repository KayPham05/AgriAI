"""Fail CI when .NET reports no executed tests or no branch coverage."""

from pathlib import Path
from sys import argv
from xml.etree import ElementTree


def main() -> None:
    results_dir = Path(argv[1])
    trx_files = list(results_dir.rglob("*.trx"))
    coverage_files = [
        path for path in results_dir.rglob("coverage.cobertura.xml")
        if "In" not in path.parts
    ]
    if len(trx_files) != 1 or len(coverage_files) != 1:
        raise SystemExit(
            f"Expected one TRX and one Cobertura report; found "
            f"{len(trx_files)} TRX and {len(coverage_files)} Cobertura"
        )

    counters = ElementTree.parse(trx_files[0]).find(".//{*}Counters")
    if counters is None:
        raise SystemExit("TRX has no test counters")
    total = int(counters.get("total", "0"))
    passed = int(counters.get("passed", "0"))
    failed = int(counters.get("failed", "0"))
    if total == 0 or passed != total or failed:
        raise SystemExit(f"Invalid test result: total={total}, passed={passed}, failed={failed}")

    coverage = ElementTree.parse(coverage_files[0]).getroot()
    covered = int(coverage.get("branches-covered", "0"))
    valid = int(coverage.get("branches-valid", "0"))
    if valid == 0:
        raise SystemExit("Cobertura has no branch coverage data")
    print(f".NET tests: {passed}/{total} passed; branch coverage: {covered}/{valid} ({covered / valid:.2%})")


if __name__ == "__main__":
    main()
