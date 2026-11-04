# AGRI-140 — Saved catalog visibility

2026-11-04: removed plant/disease review controls and disease approval gates in public catalog, prediction advice and medicine recommendations. Active-status and medicine/extraction review rules remain. No migrations or storage configuration changes. Branch AGRI-140-catalog-visibility. Verified 74 backend unit, 33 API and 16 frontend tests; [evidence and compatibility limits](../reports/AGRI-140/README.md). PR/review pending.

2026-11-04 delivery: independent branch AGRI-140-save-without-approval from 170e2be. Backend source matches the combined tested version exactly (179 unit, 33 catalog API and 29 prediction API checks passed); independent frontend checks passed 16/16. No additional worktree or migration.
