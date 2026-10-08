# Báo cáo T004 - AGRI-58 Transfer Learning và Fine-tuning

## Phạm vi

Đánh giá model ConvNeXt-Tiny v1.4 sau quy trình freeze backbone, train head,
sau đó unfreeze và fine-tune với learning rate nhỏ hơn.

## So sánh kết quả

| Bài toán | Accuracy v1.3 | Accuracy v1.4 | Macro F1 v1.3 | Macro F1 v1.4 |
|---|---:|---:|---:|---:|
| Loài cây | 0.999452 | 0.999886 | 0.998253 | 0.999881 |
| Bệnh cây | 0.973073 | 0.964146 | 0.935802 | 0.950007 |

Macro F1 v1.4 tăng ở cả hai bài toán. Accuracy bệnh giảm, cần diễn giải cùng
khác biệt phân phối dataset và số lớp giữa v1.3/v1.4.

## Bàn giao

- Checkpoint v1.4: `ai/checkpoints/plant/best_convnext_tiny.pth` và
  `ai/checkpoints/disease/best_convnext_tiny.pth`.
- Training history và summary: `ai/outputs/{plant,disease}/`.
- Baseline cũ: `ai/kaggle/ai_v1.3/ai/`.

## Kết luận

T004 đạt tiêu chí về training, checkpoint, metric và so sánh. So sánh chính
thức tiếp theo nên dùng cùng một dataset split để đo tác động của fine-tuning
riêng biệt với tác động thay đổi dataset.
