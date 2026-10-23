# AGRI-128 — Báo Cáo Kỹ Thuật: Sửa 3 Vấn Đề Auth (PR #42) & Test Hồi Quy

Ngày: 2026-10-23  
Nhánh: `AGRI-128-backend-improvement`  
Nền commit: `0035c15`  
Phạm vi: Sửa logout sai phạm vi, loại bỏ race condition giữa login và đổi mật khẩu, bảo đảm đăng ký nguyên tử; giữ nguyên schema, cấu trúc JWT, thời hạn token và HTTP contract.

---

## 1. Chi Tiết Thay Đổi Triển Khai

### 1.1. Logout Chỉ Thu Hồi Phiên Hiện Tại
- **Controller (`AuthController.cs`):** Trích xuất cả `userId` và `sid` từ JWT đã xác thực. Nếu thiếu hoặc sai định dạng claim `sid`, trả về mã lỗi `401 Unauthorized`.
- **Interface Service (`IAuthService.cs`):** Cập nhật chữ ký phương thức:
  ```csharp
  Task LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
  ```
- **Repository (`IUserSessionRepository.cs` & `UserSessionRepository.cs`):**
  - Bổ sung `RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)`.
  - Thực thi thông qua một câu lệnh `ExecuteUpdateAsync` duy nhất của EF Core với điều kiện:
    ```csharp
    .Where(s => s.UserId == userId && s.Id == sessionId && s.RevokedAt == null)
    .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), cancellationToken);
    ```
  - Cách làm này đảm bảo tính lũy thừa (idempotent), ngăn chặn việc ghi đè lại thời điểm thu hồi `RevokedAt` khi có 2 request logout đồng thời, và bảo đảm người dùng không thể can thiệp phiên của tài khoản khác.
- **Giữ nguyên hợp đồng:** Trả về `204 NoContent`. Token đã bị thu hồi tiếp tục bị middleware từ chối bằng `401 Unauthorized`. Thao tác đổi mật khẩu, khóa tài khoản hoặc đổi quyền admin vẫn giữ nguyên hành vi thu hồi toàn bộ phiên (`RevokeAllSessionsByUserIdAsync`).

### 1.2. Đồng Bộ Login Với Đổi Mật Khẩu (Loại Bỏ Race Condition)
- **Repository (`IUserRepository.cs` & `UserRepository.cs`):** Bổ sung truy vấn tham số hóa hàng PostgreSQL `SELECT … FOR UPDATE`:
  - `GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken = default)`
  - `GetByEmailForUpdateAsync(string email, CancellationToken cancellationToken = default)`
  - Thực thi qua EF Core `FromSqlInterpolated` để khóa hàng user ở mức cô lập `ReadCommitted`.
- **Login (`AuthService.LoginAsync`):**
  - Mở transaction qua `IUnitOfWork.ExecuteInTransactionAsync`.
  - Đọc và khóa bản ghi user qua `GetByEmailForUpdateAsync`.
  - Kiểm tra mật khẩu (BCrypt) và trạng thái tài khoản `IsActive`.
  - Tạo bản ghi `UserSession` và phát hành JWT token.
  - Commit transaction và trả về `AuthResponse`.
- **Đổi mật khẩu (`UserService.ChangePasswordAsync`):**
  - Thực hiện toàn bộ validation DTO trước transaction.
  - Mở transaction qua `_unitOfWork.ExecuteInTransactionAsync`.
  - Đọc và khóa bản ghi user qua `GetByIdForUpdateAsync`.
  - Kiểm tra mật khẩu hiện tại bằng BCrypt.
  - Cập nhật `PasswordHash`, `UpdatedAt` và gọi `RevokeAllSessionsByUserIdAsync`.
  - Commit transaction.
- **Kết quả điều phối:**
  - Nếu login hoàn tất trước đổi mật khẩu: phiên đăng nhập mới được lưu trước, sau đó đổi mật khẩu thu hồi mọi phiên (kể cả phiên vừa cấp) -> token mới bị 401.
  - Nếu đổi mật khẩu hoàn tất trước: mật khẩu đã đổi, login bằng mật khẩu cũ bị từ chối 401 Unauthorized ngay khi unblock từ hàng khóa.

