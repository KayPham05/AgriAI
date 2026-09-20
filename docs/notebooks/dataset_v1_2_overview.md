# Tổng quan dataset AgriVision AI v1.2

- **Phiên bản:** `v1.2`
- **Nguồn trực tiếp:** `v1.1`
- **Nguồn gốc:** `v1.0`
- **Ngày hoàn thành:** 2026-09-20
- **Trạng thái:** hoàn thành Definition of Done, sẵn sàng dùng cho training
- **Bài toán:** phân loại bệnh lá cây đa lớp

## 1. Tóm tắt

Dataset `v1.2` là bản dữ liệu đã làm sạch, loại trùng, xử lý xung đột nhãn,
gom nhóm ảnh cùng nguồn, chia tập theo `group_id` và chuẩn hóa toàn bộ ảnh về
224×224. Dataset gồm **75.025 ảnh JPEG**, **42 lớp** thuộc **8 nhóm cây**.

Ba tập train, validation và test được cố định bằng manifest. DataLoader đọc
trực tiếp các manifest này và không chia lại dữ liệu trong lúc training. Kiểm
tra cuối không phát hiện đường dẫn, `group_id`, SHA-256 hoặc near-duplicate
high-confidence xuất hiện xuyên split.

| Chỉ số | Giá trị |
|---|---:|
| Tổng số ảnh | 75.025 |
| Nhóm cây | 8 |
| Lớp phân loại | 42 |
| `group_id` cuối | 40.200 |
| Kích thước ảnh | 224×224 |
| Định dạng ảnh | JPEG |
| Dung lượng ảnh theo manifest | 1,388 GiB |
| Train / validation / test | 52.517 / 7.504 / 15.004 |
| Tỷ lệ thực tế | 69,9993% / 10,0020% / 19,9987% |

## 2. Quá trình hình thành phiên bản

### Từ v1.0 đến v1.1

- Audit 129.867 ảnh nguồn thuộc 42 lớp; không có ảnh hỏng.
- Phát hiện và bỏ khỏi bản làm sạch 54.819 bản trùng SHA-256 cùng nhãn.
- Rà soát thủ công các nhóm có cùng SHA-256 nhưng khác nhãn.
- Giữ cách ly 12 file thuộc bốn hash có nhãn Ớt không đủ rõ.
- Gán `group_id` cho ảnh cùng nguồn hoặc gần trùng nhau.
- Cách ly thêm 6 file thuộc ba nhóm Ớt near-duplicate xung đột nhãn.
- Rà soát Hamming 1–5 và cách ly một ảnh Ngô trùng nguồn nhưng khác nhãn.

### Từ v1.1 đến v1.2

- Giữ nguyên 75.025 ảnh hoạt động và toàn bộ nhãn.
- Resize giữ tỷ lệ, căn giữa và pad về 224×224.
- Tính lại SHA-256 và dHash trên ảnh đầu ra.
- Audit near-duplicate hậu-resize, gộp lại các group cùng nguồn và chia lại
  theo group với seed `20260919`.
- Giữ nguyên tổng số ảnh của từng split sau lần chia cuối.

Dataset `v1.0` và `v1.1` vẫn được giữ riêng; quá trình tạo `v1.2` không chỉnh
sửa trực tiếp ảnh nguồn.

## 3. Phân bố theo nhóm cây

| Nhóm cây | Số lớp | Tổng ảnh | Tỷ trọng | Train | Validation | Test | Ảnh khỏe | Ảnh bệnh |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Cà chua | 10 | 18.146 | 24,19% | 12.703 | 1.815 | 3.628 | 1.585 | 16.561 |
| Cà phê | 5 | 3.756 | 5,01% | 2.630 | 377 | 749 | 62 | 3.694 |
| Cam | 4 | 38.432 | 51,23% | 26.902 | 3.843 | 7.687 | 9.584 | 28.848 |
| Chè | 5 | 1.539 | 2,05% | 1.077 | 154 | 308 | 222 | 1.317 |
| Ngô | 4 | 4.185 | 5,58% | 2.930 | 418 | 837 | 1.162 | 3.023 |
| Nho | 4 | 4.062 | 5,41% | 2.843 | 406 | 813 | 423 | 3.639 |
| Ớt | 5 | 469 | 0,63% | 328 | 47 | 94 | 99 | 370 |
| Sầu riêng | 5 | 4.436 | 5,91% | 3.104 | 444 | 888 | 976 | 3.460 |
| **Tổng** | **42** | **75.025** | **100%** | **52.517** | **7.504** | **15.004** | **14.113** | **60.912** |

