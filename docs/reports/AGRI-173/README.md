# AGRI-173 · S16 Chi tiết lịch sử (`PredictionDetail`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-173-mobile-prediction-detail`
- Thiết kế Figma đã duyệt: [`AGRI-173 · S16 / Chi tiết lịch sử`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-230)

## Thay đổi chính

- **`reactNative/src/features/history/predictionDetailApi.ts`:** Adapter `GET /api/predictions/{id}`, `PUT /api/predictions/{id}/agricultural-profile`, `DELETE /api/predictions/{id}/agricultural-profile/{profileId}`, `DELETE /api/predictions/{id}` với `Bearer` token và xử lý `404` không lộ dữ liệu owner khác.
- **`reactNative/src/features/history/screens/PredictionDetailScreen.tsx` & `src/app/prediction/[id].tsx`:** Hiển thị historical snapshot (`hasHistoricalSnapshot`), placeholder ảnh expired/404 giữ nguyên metadata, sheet gắn/đổi/gỡ hồ sơ và `ConfirmDialog` xóa kết quả.
- **`reactNative/src/app/(tabs)/home.tsx` & `history.tsx` & `_layout.tsx`:** Nối `onSelectPrediction` từ Home và History sang `/prediction/[id]`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S16-T1` · Snapshot lịch sử | **Pass** (component) | `PredictionDetailScreen.test.tsx`: hiển thị nhãn snapshot và tên bệnh tại thời điểm lưu. |
| `S16-T2` · Xóa 204 | **Pass** (component/mock) | `PredictionDetailScreen.test.tsx`: xác nhận dialog, gọi `onDelete` và điều hướng về danh sách. |
| `S16-T3` · Ảnh expired / 404 | **Pass** (component) | `PredictionDetailScreen.test.tsx`: giữ metadata khi ảnh expired; `404` hiển thị not-found không lộ dữ liệu. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 18 suites / 79 tests passed. |

## Còn lại

- Kiểm thử live API gắn/gỡ hồ sơ, đọc ảnh owner private (`GET /api/predictions/{id}/images/{imageId}`) và xóa bản ghi trên thiết bị thật.
