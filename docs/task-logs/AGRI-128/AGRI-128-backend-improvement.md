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

- Phát hiện lỗi test CI trong `GuestPredictionsControllerTests.GuestPrediction_ShouldReturnFullResult_WithoutStorageOrChangesToUserHistory`: bài test từ PR #36 gửi `agriculturalProfileId` trong form data của request Guest và kỳ vọng 200 OK, trong khi quy tắc nghiệp vụ AGRI-116 (PR #38) quy định Guest gửi `agriculturalProfileId` phải bị từ chối 401 Unauthorized (đã được kiểm thử tại `Guest_CannotSelectProfileForDiagnosis`).
- Khắc phục: loại bỏ `agriculturalProfileId` khỏi request chẩn đoán khách vãng lai trong `GuestPredictionsControllerTests.cs`, giữ nguyên kiểm thử gửi `userId` không làm biến đổi phiên thành bản ghi lưu.
- Kiểm chứng: `dotnet build` 0 warning / 0 error; 82/82 unit tests passed.

---

## 2026-10-22 — Khắc phục 3 Vấn đề Bảo mật & Toàn vẹn Dữ liệu Backend (P1/P2)

### 1. [P2] Incorrect prediction count: `GetUserByIdAsync` trả về 0 do navigation property chưa nạp
- **Nguyên nhân:** Trong `AdminUserService.GetUserByIdAsync`, `SetUserStatusAsync`, `SetUserRoleAsync`, hệ thống gọi `MapToDto(User u, int predictionCount)` nhưng trước đó đọc `u.Predictions?.Count ?? 0`. Entity `User` được truy vấn bằng `GetByIdAsync` không `Include(u => u.Predictions)`, dẫn đến collection luôn null và `predictionCount` luôn bằng 0.
- **Khắc phục:**
  - Tiêm `IPredictionRepository` vào `AdminUserService`.
  - Thay thế việc đếm navigation property bằng truy vấn count trực tiếp tại database: `await _predictionRepository.GetCountByUserIdAsync(userId, cancellationToken)`.
  - Bổ sung unit test trong `AdminUserServiceTests` xác minh `PredictionCount` phản ánh đúng số lượng từ repository.

### 2. [P1] Session revocation is not enforced: JWT vẫn hợp lệ sau logout, đổi mật khẩu, vô hiệu hóa tài khoản hoặc hạ quyền Admin
- **Nguyên nhân:** ASP.NET Core `AddJwtBearer` chỉ kiểm tra chữ ký HMAC và thời gian hết hạn của JWT, không xác thực trạng thái session, trạng thái tài khoản `is_active` hay vai trò người dùng trong quá trình xử lý request. Do đó, các JWT đã cấp vẫn có hiệu lực cho đến khi hết hạn (24h) ngay cả khi người dùng đã logout, đổi mật khẩu hoặc bị admin khóa/hạ quyền.
- **Khắc phục:**
  - Cập nhật `IJwtTokenGenerator` & `JwtTokenGenerator`: hỗ trợ nhúng claim `sid` (Session ID) vào JWT payload.
  - Cập nhật `AuthService.RegisterAsync` & `LoginAsync`: tự động tạo bản ghi `UserSession` và truyền `session.Id` vào token generator.
  - Cập nhật `AdminUserService.SetUserRoleAsync`: thu hồi toàn bộ session (`_userSessionRepository.RevokeAllSessionsByUserIdAsync`) khi vai trò người dùng bị thay đổi.
  - Cấu hình sự kiện `JwtBearerEvents.OnTokenValidated` trong `Program.cs`:
    1. Kiểm tra tài khoản tồn tại và `user.IsActive == true`. Nếu bị vô hiệu hóa hoặc không tồn tại -> từ chối (`context.Fail`).
    2. Kiểm tra vai trò trong token khớp với vai trò thực tế trong database (`user.Role`). Nếu vai trò bị thay đổi/hạ quyền -> từ chối (`context.Fail`).
    3. Xác thực session qua claim `sid`: kiểm tra bản ghi session trong `user_sessions` chưa bị thu hồi (`RevokedAt == null`) và chưa quá hạn (`ExpiresAt > DateTime.UtcNow`).
    4. Cơ chế tương thích ngược (fallback) cho token không có `sid`: từ chối nếu toàn bộ session của user đã bị thu hồi.
  - Bổ sung unit tests cho `JwtTokenGenerator` (kiểm tra claim `sid`), `AuthService` (kiểm tra tạo session khi register/login), `AdminUserService` (kiểm tra thu hồi session khi đổi role).

