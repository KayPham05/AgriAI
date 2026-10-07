# PostgreSQL và migration riêng trong Docker

Phạm vi được chốt ngày 2026-10-06: image backend thật kết nối `agrivision_db`,
migration chạy bằng lệnh riêng, kiểm thử chạy riêng và tự dọn fixture. Giữ lịch sử
và snapshot sau khi ảnh hết hạn 30 ngày. Nguồn nghiệp vụ:
[yêu cầu hệ thống](../system_requirements.md), cùng quyết định chạy migration và kiểm thử bằng lệnh riêng.

## Cấu hình và quy trình

Backend trong Docker dùng `Host=postgres;Port=5432;Database=agrivision_db`, nhận
mật khẩu qua `.env`. Từ Windows dùng `127.0.0.1` và cổng trả về từ
`docker compose port postgres 5432` (cấu hình bằng `POSTGRES_HOST_PORT`).
`agrivision_erd` là database đối chiếu riêng, không chuyển
backend sang schema SQL đó. Giữ nguyên volume và dữ liệu đang có.

PowerShell tại root repository; chỉ tiếp tục khi lệnh trước thành công:

```powershell
docker compose config --quiet
docker compose build
docker compose up -d --wait postgres
# Với database đang có: sao lưu và review SQL migration trước bước này.
docker compose run --rm --no-deps backend --migrate
docker compose up -d --wait --wait-timeout 180
```

Normal startup không gọi `MigrateAsync()` hoặc seed. Nó đọc lịch sử EF và từ chối
khởi động khi còn migration thiếu. `--migrate` dùng chính assembly đã publish
trong image, chạy một lần rồi thoát; chạy lại chỉ áp dụng migration chưa có.
Không cần .NET SDK/EF CLI trên máy triển khai. Migration `DatasetV14Catalog`
nạp 59 lớp active v1.4 trong mọi môi trường; DB mới không cần import riêng.
[SQL import](../../database/import_dataset_v1_4_catalog.sql) là tùy chọn đồng bộ
riêng. Nội dung catalog mới chưa được duyệt; demo seeding chỉ còn tài khoản
Development khi có cấu hình password rõ.
Xem [hướng dẫn migration dùng chung](../docker_database_guide.md) và
[bằng chứng catalog](../reports/AGRI-79/dataset_v1_4_catalog.md).

Compose CI có một service `migrations` riêng, chạy xong thành công mới cho backend
khởi động trên database tạm. Đây không phải migration trong startup của API;
workflow, các gate và ngưỡng coverage giữ nguyên. Compose gốc không tự chạy job này.

## Schema bổ sung

[Migration mới](../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs)
được sinh bằng EF Core tool `9.0.2`, giữ nguyên migration `InitialCreate`.

| Yêu cầu | Dữ liệu/hiện trạng triển khai |
|---|---|
| Một lượt giữ nhiều ảnh | `prediction_images`: FK tới lượt, thứ tự duy nhất trong lượt, confidence từng ảnh, upload/expiry/deleted time. API upload hiện vẫn một file; chưa triển khai suy luận nhóm ảnh. |
| Lịch sử giữ kết quả lúc hiển thị | `predictions.result_snapshot` dạng JSONB; lượt mới có owner lưu DTO kết quả, cảnh báo và thông tin còn thiếu. Đọc lịch sử ưu tiên snapshot, không lấy lại nội dung mới từ catalog. |
| Tương thích dữ liệu cũ | Migration backfill một ảnh cho lượt cũ, expiry bằng `created_at + 30 ngày`. Snapshot cũ vẫn NULL và API trả `hasHistoricalSnapshot=false`; không dựng lại và gọi đó là nội dung lịch sử thật. |
| Ảnh hết hạn, giữ lịch sử | API trả `images[].isExpired=true`, URL ảnh NULL và `imagePath` cũ rỗng. Cleanup chỉ xóa ảnh/tham chiếu, giữ prediction và snapshot. |
| Nội dung kiểm duyệt/thuốc | `diseases.condition_type`, `is_content_approved`, `medication`. Mặc định chưa kiểm duyệt/Unknown; không tự phê duyệt dữ liệu cũ. Kết quả dùng placeholder; thuốc chỉ hiện cho bệnh, nội dung đã duyệt và confidence >80%. |
| Xác minh email | `users.email_verified_at`; `user_action_tokens` lưu hash SHA-256, purpose, expiry và consumed time. Chưa có gửi email/xác minh/reset endpoint hoặc policy quyền khi chưa xác minh. |
| Google | `user_identities` có unique provider/subject; password hash có thể NULL cho tài khoản chỉ dùng provider. Login mật khẩu từ chối tài khoản đó. Chưa có OAuth/provider verification hoặc policy liên kết email. |

`prediction_details` tiếp tục là top-k, không dùng làm danh sách ảnh. FK và unique
index bảo vệ quan hệ; token purpose/hash/expiry và vị trí/thời hạn ảnh có CHECK.
Backend yêu cầu class index **và** class name cùng khớp catalog; không chọn lớp đầu
tiên hoặc thay nhãn top-k khi mapping sai. Ảnh chỉ được lưu sau khi AI/mapping đạt;
lỗi ghi prediction sẽ thử dọn ảnh và ghi log nếu cleanup lỗi. Khách nhận kết quả
HTTP 200 nhưng không tạo ảnh/lịch sử server; lượt đăng nhập được lưu trả HTTP 201.
GET chi tiết cần đăng nhập và đúng owner, user khác nhận 404; guest nhận 401.

## Dọn ảnh hết hạn

