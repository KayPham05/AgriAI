# T004 - AGRI-58 Transfer Learning và Fine-tuning

- **Trạng thái:** Đã hoàn thành
- **Người thực hiện:** Chưa cập nhật
- **Ngày cập nhật:** 2026-10-08
- **Baseline đối chiếu:** T003 - AGRI-30

## 1. Mục tiêu

Cải thiện model ConvNeXt-Tiny baseline bằng chiến lược transfer learning và
fine-tuning trên dataset của dự án. Quy trình huấn luyện gồm hai giai đoạn:
freeze backbone để linear probing, sau đó unfreeze và fine-tune với learning
rate nhỏ hơn.

## 2. Công việc cần thực hiện

- Load ConvNeXt-Tiny pretrained trên ImageNet.
- Thay classification head theo đúng số lớp của bài toán.
- **Giai đoạn 1:** freeze backbone và chỉ train classification head.
- **Giai đoạn 2:** unfreeze một phần hoặc toàn bộ backbone để fine-tune.
- Sử dụng AdamW và Cosine LR Scheduler theo configuration của project.
- Lưu best checkpoint theo validation metric.
- Ghi lại đầy đủ hyperparameter và kết quả training.
- So sánh kết quả fine-tuned với baseline T003 - AGRI-30.

## 3. Cấu hình dự kiến

| Tham số | Giá trị |
|---|---|
| Model | ConvNeXt-Tiny |
| Pretrained | ImageNet |
| Dataset | `v1.4` |
| Input | `224x224` theo pipeline hiện tại |
| Optimizer | AdamW |
| Scheduler | Cosine decay |
| Learning rate | Giai đoạn fine-tune nhỏ hơn giai đoạn train head |
| Checkpoint | Best checkpoint theo validation F1 |

## 4. Đầu ra cần bàn giao

- Training script/config cho transfer learning.
- Best checkpoint của model fine-tuned.
- Training log và validation log.
- Accuracy và Macro F1.
- Bảng so sánh baseline T003 và fine-tuned model.
- Configuration của experiment.

## 5. Tiêu chí nghiệm thu

- [x] Model train thành công theo chiến lược freeze → unfreeze.
- [x] Best checkpoint được lưu đúng thư mục và liên kết với experiment.
- [x] Validation/test không sử dụng dữ liệu train.
- [x] Có Accuracy và Macro F1.
- [x] Có kết quả so sánh với T003 - AGRI-30.
- [x] Configuration của experiment được lưu lại.

## 6. Kết quả thực nghiệm

### Kết quả v1.4 fine-tuned

| Bài toán | Epoch | Best val F1 | Accuracy test | Macro F1 test | Checkpoint |
|---|---:|---:|---:|---:|---|
| Loài cây | 14 | `1.000000` | `0.999886` | `0.999881` | `ai/checkpoints/plant/best_convnext_tiny.pth` |
| Bệnh cây | 26 | `0.949307` | `0.964146` | `0.950007` | `ai/checkpoints/disease/best_convnext_tiny.pth` |

### So sánh với baseline v1.3

| Bài toán | Accuracy v1.3 | Accuracy v1.4 | Macro F1 v1.3 | Macro F1 v1.4 |
|---|---:|---:|---:|---:|
| Loài cây | `0.999452` | `0.999886` | `0.998253` | `0.999881` |
| Bệnh cây | `0.973073` | `0.964146` | `0.935802` | `0.950007` |

v1.3 được lưu tại `ai/kaggle/ai_v1.3/ai`. Kết quả v1.4 cải thiện Macro F1 ở
cả hai bài toán so với v1.3, nhưng Accuracy bệnh giảm; đây không phải phép
so sánh hoàn toàn kiểm soát vì hai phiên bản dataset có thể khác phân phối và
số lớp (v1.3 bệnh có 45 lớp, v1.4 có 44 lớp).

## 7. Blocker và ghi chú

- Đã dùng checkpoint/output trong `ai/kaggle/ai_v1.3` làm baseline đối chiếu.
- Training history v1.4 xác nhận 14 epoch cho plant và 26 epoch cho disease.
- Khi báo cáo chính thức cần ghi rõ khác biệt dataset v1.3/v1.4 để tránh kết luận
  sai về mức cải thiện tuyệt đối.