### 3. [P2] Concurrent updates can overwrite security fields: Cập nhật thông tin cá nhân ghi đè toàn bộ entity User
- **Nguyên nhân:** `UserService.UpdateProfileAsync` lấy đối tượng `User` rồi gọi `_userRepository.UpdateAsync(user)`, bên trong `UserRepository.UpdateAsync` gọi `_context.Users.Update(user)` đánh dấu toàn bộ thuộc tính ở trạng thái `Modified`. Nếu một thao tác quản trị viên (đổi vai trò, khóa tài khoản) hoặc đổi mật khẩu diễn ra đồng thời, việc lưu lại đối tượng User cũ sẽ ghi đè các trường bảo mật nhạy cảm (`role`, `is_active`, `password_hash`).
- **Khắc phục:**
  - Thêm phương thức `UpdateProfileAsync(Guid userId, string fullName, DateTime updatedAt)` trong `IUserRepository` và triển khai tại `UserRepository` sử dụng `ExecuteUpdateAsync` của EF Core, chỉ tác động duy nhất lên 2 cột `FullName` và `UpdatedAt` tại database.
  - Bổ sung bảo vệ trong `UserRepository.UpdateAsync`: chỉ cập nhật nếu entity chưa được theo dõi bởi DbContext nhằm tránh vô tình ghi đè toàn bộ thuộc tính.
  - Cập nhật `UserService.UpdateProfileAsync` gọi `_userRepository.UpdateProfileAsync` và đọc lại entity để trả về response.
  - Cập nhật unit test `UserServiceTests`: xác minh `UpdateProfileAsync` chỉ gọi phương thức cập nhật riêng lẻ, không gọi `UpdateAsync`.

