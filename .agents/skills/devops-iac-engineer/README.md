# DevOps IaC Engineer

Skill hướng dẫn IaC/CI/CD; không thay stack AgriAI hoặc cấp quyền deploy. Các phần hỗ trợ được tự biên soạn ngày 2026-10-03, không phục hồi package gốc.

## Điểm vào

- [SKILL.md](SKILL.md): workflow và ranh giới quyền.
- [Directory structure](DIRECTORY_STRUCTURE.md), [implementation guide](IMPLEMENTATION_GUIDE.md).
- [Terraform](reference/terraform.md), [Kubernetes](reference/kubernetes.md), [cloud](reference/cloud_platforms.md), [CI/CD](reference/cicd.md), [observability](reference/observability.md), [security](reference/security.md), [templates](reference/templates.md).

## Helper

Python 3.10+ và stdlib; không cần PyYAML để chạy helper. Từ thư mục skill:

```text
python scripts/devops_utils.py --help
python -m unittest discover -s tests -p "test_*.py" -v
```

Generate chỉ tạo file local mới. Validate/scan cần Terraform, kubectl hoặc Gitleaks trên PATH. Thiếu tool là lỗi. Kubernetes server dry-run cần cluster/quyền, không offline. Tests mock native tools, không xác nhận cloud/cluster/scanner thật.

Người dùng xác nhận dùng AGRI-76 cho commit skill này. Không đổi CI để miễn commitlint; việc thêm skill không chứng minh hạ tầng đã triển khai. Không push khi chưa được yêu cầu.
