# Tổng quan dataset AgriVision AI v1.3

- **Phiên bản:** `v1.3`
- **Nguồn trực tiếp:** `v1.2`
- **Ngày hoàn thành:** 2026-09-22
- **Trạng thái:** `v1_3_complete`, hoàn thành Definition of Done
- **Bài toán:** phân loại bệnh lá cây đa lớp bằng ConvNeXt-Tiny
- **Đường dẫn quy ước:** `<dataset_root>/v1.3`

## 1. Tóm tắt

Dataset `v1.3` mở rộng bản `v1.2` bằng hai nhóm cây mới là **Lúa** và
**Xoài**. Toàn bộ 75.025 ảnh của v1.2 được giữ nguyên; 7.048 ảnh mới được
xử lý bằng cùng pipeline resize, group-aware split, leakage audit và
augmentation QA. Dataset cuối gồm **82.073 ảnh JPEG 224×224**, **58 lớp**
thuộc **10 nhóm cây**.

Ba split được cố định bằng manifest. DataLoader đọc trực tiếp `train.csv`,
`val.csv` và `test.csv`, không chia lại dữ liệu trong lúc training. Hậu kiểm
cuối không phát hiện path, `group_id`, SHA-256 hoặc near-duplicate
high-confidence xuất hiện xuyên split.

| Chỉ số | Giá trị v1.3 |
|---|---:|
| Tổng số ảnh | 82.073 |
| Nhóm cây | 10 |
| Lớp phân loại | 58 |
| `group_id` cuối | 46.989 |
| Kích thước ảnh | 224×224 |
| Định dạng ảnh | JPEG |
| Dung lượng theo manifest | 1.581.750.148 byte, khoảng 1,473 GiB |
| Train / validation / test | 57.449 / 8.209 / 16.415 |
| Tỷ lệ thực tế | 69,9974% / 10,0021% / 20,0005% |

## 2. So sánh v1.2 và v1.3

| Chỉ số | v1.2 | v1.3 | Thay đổi |
|---|---:|---:|---:|
| Tổng ảnh | 75.025 | 82.073 | +7.048 (+9,39%) |
| Nhóm cây | 8 | 10 | +2 (+25%) |
| Lớp | 42 | 58 | +16 (+38,10%) |
| Group | 40.200 | 46.989 | +6.789 (+16,89%) |
| Train | 52.517 | 57.449 | +4.932 |
| Validation | 7.504 | 8.209 | +705 |
| Test | 15.004 | 16.415 | +1.411 |
| Ảnh khỏe | 14.113 | 15.685 | +1.572 |
| Ảnh bệnh | 60.912 | 66.388 | +5.476 |
| Dung lượng ảnh | 1,388 GiB | 1,473 GiB | +91.323.379 byte |
| dHash thô xuyên split | 555 | 583 | +28 ứng viên |
| Near-duplicate high-confidence xuyên split | 0 | 0 | Không đổi |

Thay đổi của v1.3 chỉ đến từ Lúa và Xoài. Đối chiếu trực tiếp manifest xác
nhận **75.025/75.025 dòng kế thừa từ v1.2 vẫn còn đủ và không thay đổi field**.

### Điểm giữ nguyên từ pipeline v1.2

- Resize giữ tỷ lệ theo cạnh dài nhất, căn giữa và pad về 224×224.
- Resampling LANCZOS, padding RGB `(124, 116, 104)`.
- Ảnh cần mã hóa lại dùng JPEG quality 95, subsampling 0.
- Gán group theo exact hash và near-duplicate đã review.
- Chia 70/10/20 theo từng lớp nhưng luôn giữ nguyên `group_id`.
- Kiểm tra path, group, SHA-256, dHash và Hamming 0–5 sau resize.
- Train augmentation riêng; validation/test chỉ resize no-op và normalize.

### Điểm mới của v1.3

