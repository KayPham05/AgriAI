# Báo cáo T007 - AGRI-68 Error Analysis và Robustness

## Phạm vi dữ liệu

Phân tích `misclassified_samples.csv`, `top_confusions.csv` và
`test_metrics.json` của plant/disease v1.4.

## Phát hiện chính

- Plant có 2 lỗi trong 17,599 mẫu; một mẫu có cờ chất lượng `below_224`.
- Disease có Macro F1 `0.950007`.
- Cặp nhầm nhiều nhất là `Khoe_manh` → `Dom_than_la` (465 mẫu).
- Các cặp đáng chú ý khác: `Khoe_manh` → `Sau_gai_an_la` (24),
  `Chay_la` ↔ `Dom_la_xam` (15 và 14).

## Nguyên nhân khả nghi

Visual similarity giữa triệu chứng đốm/cháy, class imbalance và ảnh chất lượng
thấp là các nguyên nhân cần ưu tiên kiểm chứng. Background, lighting, che khuất
và label noise chưa có metadata đủ để kết luận.

## Đề xuất

1. Bổ sung confidence/top-k/entropy vào output lỗi.
2. Review thủ công các top confusion pairs.
3. Thử class-weighted loss hoặc focal loss.
4. Thử augmentation brightness/contrast, crop và blur nhẹ.
5. Kiểm tra duplicate/group leakage bằng `group_id`.

Confidence của prediction sai chưa thể phân tích vì pipeline hiện chưa lưu
trường confidence trong file lỗi.
