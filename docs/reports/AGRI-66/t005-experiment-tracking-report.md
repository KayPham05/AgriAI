# Báo cáo T005 - AGRI-66 Experiment Tracking

## Quy ước

Mỗi lần chạy có một ID duy nhất. Hai experiment đã ghi nhận:

| ID | Bài toán | Dataset | Checkpoint |
|---|---|---|---|
| `EXP-001` | Loài cây | v1.4 | `ai/checkpoints/plant/best_convnext_tiny.pth` |
| `EXP-002` | Bệnh cây | v1.4 | `ai/checkpoints/disease/best_convnext_tiny.pth` |

## Metric

| ID | Accuracy | Precision macro | Recall macro | Macro F1 | Weighted F1 |
|---|---:|---:|---:|---:|---:|
| `EXP-001` | 0.999886 | 0.999868 | 0.999894 | 0.999881 | 0.999886 |
| `EXP-002` | 0.964146 | 0.952251 | 0.967859 | 0.950007 | 0.976337 |

## Khả năng tái hiện

Configuration nằm trong `ai/configs/config.py`; training history, summary và
test metrics nằm trong `ai/outputs/{plant,disease}/`. `inference_time` chưa được
ghi trong pipeline hiện tại và cần bổ sung nếu dùng làm chỉ số benchmark.
