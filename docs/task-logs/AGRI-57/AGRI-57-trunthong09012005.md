# AGRI-57 — Hoàn thiện frontend demo và tích hợp Backend

- **Owner:** trunthong09012005
- **Completion date:** 2026-09-28
- **Branch:** `AGRI-57-frontend-summary`
- **Pull request:** Chưa tạo

## 1. Completed Work

- Chuyển frontend từ React/Vite sang Next.js 16, React 19 và pnpm; bổ sung cấu hình build, test và biến môi trường.
- Hoàn thiện toàn bộ luồng chọn ảnh, preview, validation, upload, phân tích, hiển thị kết quả, retry và xử lý lỗi từ Backend API.
- Kết nối đăng ký, đăng nhập, khôi phục phiên, JWT, danh mục cây/bệnh và lịch sử dự đoán với ASP.NET Core Backend.
- Nâng cấp giao diện giới thiệu, trang chủ, kiểm tra lá, cây trồng, bệnh thường gặp, mẫu đã lưu, về dự án và hồ sơ theo một hệ thống thiết kế LeafAI thống nhất.
- Bổ sung responsive UI, màn hình chào sau đăng nhập, CAPTCHA demo, điều khoản sử dụng và bộ unit/integration test frontend.

## 2. Main Changes

### Các sub-task đã thực hiện

| Jira | Hạng mục | Kết quả |
|---|---|---|
| AGRI-44 | Demo UX/UI | Hoàn thiện hệ thống giao diện LeafAI và luồng demo trực quan. |
| AGRI-47 | Tạo project frontend | Chuyển sang Next.js 16, React 19, TypeScript, Tailwind CSS 4 và pnpm. |
| AGRI-48 | Xây dựng màn hình upload | Hỗ trợ chọn file, kéo thả, mở camera và thay ảnh. |
| AGRI-49 | Image preview | Preview đúng ảnh đã chọn, hiển thị metadata và cho phép xóa/chọn lại. |
| AGRI-50 | Validation file | Kiểm tra JPEG/PNG/WEBP, file rỗng và giới hạn 15 MB mà không làm crash UI. |
| AGRI-51 | Prediction API client | Xây dựng client multipart, upload progress, timeout, abort và kiểm tra response contract. |
| AGRI-52 | Kết nối Backend Demo | Mapping với ASP.NET API, JWT Bearer, trường multipart `file` và DTO dự đoán thật. |
| AGRI-53 | Hiển thị prediction result | Hiển thị cây, bệnh, confidence, ảnh, Top-K và trạng thái sức khỏe. |
| AGRI-54 | Xử lý loading/error | Hoàn thiện Idle, Uploading, Analyzing, Success, Error và retry. |
| AGRI-55 | Responsive UI | Tối ưu desktop, tablet, mobile và thanh điều hướng di động. |
| AGRI-56 | Demo flow hoàn chỉnh | Luồng từ landing page → xác thực → vào app → phân tích → lưu/xem lại kết quả hoạt động hoàn chỉnh. |

### Nâng cấp bổ sung

- Landing page giới thiệu sản phẩm với nhận diện LeafAI và CTA đăng nhập/đăng ký.
- Form đăng nhập/đăng ký kết nối API thật, lưu phiên theo lựa chọn người dùng và khôi phục bằng `/api/auth/me`.
- CAPTCHA nhập tay ở đăng nhập; checkbox bắt buộc và nội dung điều khoản sở hữu trí tuệ ở đăng ký.
- Màn hình đăng nhập thành công với logo tròn, hiệu ứng xoay và tách lá trước khi vào ứng dụng.
- Dashboard hồ sơ với dữ liệu lịch sử thật, tỷ lệ lá khỏe/bệnh, cây kiểm tra nhiều nhất và trạng thái hệ thống.
- Làm mới các trang cây trồng, bệnh thường gặp, mẫu đã lưu và giới thiệu AI; dùng tài nguyên nội bộ, không phụ thuộc ảnh nóng từ nguồn ngoài.
- Dọn các comment thiết kế cũ không liên quan đến nhận diện LeafAI.

## 3. Results and Verification

- **TypeScript:** `corepack pnpm lint` → PASS, không có lỗi type.
- **Automated tests:** `corepack pnpm test` → **20/20 PASS**, 6/6 test files.
- **Production build:** `corepack pnpm build` → PASS, Next.js tạo static route `/` thành công.
- **Backend unit tests:** `dotnet test tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore` → **8/8 PASS**.
- **Backend integration tests:** `dotnet test tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore` → **5/5 PASS** với PostgreSQL Testcontainers.
- **Diff validation:** `git diff --check` → không có lỗi whitespace; chỉ có cảnh báo chuyển LF sang CRLF trên Windows.
- **Happy path:** upload ảnh hợp lệ → preview → uploading → analyzing → nhận JSON Backend → hiển thị kết quả.
- **Error path:** chặn file sai loại/quá dung lượng/rỗng; hiển thị lỗi Backend; retry giữ lại ảnh; abort request khi unmount.

Các test chính:

- `frontend/src/utils/imageFileValidation.test.ts`
- `frontend/src/services/predictionApi.test.ts`
- `frontend/src/views/DiagnosePage.integration.test.tsx`
- `frontend/src/views/IntroPage.test.tsx`
- `frontend/src/components/modals/LoginModal.test.tsx`
- `frontend/src/components/common/LoginSuccessScreen.test.tsx`

## 4. Issues or Blockers

- CAPTCHA hiện được kiểm tra ở frontend, phù hợp demo nhưng chưa phải cơ chế chống bot production; cần endpoint xác minh phía server hoặc dịch vụ CAPTCHA chuyên dụng.
- Kết quả cuối phụ thuộc Backend ASP.NET và AI service đang hoạt động đúng cấu hình `NEXT_PUBLIC_API_BASE_URL`.
- Grad-CAM hiện có phần trực quan hóa giao diện; chất lượng heatmap production phụ thuộc dữ liệu trả về từ model AI thật.

## 5. Remaining Work or Follow-up

- Tạo Pull Request từ `AGRI-57-frontend-summary` và gán reviewer frontend theo quy định dự án.
- Chạy kiểm thử E2E với đầy đủ PostgreSQL, ASP.NET Backend, Cloudinary và AI service trong môi trường tích hợp.
- Chuyển CAPTCHA sang xác minh phía server trước khi triển khai production.
- Nhờ pháp lý rà soát nội dung Điều khoản sử dụng và Chính sách quyền riêng tư trước khi phát hành công khai.