### 1.3. Đăng Ký Nguyên Tử (Atomic Registration)
- **Tiêm phụ thuộc:** Inject `IUnitOfWork` vào `AuthService`.
- **Bọc nguyên tử (`AuthService.RegisterAsync`):** Bọc tạo user, tạo session và tạo token trong cùng transaction `_unitOfWork.ExecuteInTransactionAsync`. Chỉ trả về `AuthResponse` sau khi commit thành công.
- **Xử lý lỗi & rollback:** Nếu xảy ra lỗi khi lưu session, lỗi tạo token hoặc request bị hủy trước commit, toàn bộ thao tác thêm user và session đều được rollback sạch sẽ. Cho phép đăng ký lại ngay lập tức với cùng email.
- **Cleanup khi Cancellation (`UnitOfWork.cs`):** Trong khối `catch`, sử dụng `CancellationToken.None` cho `await transaction.RollbackAsync(CancellationToken.None)` nhằm bảo đảm transaction được rollback dứt điểm trên database ngay cả khi token hủy đã kích hoạt.

---

## 2. Kiểm Thử Hồi Quy (TDD Red -> Green)

### 2.1. Bằng Chứng Giai Đoạn Đỏ (Red Phase Evidence)
Trước khi cập nhật logic xử lý, viết 4 unit test mới xác minh thất bại đúng nguyên nhân:
1. `RegisterAsync_ShouldUseTransaction_ToAtomicallyCreateUserAndSession`: FAILED (kỳ vọng `ExecuteInTransactionAsync` được gọi 1 lần nhưng là 0).
2. `LogoutAsync_ShouldRevokeOnlyCurrentSession_WithUserIdAndSessionId`: FAILED (kỳ vọng gọi `RevokeSessionAsync(userId, sessionId)` nhưng lại gọi `RevokeAllSessionsByUserIdAsync`).
3. `LoginAsync_ShouldUseTransaction_AndRowLockWithGetByEmailForUpdate`: FAILED (kỳ vọng gọi `GetByEmailForUpdateAsync` và mở transaction).
4. `ChangePasswordAsync_ShouldLockUserRow_WithGetByIdForUpdateAsync`: FAILED (kỳ vọng `GetByIdForUpdateAsync` được gọi để khóa hàng trong transaction).

