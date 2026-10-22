# AGRI-128 — Nhật ký Thực hiện Backend Improvement

Nhánh: `AGRI-128-backend-improvement`  
Bắt đầu: 2026-10-18.  
Mục tiêu: Xây dựng pipeline cải tiến backend toàn diện theo 10 task nghiệp vụ S3-01 -> S3-10 từ Sprint 3 Backlog (`writing-block.md`).

---

## 2026-10-18 — Đối chiếu Backlog S3-01 -> S3-10 và Chuẩn hóa Pipeline

- Đã đọc và phân tích toàn bộ 10 task trong `writing-block.md` (EPIC A đến EPIC E).
- Phát hiện các khoảng trống kỹ thuật trong backend hiện tại so với yêu cầu backlog:
  - S3-01: Thiếu API `LogoutAsync`, chưa kiểm tra cờ `is_active` khi login, chưa quản lý phiên `user_sessions`.
  - S3-02: Chưa có API xem/cập nhật thông tin tài khoản và đổi mật khẩu an toàn.
  - S3-03: Bảng `agricultural_profiles` đã có nhưng chưa có Repositories, Services, Controllers.
  - S3-04: Đã có API suy luận AI 1 ảnh, cần giữ vững quy tắc snapshot JSONB bất biến và cảnh báo khi confidence <= 80%.
  - S3-05: Cần bảo đảm luồng Guest không lưu lịch sử, không tạo hồ sơ, không upload cloud storage.
  - S3-06: Chẩn đoán cần nhận `agriculturalProfileId` tùy chọn và gắn kết quả vào hồ sơ.
  - S3-07: Cần xây dựng bộ lọc lịch sử thông minh đa tiêu chí tại database (cây, bệnh, hồ sơ, khoảng ngày) với phân trang và sắp xếp ổn định.
  - S3-08: Thiếu API quản trị danh sách người dùng, kích hoạt/vô hiệu hóa và ghi nhật ký vào `admin_audit_logs`.
  - S3-09: Thiếu API quản lý thuốc BVTV và tài liệu tri thức (ràng buộc kiểm duyệt `is_approved`, `is_public` và đối soát nhãn).
  - S3-10: Cần tích hợp Cố vấn Canh tác AI (ChatGPT / OpenAI API) kết hợp dữ liệu tri thức nông nghiệp Việt Nam, hỗ trợ fallback khi không có API key.
- Đã hoàn thiện tài liệu kế hoạch pipeline chuẩn hóa tại [`docs/plans/AGRI-128-backend-improvement-plan.md`](../plans/AGRI-128-backend-improvement-plan.md).

---

## 2026-10-19 — Triển khai 4 Task: S3-01, S3-02, S3-07, S3-08

### S3-01 — User Authentication & Session Management
- **Commit:** `5e75449` (`feat(auth): AGRI-128 implement user logout and session management (S3-01)`)
- **Nội dung thay đổi:**
  - `IUserSessionRepository` & `UserSessionRepository`: Thao tác với bảng `user_sessions`.
  - Cập nhật `AuthService`: Kiểm tra `user.IsActive` khi đăng nhập (quăng lỗi nếu bị vô hiệu hóa), tạo bản ghi phiên `UserSession` khi login thành công, thêm hàm `LogoutAsync` thu hồi tất cả phiên đang hoạt động của người dùng.
  - Endpoint `POST /api/auth/logout` được bảo vệ bằng `[Authorize]`.
  - Kiểm thử đơn vị: 3 bài test mới trong `AuthServiceTests` (tài khoản vô hiệu hóa, lưu phiên, đăng xuất thu hồi phiên).

### S3-02 — User Profile & Password Management
- **Commit:** `fc71a57` (`feat(user): AGRI-128 implement profile and password management (S3-02)`)
- **Nội dung thay đổi:**
  - DTOs: `UserProfileDto`, `UpdateProfileRequest`, `ChangePasswordRequest`.
  - Service `UserService`: Lấy thông tin cá nhân, cập nhật họ tên, đổi mật khẩu an toàn (xác thực mật khẩu hiện tại bằng BCrypt, kiểm tra trùng khớp xác nhận, cấm dùng lại mật khẩu cũ, hash mật khẩu mới, cập nhật `UpdatedAt`, thu hồi toàn bộ session đang active).
  - Controller `UsersController`: `GET /api/users/profile`, `PUT /api/users/profile`, `POST /api/users/change-password`.
  - Kiểm thử đơn vị: 8 bài test trong `UserServiceTests`.

