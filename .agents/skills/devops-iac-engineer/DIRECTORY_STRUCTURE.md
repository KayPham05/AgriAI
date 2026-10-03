# Cấu trúc skill thực tế

```text
devops-iac-engineer/
├── SKILL.md
├── README.md
├── DIRECTORY_STRUCTURE.md
├── IMPLEMENTATION_GUIDE.md
├── reference/
│   ├── terraform.md
│   ├── kubernetes.md
│   ├── cloud_platforms.md
│   ├── cicd.md
│   ├── observability.md
│   ├── security.md
│   └── templates.md
├── scripts/devops_utils.py
├── tests/test_devops_utils.py
└── examples/
    ├── terraform/main.tf
    ├── kubernetes/complete-app.yaml
    └── pipelines/skill-check.yml
```

[SKILL.md](SKILL.md) là điểm vào; chỉ đọc [reference](reference/) liên quan. [Helper](scripts/devops_utils.py) không deploy; [tests](tests/test_devops_utils.py) kiểm tra local/mocked CLI; [examples](examples/) không phải dịch vụ đang chạy.

Output/cache/credential không thuộc skill và không vào Git. Native executable là prerequisite, không đóng gói hoặc tự cài.
