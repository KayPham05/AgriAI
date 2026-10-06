# AGRI-76 — Đối chiếu database hiện tại sau AGRI-70

Ngày 07/10/2026 đọc metadata `agrivision_db` trên root Compose bằng psql, không xuất tài khoản/ảnh/lịch sử. [Snapshot hiện tại](assets/database_schema_current.json) có inspected_at/database, columns, constraints, indexes và migration IDs. Snapshot 05/10 giữ nguyên ở [database_schema.json](assets/database_schema.json).

- **9 bảng nghiệp vụ, 69 cột**; ngoài ra có `__EFMigrationsHistory` với 2 cột kỹ thuật.
- Migration đã áp dụng: `20260925161222_InitialCreate` và `20261006161042_ConfirmedRequirementsSchema`, EF 9.0.2.
- ERD hiện tại: [erd_current.puml](diagrams/erd_current.puml) / [SVG](diagrams/erd_current.svg), đủ PK/FK/nullable/default/type/unique/CHECK của metadata nghiệp vụ.
- Tổng metadata có 27 PK/FK/CHECK constraints và 30 indexes, gồm cả bảng kỹ thuật EF. Định nghĩa đầy đủ trong JSON, không suy số index từ riêng ERD.
- Mới: predictions.result_snapshot JSONB nullable; users.password_hash nullable/EmailVerifiedAt; diseases.condition_type/is_content_approved/medication; prediction_images/user_identities/user_action_tokens.
- Ba FK mới: prediction_images → predictions; user_identities/user_action_tokens → users; đều CASCADE, con đúng một cha, cha có 0..N con.
- Schema supporting auth/multi-image không khẳng định các endpoint đã hoàn thiện; không có status/model version DB.

Nguồn: [migration mới](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs), [model snapshot](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs), [configurations](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/). Đọc live lần này thành công sau khi dùng quyền Docker; không giữ trạng thái blocked từ lần review trước.

Giữ nguyên ERD 6 bảng bên dưới làm lịch sử và SQL/database riêng `agrivision_erd`. Nó không thay thế migration/schema `agrivision_db` hiện tại.

## Baseline lịch sử 05/10/2026

### Đối chiếu PostgreSQL trước migration mới

Ngày 2026-10-05, đọc metadata của PostgreSQL đang chạy trong Compose bằng `psql -X`, không truy vấn tài khoản, ảnh hoặc lịch sử người dùng. Baseline source `99d6e56b825f8448aae442b87a4b3e34ee338a52`.

Nguồn source: [InitialCreate](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs), [AppDbContext](../../../backend/src/AgriVision.Infrastructure/Persistence/AppDbContext.cs), [entities](../../../backend/src/AgriVision.Domain/Entities/). Snapshot metadata: [database_schema.json](assets/database_schema.json).

## Kết quả khảo sát

Sáu bảng nghiệp vụ: users, plants, diseases, plant_diseases, predictions, prediction_details; bảng kỹ thuật `__EFMigrationsHistory` không phải entity nghiệp vụ. Migration đã áp dụng: `20260925161222_InitialCreate`, EF ProductVersion `9.0.2`.

Đã đối chiếu tên bảng/cột, kiểu, nullable, độ dài varchar, default, PK, FK, unique index và check constraint với migration. `predictions.user_id` nullable; không có cột lifecycle/status hoặc model version. Confidence/probability không có CHECK `[0,1]` trong DB; adapter HTTP có validation riêng.

| Quan hệ | Cardinality | ON DELETE |
|---|---|---|
| users → predictions | Mỗi user 0..N predictions; mỗi prediction 0..1 user | SET NULL |
| plants → plant_diseases | Mỗi plant 0..N mapping; mỗi mapping đúng 1 plant | RESTRICT |
| diseases → plant_diseases | Mỗi disease 0..N mapping; mỗi mapping đúng 1 disease | RESTRICT |
| plant_diseases → predictions | Mỗi mapping 0..N predictions; mỗi prediction đúng 1 mapping chính | RESTRICT |
| predictions → prediction_details | Mỗi prediction 0..N details theo schema; mỗi detail đúng 1 prediction | CASCADE |
| plant_diseases → prediction_details | Mỗi mapping 0..N details; mỗi detail đúng 1 mapping | RESTRICT |

Schema cho phép 0 details; code prediction HTTP hợp lệ thường tạo ít nhất 1 do top_k không rỗng. Không đổi cardinality ERD thành 1..N chỉ vì luồng service thường tạo top-k.

Unique: users.email, plants.name, diseases.name, plant_diseases.class_index, cặp (plant_id,disease_id), cặp (prediction_id,rank). CHECK: class_index >= 0; rank > 0. class_name không có unique index.

## Database riêng theo ERD — 2026-10-06

Source SQL và hướng dẫn tái tạo: [database/](../../../database/README.md). Database `agrivision_erd` đã tạo trên service PostgreSQL 16 của root Compose, owner `agrivision_user`; giữ nguyên database ứng dụng `agrivision_db`.

- Apply [postgres_schema.sql](../../../database/postgres_schema.sql) bằng `psql -v ON_ERROR_STOP=1` thành công và COMMIT.
- Đọc metadata bằng [verify_schema.sql](../../../database/verify_schema.sql): khớp snapshot về tên/kiểu/độ dài/nullability/default của 43 cột; định nghĩa 14 PK/FK/CHECK; tên/định nghĩa 19 index (6 PK + 13 secondary indexes).
- Tại thời điểm kiểm tra, sáu bảng nghiệp vụ có 0 bản ghi; service healthy, cổng local `127.0.0.1:55434`. Không seed hoặc tạo `__EFMigrationsHistory`.
- Không chạy application tests/model inference hoặc đổi cấu hình backend. SQL chuyển sang root `database/` với checksum không đổi; dữ liệu PostgreSQL vẫn nằm trong Docker volume. Chưa commit/push.

## Cách tái kiểm tra schema ứng dụng

Chạy tại root repository; không cần in mật khẩu:

```powershell
@'
SELECT table_name,column_name,data_type,is_nullable,character_maximum_length,column_default
FROM information_schema.columns WHERE table_schema='public'
ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace='public'::regnamespace
ORDER BY conrelid::regclass::text,conname;
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename,indexname;
SELECT * FROM "__EFMigrationsHistory";
'@ | docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U agrivision_user -d agrivision_db
```

Đây là đối chiếu schema, không phải chạy migration mới hoặc kiểm thử prediction E2E. Image backend đang chạy có thể khác working tree; snapshot DB chỉ chứng minh schema của instance được đọc.
