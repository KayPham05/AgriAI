# Skill additions and verification

## Work completed

On 2026-10-03: authored seven missing references; added a standard-library helper, unit tests, and three local examples; updated the README/directory map to avoid promising unavailable packages or tools. SKILL.md preserves Compose/CI and authorization boundaries; unrelated Jira keys must not be assigned.

## Commands from the skill directory

```text
python scripts/devops_utils.py --help
python scripts/devops_utils.py terraform init-project --name demo --cloud aws --region us-east-1 --output <existing-output-directory>
python scripts/devops_utils.py terraform validate --file <initialized-terraform-directory-or-file>
python scripts/devops_utils.py k8s generate --name demo --image example/app:1.0 --namespace default --output <new-output-file>
python scripts/devops_utils.py k8s validate --file examples/kubernetes/complete-app.yaml
python scripts/devops_utils.py gitops init --tool argocd --environments dev,staging,prod --output <existing-output-directory>
python scripts/devops_utils.py security scan-secrets --directory <directory-to-scan>
python -m unittest discover -s tests -p "test_*.py" -v
```

Replace angle-bracket values with the selected inputs. The output parent directory must exist; project/environment names accept only lowercase letters, digits, and hyphens. Existing outputs are rejected. I/O failures may leave partial files; the script does not perform automatic recursive deletion.

## Dependencies and limitations

| Command | Dependencies / side effects | What it demonstrates |
|---|---|---|
| Generate/init | Python 3.10+; new local files | No provisioning or controller installation |
| Terraform validate | Terraform on PATH, initialized directory; no automatic init | Syntax/internal consistency, not cloud/state validation |
| Kubernetes validate | kubectl, context/cluster/RBAC; server dry-run/admission | No resource persistence; not offline |
| Scan secrets | Gitleaks with dir; redacted output | Directory scan, not Git history |
| Unit tests | Standard library, mocked native CLIs | Helper behavior, not real native validation |

Native tool exit codes are preserved; prerequisite/I/O/timeout errors return 2. There are no apply/destroy/deploy/push commands or --schema-version option; the schema comes from the cluster.

## CI and commit exceptions

The subject chore(skills): add devops iac engineer skill was tested against repository commitlint and failed jira-subject. ci-gate requires commitlint to pass. A verbal exception does not change CI: use a real related key or obtain a separate policy change request/approval; do not advance the baseline.

The user subsequently confirmed AGRI-76 for the commit adding the skill. The selected subject was `chore(skills): AGRI-76 add devops iac engineer skill`; CI policy and the baseline were unchanged. This key assignment was a direct user decision and does not imply that DevOps deployment belongs to a completed system-analysis scope.

CI does not currently run the skill tests; the [example workflow](examples/pipelines/skill-check.yml) is not automatically active. No workflow, dependency, or stack changes were made. There is no GitHub run for the additions.

## Local results

- Helper unit tests: 10 passed in the local Python virtual environment, covering traversal/overwrite rejection, tool/timeout errors, exit-code preservation, and server dry-run/redaction arguments. Native CLIs were mocked.
- Skill Creator quick_validate.py: Skill is valid.
- PowerShell checks: 11 Markdown files, 43 valid local links; balanced fences and no trailing whitespace.
- CLI --help worked; Python syntax and the structure of both YAML examples passed checks. All 16 skill files had no trailing whitespace; a targeted secret-pattern check found no matches and does not replace Gitleaks. Tool discovery found kubectl, but no cluster was contacted; Terraform/Gitleaks were not on PATH.
- The sandbox blocked the underlying Python executable; local checks were rerun with approved permissions, without deployment or cluster access.
- Real Terraform/kubectl/Gitleaks validation and full GitHub CI were not run. The example/app:1.0 image is not guaranteed to exist or be production-ready.
- The initial additions were not staged/committed/pushed; the user subsequently requested a commit with AGRI-76. No push was performed; CI workflow and commitlint policy were unchanged.