# Tổng quan dataset AgriVision AI v1.4

- **Phiên bản:** `v1.4`
- **Nguồn trực tiếp:** 81.604 ảnh của 9 cây không phải Ớt từ `v1.3`, cộng batch `Ớt bổ sung/`
- **Ngày hoàn thành dữ liệu:** 2026-09-28
- **Trạng thái dữ liệu:** `v1_4_complete`; train/evaluate có trạng thái riêng
- **Bài toán:** phân loại bệnh lá cây đa lớp bằng ConvNeXt-Tiny
- **Đường dẫn quy ước:** `<dataset_root>/v1.4` (bản chính: `D:/AgriVisionAI_Data/v1.4/`)

## 1. Tóm tắt

V1.4 **thay toàn bộ 469 ảnh Ớt thuộc 5 lớp cũ** bằng **6.396 ảnh Ớt thuộc 6 lớp mới** sau làm sạch. Không có ánh xạ nhãn được xác nhận giữa hai bộ lớp Ớt, nên đây là thay đổi hợp đồng nhãn có chủ đích. Cả 81.604 dòng của 9 cây còn lại giữ nguyên mọi field manifest từ v1.3. Dataset cuối có **88.000 ảnh, 10 cây và 59 lớp**; ba split cố định trong manifest, không chia lại khi train.

| Chỉ số | Giá trị v1.4 |
|---|---:|
| Tổng ảnh | 88.000 |
| Nhóm cây / lớp cây+tình trạng / giá trị `condition` | 10 / 59 / 44 |
| `group_id` cuối | 52.658 |
| Kích thước ảnh | 224×224 |
| Định dạng | JPEG (`.jpg`/`.jpeg`) |
| Dung lượng theo manifest | 1.662.957.279 byte, khoảng 1,549 GiB |
| Train / validation / test | 61.599 / 8.802 / 17.599 |
| SHA-256 manifest chính | `52d95e178700ad29faa64dd3c5095fe9029dd68f0f71ff833c9cf375b858b87e` |

## 2. So sánh v1.3 và v1.4

| Chỉ số | v1.3 | v1.4 | Thay đổi |
|---|---:|---:|---:|
| Tổng ảnh | 82.073 | 88.000 | +5.927 (+7,22%) |
| Nhóm cây | 10 | 10 | 0 |
| Lớp cây+tình trạng | 58 | 59 | +1 ròng: 5 lớp Ớt cũ → 6 lớp mới |
| Giá trị `condition` | 45 | 44 | Tên Việt dùng chung với cây khác; không đồng nghĩa giảm lớp cây+tình trạng |
| Group | 46.989 | 52.658 | +5.669 |
| Ảnh Ớt | 469 | 6.396 | +5.927 |
| Tỷ trọng Ớt | 0,57% | 7,27% | +6,70 điểm phần trăm |
| Train / validation / test | 57.449 / 8.209 / 16.415 | 61.599 / 8.802 / 17.599 | +4.150 / +593 / +1.184 |
| Ảnh khỏe / còn lại | 15.685 / 66.388 | 16.928 / 71.072 | +1.243 / +4.684 |
| Dung lượng ảnh | 1.581.750.148 byte | 1.662.957.279 byte | +81.207.131 byte |
| dHash thô xuyên split | 583 | 602 | +19 ứng viên, không phải 19 lỗi leakage |
| Near-duplicate high-confidence xuyên split | 0 | 0 | Không đổi |

**Kiểm tra kế thừa:** 81.604/81.604 dòng không phải Ớt có cùng đường dẫn, nhãn, SHA-256, group và split ở hai phiên bản. Tập SHA-256 của ảnh Ớt cũ và mới không giao nhau. V1.4 thay hẳn tập Ớt và mapping checkpoint, không bổ sung ảnh vào năm lớp cũ.

### Điểm giữ nguyên từ v1.3

- Ảnh, nhãn và split của 9 cây khác; quy tắc tách group để tránh leakage.
- Ảnh đầu vào model ở 224×224; normalization ImageNet khi nạp dữ liệu.
- Ba manifest cố định và kiểm tra path, group, SHA-256, dHash/Hamming sau ghép.

### Điểm thay đổi trong v1.4

