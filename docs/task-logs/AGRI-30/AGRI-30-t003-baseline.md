# T003 - AGRI-30 Baseline phân loại bằng ConvNeXt-Tiny

- **Người thực hiện:** HTNT
- **Ngày hoàn thành:** 2026-10-08
- **Nhánh:** feature/Model_Plant_Species_Classification
- **Pull request:** Chưa có

## 1. Công việc đã hoàn thành

Xây dựng baseline ConvNeXt-Tiny pretrained trên ImageNet cho hai bài toán độc
lập: nhận diện loài cây và nhận diện bệnh cây. Hai task dùng chung pipeline dữ
liệu v1.4 nhưng có classification head, checkpoint và thư mục output riêng.

## 2. Thay đổi chính

- Cấu hình task `plant` với 10 lớp loài cây.
- Cấu hình task `disease` với 44 lớp bệnh/trạng thái.
- Huấn luyện và đánh giá trên ba tập train/validation/test cố định.
- Lưu checkpoint tốt nhất riêng cho từng task.
- Sinh báo cáo phân loại, ma trận nhầm lẫn, các cặp nhãn dễ nhầm và danh sách mẫu dự đoán sai.
- Ghi lịch sử huấn luyện cho task plant.

## 3. Cấu hình

- **Dataset:** v1.4
- **Kích thước đầu vào:** 224x224
- **Mô hình:** ConvNeXt-Tiny pretrained trên ImageNet
- **Bộ tối ưu:** AdamW
- **Weight decay:** 0.05
- **Bộ lập lịch learning rate:** Cosine
- **Chiến lược:** đóng băng backbone ở giai đoạn đầu, sau đó fine-tune
- **Seed:** 42

## 4. Kết quả và kiểm tra

### Nhận diện loài cây

- Số mẫu test: 17.599
- Accuracy: 0.9998295 (99.983%)
- Balanced accuracy: 0.9998159
- Macro precision: 0.9998547
- Macro recall: 0.9998159
- Macro F1: 0.9998352 (99.984%)
- F1 tốt nhất trên validation: 1.0
- Số epoch đã hoàn thành: 10
- Thời gian huấn luyện: 64,57 phút

Các cặp nhãn bị nhầm nhiều nhất:

- `Ot` bị dự đoán thành `Cam`: 2 mẫu
- `Ca_chua` bị dự đoán thành `Ngo`: 1 mẫu

### Nhận diện bệnh cây

- Số mẫu test: 16.415
- Accuracy: 0.9730734 (97.307%)
- Balanced accuracy: 0.9592925
- Macro precision: 0.9332176
- Macro recall: 0.9592925
- Macro F1: 0.9358021 (93.580%)

Các cặp nhãn bị nhầm nhiều nhất:

- `Khoe_manh` bị dự đoán thành `Dom_than_la`: 227 mẫu
- `Khoe_manh` bị dự đoán thành `Sau_gai_an_la`: 30 mẫu
- `Chay_la` bị dự đoán thành `Dom_la_xam`: 15 mẫu

Output của task disease hiện có metric test và báo cáo phân loại, nhưng chưa có
`training_history.json` hoặc log loss theo từng epoch. Vì vậy report này chưa
ghi loss train/validation và epoch tốt nhất của disease.

Các file kết quả:

- `ai/checkpoints/plant/best_convnext_tiny.pth`
- `ai/checkpoints/disease/best_convnext_tiny.pth`
- `ai/outputs/plant/test_metrics.json`
- `ai/outputs/plant/training_history.json`
- `ai/outputs/plant/classification_report.txt`
- `ai/outputs/plant/test_confusion_matrix.png`
- `ai/outputs/disease/test_metrics.json`
- `ai/outputs/disease/classification_report.txt`
- `ai/outputs/disease/test_confusion_matrix.png`

Đã kiểm tra:

- [x] Có artifact huấn luyện/đánh giá cho plant và disease.
- [x] Tập test được tách khỏi dữ liệu huấn luyện.
- [x] Checkpoint tốt nhất được lưu riêng.
- [x] Đã ghi Accuracy và Macro F1.
- [x] Đã ghi báo cáo theo từng lớp.
- [x] Đã ghi ma trận nhầm lẫn và các cặp nhãn dễ nhầm.
- [x] Bộ test AI đạt: 42/42 test.

## 5. Vấn đề hoặc blocker

- Cần xuất training history của disease ở lần chạy sau để phân tích đầy đủ loss
  train/validation.
- Metric trên test nội bộ cao hơn kết quả trên ảnh thu thập thủ công; cần tiếp
  tục domain adaptation và error analysis.

## 6. Công việc tiếp theo

- Hoàn thành so sánh transfer learning/fine-tuning của T004.
- Bổ sung experiment tracking để tái hiện các lần chạy.
- Phân tích các cặp bệnh dễ nhầm và thu thập ảnh thực tế đại diện.
- Kiểm tra toàn bộ luồng frontend -> backend -> AI -> database bằng ảnh thật.
