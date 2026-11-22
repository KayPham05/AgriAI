"""Require the current main revision before the CI job publishes to Sheets."""

from __future__ import annotations

import subprocess
import sys


MAIN_REF = "refs/heads/main"


def main() -> int:
    try:
        remote_refs = subprocess.check_output(
            ["git", "ls-remote", "--exit-code", "origin", MAIN_REF], text=True
        )
        checkout_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"Could not verify current main revision: {error}", file=sys.stderr)
        return 1

    for line in remote_refs.splitlines():
        remote_sha, _, ref = line.partition("\t")
        if ref == MAIN_REF and remote_sha:
            if checkout_sha == remote_sha:
                return 0
            print(
                "Sheets publish refused for an outdated main revision. "
                "Run Testcase workflow on current main.",
                file=sys.stderr,
            )
            return 1

    print("Could not verify current main revision: remote main ref missing.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