### S3-07 — Smart Diagnosis History Filtering & Search
- **Commit:** `fff7efc` (`feat(prediction): AGRI-128 add smart history filtering and search (S3-07)`)
- **Nội dung thay đổi:**
  - DTO: `PredictionFilterParams` hỗ trợ lọc theo `AgriculturalProfileId`, `PlantId`, `DiseaseId`, `FromDate`, `ToDate`, `PageNumber`, `PageSize`.
  - Repository `PredictionRepository`: Bổ sung `GetFilteredByUserIdAsync` lọc trực tiếp tại PostgreSQL với EF Core, sắp xếp `CreatedAt DESC, Id DESC`, phân trang `Skip/Take`.
  - Service `PredictionService`: Bổ sung `GetFilteredHistoryAsync`, tái sử dụng `ReadStoredResult` để đảm bảo snapshot JSONB bất biến.
  - Controller `PredictionsController`: Nâng cấp endpoint `GET /api/predictions/history` nhận `[FromQuery] PredictionFilterParams`.
  - Kiểm thử đơn vị: 2 bài test trong `PredictionServiceTests` (lọc theo cây/bệnh, lọc theo khoảng thời gian).

### S3-08 — Admin Account & Role Management
- **Commit:** `2230dbc` (`feat(admin): AGRI-128 implement admin user management and audit logging (S3-08)`)
- **Nội dung thay đổi:**
  - DTOs: `AdminUserListItemDto`, `AdminUserFilterParams`, `UpdateUserStatusRequest`, `UpdateUserRoleRequest`, `AdminAuditLogDto`.
  - Repository `IAdminAuditLogRepository` & `AdminAuditLogRepository`: Lưu và truy vấn lịch sử thao tác admin từ bảng `admin_audit_logs`.
  - Cập nhật `IUserRepository` & `UserRepository`: Bổ sung `GetPagedUsersAsync` tìm kiếm theo họ tên/email, lọc vai trò, trạng thái kích hoạt, đếm số lần chẩn đoán.
  - Service `AdminUserService`:
    - `GetUsersAsync`: Lọc, tìm kiếm và phân trang người dùng.
    - `GetUserByIdAsync`: Xem chi tiết tài khoản.
    - `SetUserStatusAsync`: Kích hoạt/vô hiệu hóa, thu hồi toàn bộ session khi vô hiệu hóa, ghi audit log, ngăn admin tự vô hiệu hóa chính mình.
    - `SetUserRoleAsync`: Điều chỉnh quyền (`User`/`Admin`), ghi audit log, ngăn admin tự tước quyền của chính mình.
    - `GetAuditLogsAsync`: Xem danh sách nhật ký kiểm toán quản trị.
  - Controller `AdminUsersController`: `api/admin/users` được bảo vệ bằng `[Authorize(Roles = UserRole.Admin)]`.
  - Kiểm thử đơn vị: 11 bài test trong `AdminUserServiceTests`.

### Kết quả kiểm thử tổng thể
- Toàn bộ 57/57 unit tests passed (`dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`).
- Project `AgriVision.IntegrationTests` build thành công với 0 lỗi, 0 cảnh báo.

## 2026-10-21 — Hồ sơ nông nghiệp: S3-03 và chọn hồ sơ S3-06

Ghi chú định danh bổ sung: người dùng sau đó xác nhận Jira của phần hồ sơ là
**AGRI-116**. Phần dưới giữ nhật ký đợt triển khai trên nhánh nền; bàn giao ở
[task log AGRI-116](../AGRI-116/AGRI-116-agricultural-profile.md), không coi tên
nhánh nền AGRI-128 là Jira của task hồ sơ.

- Yêu cầu: hoàn thiện phần backend của quản lý hồ sơ; giao diện ngoài phạm vi.
  Nhánh đã xác minh: `AGRI-128-backend-improvement`. Không commit/push/tạo PR hoặc
  thay đổi trạng thái Jira trong đợt này.
