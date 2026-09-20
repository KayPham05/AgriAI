# AGRI-21 — Preprocessing & Augmentation

Đây là điểm vào chính cho toàn bộ bằng chứng của task AGRI-21.

## Trạng thái cuối

- Dataset `v1.2`: 75.025 ảnh 224×224, giữ tỷ lệ và center padding.
- Split cố định theo `group_id`: 52.517 train, 7.504 validation, 15.004 test.
- Cả ba split có đủ 42 lớp.
- Leakage cuối: 0 đường dẫn, `group_id`, SHA-256 và near-duplicate
  high-confidence xuyên split.
- DataLoader đọc trực tiếp ba manifest; không chia lại trong script training.
- Augmentation đã qua kiểm tra contact sheet.

## Tài liệu chính

- [Tổng quan chi tiết dataset v1.2](dataset_v1_2_overview.md)
- [Nhật ký làm sạch dữ liệu](data_cleaning_log.md)
- [Báo cáo resize, preprocessing, augmentation và Definition of Done](dataset_v1_2_resize.md)
- [Chia tập theo group](dataset_v1_1_group_aware_split.md)
- [Rà soát Hamming near-duplicate](dataset_v1_1_hamming_near_duplicate_review.md)

Nhật ký làm sạch đã bao gồm checklist audit v1.0; báo cáo resize đã bao gồm
đối chiếu preprocessing và augmentation. Các báo cáo còn lại trong thư mục là
bằng chứng chi tiết theo từng bước. Mã
pipeline nằm tại `ai/scripts/dataset/`; runtime DataLoader và transforms nằm
tại `ai/data/`.