### Kết quả kiểm thử
- `dotnet build backend/AgriVision.sln`: Thành công, 0 warning, 0 error.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`: **85/85 unit tests passed (100%)**.

---

## 2026-10-23 — Siết Chặt Thu Hồi Phiên (Từ Chối Token Thiếu/Sai sid) & Bổ Sung HTTP Tests

- **Vấn đề phát hiện:** Cơ chế fallback cũ trong `JwtBearerEvents.OnTokenValidated` chấp nhận token không có claim `sid` nếu user có ít nhất một session chưa bị thu hồi trong database (`userSessions.All(s => s.RevokedAt != null) == false`). Khi user đăng nhập lại trên thiết bị/trình duyệt khác, một session mới được tạo ra khiến token cũ không có `sid` vô tình được chấp nhận trở lại, vi phạm nguyên tắc Session Revocation nghiêm ngặt.
- **Khắc phục:**
  - Trong `Program.cs`: Loại bỏ hoàn toàn nhánh fallback. Bắt buộc mọi JWT phải chứa claim `sid` hợp lệ (`Guid.TryParse(sidClaim, out var sessionId)`). Token thiếu hoặc sai định dạng `sid` bị từ chối ngay lập tức (`context.Fail`), yêu cầu người dùng đăng nhập lại.
  - Bản ghi session tương ứng trong `user_sessions` phải tồn tại, thuộc về chính `userId`, chưa bị thu hồi (`RevokedAt == null`), và chưa hết hạn (`ExpiresAt > DateTime.UtcNow`).
- **Bổ sung HTTP Integration Tests (`SecurityAuthorizationTests.cs`):**
  - Mở rộng `ProtectedEndpoints_ShouldRejectInvalidBearer` bao phủ thêm 2 biến thể: `"missing-sid"` (token hợp lệ nhưng thiếu claim `sid`) và `"nonexistent-sid"` (token có claim `sid` nhưng không tồn tại trong DB).
  - Thêm `LegacyTokenWithoutSid_ShouldBeRejected_EvenWhenNewActiveSessionExists`: Đăng ký tài khoản, đăng nhập tạo thêm session mới, sau đó gửi request HTTP với token cũ không có `sid` $\rightarrow$ xác nhận nhận mã 401 Unauthorized.
  - Thêm `SessionRevocation_AfterLogout_ShouldRejectSubsequentRequestsWithSameToken`: Xác minh token hợp lệ gửi request 200 OK, sau khi gọi `POST /api/auth/logout` (nhận mã 204 NoContent chuẩn theo API) thì gửi lại request với cùng token đó nhận mã 401 Unauthorized.
  - Thêm `SessionRevocation_AfterUserDeactivation_ShouldRejectSubsequentRequests`: Xác minh vô hiệu hóa tài khoản khiến request tiếp theo của token bị từ chối 401 Unauthorized ngay lập tức.
  - Thêm `SessionRevocation_AfterRoleChange_ShouldRejectSubsequentRequests`: Xác minh thay đổi vai trò trong database khiến request với token cũ bị từ chối 401 Unauthorized ngay lập tức.
- **Khắc phục test CI:** Cập nhật kiểm tra mã phản hồi của endpoint `POST /api/auth/logout` trong bài test từ `200 OK` thành `204 NoContent` theo đúng thiết kế của `AuthController.Logout`.
- **Kiểm chứng:**
  - `dotnet build backend/AgriVision.sln`: Thành công, 0 warning, 0 error.
  - `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`: **85/85 unit tests passed (100%)**.

---

## 2026-10-23 — Xử Lý 4 Vấn Đề Review: Transaction, Timezone & Validation Họ Tên

### 1. Transaction cho Đổi mật khẩu và Thu hồi phiên
- **Vấn đề:** Trong `UserService.ChangePasswordAsync`, cập nhật password hash trước khi thu hồi phiên. Nếu request bị hủy hoặc thao tác thu hồi lỗi, mật khẩu đã đổi nhưng phiên cũ vẫn hoạt động.
- **Khắc phục:** Tạo `IUnitOfWork` và `UnitOfWork` bọc cả hai thao tác `_userRepository.UpdateAsync` và `_userSessionRepository.RevokeAllSessionsByUserIdAsync` trong một transaction (`ExecuteInTransactionAsync`), bảo đảm cùng thành công hoặc cùng rollback.

### 2. Transaction cho Thao tác Admin và Audit Log
- **Vấn đề:** Trong `AdminUserService.SetUserStatusAsync` và `SetUserRoleAsync`, trạng thái/vai trò được lưu trước khi ghi audit log. Nếu ghi log thất bại, dữ liệu người dùng đã đổi mà thiếu log truy vết.
- **Khắc phục:** Bọc cập nhật trạng thái/vai trò, thu hồi phiên và ghi `AdminAuditLog` trong một transaction nguyên tử qua `_unitOfWork.ExecuteInTransactionAsync`.

### 3. Chuẩn hóa Timezone cho Bộ lọc Ngày
- **Vấn đề:** `PredictionRepository.GetFilteredByUserIdAsync` truyền trực tiếp `FromDate` / `ToDate` dạng `DateTimeKind.Unspecified` xuống cột `timestamptz` của PostgreSQL, dẫn đến lỗi Npgsql không tương thích kiểu dữ liệu.
- **Khắc phục:**
  - Chuẩn hóa `FromDate` và `ToDate` về UTC (`DateTimeKind.Utc`) thông qua hàm chuyển đổi `ToUtc` trước khi bind query EF Core.
  - Thêm xác thực logic `FromDate <= ToDate` trong `PredictionService.GetFilteredHistoryAsync`, quăng `ArgumentException` nếu khoảng ngày không hợp lệ.

### 4. Giới hạn độ dài Họ tên khi Cập nhật Profile (Tối đa 60 ký tự)
- **Vấn đề:** `UserService.UpdateProfileAsync` chỉ kiểm tra rỗng, chưa kiểm tra giới hạn độ dài họ tên.
- **Khắc phục:** Thêm kiểm tra `trimmedName.Length > 60` quăng `ArgumentException` với thông báo `"Họ và tên không được vượt quá 60 ký tự."` để API trả về mã lỗi 400 Bad Request hợp lệ.

### 5. Bổ sung Integration Tests cho Rollback Transaction & Lọc ngày không Timezone
- **Rollback Transaction trên PostgreSQL thật:** Bổ sung `UnitOfWork_ShouldRollbackAllOperations_WhenExceptionThrownMidTransaction` trong `DatabaseImprovementTests.cs` kiểm chứng việc cập nhật user bị rollback hoàn nguyên khi xảy ra lỗi giữa chừng trong transaction, session không bị thu hồi.
- **Lọc ngày không timezone trên PostgreSQL thật:** Bổ sung `PredictionRepository_ShouldFilterByUnspecifiedDateTimeKind_WithoutTimezoneException` trong `DatabaseImprovementTests.cs` kiểm chứng truy vấn với `DateTimeKind.Unspecified` thực thi trơn tru với cột `timestamptz`.
- **HTTP Integration Tests:**
  - `SecurityAuthorizationTests.cs`: Thêm `UpdateProfile_ShouldRejectNameExceeding60Characters` kiểm tra HTTP PUT profile từ chối tên 61 ký tự (400 Bad Request) và chấp nhận tên 60 ký tự (200 OK).
  - `PredictionsControllerTests.cs`: Thêm `GetFilteredHistory_WithUnspecifiedTimezoneQueryParams_ShouldSucceed` kiểm tra query param ngày không timezone và `GetFilteredHistory_ShouldReturnBadRequest_WhenFromDateGreaterThanToDate`.

### Kết quả kiểm thử
- `dotnet build backend/AgriVision.sln`: Thành công, 0 warning, 0 error.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`: **88/88 unit tests passed (100%)**.

