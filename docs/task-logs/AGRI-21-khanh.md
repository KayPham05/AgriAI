# AGRI-21 - Bổ sung cây Lúa và Xoài vào dataset (v1.3)

- **Owner:** KayPham05
- **Completion date:** 2026-09-20
- **Branch:** `AGRI-21-extend-dataset-with-rice-and-mango`
- **Pull request:** AGRI-21 Extend dataset with Rice and Mango (v1.3)

## 1. Completed Work
Triển khai quy trình incremental merge bổ sung hai cây Lúa và Xoài từ v1.2 sang dataset v1.3. Bảo toàn 100% dữ liệu v1.2 (75.025 ảnh, group_id, split membership), tự động lọc trùng exact SHA-256, gán group_id cho mẫu mới, chia train/val/test 70/10/20 group-aware, resize 224×224 letterbox center pad và cập nhật toàn bộ tài liệu dự án.

## 2. Main Changes
- `ai/tasks/agri_21/scripts/extend_dataset_with_new_plants.py`: Script thực thi luồng incremental merge mở rộng v1.3.
- `ai/tasks/agri_21/tests/test_extend_dataset_with_new_plants.py`: Unit test tự động kiểm tra luồng mở rộng.
- `docs/notebooks/dataset_v1_3_overview.md`: Tài liệu tổng quan chi tiết cho dataset v1.3.
- `docs/task-logs/AGRI-21/data_cleaning_log.md`: Thêm Bước 14 quy trình làm sạch Lúa & Xoài.
- `docs/notebooks/dataset_overview.md`: Cập nhật danh mục nguồn Lúa & Xoài.
- `docs/reports/AGRI-21/README.md`: Thêm liên kết tài liệu v1.3.

## 3. Results and Verification
- Chạy unit test: `python -m unittest discover -s ai/tasks/agri_21/tests` -> **20/20 PASS**.
- Đã xác minh 2 trường hợp: nạp dữ liệu từ thư mục riêng và nạp trực tiếp từ `v1.2/images/`.

## 4. Issues or Blockers
- Không có blocker. Dữ liệu v1.2 nguyên vẹn 100%.

## 5. Remaining Work or Follow-up
- Chạy script mở rộng trên môi trường sản xuất khi nạp đủ bộ dữ liệu ảnh Lúa và Xoài thực tế.
