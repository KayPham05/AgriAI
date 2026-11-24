# AGRI-57 — Scope the CI secret scan to the checked-out history

Date: 2026-11-20. Branch: `AGRI-57-frontend-summary`; baseline: `8e05a31`.

## Failure and diagnosis

[PR #65](https://github.com/KayPham05/AgriAI/pull/65) failed [CI run 44747179221](https://github.com/KayPham05/AgriAI/actions/runs/44747179221). The `secret-scan` job reported one `generic-api-key` finding at `.github/workflows/testcase-workflow.yml:124` in commit `c3a554384a91eea953164abc15ca3b52e9ea7893`. No credential value is reproduced here. `ci-gate` failed because this required job failed; commitlint, frontend, backend, Python and Compose smoke passed in that run.

GitHub's compare API confirmed that the flagged commit is not an ancestor of this PR head (diverged, three commits ahead and eight behind). Checkout fetches full history and other refs; `--log-opts="--all"` scanned unrelated branch histories as well as the checkout. This diagnosis does not establish whether the other branch's literal signing value is a real credential; that finding remains for its owner to resolve.

## Change

- `.github/workflows/ci.yml`: use `--log-opts="HEAD"` so Gitleaks scans the checked-out commit and all ancestors, including both parents of a synthetic PR merge. Keep full-depth checkout, scanner version, redaction, reports, failure exit codes and the required gate.
- `.github/scripts/test_secret_scan_scope.cjs`: exercise the workflow's actual revision arguments against isolated Git repositories. Cover detached checkout with an unrelated remote ref, complete historical coverage, and both PR merge parents. Run these tests in the existing Node-based commitlint job.
- `docs/notes/docker_pipeline.md`: describe the scan boundary.

No allowlist, baseline suppression, first-parent restriction, disabled check or history rewrite was added.

## Actual verification

- RED: new scope test failed against `--all` because it included the unrelated branch; the two history/merge tests passed.
- GREEN: `node --test .github/scripts/test_secret_scan_scope.cjs .github/scripts/test_lint_commits.cjs` passed all four tests.
- Docker was unavailable locally. Downloaded the official Windows Gitleaks **8.24.2** release to ignored cache and verified its archive SHA-256 against the release checksum file before execution.
- Real scanner with runtime-generated synthetic fixture: old `--all` scope found one unrelated-branch credential (exit 1); `HEAD` found zero on the clean checkout (exit 0); a credential introduced and subsequently deleted in reachable history still produced one finding (exit 1).
- Real Gitleaks scan of this repository's `HEAD` history: zero findings, exit 0. JSON reports: `.cache/agri57-gitleaks-evidence/`; fixture generator: `.cache/agri57_gitleaks_probe.py`. These are ignored local evidence, not committed credentials or application data.
- `git diff --check`: passed. Existing generated `frontend/next-env.d.ts` preserved.

The new workflow has not run on GitHub yet. Local Git/Gitleaks evidence does not establish remote CI success. No app/runtime behavior changed; application suites and Docker services were not rerun.

## Authorized delivery

On 2026-11-20 the user explicitly requested committing and pushing this fix to the existing feature branch. Before staging, reran all four Node tests and the real-scanner probes above successfully, and validated the proposed commit message with commitlint (zero problems/warnings). The generated local declaration file and ignored tools/evidence remain outside the commit. Remote workflow status must be checked on the new PR head after push.
