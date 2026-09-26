# AGRI-003 - Plant Species Classification Baseline

- **Owner:** HT
- **Completion date:** 2026-09-26
- **Branch:** `feature/Model_Plant_Species_Classification`
- **Pull request:** Chưa tạo

## 1. Completed Work

Đã huấn luyện ConvNeXt-Tiny pretrained để phân loại 10 loài cây trên dataset
v1.3. Backbone được freeze trong 3 epoch đầu và fine-tune toàn bộ từ epoch 4.
Checkpoint tốt nhất đã được đánh giá trên test split cố định.

## 2. Main Changes

- Thay classification head theo 10 nhãn cây.
- Train 10 epoch với AdamW, warmup và cosine decay.
- Xuất checkpoint `best`/`last`, báo cáo từng lớp và confusion matrix.
- Ghi cấu hình và metric tại `docs/plant_baseline_results.yaml`.

## 3. Results and Verification

- Dataset: v1.3, test split 16.415 ảnh.
- Best checkpoint: epoch 8, validation macro-F1 `0.992100`.
- Test accuracy: `1.000000`.
- Test macro-F1: `1.000000`.
- Test weighted-F1: `1.000000`.
- Checkpoint: `ai/checkpoints/plant/best_convnext_tiny.pth`.
- Báo cáo: `ai/outputs/plant/`.

## 4. Issues or Blockers

Test nội bộ đạt 100%, nhưng manifest không có `source_id`, `capture_id`, vị trí
hoặc ID cây/lá. Kết quả chưa chứng minh khả năng khái quát trên ảnh thực địa
hoặc tập dữ liệu độc lập.

## 5. Remaining Work or Follow-up

- Gán experiment ID `EXP-XXX` khi nhóm xác nhận số thứ tự.
- Đo inference time trên phần cứng triển khai mục tiêu.
- Đánh giá thêm trên ảnh chụp mới từ nguồn độc lập.
