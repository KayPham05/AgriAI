# AGRI-57 — CI secret scan scope

- Diagnosed PR #65: Gitleaks `--all` included a signing-value finding from an unrelated branch; the aggregate gate failed as a consequence.
- After user approval, scoped the scan to the complete checkout ancestry (`HEAD`), added three Git behavior regressions to CI, and updated the pipeline guide. No scan exemption or gate bypass.
- RED reproduced the issue; four Node tests passed. Official checksum-verified Gitleaks 8.24.2 confirmed unrelated-ref isolation, detection of removed reachable credentials, and zero findings on current repository history. Diff check passed.
- [Report and failed CI run](../../reports/AGRI-57/agri_57_ci_secret_scan_scope.md). Docker unavailable; generated local declarations preserved.
- User authorized commit/push on 2026-11-20. Fresh four-test run, real-scanner probes and proposed-message commitlint passed before staging; verify the new PR-head workflow after push.
