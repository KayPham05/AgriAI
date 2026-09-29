# Kiểm tra dataset v1.4: thay toàn bộ ảnh ớt

Ngày kiểm tra: 2026-09-28. Bằng chứng sinh tự động nằm trong `datasets/` (ngoài Git).

## Hợp đồng nhãn

Nhận định trước đây rằng sáu nhóm mới **chưa có ánh xạ được xác nhận vào năm lớp ớt cũ** vẫn đúng. Vì mục tiêu hiện nay là thay hẳn ảnh ớt, v1.4 dùng sáu nhóm làm **sáu lớp riêng**, không gán ép sang lớp cũ. Đây là thay đổi hợp đồng nhãn có chủ đích:

| v1.3: 469 ảnh, bỏ khỏi v1.4 | v1.4: 6.396 ảnh, đưa vào |
|---|---|
| `Ot___Dom_la`, `Ot___Khoe_manh`, `Ot___Ruoi_trang`, `Ot___Vang_la`, `Ot___Xoan_la` | `Ot___Dom_vi_khuan`, `Ot___Dom_la_cercospora`, `Ot___Virus_xoan_la`, `Ot___Khoe_manh`, `Ot___Thieu_dinh_duong`, `Ot___Phan_trang` |

SHA-256 ảnh ớt cũ và mới giao nhau bằng 0. Mọi bản ghi không phải ớt giữ nguyên đường dẫn, checksum, split và group từ v1.3. Tổng số lớp hợp chất tăng từ 58 lên 59; số tên `condition` sau Việt hóa là 44. `Ot___Khoe_manh` được dùng lại cho 1.342 ảnh `Healthy_Leaf` mới, không kế thừa 99 ảnh cũ. Mapping sáu lớp Ớt nằm ở index 40–45 theo thứ tự tên Việt; checkpoint dùng tên tiếng Anh trước đây cần hoán vị đầu ra trước khi dùng với manifest mới.

Việc tên nhóm phản ánh đúng bệnh học mới được xác nhận ở mức tên thư mục và manifest; chưa có xác nhận chuyên môn độc lập cho từng ảnh. Do đó báo cáo này xác nhận tính nhất quán kỹ thuật của nhãn, không xác nhận độ chính xác chẩn đoán của ảnh nguồn.

## Các gate dữ liệu đã kiểm tra

| Bước | Kết quả | Bằng chứng |
|---|---:|---|
| Audit ảnh mới | 7.074 hợp lệ; 1 ảnh nhỏ hơn 224 px | `datasets/v1.4_audit/metadata/dataset_version.json` |
| Loại trùng SHA-256 | 678 bản sao bỏ, 0 checksum mang hai nhãn; còn 6.396 ảnh | `datasets/v1.4_pepper_dedup/metadata/dataset_version.json` |
| Group/review near-duplicate | 10 cặp cùng nhãn đạt ngưỡng cao được gộp; không gộp cặp khác nhãn | `datasets/v1.4_pepper_dedup/metadata/dataset_version.json` và báo cáo review tại đó |
| Split ớt theo group | 4.478 / 640 / 1.278 ảnh train/val/test; 0 group xuyên split | metadata dedup |
| Resize | 6.396 ảnh ớt được đưa về 224×224, giữ tỷ lệ và pad giữa | `datasets/v1.4_pepper_resized/metadata/dataset_version.json` |
| Augmentation QA | Đã tạo contact sheet nhãn Việt cho cả 10 cây và riêng đủ 6 lớp Ớt; bản trước đổi tên đã được xem trực quan | `D:/AgriVisionAI_Data/v1.4/reports/augmentation_contact_sheet_vietnamese.png`, `pepper_augmentation_contact_sheet_vietnamese.png` |
| Ghép v1.4 | 88.000 ảnh, 10 cây, 59 lớp; 61.599 / 8.802 / 17.599 ảnh | `D:/AgriVisionAI_Data/v1.4/metadata/dataset_version.json` |
| Hậu kiểm | 0 path/group/SHA-256 xuyên split; 0 cặp high-confidence xuyên group và split sau review Hamming 0–5 | `D:/AgriVisionAI_Data/v1.4/reports/post_resize_leakage_summary.json`, `post_resize_hamming_0_to_5_summary.json` |

Ba manifest con khớp manifest chính; cả ba có đủ 59 lớp. Toàn bộ 88.000 ảnh được xác nhận checksum; metadata ảnh đều ghi 224×224. 602 trường hợp trùng perceptual hash xuyên split được soi tiếp và không có cặp nào đạt tiêu chí tương đồng cao. Manifest chính sau Việt hóa nhãn có SHA-256 `52d95e178700ad29faa64dd3c5095fe9029dd68f0f71ff833c9cf375b858b87e`; metadata lưu hash cũ để truy vết.

Bản chính đã được sao chép và kiểm tra đủ 88.000 checksum tại `D:/AgriVisionAI_Data/v1.4`. Mọi bản ghi không phải Ớt giữ nguyên toàn bộ field; 6.396 ảnh Ớt giữ nguyên SHA-256, group và split, chỉ đổi thư mục/nhãn theo bảng: `Bacterial_Spot → Dom_vi_khuan`, `Cercospora_Leaf_Spot → Dom_la_cercospora`, `Curl_Virus → Virus_xoan_la`, `Healthy_Leaf → Khoe_manh`, `Nutrition_Deficiency → Thieu_dinh_duong`, `Powdery_Mildew → Phan_trang`. Bản gốc được giữ tại `datasets/v1.4_english_label_archive/`; đường dẫn `datasets/v1.4/` cũ không còn.

Hai metadata trung gian ban đầu mang phiên bản nguồn cũ do script tái sử dụng giá trị cố định. Đã chỉnh thành v1.4 và đúng đường dẫn manifest nguồn; logic script cũng đã sửa. Metadata cuối của v1.4 vốn đã đúng. Các tệp trung gian được tách khỏi hardlink với ảnh cuối để chỉnh sửa nguồn sau này không đổi bản phát hành. Việc này không làm đổi manifest hay checksum ảnh cuối.

Contact sheet là kiểm tra mẫu trực quan, không thay thế việc rà nhãn từng ảnh. Một số ảnh gốc đã có lá chạm biên khung; transform hiện tại không khắc phục khuyết điểm ảnh nguồn đó.

## Trạng thái train

ConvNeXt-Tiny đã train đủ 10 epoch trên task `compound` với batch size 8 từ manifest trước đổi tên. Best validation Macro-F1 là **0,9662**; một lượt test trên 17.599 ảnh có accuracy **0,9890** và Macro-F1 **0,9631**. Lỗi `scheduler.step()` sau epoch cuối làm run không tự ghi summary dù checkpoint epoch 10 đã lưu; đã sửa code và khôi phục history/summary từ 10 sự kiện TensorBoard. Lượt test được chạy thủ công sau đó. Log và lỗi watcher gốc nằm tại `datasets/v1.4_english_label_archive/reports/`.

Checkpoint tiếng Anh và output gốc được lưu tại `ai/checkpoints/v1.4_english_label_archive/` và `ai/outputs/v1.4_english_label_archive/`. Checkpoint hiện hành `ai/checkpoints/v1.4/best_convnext_tiny.pth` được hoán vị classifier theo thứ tự nhãn Việt; đánh giá lại trên cùng 17.599 ảnh cho **đúng cùng năm metric tổng** với lượt gốc. Đây là kiểm tra tương đương của phép đổi nhãn, không phải chọn lại cấu hình bằng test. Các artifact đánh giá nhãn Việt nằm tại `ai/outputs/v1.4/`.
