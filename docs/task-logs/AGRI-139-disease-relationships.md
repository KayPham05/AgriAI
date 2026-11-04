# AGRI-139 — Disease relationships

2026-11-04: integrated existing plant/disease relationships into disease details, scoped results by disease and retained search, paging and availability confirmation. Parent edits and child mutations are mutually locked. Focused verification passed 25/25; [technical evidence](../reports/AGRI-139/README.md). Branch AGRI-139-disease-relationships. PR/review pending.

2026-11-04 delivery: separated AGRI-139-disease-links from base 170e2be; 25/25 focused checks passed independently. Renaming copy remains in AGRI-135. No additional worktree.

2026-11-04 integration: plant/disease relationship controls moved from disease detail to plant detail; disease detail keeps only the condition classification. `PlantDiseaseManager` now filters by `plantId`. Tests were updated; local execution was blocked by the host sandbox.

2026-11-04 check: `PlantDiseaseManager` component/integration tests were updated from `diseaseId` to `plantId` and the search label to "Tìm bệnh hoặc tình trạng"; frontend typecheck passes and the two related suites pass 14/14; backend KnowledgeMedicine including the relationship coverage passes 51/51 with `-p:LangVersion=12`.
