# AGRI-79 — Đồng bộ catalog dataset v1.4

Ngày thực hiện: 07/10/2026. Hoàn thành import vào PostgreSQL local
`agrivision_db`; chưa commit, push hay merge. Nghiệm thu inference thật và UI
toàn phần vẫn chưa hoàn thành.

Cập nhật sau chuyển SQL và bổ sung test ngày 07/10/2026: SQL nằm trong
`database/`; bản cuối chạy toàn bộ backend đạt **33 unit + 22 integration**,
failed 0, skipped 0. Chi tiết [hướng dẫn và test database](database_guide_testing.md).

Theo yêu cầu tiếp theo, catalog đã được đưa vào [migration backend](catalog_ef_migration.md)
và áp dụng bằng dotnet EF: hiện có 3 applied migrations; test mới nhất là
33 unit + 30 integration. Nội dung bên dưới mô tả lần import SQL trước đó.

## Nguồn mapping và cách cập nhật

- Manifest chính thức: `D:/AgriVisionAI_Data/v1.4/manifests/dataset_manifest.csv`.
- SHA-256 đã đối chiếu: `52d95e178700ad29faa64dd3c5095fe9029dd68f0f71ff833c9cf375b858b87e`.
- Thứ tự lớp dùng `sorted(compound_label)` theo
  [dataset.py](../../../ai/data/dataset.py), giữ nguyên chữ hoa/thường và dấu `_`.
- [SQL import](../../../database/import_dataset_v1_4_catalog.sql) chạy bằng
  job `psql` riêng, trong một transaction; không sửa EF migration đã áp dụng,
  trong lần import SQL này không đổi startup hoặc seed demo của test.
- Tái sử dụng ID các cây/bệnh/lớp legacy tương ứng, đổi tên/index theo dataset.
  Không xóa prediction, snapshot hoặc các lớp khoai tây ngoài v1.4.
- Nội dung bệnh mới chưa được duyệt, không tự thêm điều trị/thuốc. Tên hiển thị
  mới lấy từ key dataset và thay `_` bằng khoảng trắng; nội dung có sẵn được giữ.

## Kết quả thực tế

| Kiểm tra | Kết quả |
|---|---|
| Lớp active | **59**, index liên tục **0–58** |
| Đối chiếu index/name với manifest | **59/59 khớp chính xác** |
| Thành phần plant/condition trong từng class name | **59/59 khớp** |
| Bộ nhãn train/val/test | Cả ba khớp toàn bộ 59 lớp |
| Cây active / condition active | **10 / 44** |
| ID lớp cũ | Giữ nguyên **11/11** |
| Legacy ngoài dataset | 3 lớp Potato giữ ID, inactive, index **59–61** |
| Tổng bản ghi lớp | **62 = 59 active + 3 legacy inactive** |
| Lịch sử ứng dụng trước/sau | **0 / 0** prediction; bảo toàn lịch sử có dữ liệu đã được thử trên DB test |
| HTTP qua Next.js | `/api/plants`: 10 cây; `/api/diseases`: 44 condition; DB health Healthy |
| EF migration history | Giữ 2 migration; import catalog không tạo migration schema |

SQL thực tế đã COMMIT thành công. Backup trước import (local, ignored):
`.cache/database-verification/agrivision_before_v1_4_catalog_20261007_095820_57142351e63941589f38e3537bce6836.dump`
(26.215 bytes; chưa kiểm thử restore).

Bằng chứng đối chiếu (local, ignored):

- `.cache/database-verification/catalog-v1_4-before.csv`
- `.cache/database-verification/catalog-v1_4-after.csv`
- `.cache/database-verification/catalog-v1_4-verification.json`

## Kiểm thử và giới hạn

[CatalogImportTests](../../../backend/tests/AgriVision.IntegrationTests/Persistence/CatalogImportTests.cs)
kiểm tra PostgreSQL thật với DB trống và legacy: index, đủ 59 lớp, giữ ID,
giữ prediction/snapshot/nội dung cũ, lưu legacy inactive, chạy hai lần không
trùng ID, không thay lịch sử migration. Bộ integration đạt **15/15**, failed 0,
skipped 0. Sau chỉnh phân loại Healthy/thiếu dinh dưỡng, hai case import đã
chạy lại và đạt **2/2**. Các test dùng container tạm đã tự dọn.

Không thay hoặc kiểm chứng checkpoint, không chạy inference thật, không sửa
adapter frontend đang trộn danh mục tĩnh. Vì vậy API trả đủ catalog DB nhưng
UI bệnh chưa được coi là đã hiển thị đủ dữ liệu thật. Trong lần kiểm chứng SQL
này, demo seed 11 lớp còn dùng ở Development và mapping v1.4 cần import riêng.
Hiện tại, `DatasetV14Catalog` thay seed catalog demo và nạp 59 lớp trong mọi
môi trường qua migration riêng; SQL importer chỉ là tùy chọn đồng bộ lại.

Lệnh vận hành: [database guide](../../../.agents/commands/database.md).
