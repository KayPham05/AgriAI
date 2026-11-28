# AGRI-176 · S19 Chi tiết hồ sơ nông nghiệp (`AgriculturalProfileDetail`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-176-mobile-profile-detail`
- Thiết kế Figma đã duyệt: [`AGRI-176 · S19 / Chi tiết hồ sơ`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-299)

## Thay đổi chính

- **`reactNative/src/features/profiles/screens/AgriculturalProfileDetailScreen.tsx` & `src/app/profiles/[id].tsx`:** Tải chi tiết hồ sơ (`GET /api/agricultural-profiles/{id}`) và danh sách lịch sử lọc theo `agriculturalProfileId` (`GET /api/predictions?agriculturalProfileId={id}`), nút `"Sửa"` mở S18, bấm kết quả mở S16, `ConfirmDialog` `"Xác nhận xóa hồ sơ"` giải thích giữ nguyên lịch sử chẩn đoán, và xử lý `404` không lộ dữ liệu owner khác.
- **`reactNative/src/app/profiles/index.tsx` & `_layout.tsx`:** Nối `onSelectProfile` sang `/profiles/[id]`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S19-T1` · Mở hồ sơ | **Pass** (component/mock) | `AgriculturalProfileDetailScreen.test.tsx`: gọi `GET /api/predictions?...agriculturalProfileId={id}`. |
| `S19-T2` · Xóa 204 giữ lịch sử | **Pass** (component/mock) | `AgriculturalProfileDetailScreen.test.tsx`: dialog giải thích giữ lịch sử, gọi `onDelete` và quay về list. |
| `S19-T3` · Id owner khác 404 | **Pass** (component) | `AgriculturalProfileDetailScreen.test.tsx`: hiển thị not-found không lộ chi tiết. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 21 suites / 87 tests passed (20 suites ở `task-563` + `AgriculturalProfileDetailScreen.test.tsx` 3/3). |
| `pnpm export:android` & `pnpm export:ios` | **Pass** | Android (1215 modules, 47 assets), iOS (1221 modules, 44 assets). |

## Còn lại

- Kiểm thử end-to-end luồng S11–S19 với backend/FastAPI thật trên thiết bị Android/iOS.