- Audit 7.074 ảnh Ớt nguồn: 0 ảnh lỗi, 1 ảnh có cạnh dưới 224 px; bỏ 678 bản sao SHA-256 cùng nhãn, còn 6.396 ảnh.
- Review gần trùng, gộp 10 cặp đạt ngưỡng cao cùng nhãn; split batch Ớt theo group 70/10/20 và resize giữ tỷ lệ, pad giữa khi cần.
- Sáu nhãn Ớt mới làm mapping tăng lên 59 lớp. Checkpoint v1.3 có 58 lớp không dùng trực tiếp cho v1.4.
- Train transform hiện hành dùng flip ngang, xoay 15° và ColorJitter; thông số này khác mô tả transform trong tài liệu v1.3.

## 3. Phân bố theo nhóm cây

| Nhóm cây | Lớp | v1.3 | v1.4 | Tỷ trọng v1.4 | Group v1.4 | Train | Validation | Test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Cà chua | 10 | 18.146 | 18.146 | 20,62% | 18.146 | 12.703 | 1.815 | 3.628 |
| Cà phê | 5 | 3.756 | 3.756 | 4,27% | 1.237 | 2.630 | 377 | 749 |
| Cam | 4 | 38.432 | 38.432 | 43,67% | 6.139 | 26.902 | 3.843 | 7.687 |
| Chè | 5 | 1.539 | 1.539 | 1,75% | 1.536 | 1.077 | 154 | 308 |
| Lúa | 8 | 3.069 | 3.069 | 3,49% | 3.064 | 2.147 | 307 | 615 |
| Ngô | 4 | 4.185 | 4.185 | 4,76% | 4.184 | 2.930 | 418 | 837 |
| Nho | 4 | 4.062 | 4.062 | 4,62% | 4.062 | 2.843 | 406 | 813 |
| Ớt | 6 | 469 | 6.396 | 7,27% | 6.130 | 4.478 | 640 | 1.278 |
| Sầu riêng | 5 | 4.436 | 4.436 | 5,04% | 4.435 | 3.104 | 444 | 888 |
| Xoài | 8 | 3.979 | 3.979 | 4,52% | 3.725 | 2.785 | 398 | 796 |
| **Tổng** | **59** | **82.073** | **88.000** | **100%** | **52.658** | **61.599** | **8.802** | **17.599** |

Ớt tăng tỷ trọng rõ rệt, nhưng Cam vẫn chiếm 43,67% tổng ảnh. Lớp lớn nhất là `Cam___Vang_la_thieu_dinh_duong` với 12.800 ảnh; lớp nhỏ nhất vẫn là `Lua___Dom_than_la` với 40 ảnh, chênh 320 lần.

## 4. Sáu lớp Ớt thay thế

| Nhãn v1.4 | Ảnh nguồn | Sau dedup | Group | Train | Validation | Test |
|---|---:|---:|---:|---:|---:|---:|
| `Ot___Dom_vi_khuan` | 1.017 | 757 | 584 | 530 | 76 | 151 |
| `Ot___Dom_la_cercospora` | 1.008 | 907 | 906 | 635 | 91 | 181 |
| `Ot___Virus_xoan_la` | 1.488 | 1.480 | 1.463 | 1.036 | 148 | 296 |
| `Ot___Khoe_manh` | 1.508 | 1.342 | 1.291 | 940 | 134 | 268 |
| `Ot___Thieu_dinh_duong` | 1.207 | 1.067 | 1.046 | 747 | 107 | 213 |
| `Ot___Phan_trang` | 846 | 843 | 840 | 590 | 84 | 169 |
| **Tổng** | **7.074** | **6.396** | **6.130** | **4.478** | **640** | **1.278** |

Ánh xạ tên **trong cùng batch v1.4**: `Bacterial_Spot → Dom_vi_khuan`, `Cercospora_Leaf_Spot → Dom_la_cercospora`, `Curl_Virus → Virus_xoan_la`, `Healthy_Leaf → Khoe_manh`, `Nutrition_Deficiency → Thieu_dinh_duong`, `Powdery_Mildew → Phan_trang`. Đây là đổi tên lớp và đường dẫn ảnh, không đổi ảnh hoặc split.

