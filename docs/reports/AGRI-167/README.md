# AGRI-167 · S10 Trang chủ (`Tabs/Home`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-167-mobile-home`
- Thiết kế Figma đã duyệt: [`06 S10 Trang chủ (AGRI-167)`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=82-692) (tham chiếu `05 Sổ tay vườn nhà`).

## Thay đổi chính

- **`reactNative/src/features/home/fetchRecentPredictions.ts`:** Adapter gọi `GET /api/predictions?pageNumber=1&pageSize=3` với `Bearer` token, `credentials: 'omit'`, `redirect: 'error'`, timeout 10s, hỗ trợ `AbortSignal`, fallback tên tiếng Việt sang tên gốc (`plantVietnameseName`/`plantName`, `diseaseVietnameseName`/`diseaseName`), giới hạn tối đa 3 mục và xử lý `401` / `network` / `timeout` / `service`.
- **`reactNative/src/features/home/screens/HomeScreen.tsx`:** Dựng bố cục theo Figma `05 Sổ tay vườn nhà`: thanh thương hiệu `AgriVision · Sổ tay vườn nhà` + nút chuông `48×48` (không giả unread total), banner ảnh lúa + hero xanh đậm (`#0f4d2c`) với CTA `"Chụp ảnh lá"`.
  - **Guest:** hiển thị card `"Lưu kết quả của bạn"` + nút `"Đăng nhập"` và link `"Tra cứu cây trồng"`, không gọi API lịch sử.
  - **User:** hiển thị tối đa 3 kết quả gần đây (bấm mở S16 theo `id`), trạng thái `loading` / `empty` / `error` (có nút `"Thử lại"`, không khóa CTA chụp), kèm lối vào `"Hồ sơ nông nghiệp"` và `"Tra cứu cây trồng"`.
- **`reactNative/src/app/(tabs)/home.tsx`:** Nối `useStartupSession()` với `fetchRecentPredictions` (chỉ gọi khi `session.status === 'user'`) và điều hướng sang `/ (tabs)/diagnosis`, `/ (tabs)/catalog`, `/ (tabs)/history`, `/login`.
- **`reactNative/src/components/ui/ShellTabBar.tsx`:** Tăng `paddingBottom` tối thiểu lên `theme.spacing.lg` (24) để thanh điều hướng không sát cạnh dưới.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S10-T1` · Guest mở Home | **Pass** (component/mock) | `HomeScreen.test.tsx`: hiển thị lời nhắc đăng nhập, `fetch` không được gọi. |
| `S10-T2` · User có dữ liệu | **Pass** (component/mock) | `HomeScreen.test.tsx`: hiển thị tối đa 3 mục từ response, fallback tên gốc, bấm item gọi `onSelectPrediction(id)` và kiểm tra URL `GET /api/predictions?pageNumber=1&pageSize=3`. |
| `S10-T3` · History lỗi | **Pass** (component/mock) | `HomeScreen.test.tsx`: hiển thị `StatePanel` lỗi + nút `"Thử lại"`, CTA `"Chụp ảnh lá"` vẫn enabled và bấm được. |
| `pnpm typecheck` & `pnpm lint` | **Pass** | `tsc --noEmit`, `eslint . --max-warnings=0`. |
| `pnpm test` | **Pass** | 12 suites / 61 tests passed. |
| `pnpm export:android` & `pnpm export:ios` | **Pass** | Android (1191 modules, 47 assets), iOS (1197 modules, 44 assets). |

## Còn lại

- Tích hợp live API `/api/predictions` với backend chạy thật và kiểm thử trên thiết bị Android/iOS (S16 detail, S17 hồ sơ nông nghiệp, S35 thông báo đang chờ các màn hình đích tương ứng).