- Thêm 3.069 ảnh Lúa thuộc 8 lớp.
- Thêm 3.979 ảnh Xoài thuộc 8 lớp.
- Xử lý một cross-label group do va chạm dHash của Lúa bằng bốn singleton
  SHA-256; không xóa hoặc đổi nhãn ảnh.
- Merge 17 component near-duplicate Xoài và đổi split tối thiểu cho 8 ảnh;
  không di chuyển file vật lý và không đổi tổng ảnh từng split.
- Mapping runtime tăng từ 42 lên 58 lớp và được lưu cùng checkpoint.
- Evaluation kiểm tra mapping checkpoint phải khớp dataset hiện tại.

## 3. Phân bố theo nhóm cây

| Nhóm cây | Số lớp | Tổng ảnh | Tỷ trọng | Group | Train | Validation | Test | Ảnh khỏe | Ảnh bệnh |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Cà chua | 10 | 18.146 | 22,11% | 18.146 | 12.703 | 1.815 | 3.628 | 1.585 | 16.561 |
| Cà phê | 5 | 3.756 | 4,58% | 1.237 | 2.630 | 377 | 749 | 62 | 3.694 |
| Cam | 4 | 38.432 | 46,83% | 6.139 | 26.902 | 3.843 | 7.687 | 9.584 | 28.848 |
| Chè | 5 | 1.539 | 1,88% | 1.536 | 1.077 | 154 | 308 | 222 | 1.317 |
| Lúa | 8 | 3.069 | 3,74% | 3.064 | 2.147 | 307 | 615 | 1.072 | 1.997 |
| Ngô | 4 | 4.185 | 5,10% | 4.184 | 2.930 | 418 | 837 | 1.162 | 3.023 |
| Nho | 4 | 4.062 | 4,95% | 4.062 | 2.843 | 406 | 813 | 423 | 3.639 |
| Ớt | 5 | 469 | 0,57% | 461 | 328 | 47 | 94 | 99 | 370 |
| Sầu riêng | 5 | 4.436 | 5,40% | 4.435 | 3.104 | 444 | 888 | 976 | 3.460 |
| Xoài | 8 | 3.979 | 4,85% | 3.725 | 2.785 | 398 | 796 | 500 | 3.479 |
| **Tổng** | **58** | **82.073** | **100%** | **46.989** | **57.449** | **8.209** | **16.415** | **15.685** | **66.388** |

Ảnh khỏe chiếm 19,11%; ảnh bệnh chiếm 80,89%. Cam vẫn là nhóm lớn nhất với
46,83% tổng dữ liệu, còn Ớt chỉ chiếm 0,57%. Việc thêm Lúa và Xoài làm giảm
tỷ trọng của Cam so với 51,23% ở v1.2, nhưng chưa loại bỏ mất cân bằng.

> [!NOTE]
> Manifest giữ nguyên ID canonical `Xoai___khoe_manh` với chữ thường, trong
> khi các cây cũ thường dùng `___Khoe_manh`. Hai cách viết không được tự ý
> gộp hoặc đổi tên sau khi đã chốt mapping 58 lớp.

## 4. Mười sáu lớp mới của Lúa và Xoài

| Compound label | Tổng ảnh | Group | Train | Validation | Test |
|---|---:|---:|---:|---:|---:|
| `Lua___Bac_la_lua` | 259 | 259 | 181 | 26 | 52 |
| `Lua___Chay_la` | 611 | 608 | 428 | 61 | 122 |
| `Lua___Dom_nau` | 417 | 416 | 291 | 42 | 84 |
| `Lua___Dom_than_la` | 40 | 40 | 28 | 4 | 8 |
| `Lua___Khoe_manh` | 1.072 | 1.071 | 751 | 107 | 214 |
| `Lua___Sau_gai_an_la` | 408 | 408 | 285 | 41 | 82 |
| `Lua___Thoi_chop_la` | 143 | 143 | 100 | 14 | 29 |
| `Lua___Vang_lui` | 119 | 119 | 83 | 12 | 24 |
| `Xoai___bo_cat_la` | 500 | 248 | 350 | 50 | 100 |
| `Xoai___bo_hong` | 500 | 500 | 350 | 50 | 100 |
| `Xoai___bo_xit` | 500 | 498 | 350 | 50 | 100 |
| `Xoai___kho_canh` | 493 | 493 | 345 | 49 | 99 |
| `Xoai___khoe_manh` | 500 | 500 | 350 | 50 | 100 |
| `Xoai___loet_vi_khuan` | 500 | 500 | 350 | 50 | 100 |
| `Xoai___phan_trang` | 500 | 500 | 350 | 50 | 100 |
| `Xoai___than_thu` | 486 | 486 | 340 | 49 | 97 |

