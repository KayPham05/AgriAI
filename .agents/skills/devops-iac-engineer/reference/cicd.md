# CI/CD and GitOps

Sources of truth: [CI workflow](../../../../.github/workflows/ci.yml), [commitlint](../../../../commitlint.config.cjs). Do not change gates, coverage, or the legacy baseline without authorization.

- New commits require a real related Jira key: type(scope): AGRI-XXX description. Do not assign unrelated tooling work to AGRI-76.
- Missing keys fail jira-subject, which then fails ci-gate. A verbal exception does not change CI configuration.
- Do not bypass checks with --no-verify, broad ignores, or an advanced baseline. Policy changes require a separate request.
- Record the exact SHA/run; startup, mocks, coverage, and model inference are separate evidence.
- Add CD only for an actual environment with a clear secret store, workflow permissions, and deployment approval.
- gitops init only creates a local Kustomize skeleton. It does not install ArgoCD/Flux, connect a repository, or enable auto-sync.
- Base rollback on artifact/DB policy; do not automatically reset branches or delete volumes.

The [example workflow](../examples/pipelines/skill-check.yml) is only an example and does not run automatically in repository CI.