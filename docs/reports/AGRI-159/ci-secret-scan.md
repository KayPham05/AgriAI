# AGRI-159 CI secret scan for PR #67

On 2026-11-25, GitHub Actions passed commitlint, Compose smoke, Python, backend and frontend on Welcome commit `1e2559c`. The aggregate gate failed because [secret-scan](https://github.com/KayPham05/AgriAI/actions/runs/45454084024/job/138658701062) reported one `generic-api-key` finding in `.github/workflows/testcase-workflow.yml:124` at `c3a5543`.

The historical workflow assigns a fixed JWT signing value to the isolated `live-contract` Docker Compose test job. The job uses a per-run Compose project name and loopback endpoints. An exact-value search of the historical tracked tree found the value only in that workflow. The Welcome diff contains no workflow edits at `1e2559c`. No credential value is reproduced here.

The local review branch `AGRI-159-ci-scan-fix` passes [one exact historical fingerprint](../../../.gitleaksignore) to [the existing CI scanner](../../../.github/workflows/ci.yml). The scanner version, rules, exit code, redaction and `--all` history scan remain active. This permits the confirmed historical test fixture only. A new commit with a hardcoded test key is still eligible for detection. The source workflow in the shared branch should generate a fresh JWT value for each test run if it is edited separately.

| Local check | Result |
|---|---|
| Official Gitleaks Windows v8.24.2 archive | SHA-256 matched the published release manifest. |
| Scan all fetched GitHub refs, including the PR #67 merge ref, without the exception | 288 commits scanned and exactly one finding. Scanner exit 1. |
| Repeat the full scan with the scoped exception | 288 commits scanned and zero findings. Scanner exit 0. |
| Scan a fresh synthetic commit with a generated JWT test value | One `generic-api-key` finding with the exception enabled. Scanner exit 1 as expected. |
| Workflow YAML and Bash syntax | Passed. |

Local evidence was produced using Gitleaks directly against an isolated Git repository. The patched GitHub Actions run remains pending because the change is local. Binaries, fixture repos and redacted scan outputs are under ignored `.cache/`.