Bốn tên cũ `Ot___Dom_la`, `Ot___Ruoi_trang`, `Ot___Vang_la`, `Ot___Xoan_la` không còn trong manifest v1.4. Tên `Ot___Khoe_manh` được **dùng lại** cho nhóm nguồn `Healthy_Leaf`, nhưng 99 ảnh khỏe v1.3 đã bị thay bằng 1.342 ảnh mới. Trùng tên không có nghĩa đây là cùng tập ảnh hoặc phép đối chiếu nhãn giữa hai phiên bản đã được kiểm chứng. Bảng xác nhận số lượng và hợp đồng nhãn, chưa xác nhận chẩn đoán bệnh học của từng ảnh.

## 5. Chia tập và quản lý group

| Split | Số ảnh | Tỷ lệ thực tế | Số group | Số lớp |
|---|---:|---:|---:|---:|
| Train | 61.599 | 69,9989% | 36.881 | 59 |
| Validation | 8.802 | 10,0023% | 5.255 | 59 |
| Test | 17.599 | 19,9989% | 10.522 | 59 |

Ớt mới được split theo group; 9 cây còn lại giữ nguyên split v1.3. Không có group chứa nhiều nhãn hoặc xuất hiện ở nhiều split. Số ảnh không đồng nghĩa số quan sát độc lập: 52.658 group tương ứng 88.000 ảnh, group lớn nhất vẫn có 402 ảnh.

## 6. Đặc điểm file và preprocessing

- Manifest v1.4 có 88.000 dòng; toàn bộ 88.000 ảnh đã được đối chiếu SHA-256 khi finalize. Metadata ảnh ghi 224×224.
- Có 87.980 đường dẫn `.jpg` và 20 đường dẫn `.jpeg`; 6.396 ảnh Ớt mới được chuẩn hóa đuôi `.jpg` phù hợp nội dung JPEG.
- Trong batch Ớt mới, 5.136 ảnh chỉ cần resize và 1.260 ảnh resize kèm center pad. Phép resize giữ tỷ lệ, dùng LANCZOS, padding RGB `(124, 116, 104)` và JPEG quality 95.
- Một ảnh Ớt nguồn có cạnh nhỏ hơn 224 px; ảnh đầu ra đạt kích thước yêu cầu nhưng việc phóng lớn không khôi phục chi tiết đã thiếu.
- Mean/std ImageNet áp dụng lúc DataLoader nạp ảnh, không ghi vào JPEG.

## 7. Augmentation

Train transform hiện hành: `RandomHorizontalFlip(p=0.5)`, `RandomRotation(15°)` với bilinear và fill `(124, 116, 104)`, `ColorJitter(0.2)` cho brightness/contrast/saturation, rồi chuyển tensor và normalize ImageNet. Validation/test chỉ chuyển tensor và normalize, không biến đổi ngẫu nhiên. Inference ảnh mới dùng resize giữ tỷ lệ và pad tương ứng trước khi normalize.

Contact sheet từ đúng transform train đã được tạo cho 10 cây, cùng một sheet riêng lấy mẫu đủ 6 lớp Ớt. Sheet Ớt tiếng Việt đã được xem trực quan; các mẫu giữ nội dung lá trong khung. Bản tại đích: `D:/AgriVisionAI_Data/v1.4/reports/augmentation_contact_sheet_vietnamese.png` và `pepper_augmentation_contact_sheet_vietnamese.png`. QA trực quan là kiểm tra mẫu, chưa phải bằng chứng augmentation cải thiện metric.

## 8. Kiểm tra trùng lặp và leakage

| Kiểm tra trên v1.4 | Kết quả |
|---|---:|
| Path xuyên split | 0 |
| `group_id` xuyên split | 0 |
| SHA-256 xuyên split | 0 |
| dHash thô xuất hiện xuyên split | 602 |
| Ứng viên Hamming 0–5 đã xét | 179.559 |
| Cặp near-duplicate high-confidence khác group / xuyên split | 0 / 0 |

602 dHash là **ứng viên thô**, không phải 602 lỗi leakage. Review dùng ngưỡng grayscale correlation tối thiểu `0,9999` và normalized MAE tối đa `0,005`; không cặp nào đạt ngưỡng high-confidence. Kết luận áp dụng cho phương pháp/ngưỡng này, không chứng minh mọi ảnh cùng lá hoặc cùng nguồn chụp đã được phát hiện.

