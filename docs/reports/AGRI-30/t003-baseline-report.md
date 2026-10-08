# Báo cáo T003 - AGRI-30 Baseline ConvNeXt-Tiny

## Tóm tắt

Xây dựng baseline ConvNeXt-Tiny pretrained ImageNet cho hai bài toán trên
dataset v1.4: nhận diện loài cây và nhận diện bệnh cây.

## Kết quả

| Bài toán | Accuracy | Macro F1 | Weighted F1 | Best val F1 |
|---|---:|---:|---:|---:|
| Loài cây | 0.999886 | 0.999881 | 0.999886 | 1.000000 |
| Bệnh cây | 0.964146 | 0.950007 | 0.976337 | 0.949307 |

Plant hoàn thành 14 epoch; disease hoàn thành 26 epoch. Checkpoint được lưu
tại `ai/checkpoints/{plant,disease}/best_convnext_tiny.pth`.

## Cấu hình chính

ConvNeXt-Tiny, ImageNet pretrained, input `224x224`, AdamW weight decay `0.05`,
head learning rate `3e-4`, backbone learning rate `3e-5`, cosine decay với
warmup 3 epoch, label smoothing `0.1`, seed `42`.

## Kết luận

Baseline đủ làm mốc đối chiếu cho T004. Lỗi bệnh tập trung ở các cặp
`Khoe_manh`/`Dom_than_la` và `Chay_la`/`Dom_la_xam`.
