# AGRI-57 — Báo cáo triển khai frontend LeafAI

## 1. Phạm vi

AGRI-57 hoàn thiện frontend demo cho hệ thống chẩn đoán bệnh lá cây và mapping với Backend ASP.NET Core. Phạm vi bao gồm nền tảng Next.js, UI/UX, xác thực tài khoản, upload ảnh, prediction flow, lịch sử, danh mục cây/bệnh, responsive và kiểm thử tự động.

## 2. Kiến trúc frontend

### Nền tảng

- Next.js `16.3.6` với App Router.
- React `19.2.0` và TypeScript.
- pnpm `10.34.5` làm package manager.
- Tailwind CSS 4 cho giao diện responsive.
- Vitest, Testing Library và jsdom cho unit/integration test.

Các entry point và cấu hình chính:

- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/next.config.ts`
- `frontend/postcss.config.mjs`
- `frontend/vitest.config.mts`
- `frontend/package.json`

### Tổ chức chức năng

| Nhóm | Mã nguồn | Trách nhiệm |
|---|---|---|
| Điều phối ứng dụng | `frontend/src/App.tsx` | Session, điều hướng, history, modal và toast. |
| Màn hình | `frontend/src/views/` | Landing, trang chủ, kiểm tra lá, cây, bệnh, lịch sử, dự án và hồ sơ. |
| Thành phần dùng chung | `frontend/src/components/` | Navigation, modal, splash, kết quả và trực quan hóa. |
| API client | `frontend/src/services/` | Auth, catalog, prediction và history. |
| Validation | `frontend/src/utils/imageFileValidation.ts` | Kiểm tra file trước khi upload. |

## 3. Mapping Frontend–Backend

### Xác thực

- `POST /api/auth/register`: đăng ký với `fullName`, `email`, `password`.
- `POST /api/auth/login`: đăng nhập và nhận JWT cùng thông tin người dùng.
- `GET /api/auth/me`: khôi phục và xác minh phiên đã lưu.
- JWT được gửi bằng `Authorization: Bearer <token>` cho endpoint cần xác thực.

Mã nguồn: `frontend/src/services/authApi.ts`.

### Danh mục

- Client lấy cây trồng và bệnh từ Backend.
- DTO Backend được mapping sang type hiển thị của frontend.
- Có xử lý lỗi kết nối thay vì làm crash giao diện.

Mã nguồn: `frontend/src/services/catalogApi.ts`.

### Prediction

- Gửi ảnh qua `multipart/form-data` với field `file`.
- Theo dõi upload progress bằng `XMLHttpRequest`.
- Hỗ trợ timeout 60 giây và `AbortSignal`.
- Kiểm tra response theo `PredictionResultDto` trước khi render.
- Mapping tên cây, bệnh, confidence, Top-K, trạng thái khỏe/bệnh và timestamp sang `DiagnosisResult`.
- Hỗ trợ tải lịch sử, lấy chi tiết và xóa prediction có JWT.

Mã nguồn: `frontend/src/services/predictionApi.ts`.

## 4. Luồng trải nghiệm hoàn chỉnh

1. Người dùng mở landing page giới thiệu LeafAI.
2. Người dùng đăng nhập hoặc đăng ký; form kiểm tra dữ liệu trước khi gọi API.
3. Đăng nhập yêu cầu CAPTCHA demo; đăng ký yêu cầu chấp nhận điều khoản.
4. Sau xác thực, màn hình logo LeafAI xoay và tách lá trước khi vào ứng dụng.
5. Người dùng chọn, kéo thả hoặc chụp ảnh lá cây.
6. Frontend validation định dạng và dung lượng, sau đó hiển thị preview.
7. Khi nhấn phân tích, UI chuyển lần lượt qua Uploading và Analyzing.
8. Backend response được mapping và hiển thị tại trạng thái Success.
9. Nếu lỗi, UI hiển thị thông báo và cho phép retry mà không mất ảnh.
10. Kết quả được đưa vào lịch sử để xem chi tiết, xuất báo cáo hoặc xóa.

## 5. UI/UX đã hoàn thiện

- Landing page và hero giới thiệu sản phẩm.
- Trang chủ với banner cây trồng và CTA chẩn đoán.
- Màn hình kiểm tra lá với upload zone, scan state và result panel.
- Danh mục cây trồng, bệnh thường gặp và trang chi tiết.
- Mẫu đã lưu với tìm kiếm, lọc, grid/list và modal chi tiết.
- Trang về dự án và phần giải thích AI/Grad-CAM.
- Dashboard hồ sơ với thống kê từ lịch sử thật.
- Navbar desktop, navigation mobile, toast và các modal thao tác.
- Giao diện đồng nhất màu xanh nông nghiệp Việt Nam và responsive từ 320 px.

## 6. Xác thực file và trạng thái lỗi

`frontend/src/utils/imageFileValidation.ts` xử lý:

- Chấp nhận JPEG, PNG và WEBP.
- Từ chối file rỗng.
- Từ chối định dạng không hỗ trợ.
- Từ chối file lớn hơn 15 MB.
- Trả lỗi thân thiện để UI hiển thị mà không crash.

Prediction flow xử lý thêm lỗi mạng, timeout, hủy request, response sai contract và lỗi HTTP từ Backend.

## 7. Kiểm thử

Kết quả chạy ngày 2026-09-28:

```text
Test Files  6 passed (6)
Tests       20 passed (20)
```

Backend hỗ trợ luồng prediction cũng được xác minh cùng ngày: **8/8 unit tests** và **5/5 integration tests** đều đạt. Integration test sử dụng PostgreSQL Testcontainers và fake image/AI services để kiểm tra API cùng persistence mà không gọi dịch vụ cloud bên ngoài.

Phạm vi test:

- Unit test validation file.
- Unit test Prediction API client và mapping response.
- Integration test preview, thay ảnh và xóa ảnh.
- Integration test Uploading → Analyzing → Success.
- Integration test Error → Retry.
- Test abort request khi component unmount.
- Test CTA landing page.
- Test mode đăng ký, CAPTCHA và điều khoản.
- Test hiệu ứng logo tách trước khi vào app.

Lệnh xác minh:

```powershell
cd frontend
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## 8. Đánh giá Definition of Done

Frontend demo đáp ứng toàn bộ acceptance criteria AGRI-47 đến AGRI-56 và không hard-code prediction result trong UI. Task được xem là hoàn thành trong phạm vi demo; các hạng mục CAPTCHA server-side, model AI production và kiểm thử E2E toàn hệ thống được ghi nhận là follow-up, không phải kết quả đã hoàn tất.