## 9. Cách sử dụng trong training và inference

Đặt `AGRIVISION_DATASET_DIR` tới `D:/AgriVisionAI_Data/v1.4`. DataLoader đọc trực tiếp `manifests/{train,val,test}.csv`; không chia lại. Task `compound` cần đúng 59 lớp và mapping lưu cùng checkpoint v1.4. Checkpoint 58 lớp v1.3 không tương thích với mapping mới; checkpoint train với sáu tên tiếng Anh cũng phải đổi mapping và thứ tự đầu ra trước khi dùng.

```powershell
$env:AGRIVISION_DATASET_DIR = 'D:/AgriVisionAI_Data/v1.4'
.\.venv\Scripts\python.exe -m ai.train --task compound --epochs 10 --batch-size 8
```

Run 10 epoch trên bản nhãn nguồn đã hoàn tất ngày 2026-09-28. Checkpoint tốt nhất được chọn theo validation Macro-F1 **0,9662**, sau đó test trên 17.599 ảnh đạt Macro-F1 **0,9631**. Checkpoint nhãn Việt hiện hành là phép hoán vị đầu ra của cùng model và cho metric tổng giống hệt khi đánh giá lại; xem `ai/outputs/v1.4/`. Bản gốc và log được lưu trong các thư mục `*_english_label_archive`. Lỗi scheduler sau epoch cuối chỉ làm thiếu summary tự động; history/summary đã được khôi phục từ TensorBoard và code đã sửa.

## 10. Hạn chế và điểm yếu còn tồn đọng

> [!WARNING]
> `v1_4_complete` chỉ xác nhận các gate kỹ thuật về ảnh, manifest, nhãn dạng chuỗi và leakage theo ngưỡng đã định. Nó không xác nhận nhãn bệnh đúng trên từng ảnh hoặc khả năng tổng quát ngoài dữ liệu hiện có.

| Hạn chế | Bằng chứng/phạm vi | Hệ quả và việc cần làm |
|---|---|---|
| **Chất lượng nhãn Ớt chưa được thẩm định chuyên môn** | Sáu tên nhóm lấy từ thư mục nguồn; chưa có review từng ảnh bởi chuyên gia | Rà mẫu phân tầng và các ca model dự đoán sai; lưu quyết định sửa nhãn có truy vết |
| **Không có ánh xạ 5→6 lớp Ớt** | Hai bộ tên và ảnh khác nhau; SHA-256 Ớt giao nhau bằng 0 | Không so trực tiếp metric lớp Ớt hoặc tái dùng checkpoint 58 lớp như cùng bài toán |
| **Mất cân bằng còn lớn** | Cam 43,67%; lớp lớn nhất 12.800 ảnh, nhỏ nhất 40 | Báo cáo Macro-F1, support và recall từng lớp/cây; theo dõi class weight từ train, thử ablation nếu lớp hiếm kém |
| **Ảnh tương quan và thiếu provenance nguồn chụp** | 88.000 ảnh nhưng 52.658 group; không có ID lá/cây/ruộng/thiết bị | Group split chưa đủ chứng minh độc lập sinh học; cần external test theo nguồn độc lập |
| **Giới hạn kiểm tra leakage** | Hamming 0–5/ngưỡng pixel đã định; 602 dHash thô xuyên split không đạt ngưỡng xác nhận | Ảnh cùng lá bị crop/chỉnh màu mạnh vẫn có thể lọt; không gọi kết quả là bảo đảm tuyệt đối |
| **Độ phân giải, padding và chất lượng ảnh nguồn** | 224×224; 1 ảnh Ớt nguồn dưới 224 px; một số lá chạm biên; 1.260 ảnh Ớt được pad | Có thể mất chi tiết bệnh hoặc học viền/nền; xem saliency, lỗi theo ảnh pad và ảnh nhỏ |
| **Augmentation mới qua QA mẫu** | Sheet cho 10 cây và 6 lớp Ớt, mỗi lớp chỉ một ảnh đại diện | So sánh ablation; xem lỗi theo lớp và màu sắc trước khi coi biến đổi là có lợi |
| **Test nội bộ chưa chứng minh triển khai thực tế** | Test 17.599 ảnh đã chạy, nhưng chưa có external test độc lập | Không suy rộng Macro-F1 0,9631 cho ảnh hiện trường; cần đánh giá nguồn và điều kiện chụp khác |

