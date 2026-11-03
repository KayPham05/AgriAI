# AGRI-140 — Saved catalog visibility

2026-11-04, branch AGRI-140-catalog-visibility. Plant/disease editors no longer present approval badges, actions or review instructions. Saved active disease advice is available immediately in public catalog reads and new prediction primary/top-k content. Medicine recommendations no longer depend on disease approval; their own publication, label verification, confidence, Disease classification and active pair gates remain intact.

Affected: backend DiseaseService, MedicineService and PredictionService; frontend KnowledgeAdmin and CatalogEditor; related unit, API and UI regressions. Legacy approval fields/endpoint remain for compatibility but do not gate visibility. No schema migration, R2 configuration change, AI labels or stored snapshot rewrite. Unsnapshotted legacy history never derives medication from the unverified legacy Disease.Medication field.

Evidence from 2026-11-04: regression red run 3 failures/68 passes; final focused backend 74/74, API KnowledgeMedicineTests 33/33 with disposable PostgreSQL and fake AI/storage, frontend KnowledgeAdmin/CatalogEditor 16/16. Logs: .cache/agri140-{red,green,api,ui-green}.log. git diff --check passed. DoD: implementation and focused verification complete; combined checks and review pending. Existing snapshot content is intentionally historical; live catalog shows current saved content.