Lớp nhỏ nhất toàn dataset là `Lua___Dom_than_la` với 40 ảnh. Lớp lớn nhất
vẫn là `Cam___Vang_la_thieu_dinh_duong` với 12.800 ảnh, chênh khoảng 320 lần.
Khi đánh giá phải ưu tiên Macro-F1, classification report và confusion matrix;
accuracy tổng thể không đủ phản ánh chất lượng trên các lớp nhỏ.

## 5. Chia tập và quản lý group

| Split | Mục tiêu | Tỷ lệ thực tế | Số ảnh | Số group | Số lớp |
|---|---:|---:|---:|---:|---:|
| Train | 70% | 69,9974% | 57.449 | 32.911 | 58 |
| Validation | 10% | 10,0021% | 8.209 | 4.689 | 58 |
| Test | 20% | 20,0005% | 16.415 | 9.389 | 58 |

Split tiếp tục dùng chiến lược
`per_class_largest_group_first_relative_deficit` với seed `20260919`. Mọi
ảnh trong một group nằm trọn trong một split. Sai lệch tỷ lệ ở lớp nhỏ được
chấp nhận để ưu tiên chống leakage.

Thống kê group cuối:

- 46.989 group.
- 43.794 group một ảnh.
- 3.195 group nhiều ảnh, chứa 38.279 ảnh.
- Group lớn nhất có 402 ảnh.
- Trung bình khoảng 1,747 ảnh/group.
- 0 cross-label group và 0 group xuyên split.

## 6. Đặc điểm file và preprocessing

- 82.073/82.073 file tồn tại và khớp manifest.
- 82.073 file giải mã thành công dưới định dạng JPEG 224×224.
- 82.053 file `.jpg`; 20 file `.jpeg`.
- Tổng dung lượng: 1.581.750.148 byte, khoảng 1,473 GiB.
- Dung lượng trung bình: khoảng 18,8 KiB/ảnh.
- File nhỏ nhất 5.710 byte; file lớn nhất 74.067 byte.
- 0 sai dung lượng, 0 sai SHA-256, 0 file thừa và 0 file thiếu.

| Thao tác preprocessing | Số ảnh | Tỷ lệ |
|---|---:|---:|
| Resize không cần pad | 71.860 | 87,56% |
| Resize và center pad | 5.772 | 7,03% |
| Đã là 224×224, sao chép nguyên byte | 4.441 | 5,41% |

Normalize ImageNet không được ghi vào JPEG. DataLoader áp dụng mean
`[0.485, 0.456, 0.406]` và std `[0.229, 0.224, 0.225]` khi nạp ảnh.

## 7. Augmentation

Train transform gồm:

- Resize no-op về 224×224.
- Flip ngang và dọc với xác suất 0,5.
- `RandomRotation(30)` dùng bilinear interpolation và fill
  `(124, 116, 104)`.
- `ColorJitter` với brightness, contrast và saturation bằng `0.2`.
- Chuyển tensor và normalize ImageNet.