Sáu lớp Ớt có 84–296 ảnh test mỗi lớp, nhiều hơn trước, nhưng chưa chứng minh nguồn chụp đa dạng. Chín cây kế thừa các điểm yếu v1.3; việc tăng ảnh Ớt không xử lý lớp rất hiếm như `Lua___Dom_than_la` (28/4/8 ảnh train/val/test). **Metric toàn tập v1.3 và v1.4 không so sánh ngang hàng tuyệt đối** vì tập test và không gian nhãn Ớt đã thay đổi.

## 11. Quy tắc khi train, đánh giá và sử dụng

1. Ghi dataset version, hash manifest, mapping, seed, transform, class weight và checkpoint trong mỗi experiment. Dừng run nếu manifest/hash hoặc số ảnh/lớp khác 88.000/59.
2. Giữ ba split cố định. Chỉ dùng train để tính class weight; chọn checkpoint/hyperparameter trên validation, không dùng test để điều chỉnh.
3. Báo cáo Macro-F1 cùng per-class recall/F1, support và confusion matrix; tách kết quả Ớt, các lớp hiếm và 9 cây kế thừa.
4. Khi inference, dùng đúng preprocessing và `idx_to_info` của checkpoint v1.4; không dịch/đổi case hoặc sắp xếp lại nhãn sau train.
5. Nếu phát hiện ảnh sai nhãn hoặc trùng nguồn xuyên split, lưu bằng chứng, tạo phiên bản mới và audit lại; không sửa âm thầm manifest v1.4 đã dùng để train.

## 12. Artifact và nguồn đối chiếu

| Artifact | Vị trí |
|---|---|
| Ảnh, manifest và metadata cuối | `D:/AgriVisionAI_Data/v1.4/{images,manifests,metadata}` |
| Phân bố 59 lớp | `D:/AgriVisionAI_Data/v1.4/reports/class_distribution_v1_4.csv` |
| Audit leakage và Hamming 0–5 | `D:/AgriVisionAI_Data/v1.4/reports/post_resize_leakage_summary.json`, `post_resize_hamming_0_to_5_summary.json` |
| Mapping đường dẫn ảnh Ớt JPEG | `D:/AgriVisionAI_Data/v1.4/reports/pepper_jpeg_path_mapping.csv` |
| Contact sheet nhãn Việt | `D:/AgriVisionAI_Data/v1.4/reports/augmentation_contact_sheet_vietnamese.png`, `pepper_augmentation_contact_sheet_vietnamese.png` |
| Audit/dedup/resize Ớt | `datasets/v1.4_audit/`, `v1.4_pepper_dedup/`, `v1.4_pepper_resized/` |
| Training, evaluation nhãn Việt | `ai/outputs/v1.4/{training_summary.json,test_metrics.json}` |
| Bản sao và log nhãn nguồn | `datasets/v1.4_english_label_archive/`, `ai/checkpoints/v1.4_english_label_archive/`, `ai/outputs/v1.4_english_label_archive/` |
| Report kiểm tra v1.4 | [Báo cáo AGRI-21 về thay ảnh Ớt](../reports/AGRI-21/dataset_v1_4_pepper_replacement.md) |
| Mốc đối chiếu | `D:/AgriVisionAI_Data/v1.3/manifests/dataset_manifest.csv` và [overview v1.3](dataset_v1_3_overview.md) |

Số liệu được đối chiếu từ hai manifest cuối và metadata/report v1.4 ngày 2026-09-28. Dataset nằm ngoài Git; đường dẫn tuyệt đối trong metadata là dấu vết máy tạo và cần được cập nhật khi chuyển bản sao sang môi trường khác.

## 13. Kết luận

V1.4 đạt các gate kỹ thuật với hợp đồng 59 lớp, đồng thời thay trọn bộ Ớt mà không đổi 9 cây còn lại. Số ảnh Ớt tăng từ 469 lên 6.396. Run đầu tiên đã train và đánh giá test theo split cố định; kết quả nội bộ là Macro-F1 0,9631. Các giới hạn còn lại tập trung vào **độ đúng nhãn, độc lập nguồn chụp, mất cân bằng lớp và khả năng tổng quát ngoài tập nội bộ**.
