# Bổ sung và kiểm chứng skill

## Công việc

Ngày 2026-10-03: biên soạn bảy reference thiếu; thêm helper stdlib, unittest và ba mẫu local; cập nhật README/directory map để không hứa có package/tool chưa tồn tại. SKILL.md giữ Compose/CI và ranh giới phê duyệt; không gắn Jira key không liên quan.

## Commands từ thư mục skill

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

Angle-bracket values phải thay bằng đầu vào được chọn. Parent output cần tồn tại; project/environment chỉ nhận lowercase letters/digits/hyphen. Output tồn tại bị từ chối. I/O failure có thể để lại file dở dang; script không tự recursive delete.

## Phụ thuộc và giới hạn

| Lệnh | Phụ thuộc / side effect | Kết luận |
|---|---|---|
| Generate/init | Python 3.10+; file local mới | Không provisioning/controller |
| Terraform validate | Terraform trên PATH, directory đã init; không auto-init | Syntax/internal consistency, không cloud/state |
| Kubernetes validate | kubectl, context/cluster/RBAC; server dry-run/admission | Không persist resource, không offline |
| Scan secrets | Gitleaks có dir; output redacted | Directory, không Git history |
| Unittest | stdlib, native CLI mock | Hành vi helper, không native validation thật |

Exit code tool được giữ; lỗi prerequisite/I/O/timeout trả 2. Không có apply/destroy/deploy/push hoặc --schema-version; schema từ cluster.

## CI và ngoại lệ commit

Subject chore(skills): add devops iac engineer skill đã thử với commitlint repo và trượt jira-subject. ci-gate yêu cầu commitlint thành công. Ngoại lệ bằng lời không đổi CI: cần key thật liên quan hoặc yêu cầu/duyệt policy riêng; không tăng baseline.

Sau đó người dùng xác nhận dùng AGRI-76 cho commit bổ sung skill. Subject được chọn là `chore(skills): AGRI-76 add devops iac engineer skill`; không thay policy hoặc baseline CI. Việc gắn key này là quyết định trực tiếp của người dùng, không suy ra triển khai DevOps thuộc phạm vi phân tích hệ thống đã hoàn tất.

CI hiện chưa chạy tests trong skill; [workflow mẫu](examples/pipelines/skill-check.yml) không tự active. Không sửa workflow, dependency hay stack. Chưa có GitHub run cho phần mới.

## Kết quả local

- Unittest helper: 10 tests đạt trên Python venv local, gồm từ chối traversal/overwrite, lỗi tool/timeout, giữ exit code và server dry-run/redaction argv. Native CLI được mock.
- Skill Creator quick_validate.py: Skill is valid.
- Kiểm tra PowerShell: 11 Markdown, 43 liên kết local hợp lệ; fences cân bằng, không trailing whitespace.
- CLI --help chạy được; Python syntax và cấu trúc hai YAML mẫu đạt. Tổng 16 file skill không trailing whitespace; targeted secret-pattern check không có match, không thay cho Gitleaks. Tool discovery thấy kubectl, nhưng chưa gọi cluster; Terraform/Gitleaks không có trên PATH.
- Python trong sandbox bị chặn executable gốc; chạy lại kiểm tra local với quyền được duyệt, không deploy hoặc truy cập cluster.
- Chưa chạy Terraform/kubectl/Gitleaks thật, chưa chạy full CI GitHub. Mẫu image example/app:1.0 không có đảm bảo tồn tại/production-ready.
- Lần bổ sung ban đầu chưa stage/commit/push; lần tiếp theo được người dùng yêu cầu commit với AGRI-76. Không push; CI workflow và commitlint policy không thay đổi.
