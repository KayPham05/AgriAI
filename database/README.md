# AgriVision — SQL database và catalog

**Database backend dùng là `agrivision_db`.** Schema ứng dụng hiện được quản lý bằng
EF migrations, gồm migration bổ sung `20261006161042_ConfirmedRequirementsSchema`.
Chạy migration bằng lệnh riêng trong Docker; xem [quy trình và kiểm thử](../docs/notes/database_migrations.md).
Hướng dẫn từ khởi tạo Docker đến build, xem/thêm/xóa migration, backup và cập
nhật DB: [Docker và database](../docs/docker_database_guide.md).
Migration schema là C# trong backend; SQL ở đây gồm catalog ứng dụng và ERD baseline.
SQL sáu bảng bên dưới vẫn là snapshot ERD baseline dành cho `agrivision_erd`, không
thay thế lịch sử migration hoặc toàn bộ schema ứng dụng sau khi nâng cấp.

Database `agrivision_erd` được tạo ngày 2026-10-06 trên service PostgreSQL 16 của root Compose, owner `agrivision_user`. Đây là database schema riêng để mở bằng DBeaver/pgAdmin và đối chiếu ERD. Database ứng dụng `agrivision_db` giữ nguyên.

Nguồn: [ERD](../docs/reports/AGRI-76/diagrams/erd.svg), [source ERD](../docs/reports/AGRI-76/diagrams/erd.puml), [snapshot schema đã xác minh](../docs/reports/AGRI-76/assets/database_schema.json), [InitialCreate](../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs), baseline `99d6e56`. Bằng chứng tạo database và đối chiếu metadata: [DB verification AGRI-76](../docs/reports/AGRI-76/database_verification.md#database-riêng-theo-erd--2026-10-06).

## File và phạm vi

- [import_dataset_v1_4_catalog.sql](import_dataset_v1_4_catalog.sql): tùy chọn đồng bộ SQL riêng; mặc định dùng [migration DatasetV14Catalog](../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261007032722_DatasetV14Catalog.cs) để tạo 59 lớp active trong `agrivision_db`. Giữ legacy inactive và ID/history/snapshot. Không chạy tự động khi mở API.
- [postgres_schema.sql](postgres_schema.sql): sáu bảng nghiệp vụ, đủ kiểu/độ dài/nullability/default, PK/FK, CHECK và các index theo ERD baseline. Áp dụng vào database ERD trống trong một transaction; lỗi sẽ rollback.
- [verify_schema.sql](verify_schema.sql): truy vấn metadata để đối chiếu, không xuất dữ liệu tài khoản hoặc prediction.
- `generated/`: SQL EF xuất để đọc/review trên máy local, được Git ignore; không thay thế C# migration source.

SQL ERD baseline không có seed, ảnh, tài khoản, checkpoint, bảng status/model version hoặc `__EFMigrationsHistory`. Đây không phải database đã được EF migrate/seed để chạy ứng dụng. Không đổi cấu hình backend sang database này nếu chưa xử lý migration theo quy trình ứng dụng.

Thư mục này lưu source SQL và hướng dẫn tái tạo. Dữ liệu PostgreSQL thực nằm trong Docker volume `postgres_data` của root Compose, không phải một file `.db` trong repository.

## Kết nối database đã tạo

| Trường | Giá trị |
|---|---|
| Host | `127.0.0.1` |
| Port | Dùng cổng trả về từ `docker compose port postgres 5432`; lần kiểm tra ERD trước đây dùng `55434` |
| Database | `agrivision_erd` |
| Username | `agrivision_user` |
| Password | Dùng `POSTGRES_PASSWORD` trong `.env` local; không đưa giá trị vào Git |

Nếu tạo ở máy khác, kiểm tra port bằng `docker compose port postgres 5432`.

## Tái tạo trên môi trường mới

Chạy PowerShell tại root repository. Các lệnh sau dành cho môi trường chưa có `agrivision_erd`; nếu database đã tồn tại, kiểm tra schema thay vì xóa hoặc tạo đè.

```powershell
docker compose up -d --wait postgres
docker compose exec -T postgres createdb -U agrivision_user -O agrivision_user agrivision_erd
Get-Content -Raw -Encoding UTF8 database/postgres_schema.sql |
    docker compose exec -T postgres psql -X -w -U agrivision_user -d agrivision_erd -v ON_ERROR_STOP=1
```

Kiểm tra metadata:

```powershell
Get-Content -Raw -Encoding UTF8 database/verify_schema.sql |
    docker compose exec -T postgres psql -X -w -U agrivision_user -d agrivision_erd -v ON_ERROR_STOP=1 -qAt
```

SQL dùng kiểu PostgreSQL thật (`uuid`, `timestamp with time zone`, `double precision`), giữ `predictions.user_id` nullable và đúng delete rules `SET NULL`/`RESTRICT`/`CASCADE`. Confidence/probability không có CHECK `[0,1]` vì schema gốc không có ràng buộc này.
