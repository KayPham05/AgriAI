# AGRI-172 · S15 Danh sách lịch sử (`Tabs/History`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-172-mobile-history`
- Thiết kế Figma đã duyệt: [`AGRI-172 · S15 / Danh sách lịch sử`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-141)

## Thay đổi chính

- **`reactNative/src/features/history/fetchHistoryList.ts`:** Adapter `GET /api/predictions` có `pageNumber`, `pageSize`, `agriculturalProfileId`, `plantId`, `diseaseId`, `fromDate`, `toDate`, bỏ tham số rỗng, kiểm tra `fromDate <= toDate` và đánh dấu `isImageExpired` từ `images`.
- **`reactNative/src/features/history/screens/HistoryScreen.tsx` & `src/app/(tabs)/history.tsx`:** Guest hiển thị lời mời đăng nhập và không gọi API riêng; User có nút `"Bộ lọc"` mở `FilterSheet`, phân trang `"Tải thêm"`, reset về trang 1 khi đổi filter và giữ metadata/mở S16 khi ảnh hết hạn.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S15-T1` · Guest vào tab | **Pass** (component) | `HistoryScreen.test.tsx`: hiển thị lời mời đăng nhập, không gọi `fetch`. |
| `S15-T2` · Đổi filter ở trang 2 | **Pass** (component/mock) | `HistoryScreen.test.tsx`: gọi `pageNumber=1` với filter mới, thay thế danh sách cũ. |
| `S15-T3` · Ảnh expired | **Pass** (component) | `HistoryScreen.test.tsx`: hiển thị `"Ảnh gốc đã hết hạn"` và vẫn mở S16 khi bấm. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 17 suites / 76 tests passed. |

## Còn lại

- Nối `onSelectPrediction` sang route `S16` (`AGRI-173`) và kiểm thử phân trang với dữ liệu thật.