---

## 2026-10-23 — Sửa 3 Vấn Đề Auth Của PR #42 & Bổ Sung Test Hồi Quy (TDD)

### 1. Logout chỉ thu hồi phiên hiện tại
- **Vấn đề:** Trước đây `AuthService.LogoutAsync(userId)` gọi `RevokeAllSessionsByUserIdAsync`, làm thu hồi toàn bộ các phiên hoạt động khác của người dùng khi chỉ đăng xuất trên một thiết bị.
- **Khắc phục:**
  - Controller `AuthController.Logout`: Trích xuất `userId` và `sid` từ JWT đã xác thực; nếu thiếu hoặc sai định dạng claim `sid` thì từ chối ngay với mã `401 Unauthorized`.
  - Thay đổi chữ ký `IAuthService.LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)`.
  - Thêm phương thức `IUserSessionRepository.RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)`. Triển khai tại `UserSessionRepository` bằng một câu lệnh `ExecuteUpdateAsync` duy nhất với điều kiện `s.UserId == userId && s.Id == sessionId && s.RevokedAt == null`. Tránh ghi đè thời điểm `RevokedAt` khi có 2 request logout đồng thời và ngăn chặn sửa phiên của tài khoản khác.
  - Phản hồi endpoint giữ nguyên mã thành công `204 NoContent`. Token bị thu hồi bị middleware từ chối bằng `401 Unauthorized`.
  - Đổi mật khẩu, khóa tài khoản và đổi quyền admin vẫn giữ nguyên việc thu hồi mọi phiên (`RevokeAllSessionsByUserIdAsync`).

### 2. Đồng bộ login với đổi mật khẩu (Loại bỏ Race Condition)
- **Vấn đề:** Khi login và đổi mật khẩu diễn ra đồng thời trên cùng tài khoản, login có thể cấp token bằng mật khẩu cũ sau khi đổi mật khẩu hoàn tất, hoặc token mới tạo không bị thu hồi.
- **Khắc phục:**
  - Thêm `GetByIdForUpdateAsync(Guid id, ...)` và `GetByEmailForUpdateAsync(string email, ...)` vào `IUserRepository` và `UserRepository`, thực thi câu lệnh SQL tham số hóa `SELECT ... FOR UPDATE` khóa hàng user ở mức PostgreSQL `ReadCommitted`.
  - `AuthService.LoginAsync`: Mở transaction qua `IUnitOfWork.ExecuteInTransactionAsync`, đọc và khóa user bằng `GetByEmailForUpdateAsync`, xác thực mật khẩu BCrypt và trạng thái `IsActive`, tạo phiên và phát hành token bên trong transaction, chỉ commit khi hoàn tất.
  - `UserService.ChangePasswordAsync`: Thực hiện validation DTO trước transaction; bên trong transaction đọc và khóa user bằng `GetByIdForUpdateAsync`, xác thực mật khẩu hiện tại, cập nhật hash mật khẩu mới, cập nhật `UpdatedAt` và thu hồi toàn bộ phiên qua `RevokeAllSessionsByUserIdAsync`.
  - Kết quả: Thao tác nào vào trước sẽ giữ khóa hàng; thao tác sau phải chờ ở tầng database. Nếu đổi mật khẩu trước, login bằng mật khẩu cũ bị từ chối 401. Nếu login trước, phiên mới cấp sẽ bị thao tác đổi mật khẩu thu hồi ngay sau đó.

