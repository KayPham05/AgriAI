# AGRI-170 · S13 Đang phân tích ảnh (`DiagnosisProcessing`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-170-mobile-analyzing`
- Thiết kế Figma đã duyệt: [`AGRI-170 · S13 / Đang phân tích ảnh`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-90)

## Thay đổi chính

- **`reactNative/src/features/diagnosis/submitPrediction.ts`:** Adapter `POST /api/predictions` multipart/form-data (để `fetch` tự tạo boundary), gửi `Bearer` và `agriculturalProfileId` chỉ khi `User` đã đăng nhập; xử lý `200`/`201`, `401`, `timeout` (không tự POST lại), `network`, `service` và `AbortSignal`.
- **`reactNative/src/features/diagnosis/screens/AnalyzingScreen.tsx` & `src/app/diagnosis/analyzing.tsx`:** Hiển thị thumbnail và spinner tĩnh (không % giả), chặn double tap bằng `inFlightRef`, giải thích khi quay lại và khuyên User kiểm tra lịch sử trước khi gửi lại khi timeout.
- **`reactNative/src/features/diagnosis/diagnosisDraft.ts` & `src/app/diagnosis/preview.tsx`:** Lưu `lastResult` tạm trong context và nối `onAnalyze` sang `/diagnosis/analyzing`.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S13-T1` · Double tap / single-flight | **Pass** (component) | `AnalyzingScreen.test.tsx`: chỉ 1 `POST` chạy khi mount. |
| `S13-T2` · Guest 200 / User 201 | **Pass** (component) | `AnalyzingScreen.test.tsx`: gọi `onCompleted` đúng 1 lần, không POST lại. |
| `S13-T3` · Timeout sau upload | **Pass** (component) | `AnalyzingScreen.test.tsx`: báo chưa rõ kết quả, hiển thị nút `"Xem lịch sử"` cho User, không auto-POST. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 15 suites / 70 tests passed. |

## Còn lại

- Nối `onCompleted` sang màn `S14` (`AGRI-171`) và kiểm thử upload multipart với FastAPI/backend thật trên thiết bị.