Validation/test không có augmentation ngẫu nhiên. Contact sheet gồm đủ 10
nhóm cây và ba biến thể mỗi ảnh đã được review; không có vùng đen giả do
rotation. Kiểm tra 64 output thuộc 16 lớp mới cho tensor `3×224×224` hữu hạn.

![Contact sheet augmentation v1.3](../reports/AGRI-21/assets/dataset_v1_3_augmentation/augmentation_contact_sheet.png)

## 8. Kiểm tra trùng lặp và leakage

V1.3 từng phát hiện 17 cặp near-duplicate high-confidence cùng nhãn, gồm 8
cặp `Xoai___bo_cat_la` nằm khác split. Pipeline đã merge 34 group cũ thành
17 component và chỉ đổi split của 8 ảnh để giữ component nguyên vẹn.

Kết quả audit cuối:

| Kiểm tra | Kết quả |
|---|---:|
| Cross-label group | 0 |
| Path xuyên split | 0 |
| `group_id` xuyên split | 0 |
| SHA-256 xuyên split | 0 |
| Ứng viên Hamming 0–5 | 155.950 |
| Near-duplicate high-confidence khác group | 0 |
| Near-duplicate high-confidence xuyên split | 0 |
| dHash thô xuất hiện xuyên split | 583 |

583 va chạm dHash là ứng viên thô, không phải 583 leakage. Sau khi so sánh
pixel với grayscale correlation tối thiểu `0,9999` và normalized MAE tối đa
`0,005`, không cặp nào được xác nhận là near-duplicate xuyên split.

## 9. Cách sử dụng trong training và inference

Ba manifest cố định:

- `<dataset_root>/v1.3/manifests/train.csv`
- `<dataset_root>/v1.3/manifests/val.csv`
- `<dataset_root>/v1.3/manifests/test.csv`

Thiết lập đường dẫn trên PowerShell:

```powershell
$env:AGRIVISION_DATASET_DIR = "<dataset_root>\v1.3"
.\.venv\Scripts\python.exe -m ai.train
```

Không dùng `train_test_split`, `random_split` hoặc tự chia lại thư mục ảnh.
Mapping 58 lớp được sinh từ manifest và lưu trong checkpoint. Inference bắt
buộc đọc `idx_to_info` của checkpoint; evaluation còn kiểm tra mapping
checkpoint phải khớp mapping dataset hiện tại.

## 10. Hạn chế và điểm yếu còn tồn đọng

> [!WARNING]
> Trạng thái `v1_3_complete` nghĩa là dataset đã vượt qua các gate kỹ thuật đã
> định nghĩa, **không có nghĩa dữ liệu hoàn hảo, không còn label noise hoặc mô
> hình train trên dữ liệu này chắc chắn tổng quát tốt ngoài thực tế**.

| Rủi ro | Mức ưu tiên | Hậu quả có thể gặp | Kiểm soát tối thiểu |
|---|---|---|---|
| Mất cân bằng lớp/cây | Cao | Accuracy cao nhưng bỏ sót lớp hiếm | Macro-F1, per-class recall, thử balancing có ablation |
| Ảnh tương quan trong group | Cao | Metric có vẻ ổn định hơn thực tế | Giữ group nguyên split, phân tích thêm theo group |
| Thiếu provenance nguồn chụp | Cao | Không chứng minh được khả năng tổng quát ngoài nguồn | External test có nguồn độc lập |
| Label noise còn sót | Trung bình–cao | Học sai hoặc confusion giữa bệnh tương tự | Review error cases, ưu tiên lớp hiếm/confusion lớn |
| Augmentation đổi dấu hiệu bệnh | Trung bình–cao | Giảm recall hoặc học ảnh phi thực tế | Baseline/ablation, xem mẫu augment và lỗi theo lớp |
| Padding/độ phân giải tạo shortcut | Trung bình | Mô hình nhìn viền/nền thay vì tổn thương | Saliency, error analysis, external test |
| Dùng test để tinh chỉnh | Nghiêm trọng | Metric test bị lạc quan và không còn độc lập | Khóa test đến khi chốt cấu hình |

