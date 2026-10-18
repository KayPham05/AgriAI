# Quy Ước Triển Khai Backend (AGRI-128 Implementation Rules)

> **Phạm vi áp dụng:** Dành cho tất cả thành viên tham gia phát triển các task từ **S3-01** đến **S3-10** trên nhánh `AGRI-128-backend-improvement` (kế hoạch chi tiết tại [`docs/plans/AGRI-128-backend-improvement-plan.md`](../plans/AGRI-128-backend-improvement-plan.md)).  
> **Mục tiêu:** Đảm bảo toàn bộ mã nguồn do nhiều thành viên phát triển có tính nhất quán 100% về kiến trúc, bảo mật, quy tắc dữ liệu, chuẩn giao tiếp API và chất lượng kiểm thử.

---

## 1. Nguyên Tắc Kiến Trúc & Tổ Chức Mã Nguồn (Clean Architecture)

Mọi code backend viết bằng **.NET 9 (C# 13)** và phải tuân thủ nghiêm ngặt mô hình 4 tầng:

```text
backend/
├── src/
│   ├── AgriVision.Domain/          # Entity, Enum, Value Objects (KHÔNG phụ thuộc tầng nào)
│   ├── AgriVision.Application/     # Interfaces, DTOs, Services, Business Logic, Exceptions
│   ├── AgriVision.Infrastructure/  # EF Core, AppDbContext, Repositories, External Services (Cloudinary, AI, OpenAI)
│   └── AgriVision.API/             # Controllers, Middlewares, Program.cs, Configuration
└── tests/
    ├── AgriVision.UnitTests/       # Unit Tests cho Services (dùng Moq / InMemory)
    └── AgriVision.IntegrationTests/# Integration Tests cho Controllers & Database PostgreSQL
```

### 1.1. Quy tắc theo tầng:
1. **Domain (`AgriVision.Domain`):**
   - Không được sửa đổi schema database hoặc Entity nếu chưa có thống nhất. Schema hiện hành có **16 bảng** và đã được chốt tại `database_details.md`.
   - Các Entity mới (nếu có) phải kế thừa `BaseEntity` (nếu có `Id`, `CreatedAt`, `UpdatedAt`).
2. **Application (`AgriVision.Application`):**
   - **Mọi DTO phải là C# `record`** hoặc `class` với `get; init;` bất biến (immutability).
   - Tách biệt rõ ràng giữa Request DTO (`Create...Request`, `Update...Request`, `...FilterParams`) và Response DTO (`...Dto`).
   - Mọi Service nghiệp vụ phải có Interface tương ứng (`I...Service`) trong thư mục `Services/Interfaces/` và Implementation trong `Services/Implementations/`.
   - **Tất cả các phương thức bất đồng bộ phải nhận `CancellationToken cancellationToken = default`**.
3. **Infrastructure (`AgriVision.Infrastructure`):**
   - Mọi truy vấn database phức tạp phải đi qua Repository (`I...Repository`), không inject trực tiếp `AppDbContext` vào Controller.
   - Luôn sử dụng `AsNoTracking()` cho các truy vấn chỉ đọc (Read-only queries).
4. **API (`AgriVision.API`):**
   - Controller chỉ đóng vai trò điều phối HTTP: nhận request, validate model state, lấy `UserId` từ Claims, gọi Service và trả về `ActionResult<T>`.
   - Tuyệt đối không viết logic nghiệp vụ (business logic) hoặc gọi database trực tiếp trong Controller.

---

## 2. Quy Chuẩn Đặt Tên & Định Dạng (Naming & Coding Conventions)

| Thành phần | Quy ước | Ví dụ đúng | Ví dụ sai |
|---|---|---|---|
| **Class, Interface, Record** | `PascalCase` | `AgriculturalProfileService`, `IAgriculturalProfileRepository` | `agriculturalProfileService`, `Iagricultural_profile` |
| **Interface** | Tiền tố `I` + `PascalCase` | `IUserService`, `IMedicineRepository` | `UserServiceInterface`, `UserRepo` |
| **Method** | `PascalCase` + hậu tố `Async` | `GetPredictionHistoryAsync`, `ChangePasswordAsync` | `getHistory`, `ChangePassword` |
| **Method Parameter** | `camelCase` | `userId`, `cancellationToken`, `pageNumber` | `UserId`, `CT`, `p_number` |
| **Private Field** | `_camelCase` | `_predictionRepository`, `_logger` | `predictionRepository`, `m_repo` |
| **Controller Route** | `kebab-case`, số nhiều | `api/agricultural-profiles`, `api/admin/users` | `api/AgriculturalProfile`, `api/user_list` |
| **Controller Action** | RESTful HTTP verbs | `GET api/agricultural-profiles/{id}`, `POST api/agricultural-profiles` | `POST api/agricultural-profiles/create` |

---

## 3. Quy Tắc Nghiệp Vụ Cốt Lõi Bắt Buộc Tuân Thủ

Tất cả thành viên khi code task của mình phải thuộc lòng 6 quy tắc bất di bất dịch sau:

### 3.1. Phân quyền & Định danh (`ClaimsPrincipal`):
- Lấy `userId` từ token thông qua:
  ```csharp
  var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
  if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
      return Unauthorized();
  ```
- Các API quản trị (`S3-08`, `S3-09`) **BẮT BUỘC** có attribute:
  ```csharp
  [Authorize(Roles = UserRole.Admin)]
  ```
- User thường **tuyệt đối không được xem/sửa/xóa** dữ liệu (hồ sơ, lịch sử, profile) của User khác. Luôn kiểm tra `entity.UserId == currentUserId`.

### 3.2. Ràng buộc Khách vãng lai (Guest - `S3-05`):
- Nếu request không có token xác thực (`userId == null`):
  - ✅ Trả về kết quả dự đoán `PredictionResultDto` đầy đủ.
  - ❌ **TUYỆT ĐỐI KHÔNG GHI VÀO DATABASE** (không insert vào `predictions`, `prediction_images`, `prediction_details`).
  - ❌ **TUYỆT ĐỐI KHÔNG TẢI LÊN CLOUD STORAGE LÂU DÀI**.
  - ❌ Chặn Guest gọi các API lịch sử, profile, hồ sơ.

### 3.3. Ràng buộc Hồ sơ Nông nghiệp (`S3-03`, `S3-06`):
- Hồ sơ là **tùy chọn**: User có thể chọn gắn vào hồ sơ hoặc không khi chẩn đoán. Nếu không chọn, kết quả vẫn lưu vào tài khoản User.
- Xóa hồ sơ: Chỉ ngắt liên kết (`SET NULL` ở `predictions.agricultural_profile_id`). **Tuyệt đối không xóa bản ghi lịch sử chẩn đoán của người dùng**.

### 3.4. Ràng buộc Dữ liệu Lịch sử & Snapshot Bất biến (`S3-06`, `S3-07`):
- Snapshot kết quả chẩn đoán lưu dưới dạng JSONB (`result_snapshot`). Khi xem lại lịch sử, đọc từ snapshot này để đảm bảo dù danh mục bệnh/thuốc có thay đổi trong tương lai thì kết quả lịch sử vẫn nguyên vẹn.
- Ảnh gốc chẩn đoán có TTL 30 ngày (`ExpiresAt = CreatedAt.AddDays(30)`). Sau 30 ngày, đường dẫn ảnh gốc bị ẩn nhưng snapshot và metadata vẫn giữ nguyên.

### 3.5. Ràng buộc Kiểm duyệt Tri thức & Thuốc BVTV (`S3-09`):
- Bảng `medicines` và `knowledge_documents` có cờ kiểm duyệt:
  - Chỉ trả về cho User/Guest công khai khi: `is_approved == true` **VÀ** `is_public == true` **VÀ** `is_active == true`.
  - Thuốc (`medicines`) chỉ được gán vào kết quả chẩn đoán khi: `confidence > 0.8`, tình trạng là `Disease`, đã kiểm duyệt và đã đối soát nhãn gốc (`is_label_verified == true`). Nếu `confidence <= 0.8`, hiện cảnh báo độ tin cậy thấp và không gợi ý thuốc.

### 3.6. Ràng buộc Cố vấn AI Nâng cao (ChatGPT - `S3-10`):
- Khuyến nghị canh tác phải có cấu trúc chuẩn: Tóm tắt, Giải pháp hữu cơ, Giải pháp hóa học (có kiểm soát), Biện pháp phòng ngừa, Cải tạo đất.
- **Không tự bịa tên thuốc hoặc liều lượng hóa chất độc hại**. Ưu tiên tham chiếu danh mục thuốc đã có trong DB.
- Phải có cơ chế **Fallback / Mock Service** khi chưa cấu hình `OpenAI:ApiKey` để toàn bộ hệ thống và CI test luôn hoạt động bình thường.

---

## 4. Chuẩn Hóa API Response & Xử Lý Lỗi (Error Handling)

### 4.1. Chuẩn hóa Phân trang (Pagination):
Mọi API trả về danh sách có phân trang phải dùng `PagedResult<T>`:
```csharp
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int PageNumber,
    int PageSize,
    int TotalCount
)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
```

### 4.2. Xử lý Lỗi & HTTP Status Code:
- `200 OK`: Trả về dữ liệu truy vấn thành công.
- `201 Created`: Tạo mới thành công (kèm header `Location` hoặc id).
- `204 NoContent`: Cập nhật/Xóa thành công không cần trả về body.
- `400 BadRequest`: Dữ liệu đầu vào không hợp lệ (Validation failed).
- `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ / đã hết hạn.
- `403 Forbidden`: Tài khoản bị vô hiệu hóa (`IsActive == false`) hoặc không đủ quyền (ví dụ User cố gọi API Admin).
- `404 NotFound`: Không tìm thấy tài nguyên theo ID.
- `409 Conflict`: Trùng lặp dữ liệu duy nhất (ví dụ email đã tồn tại).

---

## 5. Quy Chuẩn Kiểm Thử & CI Quality Gate

Mỗi thành viên khi hoàn thành task **BẮT BUỘC** phải viết test tương ứng trước khi gửi PR:

1. **Unit Tests (`AgriVision.UnitTests`):**
   - Viết test cho tầng Service tương ứng (ví dụ: `AgriculturalProfileServiceTests.cs`, `UserServiceTests.cs`).
   - Mock tất cả các dependency ngoại vi (`IRepository`, `ILogger`, `IImageStorage`).
   - Phải test đủ 2 nhóm kịch bản: **Happy path** (thành công) và **Error/Edge cases** (dữ liệu sai, không có quyền, không tìm thấy).
2. **Integration Tests (`AgriVision.IntegrationTests`):**
   - Viết test kiểm tra gọi endpoint thực tế qua `CustomWebApplicationFactory`.
   - Kiểm tra ràng buộc phân quyền (gọi với Guest, gọi với User, gọi với Admin).
3. **Ngưỡng Coverage:**
   - Đảm bảo lệnh `dotnet test` vượt qua 100%.
   - Không làm tụt ngưỡng **Branch Coverage** của Backend dưới mức quy định CI sàn **60%** (target hướng tới **80%**).

---

## 6. Quy Trình Git & Cam Kết Mã Nguồn (Git Workflow)

1. **Tạo nhánh làm việc:**
   - Nhánh con theo task: `AGRI-128-<task-name>` (ví dụ: `AGRI-128-agricultural-profile`, `AGRI-128-smart-filtering`).
2. **Quy chuẩn Commit:** Tuân theo Conventional Commits:
   ```text
   <type>(<scope>): AGRI-128 <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt rõ ràng>
   ```
   - Ví dụ:
     - `feat(profile): AGRI-128 implement agricultural profile CRUD service and controller`
     - `feat(history): AGRI-128 add smart filtering query by plant and disease`
     - `test(admin): AGRI-128 add unit tests for user management and audit logging`
3. **Cấm tuyệt đối:**
   - ❌ Không commit file cấu hình chứa mật khẩu thật, JWT Secret, Cloudinary API Key hoặc OpenAI API Key.
   - ❌ Không format lại toàn bộ dự án làm nhiễu loạn git diff.
   - ❌ Không tự ý xóa migration cũ hoặc chạy `dotnet ef migrations add` khi chưa có phê duyệt kiến trúc.
