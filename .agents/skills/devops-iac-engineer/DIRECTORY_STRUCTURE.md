# Actual skill structure

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

[SKILL.md](SKILL.md) is the entry point; read only the relevant [references](reference/). The [helper](scripts/devops_utils.py) does not deploy; [tests](tests/test_devops_utils.py) exercise local behavior and mocked CLIs; [examples](examples/) are not running services.

Outputs, caches, and credentials are outside the skill and must stay out of Git. Native executables are prerequisites; they are neither bundled nor installed automatically.