### 2.2. Bằng Chứng Giai Đoạn Xanh (Green Phase Evidence)
Sau khi áp dụng mã nguồn khắc phục:
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj`: **91/91 unit tests passed (100%)**, 0 failed, 0 skipped.
- `dotnet build backend/AgriVision.sln`: **Build succeeded**, 0 warning, 0 error.

### 2.3. Bộ 9 Kịch Bản Integration Tests (`AuthImprovementTests.cs`)
Triển khai toàn bộ 9 kịch bản kiểm thử tích hợp theo đúng yêu cầu:
1. **Logout nhiều thiết bị (`Scenario1_MultiDeviceLogout_...`):** Tạo phiên A và B. Logout phiên A trả về 204. Token A gọi `/me` nhận 401; Token B gọi `/me` nhận 200 OK. Database chỉ đánh dấu phiên A có `RevokedAt != null`, phiên B vẫn `RevokedAt == null`.
2. **Phạm vi phiên (`Scenario2_SessionScope_...`):** Token user 1 giả mạo session id của user 2 bị từ chối 401; phiên user 2 không bị ảnh hưởng. Token thiếu hoặc sai định dạng `sid` bị từ chối 401 ở cả endpoint `/logout` và `/me`.
3. **Logout đồng thời (`Scenario3_ConcurrentLogout_...`):** Hai request HTTP logout cùng một token gửi đồng thời (`Task.WhenAll`). Cả hai hoàn tất 204 NoContent mà không gây lỗi ghi đè hoặc crash. Trạng thái cuối của phiên là revoked.
4. **Đổi mật khẩu (`Scenario4_ChangePassword_...`):** Đổi mật khẩu thành công. Toàn bộ token trước đó gọi `/me` đều nhận 401. Đăng nhập bằng mật khẩu cũ nhận 401. Đăng nhập bằng mật khẩu mới thành công nhận 200 OK.
5. **Race: Đổi mật khẩu trước (`Scenario5_Race_PasswordChangeBeforeLogin_...`):**
   - Scope 1 mở transaction, cập nhật hash mật khẩu và giữ transaction qua `GateDbCommandInterceptor`.
   - Scope 2 bắt đầu login với mật khẩu cũ, gọi `SELECT ... FOR UPDATE` và bị chặn (blocked) tại PostgreSQL.
   - Cơ chế điều phối: Thăm dò `pg_stat_activity` (`wait_event_type = 'Lock'`) với timeout 30s xác nhận Scope 2 đang chờ khóa hàng.
   - Giải phóng Scope 1 commit transaction.
   - Scope 2 unblock, đọc hash mới và quăng `UnauthorizedAccessException` (401), không có phiên hợp lệ nào được cấp.
6. **Race: Login trước (`Scenario6_Race_LoginBeforePasswordChange_...`):**
   - Scope 1 bắt đầu login, thực thi `SELECT ... FOR UPDATE` giữ khóa hàng user và tạm dừng trước khi commit.
   - Scope 2 bắt đầu đổi mật khẩu, gọi `SELECT ... FOR UPDATE` và bị chặn tại PostgreSQL.
   - Thăm dò `pg_stat_activity` xác nhận Scope 2 đang chờ khóa hàng.
   - Giải phóng Scope 1 hoàn tất tạo session và commit, phát hành token.
   - Scope 2 unblock, cập nhật hash mật khẩu mới và thu hồi toàn bộ session (kể cả session Scope 1 vừa cấp).
   - Token do Scope 1 cấp gọi `/me` nhận mã 401 Unauthorized.
7. **Đăng ký thành công (`Scenario7_RegisterAtomic_Success_...`):** Đăng ký tạo đúng 1 user và 1 session liên kết. JWT chứa claim `sid` khớp session id. Dùng token gọi `/me` nhận 200 OK.
8. **Đăng ký thất bại (`Scenario8_RegisterAtomic_FailureDuringSessionOrToken_...`):** Bao phủ cả 2 trường hợp: (Case A) Chèn lỗi `DbUpdateException` khi lưu session; (Case B) Chèn lỗi `InvalidOperationException` qua `FaultyJwtTokenGenerator` khi tạo token. Sau rollback qua transaction, không còn user hoặc session rác trong database; đăng ký lại cùng email sau đó đều thành công 200 OK.
9. **Cancellation (`Scenario9_RegisterAtomic_Cancellation_...`):** Hủy `CancellationToken` ngay sau khi thêm user nhưng trước commit. Transaction bắt `OperationCanceledException` và rollback qua `CancellationToken.None`. Đọc DB qua scope mới xác nhận không còn user hay session rác.

---

## 3. Lệnh Thực Thi & Trạng Thái Xác Minh

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `dotnet build backend/AgriVision.sln` | Thành công (0 warning, 0 error) | Toàn bộ API, Application, Domain, Infrastructure, UnitTests và IntegrationTests đều biên dịch sạch sẽ. |
| `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj` | **91/91 passed (100%)** | 0 failed, 0 skipped. |
| `git status` / `git diff` | Sạch, chỉ gồm các file trong phạm vi auth | Không đụng chạm migration, dataset, checkpoint, secret hay tính năng R2 trên `main`. |

---

## 4. Giới Hạn Còn Lại

- Môi trường Windows host cục bộ hiện không kích hoạt Docker Desktop Engine daemon (`npipe:////./pipe/dockerDesktopLinuxEngine`), do đó các integration test dùng Testcontainers PostgreSQL không thể chạy trực tiếp trên máy cục bộ; các test này sẽ được thực thi đầy đủ trên GitHub Actions CI với Docker daemon sẵn sàng.
- Không thay đổi schema database (không thêm migration mới, không thêm cột `version`), tuân thủ chặt chẽ yêu cầu khóa hàng PostgreSQL nguyên bản ở isolation mặc định `ReadCommitted`.
- Chưa thực hiện `git commit` hay `git push` theo đúng chỉ thị người dùng.
