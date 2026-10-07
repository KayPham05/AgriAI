# Health, logs, and observability

AgriAI has /api/health for DB checks and /api/health/deps for AI HTTP health checks. These do not validate checkpoint/mapping correctness or classification accuracy.

- Distinguish startup/liveness/readiness, availability, and prediction quality. A health mock is not inference.
- Log request IDs, latency, upload/AI/DB errors, and versions supported by evidence; do not log bearer tokens, secrets, image bytes, or personal data.
- Latency percentiles/SLOs require approved measurement conditions; do not invent thresholds or figures.
- Monitor DB connections, volumes, uploads, AI timeouts, and mapping rejection; do not turn unknown mappings into success.
- Alerts need an action, owner, and runbook; record an unassigned owner as pending.
- Run backup restores/drills only in authorized environments; do not disrupt production.

[Health code](../../../../backend/src/AgriVision.API/Controllers/HealthController.cs), [AGRI-75 testing scope](../../../../docs/reports/AGRI-75/README.md).