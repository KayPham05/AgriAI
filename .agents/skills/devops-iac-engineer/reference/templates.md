# Mẫu và helper

Các phần hỗ trợ được tự biên soạn trong repo, không phục hồi upstream và không chứng minh infrastructure đã triển khai.

- [Terraform](../examples/terraform/main.tf): local, không provider/resource.
- [Deployment](../examples/kubernetes/complete-app.yaml): schema example; image example/app:1.0 minh họa, chưa xác nhận tồn tại, thiếu probes/Service/Ingress.
- [Workflow](../examples/pipelines/skill-check.yml): unittest helper, không tự thêm gate repo.
- [Helper](../scripts/devops_utils.py): Python 3.10+, stdlib, không overwrite/deploy.
- [Tests](../tests/test_devops_utils.py): native tools mock, không chứng minh scan/validate thật.

Từ root repo, output vào .cache đã tồn tại:

```powershell
$tool = '.agents/skills/devops-iac-engineer/scripts/devops_utils.py'
.\.venv\Scripts\python.exe $tool terraform init-project --name demo-iac --output .cache
.\.venv\Scripts\python.exe $tool k8s generate --name demo --image example/app:1.0 --output .cache/demo-deployment.yaml
.\.venv\Scripts\python.exe $tool gitops init --name demo-gitops --tool argocd --output .cache
```

Output tồn tại bị từ chối; không tự xóa/ghi đè. Xem [implementation guide](../IMPLEMENTATION_GUIDE.md) về prerequisite, exit codes và kiểm chứng.