### 3. Đăng ký nguyên tử (Atomic Registration)
- **Vấn đề:** Trước đây việc tạo user, tạo session và tạo token diễn ra rời rạc không qua transaction. Nếu lưu session lỗi hoặc tạo token thất bại, bản ghi user đã tồn tại trong DB, dẫn đến rác dữ liệu và không thể đăng ký lại cùng email.
- **Khắc phục:**
  - Tiêm `IUnitOfWork` vào `AuthService`.
  - Bọc việc tạo user, tạo session và phát hành JWT token trong cùng transaction `_unitOfWork.ExecuteInTransactionAsync`. Chỉ trả về `AuthResponse` sau khi commit thành công.
  - Lỗi khi lưu session, lỗi tạo token hoặc cancellation trước commit đều rollback toàn bộ user và session, cho phép đăng ký lại cùng email thành công.
  - Cập nhật `UnitOfWork.cs`: Sử dụng `CancellationToken.None` cho `await transaction.RollbackAsync(CancellationToken.None)` trong khối catch để bảo đảm rollback hoàn tất dứt điểm khi có yêu cầu hủy request.

### 4. Quy trình TDD & Bộ 9 Kịch Bản Test Hồi Quy
- **Giai đoạn Đỏ (Red Phase):**
  - Viết 4 bài test đơn vị mới trong `AuthServiceTests` và `UserServiceTests` xác nhận thất bại đúng nguyên nhân trước khi sửa code: `RegisterAsync` không dùng transaction (FAIL), `LogoutAsync` thu hồi toàn bộ phiên (FAIL), `LoginAsync` không khóa hàng `GetByEmailForUpdateAsync` (FAIL), `ChangePasswordAsync` không gọi `GetByIdForUpdateAsync` (FAIL).
- **Giai đoạn Xanh (Green Phase):**
  - Triển khai toàn diện code sửa lỗi, toàn bộ **91/91 unit tests passed (100%)**.
- **Bộ 9 kịch bản Integration Tests (`AuthImprovementTests.cs`):**
  1. *Logout nhiều thiết bị:* Logout phiên A (204), token A nhận 401, token B nhận 200, DB chỉ đánh dấu A bị thu hồi.
  2. *Phạm vi phiên:* Token sai owner/session hoặc thiếu/sai `sid` nhận 401 ở cả endpoint logout và `/me`; phiên của tài khoản khác không bị ảnh hưởng.
  3. *Logout đồng thời:* Hai request logout cùng phiên hoàn tất 204 mà không xung đột ghi đè `RevokedAt`.
  4. *Đổi mật khẩu:* Mọi token cũ nhận 401 sau đổi mật khẩu; đăng nhập mật khẩu mới thành công 200 OK.
  5. *Race: Đổi mật khẩu trước:* Giữ transaction sau cập nhật hash qua `GateDbCommandInterceptor`, Scope 2 login mật khẩu cũ bị chặn tại PostgreSQL (thăm dò `pg_stat_activity` với wait_event_type = 'Lock', timeout 30s). Scope 1 commit, Scope 2 unblock và nhận 401, không tạo phiên rác.
  6. *Race: Login trước:* Giữ login sau `SELECT ... FOR UPDATE`, Scope 2 đổi mật khẩu bị chặn tại PostgreSQL. Scope 1 commit cấp token, Scope 2 unblock và thu hồi mọi phiên; token vừa cấp nhận 401.
  7. *Đăng ký thành công:* Tạo đúng 1 user, 1 session tương ứng có `sid` khớp JWT payload, gọi `/me` thành công 200 OK.
  8. *Đăng ký thất bại:* Chèn lỗi khi lưu session (`FaultInjectionDbCommandInterceptor`) và khi tạo token (`FaultyJwtTokenGenerator`), transaction rollback hoàn toàn không còn user/session, đăng ký lại cùng email thành công.
  9. *Cancellation:* Hủy request qua `CancelOnCommandDbCommandInterceptor`, transaction rollback bằng `CancellationToken.None`, DB hoàn toàn sạch dữ liệu.