```powershell
docker compose run --rm --no-deps backend --expire-images
```

Lệnh xóa ảnh qua adapter storage trước, rồi đánh dấu `deleted_at` và xóa tham chiếu
ảnh đang phục vụ. Snapshot JSON giữ nguyên; lúc đọc API thay URL bằng trạng thái
hết hạn. Lỗi xóa ảnh giữ metadata để chạy lại, log lỗi và exit 1. Chạy lại sau khi
đã dọn không xóa prediction. **Chưa cấu hình scheduler**, nên chưa nghiệm thu xóa
vật lý tự động đúng thời hạn; API ẩn URL hết hạn độc lập với lịch dọn. URL static
local/Cloudinary đang có chưa được thay bằng cơ chế phục vụ ảnh riêng tư có kiểm
owner; bảo vệ API chi tiết không chứng minh bảo vệ mọi URL ảnh đã biết.

## Kiểm thử và dọn fixture

```powershell
# Unit và integration (integration cần Docker).
dotnet restore backend/AgriVision.sln
dotnet test backend/AgriVision.sln

# Image backend đang chạy: không cần SDK trên host.
powershell -NoProfile -File .agents/commands/verify_database.ps1
```

[Script đọc/ghi](../../.agents/commands/verify_database.ps1) tự tìm API port qua
Compose, đối chiếu history EF với migration source, tạo tài khoản riêng cho từng
lần chạy, thử register/login/me và catalog create/read/update/soft-delete. Nó nâng
role **chỉ tài khoản fixture** để gọi API quản trị. Kiểm tra lịch sử dùng SQL
fixture tổng hợp để thử snapshot, owner, expiry và cascade; không giả vờ đó là
kết quả model. Trong `finally`, xóa đúng UUID/email/marker của lần chạy và xác minh
không còn fixture. Không upload file ảnh và không sửa dữ liệu người dùng sẵn có.

Integration tests dùng PostgreSQL 16 thật trong Testcontainers, tự hủy container
tạm khi xong. Các case prediction dùng fake AI/storage đã chỉ rõ trong fixture;
chúng kiểm tra API/persistence, không kiểm chứng inference ConvNeXt-Tiny.
Migration test bắt đầu từ InitialCreate có dữ liệu cũ, nâng cấp và chạy lặp;
kiểm tra backfill, thiếu snapshot lịch sử, không lệch model snapshot, unique/CHECK
và cascade tài khoản. Case expiry kiểm cả lỗi storage và khả năng chạy lại.

## Lịch sử kiểm chứng local ngày 2026-10-06, trước migration catalog

- Build image backend từ source mới; migration mới đã áp dụng vào `agrivision_db`.
  Chạy migration lần hai: không áp dụng lại; backend healthy sau khi khởi động.
- 33 unit tests và 13 integration tests đạt, không skip. Kết quả TRX nằm tại
  `.cache/database-verification/final/` (ignored); chưa đo coverage của thay đổi này.
- Trước nâng cấp đã tạo backup `.cache/database-verification/agrivision_before_confirmed_schema.dump`
  (ignored, chứa dữ liệu local, không đưa vào Git). Chưa thử restore backup.
- Script API/backend–DB đạt: register/login/me, catalog CRUD (soft-delete), snapshot
  fixture, owner A/B, ẩn URL ảnh hết hạn và xóa lịch sử. Cleanup đạt, không còn
  fixture và không upload ảnh. Log: `.cache/database-verification/live_api_db.txt`.
- Probe image với database trống: startup từ chối vì còn migration, không tạo bảng;
  lệnh `--migrate` áp dụng cả hai migration và không seed demo Production. Container
  và database probe đã dọn; log startup: `.cache/database-verification/startup_without_migrations.txt`.
- Kiểm tra cuối: web/API/PostgreSQL healthy; web proxy `/api/health` trả database
  Healthy. Instance có 9 bảng nghiệp vụ; số tài khoản/cây/bệnh fixture và database
  probe còn lại đều bằng 0. Container đang chạy và image vừa build cùng ID
  `sha256:872a84d85cc16d6ff0f55eda7ed51fb9e4a0c2965f491028014992825a0f5919`.

Tại thời điểm kiểm chứng trên, chưa chạy GitHub Actions hoặc nghiệm thu model thật, mapping 59 lớp,
upload nhiều ảnh, giới hạn/validation nội dung ảnh, UI trạng thái hết hạn,
email/Google/reset hoặc scheduler. Các phần dữ liệu hỗ trợ chức năng mới không
đồng nghĩa chức năng đó đã được tích hợp đầy đủ.

Ngày 07/10/2026, catalog v1.4 đã được bổ sung qua migration và kiểm tra đủ
59 lớp; bộ backend đạt 33 unit + 30 integration tests. Xem
[báo cáo migration catalog](../reports/AGRI-79/catalog_ef_migration.md).
Kết quả này chưa xác nhận inference thật hoặc GitHub Actions.

Phần tích hợp database hiện được ghi nhận tại Jira `AGRI-79` và nhánh `AGRI-79-database-integration`. Xem
[task log AGRI-79](../task-logs/AGRI-79/AGRI-79-database-migrations.md). Giữ output local
ở `.cache/`; khi chuẩn bị PR, chuyển bằng chứng phù hợp sang `docs/reports/AGRI-79/`.

Xem thêm [Entities và ảnh hưởng đến ERD](database_entities.md) cùng
[commands index](../../.agents/commands/README.md) để chạy backup, migration,
unit/integration tests và kiểm chứng image backend bằng các lệnh riêng.
