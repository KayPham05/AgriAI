# DevOps IaC Engineer

This skill guides IaC/CI/CD work; it does not replace the AgriAI stack or authorize deployment. Supporting resources were authored locally on 2026-10-03, not recovered from the original package.

## Entry points

- [SKILL.md](SKILL.md): workflow and authorization boundaries.
- [Directory structure](DIRECTORY_STRUCTURE.md), [implementation guide](IMPLEMENTATION_GUIDE.md).
- [Terraform](reference/terraform.md), [Kubernetes](reference/kubernetes.md), [cloud](reference/cloud_platforms.md), [CI/CD](reference/cicd.md), [observability](reference/observability.md), [security](reference/security.md), [templates](reference/templates.md).

## Helper

Python 3.10+ and the standard library; the helper does not require PyYAML. From the skill directory:

```text
python scripts/devops_utils.py --help
python -m unittest discover -s tests -p "test_*.py" -v
```

Generate commands only create new local files. Validation/scanning requires Terraform, kubectl, or Gitleaks on PATH. Missing tools are errors. Kubernetes server dry-run requires cluster access and permissions; it is not offline. Tests mock native tools and do not validate a real cloud, cluster, or scanner.

The user confirmed AGRI-76 for the commit adding this skill. Do not change CI to bypass commitlint; adding the skill does not demonstrate deployed infrastructure. Do not push unless requested.