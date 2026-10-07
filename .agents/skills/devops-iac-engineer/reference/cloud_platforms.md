# Choosing a cloud platform

Do not choose AWS/Azure/GCP merely because the skill lists them. AgriAI has no confirmed cloud staging environment.

- Record workload, budget, data region, GPU/CPU inference needs, availability, and operator.
- Compare VM + Compose with managed services according to actual needs; do not automatically add Kubernetes or multi-cloud.
- The user must confirm the account/project/subscription and region before provisioning.
- Use least-privilege identities and short-lived credentials where supported; do not embed keys in Git.
- Keep the DB private by default; finalize networking, TLS, registry, backup/restore, and image lifecycle.
- Check budget alerts, tags, and egress costs for the selected cloud.
- Consult official documentation for current pricing, quotas, or specifications; do not provide unmeasured figures or claim compliance.

The helper's --cloud option only records metadata; it does not call cloud APIs or verify quotas, costs, or regions.