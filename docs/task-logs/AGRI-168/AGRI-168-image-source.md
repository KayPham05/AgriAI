# AGRI-168 · S11 Chụp hoặc chọn ảnh (`Tabs/Diagnosis/ImageSource`)

28/11/2026 · `AGRI-168-mobile-image-source`

- Triển khai `DiagnosisDraftProvider`, `ImageSourceAdapter` (`imageSource.ts`) và `DiagnosisScreen` cho luồng chụp/chọn 1 ảnh lá, xin quyền theo action và mở Cài đặt khi bị từ chối.
- Fresh checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (13 suites / 64 tests gồm `S11-T1`, `S11-T2`, `S11-T3`) đều pass. Chi tiết tại [báo cáo AGRI-168](../../reports/AGRI-168/README.md).
- Còn lại: nối sang màn `S12` (`AGRI-169`) và kiểm thử camera/picker trên thiết bị thật.