Ảnh khỏe chiếm 18,81%; ảnh bệnh chiếm 81,19%. Cam chiếm hơn một nửa dataset,
trong khi toàn bộ nhóm Ớt chỉ chiếm 0,63%. Vì vậy dataset có mất cân bằng rõ
rệt giữa nhóm cây và giữa các lớp.

## 4. Phân bố 42 lớp

| Nhóm cây | Tình trạng | Tổng ảnh | Group | Train | Validation | Test |
|---|---|---:|---:|---:|---:|---:|
| Cà chua | Cháy lá sớm | 1.000 | 1.000 | 700 | 100 | 200 |
| Cà chua | Đốm lá Septoria | 1.771 | 1.771 | 1.240 | 177 | 354 |
| Cà chua | Đốm mục tiêu | 1.404 | 1.404 | 983 | 140 | 281 |
| Cà chua | Đốm vi khuẩn | 2.127 | 2.127 | 1.489 | 213 | 425 |
| Cà chua | Khỏe mạnh | 1.585 | 1.585 | 1.109 | 159 | 317 |
| Cà chua | Mốc lá | 952 | 952 | 667 | 95 | 190 |
| Cà chua | Mốc sương | 1.901 | 1.901 | 1.331 | 190 | 380 |
| Cà chua | Nhện đỏ | 1.676 | 1.676 | 1.173 | 168 | 335 |
| Cà chua | Virus khảm lá | 373 | 373 | 261 | 37 | 75 |
| Cà chua | Virus xoăn vàng lá | 5.357 | 5.357 | 3.750 | 536 | 1.071 |
| Cà phê | Đốm cháy Phoma | 691 | 181 | 483 | 70 | 138 |
| Cà phê | Đốm lá Cercospora | 322 | 80 | 225 | 32 | 65 |
| Cà phê | Gỉ sắt | 1.042 | 518 | 730 | 104 | 208 |
| Cà phê | Khỏe mạnh | 62 | 13 | 46 | 6 | 10 |
| Cà phê | Sâu đục lá | 1.639 | 445 | 1.146 | 165 | 328 |
| Cam | Khỏe mạnh | 9.584 | 2.247 | 6.709 | 958 | 1.917 |
| Cam | Loét vi khuẩn | 11.248 | 1.500 | 7.873 | 1.125 | 2.250 |
| Cam | Mắc nhiều bệnh cùng lúc | 4.800 | 474 | 3.360 | 480 | 960 |
| Cam | Vàng lá thiếu dinh dưỡng | 12.800 | 1.918 | 8.960 | 1.280 | 2.560 |
| Chè | Cháy lá nâu | 339 | 339 | 237 | 34 | 68 |
| Chè | Đốm lá đỏ | 429 | 429 | 300 | 43 | 86 |
| Chè | Đốm tảo | 339 | 339 | 237 | 34 | 68 |
| Chè | Khỏe mạnh | 222 | 219 | 156 | 22 | 44 |
| Chè | Thán thư | 210 | 210 | 147 | 21 | 42 |
| Ngô | Cháy lá | 1.144 | 1.144 | 801 | 114 | 229 |
| Ngô | Đốm lá xám | 573 | 573 | 401 | 57 | 115 |
| Ngô | Gỉ sắt | 1.306 | 1.305 | 914 | 131 | 261 |
| Ngô | Khỏe mạnh | 1.162 | 1.162 | 814 | 116 | 232 |
| Nho | Cháy lá | 1.076 | 1.076 | 753 | 108 | 215 |
| Nho | Esca | 1.383 | 1.383 | 968 | 138 | 277 |
| Nho | Khỏe mạnh | 423 | 423 | 296 | 42 | 85 |
| Nho | Thối đen | 1.180 | 1.180 | 826 | 118 | 236 |
| Ớt | Đốm lá | 100 | 100 | 70 | 10 | 20 |
| Ớt | Khỏe mạnh | 99 | 99 | 69 | 10 | 20 |
| Ớt | Ruồi trắng | 99 | 97 | 69 | 10 | 20 |
| Ớt | Vàng lá | 79 | 75 | 55 | 8 | 16 |
| Ớt | Xoăn lá | 92 | 90 | 65 | 9 | 18 |
| Sầu riêng | Cháy lá | 936 | 936 | 655 | 94 | 187 |
| Sầu riêng | Đốm lá Phomopsis | 878 | 878 | 614 | 88 | 176 |
| Sầu riêng | Đốm tảo | 733 | 733 | 513 | 73 | 147 |
| Sầu riêng | Khỏe mạnh | 976 | 975 | 683 | 98 | 195 |
| Sầu riêng | Rầy gây hại | 913 | 913 | 639 | 91 | 183 |