### 10.1. Mất cân bằng lớp và cây rất lớn

- Lớp lớn nhất có 12.800 ảnh, lớp nhỏ nhất chỉ có 40 ảnh: chênh khoảng 320 lần.
- `Lua___Dom_than_la` chỉ có 28/4/8 ảnh ở train/validation/test;
  `Ca_phe___Khoe_manh` chỉ có 46/6/10.
- Cam chiếm 46,83% toàn dataset, trong khi Ớt chỉ chiếm 0,57%. Accuracy và
  loss trung bình vì vậy có thể tốt dù mô hình bỏ qua lớp hiếm.
- Baseline hiện dùng `CrossEntropyLoss(label_smoothing=0.1)`, `shuffle=True`
  và **chưa dùng class weight hoặc sampler cân bằng**. Việc chọn checkpoint
  bằng validation Macro-F1 giúp giảm thiên lệch khi chọn mô hình, nhưng không
  làm gradient trong lúc train trở nên cân bằng.
- Không áp dụng inverse-frequency weight cực đoan một cách mặc định. Với tỷ lệ
  320 lần, weight quá lớn hoặc oversampling quá mạnh có thể gây overfit lớp
  nhỏ và làm training dao động. Phải so sánh baseline với phương án có kiểm
  soát như clipped/square-root class weight, focal loss hoặc sampler theo
  thí nghiệm riêng.

### 10.2. Số ảnh không đồng nghĩa số quan sát độc lập

- Dataset có 46.989 group cho 82.073 ảnh; 38.279 ảnh nằm trong 3.195 group
  nhiều ảnh và group lớn nhất có 402 ảnh.
- Group-aware split ngăn một `group_id` xuất hiện ở nhiều split, nhưng ảnh
  trong cùng group vẫn tương quan cao. Một lớp có nhiều ảnh gần giống nhau có
  thể tạo accuracy cao hơn mức đa dạng thực tế.
- Khi phân tích sai số hoặc ước lượng độ ổn định, cần xem cả kết quả theo ảnh
  và theo group. Không coi 82.073 ảnh là 82.073 mẫu thống kê độc lập.
- Oversampling theo ảnh có thể lặp lại dày đặc các group nhỏ hoặc ảnh gần
  giống nhau. Nếu thử sampler cân bằng, phải theo dõi số group duy nhất được
  nhìn thấy, không chỉ số lượt ảnh.

### 10.3. Phạm vi của kiểm tra leakage

Audit cuối xác nhận không có path, `group_id`, SHA-256 hoặc near-duplicate
high-confidence theo dHash Hamming 0–5 và ngưỡng pixel đã định xuất hiện xuyên
split. Tuy nhiên, kết quả này không bao phủ mọi dạng liên quan dữ liệu:

- cùng một lá/cây/ruộng được chụp ở góc khác, crop mạnh hoặc thời điểm khác;
- ảnh bị biến đổi phối cảnh, thêm chữ/watermark, nén hoặc chỉnh màu mạnh đến
  mức vượt ngoài Hamming 0–5;
- ảnh từ cùng video burst hoặc cùng nguồn công khai nhưng không còn đủ giống
  về pixel để được gom group.

Manifest hiện không có `source_id`, `capture_id`, vị trí, thiết bị, ruộng,
ngày chụp hoặc ID cây/lá. Do đó chưa thể chứng minh split độc lập theo nguồn,
địa điểm hoặc đối tượng sinh học. Không được mô tả kết quả là “field-level” hay
“farm-level generalization” nếu chưa đánh giá trên tập ngoài độc lập có provenance.

583 dHash xuyên split chỉ là ứng viên thô đã không vượt qua ngưỡng xác nhận;
không được báo cáo chúng là 583 leakage, nhưng cũng không dùng kết quả audit
để khẳng định tuyệt đối rằng mọi quan hệ nguồn tiềm ẩn đã được loại bỏ.

