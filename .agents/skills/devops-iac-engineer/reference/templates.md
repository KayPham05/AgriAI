# Templates and helper

Supporting resources were authored locally in the repository; they were not recovered from upstream and do not demonstrate deployed infrastructure.

- [Terraform](../examples/terraform/main.tf): local example, no providers/resources.
- [Deployment](../examples/kubernetes/complete-app.yaml): schema example; example/app:1.0 is illustrative and its existence is unverified; probes/Service/Ingress are missing.
- [Workflow](../examples/pipelines/skill-check.yml): helper unit tests; does not automatically add a repository gate.
- [Helper](../scripts/devops_utils.py): Python 3.10+, standard library, no overwriting/deployment.
- [Tests](../tests/test_devops_utils.py): mocked native tools; do not demonstrate real scanning/validation.

From the repository root, write output to an existing .cache directory:

```powershell
$tool = '.agents/skills/devops-iac-engineer/scripts/devops_utils.py'
.\.venv\Scripts\python.exe $tool terraform init-project --name demo-iac --output .cache
.\.venv\Scripts\python.exe $tool k8s generate --name demo --image example/app:1.0 --output .cache/demo-deployment.yaml
.\.venv\Scripts\python.exe $tool gitops init --name demo-gitops --tool argocd --output .cache
```

Existing outputs are rejected; do not automatically delete/overwrite them. See the [implementation guide](../IMPLEMENTATION_GUIDE.md) for prerequisites, exit codes, and verification.