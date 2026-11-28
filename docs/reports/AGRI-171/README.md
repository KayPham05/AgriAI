# AGRI-171 · S14 Kết quả chẩn đoán và lưu lượt khách (`DiagnosisResult`)

- Ngày: 28/11/2026 · Nhánh: `AGRI-171-mobile-diagnosis-result`
- Thiết kế Figma đã duyệt: [`AGRI-171 · S14 / Kết quả & Lưu Guest`](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=90-113)

## Thay đổi chính

- **`reactNative/src/features/diagnosis/saveGuestPrediction.ts`:** Adapter `POST /api/predictions/guest/save` (`{ guestToken }`, `Bearer` token), không đẩy token lên URL/log, phân biệt `201` (`saved`), `400`/`404`/`410` (`expired`), `401` (`unauthorized`).
- **`reactNative/src/features/diagnosis/screens/DiagnosisResultScreen.tsx` & `src/app/diagnosis/result.tsx`:** Hiển thị ảnh `4:3 contain`, `ResultSummary` (kiểm tra raw `confidence <= 0.80` trước khi làm tròn), Top-K, hướng dẫn chăm sóc, thuốc tham khảo (chỉ hiện khi `confidence > 0.8` và không có `warning`), trạng thái `informationPending`, và luồng Guest đăng nhập → lưu không inference lại.
- **`reactNative/src/features/auth/returnTarget.ts` & `src/app/diagnosis/analyzing.tsx` & `_layout.tsx`:** Thêm `/diagnosis/result` vào whitelist return target và điều hướng từ S13 sang S14.

## Kết quả kiểm thử (28/11/2026)

| Case / Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `S14-T1` · Confidence 0.75 & warning | **Pass** (component) | `DiagnosisResultScreen.test.tsx`: hiển thị `75,0%`, cảnh báo và ẩn thuốc. |
| `S14-T2` · Guest login/save 201 | **Pass** (component/mock) | `DiagnosisResultScreen.test.tsx`: gọi `POST /api/predictions/guest/save` và chuyển trạng thái đã lưu. |
| `S14-T3` · Guest hết hạn / informationPending | **Pass** (component) | `DiagnosisResultScreen.test.tsx`: hiển thị thông báo tương ứng, không dựng thuốc/ảnh giả. |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | **Pass** | 16 suites / 73 tests passed. |

## Còn lại

- Kiểm thử end-to-end Guest → Login → Save với backend thật và đọc ảnh private Guest qua `GET /api/predictions/guest/image` trên thiết bị.