### 10.4. Chất lượng nhãn và ý nghĩa nhãn

- Pipeline đã quarantine các conflict được phát hiện và sửa cross-label group,
  nhưng chưa có bằng chứng rằng chuyên gia nông học đã rà soát thủ công toàn bộ
  82.073 ảnh. Label noise còn sót lại vẫn là rủi ro.
- Một ảnh có thể có nhiều biểu hiện, thiếu dinh dưỡng hoặc điều kiện ánh sáng
  giống bệnh khác, trong khi bài toán hiện buộc mỗi ảnh vào đúng một lớp.
- “Khỏe mạnh” và tên bệnh là tình trạng được gán trong nguồn dữ liệu, không
  phải kết luận chẩn đoán chắc chắn cho mẫu ngoài thực tế.
- ID canonical `Xoai___khoe_manh` có chữ thường khác quy ước của các cây cũ.
  Không tự đổi case, dịch tên hoặc sắp xếp lại mapping sau khi tạo checkpoint.

### 10.5. Giới hạn về độ phân giải và preprocessing

- Mọi ảnh đã được chốt ở 224×224. Chi tiết nhỏ của đốm bệnh có thể đã mất và
  không thể phục hồi bằng cách upscale trong DataLoader.
- 5.772 ảnh có padding màu cố định `(124, 116, 104)`. Nếu tỷ lệ padding tương
  quan với nguồn hoặc lớp, mô hình có thể học shortcut từ viền thay vì triệu
  chứng. Cần kiểm tra saliency/error cases có tập trung vào viền hay không.
- Center pad giữ nội dung tốt hơn crop, nhưng không bảo đảm lá hoặc vùng bệnh
  luôn chiếm đủ diện tích. Chưa có annotation vùng bệnh để đo điều này.
- ImageNet normalization là lựa chọn tương thích pretrained ConvNeXt, không
  phải bằng chứng rằng đây là normalization tối ưu cho ảnh nông nghiệp.

### 10.6. Augmentation mới qua QA kỹ thuật, chưa qua xác nhận ngữ nghĩa đầy đủ

- Contact sheet chứng minh transform chạy đúng, không tạo vùng đen và output
  tensor hợp lệ; nó chỉ gồm ảnh đại diện của 10 cây và ba biến thể mỗi ảnh,
  không phải kiểm tra toàn bộ không gian augmentation.
- Flip dọc có thể không phù hợp với ảnh hiện trường có hướng tự nhiên. Rotation
  30 độ và ColorJitter có thể làm đổi hình thái/màu vốn là dấu hiệu phân lớp.
- Vì vậy phải chạy ít nhất một baseline không augmentation và một cấu hình
  augmentation hiện tại với cùng split/seed. Nếu lớp hiếm giảm recall hoặc
  confusion tăng, cần giảm rotation, tắt vertical flip hoặc giảm ColorJitter;
  không kết luận augmentation tốt chỉ từ contact sheet.
- Tuyệt đối không áp dụng augmentation ngẫu nhiên cho validation/test và không
  ghi ảnh augment đè vào `images/` hay manifest chính thức.

### 10.7. Giới hạn khi so sánh kết quả

- V1.2 có 42 lớp, v1.3 có 58 lớp nên accuracy/Macro-F1 toàn tập không phải so
  sánh ngang hàng tuyệt đối. Muốn đo tác động của 16 lớp mới phải báo cáo thêm
  metric trên 42 lớp chung và trên riêng Lúa/Xoài.
- Validation/test của lớp rất nhỏ tạo metric per-class không ổn định: ví dụ
  test có 8 ảnh thì chỉ một dự đoán sai đã làm recall thay đổi 12,5 điểm phần
  trăm. Luôn ghi support và tránh xếp hạng mô hình dựa trên chênh lệch rất nhỏ.
