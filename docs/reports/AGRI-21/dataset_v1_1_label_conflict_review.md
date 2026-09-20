# Dataset v1.1 — Kết quả bước 2: review xung đột nhãn

- **Ngày thực hiện:** 2026-09-19
- **Input:** `<dataset_root>/v1.1` sau exact dedup
- **Trạng thái mới:** `exact_dedup_and_label_conflict_review`
- **Phạm vi:** 8 SHA-256/20 file có cùng nội dung nhưng nằm ở nhiều nhãn.

## 1. Nguyên tắc quyết định

- Chỉ khôi phục ảnh khi triệu chứng quan sát được phân biệt đủ rõ giữa các nhãn đang xung đột.
- Không suy đoán tác nhân gây bệnh nếu ảnh chỉ cho thấy triệu chứng chung.
- Ảnh có đồng thời vàng lá và xoăn lá nhưng không đủ chi tiết tiếp tục bị cách ly.
- Mỗi SHA được khôi phục chỉ tạo một canonical; các bản cùng nội dung ở nhãn còn lại không được copy.

Với Ngô, tài liệu University of Minnesota và University of Nebraska mô tả gray leaf spot có vết chữ nhật, mép song song theo gân lá; northern leaf blight thường có vết lớn hình thoi/xì gà với đầu thuôn hoặc tròn. Đây là đặc trưng được dùng để phân biệt hai ảnh Ngô: [UMN Extension](https://apps.extension.umn.edu/garden/diagnose/plant/vegetable/corn/leavesspotsstreaks.html), [UNL CropWatch](https://cropwatch.unl.edu/2018/differentiating-corn-leaf-diseases/).

Nhóm Ớt bắt nguồn từ các lớp `Chili__healthy`, `Chili__leaf curl`, `Chili__whitefly` và `Chili__yellowish` trong [Plant Disease Classification Merged Dataset](https://www.kaggle.com/datasets/alinedobrovsky/plant-disease-classification-merged-dataset). Các lớp này có biểu hiện trực quan chồng lấn nên review chỉ sửa trường hợp rõ ràng, không xem đây là chẩn đoán bệnh học hoàn chỉnh.

## 2. Bảng quyết định

| SHA-256 rút gọn | Nhãn xung đột | Quyết định | Tin cậy | Lý do |
|---|---|---|---|---|
| `9120578a76…` | `Ngo___Chay_la` / `Ngo___Dom_la_xam` | `Ngo___Dom_la_xam` | Cao | Nhiều vết chữ nhật hẹp, mép song song và giới hạn bởi gân lá. |
| `ee3838e224…` | `Ngo___Chay_la` / `Ngo___Dom_la_xam` | `Ngo___Chay_la` | Cao | Một vết lớn hình thoi/xì gà với hai đầu thuôn. |
| `b3b7e136f8…` | `Ot___Khoe_manh` / `Ot___Xoan_la` | `Ot___Xoan_la` | Cao | Đọt và lá non biến dạng, cuộn rõ; không phù hợp lớp khỏe. |
| `d68d901f85…` | `Ot___Ruoi_trang` / `Ot___Xoan_la` | `Ot___Xoan_la` | Vừa | Lá nhăn/cuộn rõ nhưng không thấy ruồi trắng trong ảnh. |
| `216ee24be4…` | `Ot___Vang_la` / `Ot___Xoan_la` | Tiếp tục cách ly | Thấp | Ảnh 100×100 có đồng thời vàng và xoăn lá. |
| `54b484a26d…` | `Ot___Vang_la` / `Ot___Xoan_la` | Tiếp tục cách ly | Thấp | Khảm vàng và biến dạng lá chồng lấn. |
| `b7ce7f4462…` | `Ot___Vang_la` / `Ot___Xoan_la` | Tiếp tục cách ly | Thấp | Có cả vàng loang và xoăn/biến dạng. |
| `f0404c3f8b…` | `Ot___Vang_la` / `Ot___Xoan_la` | Tiếp tục cách ly | Thấp | Ảnh 100×100 không đủ chi tiết để chọn nhãn. |

Ảnh đối chứng — Tám ảnh xung đột nhãn: `<dataset_root>/v1.1/reports/label_conflict_review.png`.

## 3. Kết quả áp dụng

| Chỉ số | Sau bước 1 | Sau bước 2 |
|---|---:|---:|
| Ảnh/SHA duy nhất trong `v1.1` | 75.028 | 75.032 |
| SHA xung đột đã giải quyết | 0 | 4 |
| File nguồn thuộc nhóm đã giải quyết | 0 | 8 |
| SHA tiếp tục cách ly | 8 | 4 |
| File nguồn tiếp tục cách ly | 20 | 12 |

Bốn canonical được thêm:

- `Ngo/Dom_la_xam/Ngo_DomLaXam_00101.jpg`
- `Ngo/Chay_la/Ngo_ChayLa_00120.jpg`
- `Ot/Xoan_la/Ot_XoanLa_00092.jpg`
- `Ot/Xoan_la/Ot_XoanLa_00019.jpg`

## 4. Artifact kiểm tra

- Quyết định đầy đủ: `<dataset_root>/v1.1/reports/label_conflict_review.csv`
- Contact sheet 8 ảnh: `<dataset_root>/v1.1/reports/label_conflict_review.png`
- Mẫu ngữ cảnh bốn lớp Ớt: `<dataset_root>/v1.1/reports/label_conflict_context/`
- Mapping đã cập nhật: `<dataset_root>/v1.1/reports/exact_dedup_mapping.csv`
- Backup bước 1: `<dataset_root>/v1.1/reports/step1_backup_before_label_review/`

## 5. Xác minh

- [x] Manifest có 75.032 dòng và 75.032 SHA-256 duy nhất.
- [x] Thư mục ảnh có 75.032 file.
- [x] Mapping vẫn có đủ 129.867 file nguồn.
- [x] Bốn canonical mới tồn tại và checksum khớp.
- [x] Bốn nhóm/12 file chưa chắc chắn vẫn mang trạng thái `quarantined_label_conflict`.
- [x] Ba unit test dữ liệu chạy thành công.
- [x] Ảnh nguồn không bị sửa hoặc xóa.

## 6. Chưa thực hiện

- [ ] Không ép nhãn cho bốn nhóm Ớt còn mơ hồ.
- [x] Đã nhóm near-duplicate/dHash thành `group_id` nguồn; xem `dataset_v1_1_group_assignment.md`.
- [ ] Chưa chia train/validation/test.

Bước 2 được xem là hoàn thành với kết quả một phần có kiểm soát: bốn nhóm đã giải quyết, bốn nhóm tiếp tục cách ly để tránh đưa nhãn nhiễu vào training.
