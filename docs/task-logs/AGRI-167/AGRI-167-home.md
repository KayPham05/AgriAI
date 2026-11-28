# AGRI-167 · S10 Trang chủ (`Tabs/Home`)

28/11/2026 · `AGRI-167-mobile-home`

- Thiết kế Figma 4 trạng thái (`Guest`, `User 3 kết quả`, `User rỗng`, `User lỗi + Thử lại`) trên [`06 S10 Trang chủ (AGRI-167)`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=82-692) theo mẫu `05 Sổ tay vườn nhà` và được user duyệt.
- Triển khai `fetchRecentPredictions.ts` (`GET /api/predictions?pageNumber=1&pageSize=3`, chỉ User, fallback tên Việt → tên gốc), cập nhật `HomeScreen.tsx`, `src/app/(tabs)/home.tsx` và nâng `paddingBottom` của `ShellTabBar.tsx`.
- Fresh checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (12 suites / 61 tests gồm `S10-T1`, `S10-T2`, `S10-T3`), `pnpm export:android`, `pnpm export:ios` đều pass. Chi tiết tại [báo cáo AGRI-167](../../reports/AGRI-167/README.md).
- Còn lại: nối điều hướng đích S16/S17/S35 khi các màn hình đó sẵn sàng và kiểm thử live API/thiết bị thật.
