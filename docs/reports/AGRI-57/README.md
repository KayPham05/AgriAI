# AGRI-57 — Frontend LeafAI và tích hợp Backend

Đây là điểm vào chính cho toàn bộ bằng chứng kỹ thuật của task AGRI-57.

## Trạng thái Definition of Done

**Hoàn thành phạm vi frontend demo.**

- Upload, preview, xóa và chọn lại ảnh: hoàn thành.
- Validation định dạng, file rỗng và dung lượng tối đa 15 MB: hoàn thành.
- Gửi multipart request đến ASP.NET Backend và nhận JSON response: hoàn thành.
- Hiển thị cây trồng, bệnh, confidence, ảnh và trạng thái xử lý: hoàn thành.
- Idle, Uploading, Analyzing, Success, Error và retry: hoàn thành.
- Responsive desktop, tablet và mobile: hoàn thành.
- Unit test và integration test frontend: **20/20 PASS**.
- TypeScript check và Next.js production build: PASS.
- Prediction result không hard-code trong UI; dữ liệu được mapping từ Backend DTO.

## Kết quả chính

| Kiểm tra | Kết quả | Nguồn bằng chứng |
|---|---:|---|
| Test files | 6/6 PASS | `corepack pnpm test` ngày 2026-09-28 |
| Test cases | 20/20 PASS | `corepack pnpm test` ngày 2026-09-28 |
| TypeScript | PASS | `corepack pnpm lint` ngày 2026-09-28 |
| Production build | PASS | `corepack pnpm build` ngày 2026-09-28 |
| Backend unit tests | 8/8 PASS | `dotnet test` ngày 2026-09-28 |
| Backend integration tests | 5/5 PASS | `dotnet test` với Testcontainers ngày 2026-09-28 |
| Static route | `/` | Output của Next.js build ngày 2026-09-28 |

## Tài liệu

- [Báo cáo triển khai frontend](frontend_implementation_report.md)
- [Task completion log](../../task-logs/AGRI-57/AGRI-57-trunthong09012005.md)
- [Hướng dẫn tích hợp Backend–Frontend](../../backend_frontend_integration_handbook.md)

## Mã nguồn liên quan

- `frontend/src/App.tsx`
- `frontend/src/views/`
- `frontend/src/components/`
- `frontend/src/services/authApi.ts`
- `frontend/src/services/catalogApi.ts`
- `frontend/src/services/predictionApi.ts`
- `frontend/src/utils/imageFileValidation.ts`
- `frontend/src/**/*.test.ts`
- `frontend/src/**/*.test.tsx`

## Giới hạn còn lại

- CAPTCHA phía frontend chỉ phục vụ demo, chưa thay thế xác minh chống bot phía server.
- Grad-CAM và kết quả bệnh production phụ thuộc AI service/model thật.
- Chưa có Pull Request cho thay đổi hiện tại.
