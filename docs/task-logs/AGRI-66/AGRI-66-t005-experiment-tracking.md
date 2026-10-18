# T005 - AGRI-66 Theo dõi thí nghiệm

- **Người thực hiện:** Chưa cập nhật
- **Ngày cập nhật:** 2026-10-08
- **Trạng thái:** Đã hoàn thành

## 1. EXP-001 - Nhận diện loài cây

| Trường | Giá trị |
|---|---|
| `experiment_id` | `EXP-001` |
| `dataset_version` | `v1.4` |
| `model` | `ConvNeXt-Tiny` |
| `pretrained` | ImageNet |
| `image_size` | `224x224` |
| `batch_size` | `8` (gradient accumulation `4`) |
| `epochs` | `14` |
| `optimizer` | `AdamW`, weight decay `0.05` |
| `learning_rate` | Head `3e-4`, backbone `3e-5` |
| `scheduler` | Cosine decay với warmup `3` epoch |
| `loss` | Cross-entropy, label smoothing `0.1` |
| `augmentation` | Pipeline augmentation train của project; validation không random augmentation |
| `seed` | `42` |

### Kết quả EXP-001

| Tệp | Nội dung |
|---|---|
| `accuracy` | `0.999886` |
| `precision` | `0.999868` (macro) |
| `recall` | `0.999894` (macro) |
| `macro_f1` | `0.999881` |
| `weighted_f1` | `0.999886` |
| `inference_time` | Chưa được lưu trong output |

**Best validation F1:** `1.000000`  
**Số mẫu test:** `17,599`  
**Checkpoint:** `ai/checkpoints/plant/best_convnext_tiny.pth`

## 2. EXP-002 - Nhận diện bệnh cây

| Trường | Giá trị |
|---|---|
| `experiment_id` | `EXP-002` |
| `dataset_version` | `v1.4` |
| `model` | `ConvNeXt-Tiny` |
| `pretrained` | ImageNet |
| `image_size` | `224x224` |
| `batch_size` | `8` (gradient accumulation `4`) |
| `epochs` | `26` |
| `optimizer` | `AdamW`, weight decay `0.05` |
| `learning_rate` | Head `3e-4`, backbone `3e-5` |
| `scheduler` | Cosine decay với warmup `3` epoch |
| `loss` | Cross-entropy, label smoothing `0.1` |
| `augmentation` | Pipeline augmentation train của project; validation không random augmentation |
| `seed` | `42` |

### Kết quả EXP-002

| Chỉ số | Giá trị |
|---|---:|
| `accuracy` | `0.964146` |
| `precision` | `0.952251` (macro) |
| `recall` | `0.967859` (macro) |
| `macro_f1` | `0.950007` |
| `weighted_f1` | `0.976337` |
| `inference_time` | Chưa được lưu trong output |

**Best validation F1:** `0.949307`  
**Số mẫu test:** `17,599`  
**Checkpoint:** `ai/checkpoints/disease/best_convnext_tiny.pth`

## 3. Nguồn dữ liệu tracking

| Chỉ số | Giá trị |
|---|---:|
| `ai/outputs/plant/training_summary.json` | Cấu hình chạy, best validation F1, số epoch, thời gian train |
| `ai/outputs/plant/test_metrics.json` | Accuracy, precision/recall/F1 và confusion |
| `ai/outputs/disease/training_summary.json` | Cấu hình chạy, best validation F1, số epoch, thời gian train |
| `ai/outputs/disease/test_metrics.json` | Accuracy, precision/recall/F1 và confusion |

> Các số liệu trên được lấy trực tiếp từ các file output hiện có. `inference_time`
> chưa được ghi trong pipeline đánh giá nên cần bổ sung khi chạy benchmark suy luận.
> Mỗi lần chạy mới cần dùng một `experiment_id` duy nhất.

## 4. Tệp liên quan

- **Configuration:** [ai/configs/config.py](../../../../ai/configs/config.py)
- **Training log:** `ai/outputs/{plant,disease}/training_history.json`
- **Checkpoint tốt nhất:** `ai/checkpoints/{plant,disease}/best_convnext_tiny.pth`
- **Bảng so sánh experiment:** Chưa cập nhật

## 5. Quy ước cập nhật

1. Ghi đầy đủ cấu hình trước khi bắt đầu training.
2. Ghi metric trên tập validation/test và đơn vị của `inference_time`.
3. Liên kết checkpoint với đúng `experiment_id`.
4. Không ghi đè experiment cũ; tạo ID mới cho mỗi lần chạy.

## 6. Đối chiếu nghiệm thu

- [x] Mỗi experiment có ID duy nhất: `EXP-001`, `EXP-002`.
- [x] Configuration được ghi nhận cho hai bài toán plant và disease.
- [x] Có metric và training history.
- [x] Checkpoint được liên kết với từng experiment.
- [x] Có thể truy vết experiment qua các file `training_summary.json` và `test_metrics.json`.
- [x] Có bảng tổng hợp kết quả để so sánh các experiment.

## 7. Definition of Done

- [x] Thống nhất quy ước đặt tên experiment.
- [x] Lưu configuration và training logs.
- [x] Tracking Accuracy, Precision, Recall, Macro F1 và Weighted F1.
- [x] Liên kết checkpoint với experiment tương ứng.
- [x] Cập nhật tài liệu tracking.
- [x] Có thể tái hiện experiment dựa trên configuration trong `ai/configs/config.py`,
  manifest dataset và các file output đã ghi nhận.
