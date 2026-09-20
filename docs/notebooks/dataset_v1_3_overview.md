# Tổng quan dataset AgriVision AI v1.3

- **Phiên bản:** `v1.3`
- **Nguồn trực tiếp:** `v1.2` + Nguồn bổ sung (Lúa, Xoài)
- **Ngày tạo:** 2026-09-20
- **Jira Task:** `AGRI-21`
- **Trạng thái:** Hoàn tất bổ sung dữ liệu incremental merge, sẵn sàng dùng cho training
- **Bài toán:** Phân loại bệnh lá cây đa lớp (10 nhóm cây)

## 1. Tóm tắt

Dataset `v1.3` là bản dữ liệu được mở rộng từ `v1.2` bằng cách bổ sung hai cây mới: **Lúa** và **Xoài**.
Quy trình bổ sung áp dụng phương pháp **incremental merge** thông qua script `extend_dataset_with_new_plants.py`:
- Giữ nguyên toàn bộ 75.025 ảnh, nhãn, `group_id` và split của `v1.2`.
- Thực hiện audit, exact-dedup, gán `group_id`, chia train/val/test 70/10/20 và resize 224×224 đối với các mẫu ảnh mới thuộc Lúa và Xoài.
- Hợp nhất manifest v1.2 với ảnh mới để tạo dataset v1.3 hoàn chỉnh.

| Chỉ số | v1.2 | v1.3 (Dự kiến mở rộng) |
|---|---:|---:|
| Nhóm cây | 8 | **10** (Thêm Lúa, Xoài) |
| Kích thước ảnh | 224×224 | 224×224 |
| Định dạng | JPEG | JPEG |
| Quy trình bổ sung | Full-rebuild | Incremental merge |
| Leakage check | 0 leakage | 0 leakage giữa các split |

## 2. Phương pháp Incremental Merge (v1.2 → v1.3)

Quy trình bổ sung hai cây Lúa và Xoài tuân thủ các nguyên tắc sau:
1. **Bảo toàn v1.2**: Toàn bộ 75.025 ảnh của v1.2 được giữ nguyên checksum SHA-256, đường dẫn, group_id và phân bổ split (train/val/test).
2. **Audit & Dedup nguồn mới**:
   - Quét file, loại bỏ ảnh hỏng/từ chối.
   - Loại trùng SHA-256 nội bộ trong đợt ảnh mới.
   - Loại trùng SHA-256 đối chiếu với dataset v1.2 (nếu ảnh đã tồn tại trong v1.2).
3. **Gán Group ID cho ảnh mới**:
   - Các ảnh mới có cùng dHash (phash) được nhóm chung `group_id` dạng `grp_dhash_<hash>`.
   - Đảm bảo `group_id` mới không trùng lặp với tập `group_id` hiện tại của v1.2.
4. **Chia Split Group-Aware cho ảnh mới**:
   - Áp dụng `assign_class_groups()` với seed cố định `20260919` để chia ảnh mới theo tỷ lệ 70% Train / 10% Val / 20% Test cho từng lớp bệnh của Lúa và Xoài.
5. **Resize & letterbox padding**:
   - Resize giữ tỷ lệ theo cạnh dài nhất, căn giữa và pad màu RGB `(124, 116, 104)` về 224×224.
6. **Hợp nhất Manifest & Kiểm tra Leakage**:
   - Tạo các file manifest mới (`dataset_manifest.csv`, `train.csv`, `val.csv`, `test.csv`) trong `<dataset_root>/v1.3/manifests/`.
   - Kiểm tra ranh giới split: đảm bảo 0 `group_id` xuất hiện ở nhiều split.

## 3. Cách sử dụng script mở rộng dataset

Chạy script mở rộng từ root repository:

```powershell
python -m ai.tasks.agri_21.scripts.extend_dataset_with_new_plants `
    --new-source <dataset_root>/new_plants `
    --current-v12 <dataset_root>/v1.2 `
    --output <dataset_root>/v1.3
```

## 4. Artifact và vị trí lưu trữ

| Artifact | Vị trí |
|---|---|
| Ảnh dùng cho mô hình | `<dataset_root>/v1.3/images` |
| Manifest hợp nhất | `<dataset_root>/v1.3/manifests/dataset_manifest.csv` |
| Train split manifest | `<dataset_root>/v1.3/manifests/train.csv` |
| Validation split manifest | `<dataset_root>/v1.3/manifests/val.csv` |
| Test split manifest | `<dataset_root>/v1.3/manifests/test.csv` |
| Metadata phiên bản v1.3 | `<dataset_root>/v1.3/metadata/dataset_version.json` |
| Script xử lý | `ai/tasks/agri_21/scripts/extend_dataset_with_new_plants.py` |
| Unit test | `ai/tasks/agri_21/tests/test_extend_dataset_with_new_plants.py` |
