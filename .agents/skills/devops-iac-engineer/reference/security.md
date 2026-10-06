# Security and secrets

Do not commit secrets, checkpoints, datasets, or browser profiles. Ignore rules do not clean history; exposed secrets require revocation/rotation and authorized history remediation.

- The helper's scan-secrets command calls Gitleaks dir with --redact: it scans directory contents, not Git history.
- Gitleaks must support the dir subcommand (CI baseline v8.24.2); do not automatically download/install tools. Missing tools are errors; findings preserve the tool's exit code.
- CI uses Gitleaks git with --log-opts=--all. A passing directory scan does not imply clean history.
- Do not print secrets or use broad allowlists to make CI pass. False positives require evidence and narrowly scoped, approved handling.
- Enforce ownership/roles and image checks on the server; popups/client validation do not replace API protection.
- Terraform plans/state may contain sensitive data; base64 encoding does not inherently secure Kubernetes Secrets.
- Deployment, pushes, and state mutations require explicit authorization.

Source: [Gitleaks CLI](https://github.com/gitleaks/gitleaks).