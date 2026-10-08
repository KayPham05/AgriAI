# T007 - AGRI-68 Phân tích lỗi và độ bền vững

- **Trạng thái:** Đã hoàn thành phân tích dữ liệu hiện có
- **Ngày cập nhật:** 2026-10-08
- **Checkpoint phân tích:** v1.4

## 1. Nguồn dữ liệu

- `ai/outputs/plant/misclassified_samples.csv`
- `ai/outputs/plant/top_confusions.csv`
- `ai/outputs/disease/misclassified_samples.csv`
- `ai/outputs/disease/top_confusions.csv`
- `ai/outputs/{plant,disease}/test_metrics.json`

## 2. Tổng quan lỗi

| Bài toán | Mẫu test | Accuracy | Macro F1 | Ghi chú |
|---|---:|---:|---:|---|
| Loài cây | 17,599 | 0.999886 | 0.999881 | 2 lỗi được ghi nhận |
| Bệnh cây | 17,599 | 0.964146 | 0.950007 | Có lỗi tập trung ở một số cặp lớp |

## 3. Prediction sai tiêu biểu

### Nhận diện loài cây

| Nhãn thật | Dự đoán | Số lượng | Dấu hiệu dữ liệu |
|---|---|---:|---|
| `Ca_chua` | `Ngo` | 1 | Không có quality flag |
| `Ot` | `Cam` | 1 | `below_224` |

### Nhận diện bệnh cây

File `misclassified_samples.csv` lưu đường dẫn ảnh, nhãn thật, nhãn dự đoán,
`group_id` và `quality_flags`, giúp truy nguyên từng mẫu lỗi và kiểm tra trùng
nhóm ảnh. File hiện chưa lưu confidence của từng prediction.

## 4. Top confusion pairs

| Nhãn thật | Dự đoán | Số lượng | Nhận định khả nghi |
|---|---|---:|---|
| `Khoe_manh` | `Dom_than_la` | 465 | Visual similarity hoặc nhãn khỏe/bệnh khó phân tách |
| `Khoe_manh` | `Sau_gai_an_la` | 24 | Dấu hiệu tổn thương nhẹ, mất cân bằng lớp |
| `Chay_la` | `Dom_la_xam` | 15 | Triệu chứng đốm/cháy tương đồng |
| `Dom_la_xam` | `Chay_la` | 14 | Nhầm lẫn đối xứng theo biểu hiện hình ảnh |
| `Dom_la_phomopsis` | `Dom_tao` | 7 | Visual similarity |
| `Vang_lui` | `Thoi_chop_la` | 5 | Ít mẫu, cần kiểm tra chất lượng/nhãn |

Chi tiết đầy đủ nằm trong `ai/outputs/disease/top_confusions.csv`.

## 5. Phân tích nguyên nhân

- **Visual similarity:** `Chay_la` và `Dom_la_xam` nhầm lẫn hai chiều; các
  nhóm đốm/cháy có biểu hiện gần nhau.
- **Class imbalance:** các lỗi `Khoe_manh` → `Dom_than_la` cần được kiểm tra
  cùng số lượng mẫu mỗi lớp; các lớp ít mẫu có F1 thấp hơn.
- **Ảnh chất lượng thấp:** có mẫu plant mang cờ `below_224`, cần kiểm tra
  resize/crop và điều kiện chụp.
- **Background/lighting/che khuất:** chưa có nhãn metadata đủ để kết luận;
  cần bổ sung annotation khi review ảnh lỗi.
- **Label noise:** chưa thể khẳng định chỉ từ confusion matrix; cần review
  thủ công các mẫu lỗi có cùng `group_id`.

## 6. Confidence

Output hiện tại không lưu confidence trong `misclassified_samples.csv` hoặc
`test_metrics.json`, nên chưa thể xác định trực tiếp các lỗi confidence cao.
Đây là khoảng trống cần bổ sung trong lần đánh giá tiếp theo: lưu
`true_label`, `predicted_label`, `confidence`, `top_k` và entropy cho từng mẫu.

## 7. Đề xuất experiment tiếp theo

1. **T00X - Confidence-aware error analysis:** lưu confidence/top-k cho toàn
   bộ lỗi và lập danh sách lỗi confidence cao nhưng dự đoán sai.
2. Dùng class-weighted loss hoặc focal loss cho lớp ít mẫu và so sánh Macro F1.
3. Bổ sung augmentation có kiểm soát: crop, brightness/contrast và blur nhẹ;
   không augmentation validation/test.
4. Review thủ công các mẫu trong top confusion pairs, đặc biệt
   `Khoe_manh`/`Dom_than_la` và `Chay_la`/`Dom_la_xam`.
5. Kiểm tra duplicate/group leakage bằng `group_id` trước khi train lại.

## 8. Đối chiếu nghiệm thu

- [x] Thu thập prediction sai trên test set.
- [x] Có phân tích theo class và top confusion pairs.
- [x] Có nhận định nguyên nhân khả nghi dựa trên dữ liệu.
- [x] Có danh sách cải thiện có thể kiểm chứng bằng experiment.
- [x] Error analysis report được ghi nhận trong repository.
- [ ] Confidence từng lỗi chưa hoàn thành vì pipeline chưa xuất trường này.
