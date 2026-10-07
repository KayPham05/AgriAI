# Terraform and IaC

Use only for an approved provisioning request. AgriAI currently uses Compose; adding the skill does not change the stack.

- Confirm account, region, cost, permissions, and resources before writing providers/resources.
- The helper's init-project command creates a local starter without providers/resources/credentials; cloud and region are metadata only.
- Run terraform init -backend=false separately when preparation for validation is needed; it may download modules/providers. The helper does not initialize automatically.
- terraform validate checks the entire directory; it does not validate cloud APIs/state or deploy. --file accepts a directory or uses the file's parent directory.
- Plan/apply/destroy/state mutations require separate approval. Do not use auto-approve by default.
- Do not commit state, plans, or tfvars containing secrets. Choose backend/locking according to the approved version; do not apply outdated recipes to every environment.

[Local example](../examples/terraform/main.tf). Source: [Terraform validate](https://developer.hashicorp.com/terraform/cli/commands/validate).