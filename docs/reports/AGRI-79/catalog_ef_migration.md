# AGRI-79 — Catalog v1.4 bằng backend migration và dotnet EF

Ngày thực hiện: 07/10/2026. Migration mới:
[20261007032722_DatasetV14Catalog](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261007032722_DatasetV14Catalog.cs).
Đã áp dụng vào `agrivision_db` bằng **dotnet EF trên Windows host**.

## Thay đổi và cách chạy

- Tạo migration bằng `dotnet ef migrations add DatasetV14Catalog` với tool
  9.0.2 đã pin. Không thay model/schema hoặc sửa migration đã áp dụng.
- `Up()` chứa bản SQL catalog cố định, giữ nguyên chữ hoa/thường, index v1.4,
  các ID, history và lớp legacy inactive. SQL không có BEGIN/COMMIT riêng;
  EF quản lý transaction và ghi history cùng dữ liệu catalog.
- Không đọc SQL có thể thay đổi từ filesystem lúc chạy migration; bản SQL
  trong migration giữ bất biến. SQL source ở `database/` vẫn là importer tùy chọn.
- `Down()` từ chối downgrade vì không thể an toàn khôi phục class identity
  và mapping legacy sau khi đã có lịch sử; sửa bằng migration mới theo hướng tiến tới.
- Bỏ seed catalog demo 11 lớp trong DbInitializer. Development chỉ seed tài
  khoản khi có cấu hình password rõ; catalog thật đến từ migration trong mọi môi trường.
- Cập nhật fake predictor/DTO expectations của integration theo mapping v1.4.

Lệnh đã thực thi, với connection string host được đặt trong biến môi trường
local và không in vào log:

```powershell
dotnet ef database update --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --no-build
dotnet ef migrations list --project backend/src/AgriVision.Infrastructure --startup-project backend/src/AgriVision.API --no-build
```

Host port cũ `55434` bị Windows từ chối bind sau khi recreate PostgreSQL.
Đã chuyển `POSTGRES_HOST_PORT` trong `.env` local sang **5432**; kiểm tra volume
vẫn là **agriai_postgres_data**, không xóa volume hoặc dữ liệu. PostgreSQL healthy
và dotnet kết nối thành công qua `127.0.0.1:5432`.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| EF database update | Applying migration `20261007032722_DatasetV14Catalog`; Done |
| Applied migration history | 3 dòng: InitialCreate, ConfirmedRequirementsSchema, DatasetV14Catalog |
| Active catalog | 59 lớp, index 0–58 |
| Legacy | 3 lớp Potato inactive, tổng 62 dòng |
| Đối chiếu DB trước/sau | Toàn bộ 62 ID/index/name/status giữ nguyên, CSV SHA-256 trước/sau bằng nhau |
| Web proxy sau migration | DB Healthy |
| Live API–DB sau migration | Auth, catalog CRUD, synthetic history/owner/expiry/delete đạt; CLEANUP PASS |
| Unit / integration tests | **33/33 / 30/30**, failed 0, skipped 0; PostgreSQL Testcontainers thật |

Integration bổ sung đường chạy EF cho cả 6 case conflict/rollback, DB trống,
DB đã import SQL, áp dụng lại giữ ID và chặn downgrade giữ dữ liệu/history.
Test migration legacy cũ vẫn kiểm tra backfill ảnh và bảo toàn prediction.
Test catalog độc lập chạy trên schema trước migration catalog để vẫn kiểm thử
được importer SQL. Mapping fixture kiểm tra toàn bộ 59 tên theo đúng index.

Bằng chứng local/ignored:

- `.cache/database-verification/catalog-ef-migration-20261007/database-update.txt`
- `.cache/database-verification/catalog-ef-migration-20261007/Admin_ADMIN-PC_2026-10-07_10_34_22.trx` (unit)
- `.cache/database-verification/catalog-ef-migration-20261007/Admin_ADMIN-PC_2026-10-07_10_34_23.trx` (integration)
- `.cache/database-verification/catalog-ef-before.csv`, `catalog-ef-after.csv`
- Backup trước migration: `.cache/database-verification/agrivision_before_catalog_ef_20261007_103449_b9b96c145f8447e5ada53e410dbbbbca.dump`, **30.677 bytes**; chưa kiểm thử restore.
- SQL export cập nhật ở `database/generated/ef_migrations.sql` (ignored).

Hướng dẫn vận hành đã cập nhật:
[Docker/database guide](../../docker_database_guide.md).
Đã build lại backend image chứa migration mới; NuGet restore trong Docker mất
gần 3 phút. Không chạy job migration Docker để thay thế lần áp dụng bằng dotnet.
Không đổi startup thành tự migrate, không chạy inference thật hoặc GitHub
Actions, chưa commit/push/merge.