- Đọc README, quy tắc project/directory, command guides backend/database, schema và
  migration, Docker/CI pipeline, kế hoạch và implementation rules AGRI-128. Giữ quy
  tắc hồ sơ tùy chọn: tên 1–150 ký tự sau trim, mô tả/ghi chú canh tác tùy chọn;
  cây/bệnh theo từng kết quả, không thêm cột cây cố định hoặc sửa schema.
- Thêm DTO, `IAgriculturalProfileRepository`/repository, service/interface và
  `AgriculturalProfilesController` cho 5 route CRUD `api/agricultural-profiles`.
  Owner từ JWT; không cho đổi owner; người khác kể cả Admin nhận 404. List đọc
  `AsNoTracking`, sort thời gian/ID ổn định, count prediction tính ở DB.
- Bổ sung multipart `AgriculturalProfileId` tùy chọn vào prediction request,
  kiểm tra sở hữu trước AI/storage; Guest chọn hồ sơ nhận 401. Lưu FK trong cùng
  lần SaveChanges với prediction/ảnh/top-K/snapshot. Không chọn vẫn giữ hành vi cũ.
  DTO kết quả/history phản ánh FK hiện tại; snapshot lịch sử không bị sửa khi xóa hồ sơ.
- Xóa hồ sơ dùng FK `SET NULL` đã có: giữ prediction, top-K, snapshot và metadata ảnh,
  giữ TTL 30 ngày, không gọi xóa storage. Tái sử dụng filter history S3-07.
- Source mới tại `backend/src/{AgriVision.API/Controllers,AgriVision.Application/DTOs/AgriculturalProfile,
  AgriVision.Application/Common/Interfaces/Persistence,AgriVision.Application/Services,
  AgriVision.Infrastructure/Persistence/Repositories}`; cập nhật DI và prediction
  controller/DTO/interface/service. Thêm unit và HTTP/PostgreSQL tests trong hai
  project test hiện có. Không thay frontend, AI, migration, EF snapshot hoặc CI.
- TDD: 16 integration tests mới fail trước triển khai rồi 16/16 pass sau triển khai.
  Lần chạy đầu testhost aborted vì host thiếu runtime .NET 9; sau đó dùng runtime
  Microsoft ASP.NET Core 9.0.21 đã xác minh SHA-512, đặt local trong cache. Build
  vẫn target net9.0 với SDK 10.0.401; không đổi dependency/target framework dự án.
- Kiểm chứng mới: **79/79 unit + 99/99 integration pass**, failed/skipped 0 trong
  suite được chạy; filter loại `Category=RealCheckpoint`. Backend branch coverage
  **308/500 = 61,60%**, gate 60% PASS, target 80% chưa đạt. Build 0 warning/error;
  `git diff --check` pass. Unit TRX đã lưu lại riêng vì TRX chung bị integration ghi đè.
- PostgreSQL thật qua Testcontainers tạm, AI/storage fake; không nghiệm thu
  checkpoint/storage thật hoặc GitHub Actions. Không chạy test frontend/Python.
  Giữ nguyên các thay đổi cục bộ notebook/AI/Compose đã tồn tại trước công việc.
- [Báo cáo kỹ thuật và lệnh/artifact cụ thể](../../reports/AGRI-116/agricultural_profiles.md),
  [entry point AGRI-116](../../reports/AGRI-116/README.md). UI nằm ngoài phạm vi;
  backend S3-03 và chọn hồ sơ S3-06 hoàn tất trong phạm vi đã kiểm chứng.



---

## 2026-10-22 — Đồng bộ Remote và Sửa Lỗi Biên dịch Chữ ký PredictAsync

- Đồng bộ nhánh `AGRI-128-backend-improvement` với remote qua fast-forward (các commit từ PR #36 và PR #38).
- Phát hiện lỗi biên dịch CS1503 trong `backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs` do xung đột vị trí tham số `Guid? agriculturalProfileId` mới thêm ở PR #38 và `CancellationToken cancellationToken` ở PR #36.
- Khắc phục: truyền `cancellationToken: cancellation.Token` bằng named argument trong test `CancelledGuestUpload_ShouldNotInvokeAiOrStoreData`.
- Kiểm chứng: `dotnet build` 0 warning / 0 error; 82/82 backend unit tests passed.
