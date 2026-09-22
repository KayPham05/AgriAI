# AGRI-21 — Preprocessing & Augmentation

Đây là điểm vào chính cho toàn bộ bằng chứng của task AGRI-21.

## Trạng thái cuối

- Dataset `v1.3`: 82.073 ảnh, 10 loại cây, 58 lớp; trạng thái `v1_3_complete`.
- Split cố định theo `group_id`: 57.449 train, 8.209 validation, 16.415 test.
- Hậu kiểm v1.3: 0 cross-label group; 0 path, `group_id`, SHA-256 và near-duplicate
  high-confidence xuyên split.
- Augmentation v1.3: contact sheet đủ 10 cây đã đạt; toàn bộ 28 unit test AGRI-21 pass.
- Dataset `v1.2`: 75.025 ảnh 224×224, giữ tỷ lệ và center padding.
- Split cố định theo `group_id`: 52.517 train, 7.504 validation, 15.004 test.
- Cả ba split có đủ 42 lớp.
- Leakage cuối: 0 đường dẫn, `group_id`, SHA-256 và near-duplicate
  high-confidence xuyên split.
- DataLoader đọc trực tiếp ba manifest; không chia lại trong script training.
- Augmentation đã qua kiểm tra contact sheet.

## Tài liệu chính

- [Review các điểm chưa đạt của dataset v1.3](dataset_v1_3_gap_review.md)
- [Tổng quan chi tiết dataset v1.3](../../notebooks/dataset_v1_3_overview.md)
- [So sánh v1.3 hiện tại với snapshot cũ](../../notebooks/dataset_v1_3_current_vs_old_comparison.md)
- [Tổng quan chi tiết dataset v1.2](../../notebooks/dataset_v1_2_overview.md)
- [Nhật ký làm sạch dữ liệu](../../task-logs/AGRI-21/data_cleaning_log.md)
- [Báo cáo resize, preprocessing, augmentation và Definition of Done](dataset_v1_2_resize.md)
- [Chia tập theo group](dataset_v1_1_group_aware_split.md)
- [Rà soát Hamming near-duplicate](dataset_v1_1_hamming_near_duplicate_review.md)

Nhật ký làm sạch đã bao gồm checklist audit v1.0; báo cáo resize đã bao gồm
đối chiếu preprocessing và augmentation. Các báo cáo còn lại trong thư mục là
bằng chứng chi tiết theo từng bước. Mã
pipeline nằm tại `ai/tasks/agri_21/scripts/`; runtime DataLoader và transforms nằm
tại `ai/data/`.
