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