### 5. Kết quả kiểm chứng
- `dotnet build backend/AgriVision.sln`: Thành công, 0 warning, 0 error.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`: **91/91 unit tests passed (100%)**.
- Kiểm tra diff: Không thay đổi migration, dataset, checkpoint, secret hay code R2.
- Tuân thủ quy định: Chưa thực hiện commit hoặc push khi chưa có yêu cầu từ người dùng.

## 2026-10-23 — Kiểm tra lại auth PR #42 trên ba89f19

- Nhánh: AGRI-128-backend-improvement. Người dùng xác nhận tiếp tục trên
  ba89f19f28f4eb5486b771d0c57c85c956fb0153, thay vì triển khai lại từ 0035c15.
- Phạm vi thay đổi: AuthImprovementTests.cs và report/task log AGRI-128.
  Ba sửa nghiệp vụ đã có trong HEAD được kiểm tra, không đảo hoặc sửa lại.
  Giữ IAuthService.LogoutAsync(userId, sessionId, cancellationToken),
  IUnitOfWork, hai locking read của IUserRepository và rollback với CancellationToken.None.
- Khắc phục lỗi test: scoped JWT resolution, kỳ vọng đổi mật khẩu 204,
  fault/cancellation interceptor bắt Reader; assert session rollback theo ID.
- Bổ sung gate cho hai logout đã qua xác thực và so sánh RevokedAt trước/sau;
  race qua HTTP, hai request DI scope/connection riêng, xác nhận đúng blocker/waiter PID
  bằng pg_blocking_pids, timeout 30 giây, không dùng sleep cố định.
- Red/green mới: baseline 4 pass/5 fail; sửa setup còn 7 pass/2 fail do interceptor
  không kích hoạt. Sau sửa hook và tăng cường test, auth/transaction 10/10 pass.
  Bản sao cô lập tái đưa ba lỗi auth: 4 pass/5 fail đúng ràng buộc, không sửa
  code trên nhánh để lấy bằng chứng red.
- Lượt cuối: unit 91/91, integration 140/140, không skip, filter
  Category!=RealCheckpoint. Script kiểm tra TRX của CI pass cho cả hai suite.
  ReportGenerator 5.5.4 gộp branch coverage 364/552 = 65.94%;
  gate 60% pass, target 80% chưa đạt.
- Lệnh, paths bằng chứng và giới hạn:
  [báo cáo kiểm chứng mới](../../reports/AGRI-128/auth_verification_2026_10_23.md).
  TRX/log/Cobertura nằm trong .cache/verification/AGRI-128/, không đưa vào Git.
- GitHub: CI run 39902453660 (#67) cho ba89f19 completed/failure ở bước
  backend integration; bước merge coverage bị skip, ci-gate failure.
  Chưa có GitHub CI cho các thay đổi local chưa commit/push.
- Diff chỉ gồm test và docs; giữ nguyên migration, dataset, checkpoint, secret,
  HTTP/JWT contract và R2. Không commit/push hoặc thay đổi remote workflow/PR.
  Nghiệm thu local auth đã đạt; chưa kết luận toàn bộ AGRI-128 hoặc remote CI hoàn tất.

## 2026-10-23 — Delivery authorization

- User requested committing and pushing the verified auth regression follow-up to AGRI-128-backend-improvement.
- Delivery includes only the auth integration test and its AGRI-128 reports/task log. Unrelated untracked files remain excluded.
- Revalidated existing TRX and merged coverage before delivery: 91 unit and 140 integration passed; 65.94% branch coverage. No new test execution is claimed by this delivery entry.
- GitHub CI for the new commit must be checked separately after push; the earlier ba89f19 CI result remains historical.
