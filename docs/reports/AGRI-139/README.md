# AGRI-139 — Disease relationships

2026-11-04, branch AGRI-139-disease-relationships. Removed the standalone Admin relationship navigation. Disease details now contain a scoped Cây trồng liên quan section with search (500 ms debounce), pagination and confirmation for changing existing link availability. Unsaved disease edits or pending operations disable link mutations. Plant details retain their read-only disease list; AI class identities remain immutable.

Affected: frontend/src/features/admin/AdminCrmPage.tsx and frontend/src/features/knowledge/{KnowledgeAdmin,PlantDiseaseManager}.tsx. Regression coverage: KnowledgeAdmin, PlantDiseaseManager and CatalogDebounce tests.

Verification: regression initially failed because the embedded section was absent (1 failed, 10 passed); after implementation all 25 focused tests passed (.cache/agri139-red.log and .cache/agri139-green.log). git diff --check passed. DoD: implementation and focused verification complete; combined checks and review pending. No dependencies or additional worktrees.
