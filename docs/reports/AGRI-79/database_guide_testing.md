# AGRI-79 — Hướng dẫn Docker, tổ chức SQL và test database

Ngày kiểm tra: 07/10/2026; branch `AGRI-79-database-integration`, working tree
chưa commit. Hoàn thành phạm vi chuyển SQL, hướng dẫn và test được yêu cầu.

Báo cáo này ghi lại đợt kiểm chứng trước khi thêm `DatasetV14Catalog`.
Hiện tại catalog được nạp qua migration, SQL import riêng là tùy chọn;
kết quả mới hơn (33 unit + 30 integration) nằm trong
[báo cáo migration catalog](catalog_ef_migration.md).

## Thay đổi

- Chuyển SQL catalog từ `backend/sql/` vào
  [database/import_dataset_v1_4_catalog.sql](../../../database/import_dataset_v1_4_catalog.sql).
  Hai SQL ERD baseline đã có trong `database/` được giữ nguyên.
- Cập nhật resource path trong integration test và toàn bộ hướng dẫn/report
  có đường dẫn tới SQL catalog. Migration C# vẫn nằm tại backend persistence.
- Viết [hướng dẫn Docker và database](../../docker_database_guide.md):
  khởi tạo/build, migration riêng, import catalog, xem history/SQL, backup,
  thêm/xóa migration nháp, rollback trên DB thử nghiệm, cập nhật và tests.
- Xuất SQL EF để đọc ở `database/generated/ef_migrations.sql` (local/ignored).
  Source migration C# và ba source SQL vẫn không bị ignore.

## Test PostgreSQL được bổ sung

[CatalogImportTests.cs](../../../backend/tests/AgriVision.IntegrationTests/Persistence/CatalogImportTests.cs)
ở đợt kiểm chứng này có **9 case**, chạy PostgreSQL Testcontainers thật:

| Case | Điều kiểm chứng |
|---|---|
| DB trống / legacy (2) | Đủ 59 index/name và plant/condition identities theo fixture v1.4 độc lập; 10 cây, 44 condition; Healthy/thiếu dinh dưỡng; import hai lần giữ ID; bảo toàn prediction/snapshot/nội dung cũ và lớp inactive |
| Xung đột plant alias / disease alias (2) | Từ chối khi legacy và canonical cùng tồn tại |
| Class identity trùng (1) | Từ chối lớp trùng sau dịch nhãn legacy |
| Sai plant / sai condition (2) | Từ chối quan hệ không khớp class name v1.4 |
| Cặp plant–condition đã bị lớp legacy chiếm (1) | Unique constraint lỗi sau các thao tác rename/create/reindex; rollback toàn bộ |
| Nội dung đã duyệt và canonical inactive (1) | Giữ approved content/medication/condition type/scientific name/ID; re-activate đúng lớp và không duyệt nội dung mới |

Sáu case lỗi so sánh mọi hàng/trường trong **9 bảng nghiệp vụ** trước/sau,
đồng thời kiểm tra lịch sử migration vẫn giữ hai dòng. Fixture 59 nhãn đã đối
chiếu manifest v1.4; CI không cần tải dataset/checkpoint để chạy các test này.

## Kết quả của đợt kiểm chứng này

Lệnh chạy:

```powershell
dotnet test backend/AgriVision.sln --no-restore --verbosity quiet --logger trx --results-directory .cache/database-verification/database-guide-final-20261007
```

- Unit **33/33**, integration **22/22**, failed **0**, skipped **0**.
- TRX local/ignored:
  `.cache/database-verification/database-guide-final-20261007/Admin_ADMIN-PC_2026-10-07_10_13_00.trx`
  (unit) và `Admin_ADMIN-PC_2026-10-07_10_13_02.trx` (integration).
- `dotnet ef migrations list --no-connect`: liệt kê hai migration hiện tại;
  offline nên không khẳng định applied/pending status từ lệnh này.
- `dotnet ef migrations script --idempotent`: xuất SQL thành công; không thực thi
  SQL export trên database ứng dụng.
- `dotnet ef migrations has-pending-model-changes`: không có model change sau
  migration cuối. Dùng connection design-time giả để chạy offline, không kết nối DB.
- Hướng dẫn: parse **23** block PowerShell không lỗi; **10** link nội bộ hợp lệ.
- Không còn reference vận hành tới đường dẫn SQL cũ. `git diff --check` đạt.

Container test được tự dọn. Không tạo/xóa/rollback migration trên DB ứng dụng,
không reset volume, không chạy inference thật hoặc GitHub Actions. Bộ tests
hiện bao phủ các nhánh lỗi đã xác định của import; không khẳng định mọi lỗi
vận hành như mất kết nối giữa transaction, deadlock hoặc phục hồi backup đã thử.