- Dataset chưa có external test set độc lập. Kết quả test hiện tại chỉ phản ánh
  phân phối của các nguồn đã tổng hợp trong v1.3, không chứng minh hiệu năng
  trên ảnh điện thoại, vùng địa lý, mùa vụ hoặc thiết bị mới.

## 11. Quy tắc an toàn khi train, đánh giá và sử dụng

### 11.1. Việc bắt buộc trước khi train

- Trỏ `AGRIVISION_DATASET_DIR` đúng vào `<dataset_root>/v1.3`; log đường dẫn
  tuyệt đối ở đầu mỗi experiment để tránh vô tình dùng snapshot `old v1.3`.
- Chỉ dùng ba manifest đã chốt. Không gọi `train_test_split`, `random_split`,
  không chia lại theo thư mục và không trộn các manifest.
- Xác nhận các count phải là 57.449/8.209/16.415, 58 lớp và mapping checkpoint
  có đủ 58 ID. Dừng run nếu count hoặc mapping khác.
- Xác nhận SHA-256 của `dataset_manifest.csv` là
  `1d7f431440a7dc6e3e9ffc8f2d542f55d7cb358186e685c33fe54d86dab053eb`.
  Nếu manifest thay đổi, phải tạo phiên bản dataset mới và audit lại; không
  tiếp tục gọi đó là v1.3.
- Ghi vào experiment: dataset version/hash, Git commit, seed, model weights
  khởi tạo, hyperparameter, transform, class-balancing strategy và môi trường.
- Giữ test set đóng. Chỉ train trên train, chọn epoch/hyperparameter bằng
  validation và chỉ chạy test cho cấu hình đã chốt.

### 11.2. Trong lúc train

- Theo dõi đồng thời train loss, validation loss, validation Macro-F1 và
  per-class recall. Accuracy chỉ là metric phụ.
- Kiểm tra riêng các lớp support thấp và hai cây mới. Nếu train metric tăng
  nhưng Macro-F1/recall lớp hiếm giảm, coi đó là dấu hiệu majority bias hoặc
  overfit, không tiếp tục chỉ vì accuracy tăng.
- Lưu best checkpoint theo validation Macro-F1 như pipeline hiện tại; không
  chọn lại checkpoint bằng test score.
- Với class weight, focal loss hoặc sampler, chỉ tính thống kê từ train split.
  Không dùng phân bố validation/test để thiết kế trọng số.
- Không kết hợp nhiều biện pháp cân bằng ngay lần đầu. Chạy baseline cố định,
  sau đó thay từng yếu tố để biết cải thiện đến từ đâu.
- Giữ seed `42` cho baseline, nhưng kết luận cuối nên lặp nhiều seed. Một run
  duy nhất không đủ khi lớp validation chỉ có 4–6 ảnh.

### 11.3. Khi đánh giá và báo cáo

- Báo cáo tối thiểu: Accuracy, Macro-F1, macro precision/recall, support từng
  lớp, per-class precision/recall/F1 và confusion matrix.
- Tách thêm metric theo cây, 42 lớp kế thừa, 16 lớp mới, Lúa và Xoài để phát
  hiện việc metric tổng che khuất nhóm yếu.
- Ghi rõ checkpoint được chọn bằng validation; test không tham gia early
  stopping, threshold tuning, augmentation tuning hay chọn loss/sampler.
- Xem thủ công false positive/false negative của lớp hiếm, các ảnh có padding
  và các group lớn. Nếu nhiều lỗi tập trung ở cùng group, không diễn giải chúng
  như nhiều failure độc lập.
- Không tuyên bố mô hình “đạt độ chính xác ngoài thực tế” nếu chưa có external
  test set độc lập. Khi so với v1.2 phải nêu khác biệt 42 lớp và 58 lớp.

### 11.4. Khi inference hoặc tích hợp

- Nạp `idx_to_info` từ chính checkpoint; không tạo mapping mới từ tên thư mục
  hoặc danh sách sắp xếp thủ công.
