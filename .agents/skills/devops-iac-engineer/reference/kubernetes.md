# Kubernetes and containers

Kubernetes is a future option, not a deployed AgriAI component. Prefer the existing Compose setup.

- Confirm context, namespace, version, and permissions; do not default to a production context.
- The helper's generate command only writes Deployment JSON (also valid YAML); it does not apply resources, install a cluster, create a Service/Ingress/Secret, or overwrite files.
- Replace the demo image and finalize ports, probes, UID, write permissions, and resource limits for the application. The example is not production-ready and does not work with every image.
- Validation calls kubectl apply --dry-run=server --validate=strict. It requires cluster access/RBAC and sends requests for schema/admission checks without persisting resources. Admission webhooks may be invoked.
- This is not offline validation; --schema-version is unsupported. The schema comes from the selected cluster.
- Deployment, public ingress, RBAC changes, and namespace deletion require separate approval. Record missing tools/cluster access as Blocked, not Passed.

[Deployment example](../examples/kubernetes/complete-app.yaml). Source: [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/).