Lớp lớn nhất là `Cam___Vang_la_thieu_dinh_duong` với 12.800 ảnh. Lớp nhỏ
nhất là `Ca_phe___Khoe_manh` với 62 ảnh. Chênh lệch giữa hai lớp là khoảng
206,45 lần. Khi train nên theo dõi Macro-F1 và cân nhắc class-weighted loss
hoặc sampler cân bằng; không nên chỉ dựa vào accuracy tổng thể.

## 5. Chia tập và quản lý group

| Split | Mục tiêu | Tỷ lệ thực tế | Số ảnh | Số group | Số lớp |
|---|---:|---:|---:|---:|---:|
| Train | 70% | 69,9993% | 52.517 | 28.159 | 42 |
| Validation | 10% | 10,0020% | 7.504 | 4.010 | 42 |
| Test | 20% | 19,9987% | 15.004 | 8.031 | 42 |

Split được tạo theo từng lớp bằng chiến lược
`per_class_largest_group_first_relative_deficit`. Tất cả ảnh trong cùng một
`group_id` luôn nằm trong cùng split. Sai lệch tỷ lệ nhỏ ở một số lớp là hệ
quả cần thiết của việc giữ nguyên group, đặc biệt với lớp Cà phê khỏe chỉ có
13 group.

Tính trực tiếp từ `group_split_assignments.csv` cuối:

- 40.200 group.
- 37.260 group một ảnh.
- 2.940 group có nhiều ảnh, chứa 37.765 ảnh.
- Group lớn nhất có 402 ảnh.
- Trung bình 1,866 ảnh/group.

Các trường `multi_member_group_count`, `multi_member_file_count` và
`largest_group_size` trong `dataset_version.json` được ghi trước lần regroup
hậu-resize nên không còn phản ánh chính xác group cuối. Khi phân tích group,
`group_split_assignments.csv` và ba manifest cuối là nguồn chính xác hơn.

## 6. Đặc điểm file ảnh

- 75.025/75.025 ảnh giải mã dưới định dạng JPEG.
- 75.005 file có phần mở rộng `.jpg`; 20 file có phần mở rộng `.jpeg`.
- Tổng dung lượng theo manifest: 1.490.426.769 byte, tương đương 1,388 GiB.
- Dung lượng trung bình: khoảng 19,4 KiB/ảnh.
- File nhỏ nhất 6.001 byte; file lớn nhất 74.067 byte.
- Tất cả ảnh có kích thước thật 224×224.

## 7. Preprocessing ảnh

`v1.2` dùng phương pháp `resize_longest_side_then_center_pad`:

1. Resize theo cạnh dài nhất bằng LANCZOS để giữ nguyên tỷ lệ.
2. Căn giữa ảnh đã resize.
3. Pad phần thiếu bằng màu RGB `(124, 116, 104)`.
4. Lưu ảnh cần xử lý lại dưới JPEG quality 95, subsampling 0.
5. Mở lại ảnh đầu ra, xác nhận kích thước và tính checksum.

| Thao tác | Số ảnh | Tỷ lệ |
|---|---:|---:|
| Resize không cần pad | 68.223 | 90,93% |
| Resize và pad | 2.365 | 3,15% |
| Đã là 224×224, sao chép nguyên byte | 4.437 | 5,91% |

Phương án này không crop và không stretch. Nó được chọn thay cho CenterCrop
vì nhiều ảnh có lá hoặc vùng bệnh lệch tâm; crop cố định có thể loại bỏ tín
hiệu quan trọng.

> [!NOTE]
> Thay CenterCrop và RandomResizedCrop bằng resize giữ tỷ lệ + center padding để bảo toàn vùng bệnh có vị trí không cố định. Đã kiểm tra trực quan và unit test thành công.

Normalize ImageNet không được ghi trực tiếp vào JPEG. DataLoader thực hiện
normalize bằng mean `[0.485, 0.456, 0.406]` và std
`[0.229, 0.224, 0.225]` khi nạp ảnh.

## 8. Augmentation

Train transform hiện sử dụng:

- Flip ngang và dọc.
- `RandomRotation(30)` với bilinear interpolation và fill RGB
  `(124, 116, 104)`.
- ColorJitter mức vừa phải: brightness, contrast và saturation đều `0.2`;
  hue tắt.