- Input inference phải dùng đúng resize/pad, RGB và ImageNet normalization;
  không dùng train augmentation.
- Từ chối hoặc cảnh báo ảnh không phải lá, cây không thuộc 10 nhóm, ảnh quá
  mờ/xa hoặc trường hợp nhiều bệnh. Softmax cao không chứng minh ảnh thuộc
  phân phối train và không thay thế chẩn đoán chuyên gia.
- Không dùng mô hình cho quyết định phun thuốc hay xử lý cây chỉ từ một ảnh.
  Kết quả nên được trình bày là gợi ý phân loại kèm confidence và cảnh báo
  phạm vi dataset.

### 11.5. Điều kiện phải dừng run và kiểm tra lại

Dừng training/evaluation nếu gặp một trong các trường hợp sau:

- count split hoặc số lớp khác 57.449/8.209/16.415 và 58;
- manifest hash không khớp, có ảnh thiếu/hỏng hoặc mapping checkpoint lệch;
- validation/test đang dùng transform ngẫu nhiên;
- cùng path, SHA-256 hoặc `group_id` xuất hiện ở nhiều split;
- test score đã được dùng để chọn hyperparameter hoặc checkpoint;
- metric tổng tăng nhưng nhiều lớp hiếm có recall bằng 0 mà vẫn định công bố
  mô hình là đạt yêu cầu.

## 12. Artifact và nguồn đối chiếu

| Artifact | Vị trí |
|---|---|
| Ảnh dùng cho mô hình | `<dataset_root>/v1.3/images` |
| Manifest đầy đủ | `<dataset_root>/v1.3/manifests/dataset_manifest.csv` |
| Train/validation/test | `<dataset_root>/v1.3/manifests/{train,val,test}.csv` |
| Metadata phiên bản | `<dataset_root>/v1.3/metadata/dataset_version.json` |
| Tổng hợp split | `<dataset_root>/v1.3/reports/split_summary.csv` |
| Leakage cuối | `<dataset_root>/v1.3/reports/post_resize_leakage_summary.json` |
| Audit Hamming cuối | `<dataset_root>/v1.3/reports/post_resize_hamming_0_to_5_summary.json` |
| Mapping merge v1.3 | `<dataset_root>/v1.3/reports/v1_3_near_duplicate_group_merge_mapping.csv` |
| Log đổi split | `<dataset_root>/v1.3/reports/v1_3_split_move_log.csv` |
| Backup trước release sync | `<dataset_root>/v1.3/reports/step_v1_3_backup_before_release_sync` |
| Report xử lý và bằng chứng | `docs/reports/AGRI-21/dataset_v1_3_gap_review.md` |

Các số liệu trong tài liệu được tính lại trực tiếp từ manifest, metadata và
leakage report cuối của v1.2/v1.3 ngày 2026-09-22. Manifest v1.3 có SHA-256
`1d7f431440a7dc6e3e9ffc8f2d542f55d7cb358186e685c33fe54d86dab053eb`.

## 13. Kết luận

V1.3 giữ nguyên pipeline và toàn bộ dữ liệu đã chốt của v1.2, đồng thời mở
rộng thêm Lúa và Xoài. Dataset đã đạt các gate về tính toàn vẹn file, group,
split, exact leakage, near-duplicate Hamming 0–5, augmentation, metadata và
runtime mapping. V1.3 là phiên bản chính thức dùng cho các thí nghiệm tiếp
theo, với điều kiện kết quả phải được đánh giá theo metric cân bằng và nêu rõ
hạn chế của các lớp ít mẫu. Trạng thái hoàn tất dataset không thay thế quy
trình kiểm soát experiment: phải khóa manifest, giữ test set đóng, kiểm tra
mapping, so sánh augmentation/class balancing bằng ablation và giới hạn tuyên
bố trong đúng phạm vi dữ liệu đã được kiểm chứng.
