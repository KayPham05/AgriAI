# AGRI-168 · S11 Chụp hoặc chọn ảnh (`Tabs/Diagnosis/ImageSource`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-168-mobile-image-source`
- Thiết kế Figma đã duyệt: [`AGRI-168 · S11 / Chụp hoặc chọn ảnh`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-3)

## Thay đổi chính

- **`reactNative/src/features/diagnosis/diagnosisDraft.ts`:** `DiagnosisDraftProvider` giữ duy nhất 1 `SelectedLeafImage` và `profileId` tùy chọn trong bộ nhớ cho luồng `S11 -> S12 -> S13 -> S14`.
- **`reactNative/src/features/diagnosis/imageSource.ts`:** `ImageSourceAdapter` xin quyền camera/thư viện theo action, nhận 1 ảnh (`selectionLimit: 1`, `allowsEditing: false`), xử lý `cancelled` / `permission-denied` / `unavailable` và mở `Linking.openSettings()`.
- **`reactNative/src/features/diagnosis/screens/DiagnosisScreen.tsx` & `src/app/(tabs)/diagnosis.tsx` & `src/app/_layout.tsx`:** Nối `DiagnosisDraftProvider` và `defaultImageSourceAdapter`, chặn double tap, giữ draft cũ khi hủy và hiển thị hướng dẫn `"Mở Cài đặt"` khi bị từ chối quyền.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S11-T1` · Chụp thành công | **Pass** (component) | `DiagnosisScreen.test.tsx`: trả đúng 1 URI ảnh qua `onImageSelected`. |
| `S11-T2` · Hủy picker | **Pass** (component) | `DiagnosisScreen.test.tsx`: giữ draft hiện tại, không báo lỗi. |
| `S11-T3` · Từ chối quyền vĩnh viễn | **Pass** (component) | `DiagnosisScreen.test.tsx`: hiển thị hướng dẫn và gọi `openSettings`, không crash. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 13 suites / 64 tests passed. |

## Còn lại

- Cài/kiểm `expo-image-picker` trên thiết bị Android/iOS thật (hiện adapter fallback an toàn khi module native chưa link) và nối điều hướng sang màn `S12` (`AGRI-169`).
