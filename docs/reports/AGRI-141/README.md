# AGRI-141 — Medicine pair choices

2026-11-04, branch AGRI-141-medicine-pair-options. PlantDiseasePicker lists only Disease pairs whose link, plant and disease are active. Search and keyboard selection operate on that eligible set. Unknown, Healthy, NutrientDeficiency, inactive and missing-metadata choices are excluded, even if selected historically. Existing invalid uses remain visible in MedicineUses and can be removed with confirmation.

Affected: frontend/src/features/knowledge/PlantDiseasePicker.tsx and frontend/tests/component/admin/MedicineUses.test.tsx. Regression red: 9 failed/6 passed; green: 15/15 (.cache/agri141-{red,green}.log). git diff --check passed. DoD: implementation and focused checks complete; combined verification/review pending. Backend validation is retained; no data deletion or dependencies.

2026-11-04 delivery: independent branch AGRI-141-disease-only-picker starts at 170e2be; all 15 focused tests passed after splitting (.cache/split-141.log). Combined frontend typecheck/lint, 483 tests and build passed; changed-file formatting passed while whole-checkout CRLF formatting remains a limitation. Branch split complete; remote PR/review pending.