- Normalize ImageNet.

Không dùng `RandomGrayscale`. `RandomResizedCrop`, Mixup/CutMix và
RandomErasing chưa được áp dụng. Val/test không có augmentation ngẫu nhiên,
chỉ thực hiện bước kích thước no-op và normalize.

Contact sheet đã được kiểm tra trên tám nhóm cây với ba biến thể mỗi ảnh. Sau
khi đổi rotation sang bilinear và dùng đúng màu fill, không còn vùng đen giả
tạo và vùng bệnh vẫn nhận biết được.

## 9. Kiểm tra trùng lặp và leakage

Quá trình hậu kiểm sau resize từng phát hiện 244 cặp group near-duplicate
high-confidence. Tất cả cùng nhãn. Các group liên quan được gộp thành 144
component rồi chia lại theo group.

Kết quả audit cuối:

| Kiểm tra xuyên split | Kết quả |
|---|---:|
| Trùng đường dẫn | 0 |
| Trùng `group_id` | 0 |
| Trùng SHA-256 | 0 |
| Near-duplicate high-confidence | 0 |
| dHash xuất hiện ở nhiều split | 555 |

555 dHash trùng xuyên split đã được kiểm tra thêm bằng độ tương quan grayscale
và normalized MAE. Không cặp nào đạt ngưỡng near-duplicate high-confidence;
chúng được xem là va chạm hash, không phải leakage đã xác nhận.

Ngưỡng kiểm tra high-confidence:

- Khoảng cách Hamming tối đa: 5.
- Grayscale correlation tối thiểu: 0,9999.
- Normalized MAE tối đa: 0,005.

## 10. Cách sử dụng trong training

Ba manifest chính:

- `<dataset_root>/v1.2/manifests/train.csv`
- `<dataset_root>/v1.2/manifests/val.csv`
- `<dataset_root>/v1.2/manifests/test.csv`

Mỗi dòng manifest chứa đường dẫn ảnh, nhóm cây, tình trạng, nhãn ghép, định
dạng, kích thước, dung lượng, SHA-256, dHash, trạng thái, `group_id` và split.

Script training phải dùng trực tiếp ba manifest trên. Không dùng
`train_test_split`, `random_split` hoặc một random seed khác để tạo lại split,
vì việc đó có thể phá vỡ ranh giới group và làm sai kết quả leakage check.

## 11. Hạn chế cần lưu ý

- Dataset mất cân bằng mạnh: lớp lớn nhất gấp khoảng 206 lần lớp nhỏ nhất.
- Cam chiếm 51,23% tổng số ảnh; Ớt chỉ chiếm 0,63%.
- Một số lớp có rất ít group, đặc biệt `Ca_phe___Khoe_manh`; metric của các
  lớp này có thể dao động lớn.
- Nhiều ảnh có chung nguồn hoặc là biến thể gần nhau. Group-aware split giảm
  leakage nhưng không làm dataset trở thành tập ảnh hoàn toàn độc lập.
- Resize giữ toàn bộ nội dung nhưng ảnh rất dài hoặc hẹp sẽ có vùng nội dung
  nhỏ hơn sau khi pad.
- Nhãn biểu diễn tình trạng quan sát được trong dataset; không nên diễn giải
  đầu ra mô hình như chẩn đoán nông học chắc chắn.

## 12. Artifact và nguồn đối chiếu

| Artifact | Vị trí |
|---|---|
| Ảnh dùng cho mô hình | `<dataset_root>/v1.2/images` |
| Manifest đầy đủ | `<dataset_root>/v1.2/manifests/dataset_manifest.csv` |
| Metadata phiên bản | `<dataset_root>/v1.2/metadata/dataset_version.json` |
| Phân bố lớp và split | `<dataset_root>/v1.2/reports/split_class_distribution.csv` |
| Tổng hợp split | `<dataset_root>/v1.2/reports/split_summary.csv` |
| Mapping group sang split | `<dataset_root>/v1.2/reports/group_split_assignments.csv` |
| Mapping resize | `<dataset_root>/v1.2/reports/resize_mapping.csv` |
| Leakage cuối | `<dataset_root>/v1.2/reports/post_resize_leakage_summary.json` |
| Audit Hamming cuối | `<dataset_root>/v1.2/reports/post_resize_hamming_0_to_5_summary.json` |

Các số liệu trong tài liệu này được đối chiếu trực tiếp từ metadata, manifest
và báo cáo cuối của `v1.2` vào ngày 2026-09-20.
