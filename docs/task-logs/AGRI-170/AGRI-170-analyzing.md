# AGRI-170 · S13 Đang phân tích ảnh (`DiagnosisProcessing`)

28/11/2026 · `AGRI-170-mobile-analyzing`

- Triển khai `submitPrediction.ts` (`POST /api/predictions` multipart), `AnalyzingScreen.tsx`, `src/app/diagnosis/analyzing.tsx` và nối từ `preview.tsx`.
- Fresh checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (15 suites / 70 tests gồm `S13-T1`, `S13-T2`, `S13-T3`) pass. Chi tiết tại [báo cáo AGRI-170](../../reports/AGRI-170/README.md).
- Còn lại: nối sang `S14` (`AGRI-171`) và kiểm thử upload thật trên thiết bị.
