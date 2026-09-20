# Notebook 01 — Nhật ký làm sạch dữ liệu

- **Dataset:** AgriVision AI
- **Phiên bản hiện tại:** `v1.2`
- **Ngày cập nhật:** 2026-09-20
- **Phạm vi:** audit, dedup, xử lý xung đột nhãn, gán `group_id`, audit Hamming, chia tập, tích hợp DataLoader và resize 224×224.

## 1. Kiểm tra dữ liệu nguồn

- Quét 129.867 ảnh thuộc 42 lớp.
- Đọc được toàn bộ ảnh, không phát hiện file hỏng.
- Ghi kích thước, định dạng, dung lượng, SHA-256 và dHash vào manifest.
- Thống kê phân bố lớp và gắn cờ ảnh nhỏ hơn 224 pixel.
- Chuẩn hóa tên dữ liệu nguồn: `Buoi` → `Nho`, sửa các tên lớp sai hoặc chưa
  thống nhất (`Dom_la_som`, `Suong_mai_muon`, `Ghi_sat`,
  `Gan_xanh_la_vang`, `Bo_phan_trang`) và xóa thư mục rỗng
  `Che/Dom_mat_chim`.
- Sau chuẩn hóa vẫn đủ 129.867 file với tổng dung lượng 3.405.386.393 byte;
  chỉ tên thư mục thay đổi, không xóa hoặc đổi tên ảnh.
- Dataset và báo cáo sinh tự động được giữ ngoài repository; Git chỉ lưu mã
  audit và tài liệu kết quả.

**Output:** `<dataset_root>/v1.0`

## 2. Phát hiện trùng lặp

- Phát hiện 54.831 file trùng SHA-256 trong dữ liệu nguồn.
- Trùng lặp tập trung mạnh ở nhóm Cà phê.
- `Ca_phe___Khoe_manh` có 18.983 file nhưng chỉ 62 SHA-256 duy nhất.
- Chỉ dùng dHash để tìm ứng viên gần giống, không tự động xóa theo dHash.
- Điều tra riêng nhóm Cà phê xác nhận 58.549 file chỉ có 3.756 SHA-256 duy
  nhất; báo cáo và ảnh đối chứng nằm trong `coffee_duplicate_analysis.md`.

## 3. Tạo bản exact-dedup `v1.1`

- Giữ một canonical cho mỗi SHA-256 không xung đột nhãn.
- Copy và xác minh checksum 75.028 ảnh.
- Bỏ khỏi bản sao 54.819 file trùng cùng nhãn.
- Cách ly 20 file thuộc 8 SHA xuất hiện ở nhiều nhãn.
- Ảnh nguồn không bị xóa, đổi tên hoặc chỉnh sửa.

## 4. Rà soát xung đột nhãn

- Kiểm tra trực quan 8 nhóm xung đột.
- Giải quyết 4 nhóm và thêm 4 canonical:
  - 2 ảnh Ngô được phân vào `Chay_la` và `Dom_la_xam`;
  - 2 ảnh Ớt được phân vào `Xoan_la`.
- Giữ cách ly 4 nhóm/12 file Ớt vì triệu chứng vàng lá và xoăn lá chồng lấn.

Sau bước này, `v1.1` có **75.032 ảnh và 75.032 SHA-256 duy nhất**.

## 5. Kiểm tra nguồn dữ liệu

- Xác nhận nguồn Cà phê là JMuBEN/JMuBEN2, có mirror trên Kaggle.
- Xác nhận nguồn Cam là Orange leaf disease dataset Version 2 trên Kaggle.
- Cập nhật khác biệt số lượng, cách gộp nhãn và lưu ý giấy phép trong
  `docs/reports/AGRI-21/dataset_overview.md`.

## 6. Gán `group_id` cho near-duplicate

- Kiểm tra trực quan 8 nhóm dHash đại diện.
- Gán 75.032 ảnh vào 41.246 nhóm.
- Có 3.602 nhóm nhiều thành viên, bao phủ 37.388 ảnh; nhóm lớn nhất có 332 ảnh.
- Review bốn dHash xuất hiện ở nhiều nhãn:
  - ba cặp Ớt là cùng ảnh gốc, được dùng chung `group_id` và gắn cờ xung đột nhãn;
  - một dHash Cam là va chạm hash, được tách theo nhãn.
- Không xóa, di chuyển hoặc chỉnh sửa ảnh; chưa ghi split.

## 7. Cách ly ba cặp Ớt xung đột nhãn

- Không ép nhãn vì biểu hiện vàng lá và xoăn lá chồng lấn.
- Chuyển 6 file thuộc 3 nhóm khỏi `images/` sang quarantine và xác minh SHA-256.
- Tập hoạt động còn 75.026 ảnh thuộc 41.243 nhóm; không còn nhóm xuyên nhãn.
- Tổng 75.026 ảnh hoạt động và 6 ảnh cách ly vẫn bằng 75.032, không mất file.

## 8. Rà soát Hamming rộng hơn trước split

- Quét khoảng cách Hamming dHash 1–5 giữa các `group_id` khác nhau, thu được 59.554 cặp ứng viên.
- Không gộp tự động theo Hamming; dùng thêm correlation grayscale và normalized MAE với ngưỡng hiệu chỉnh từ dữ liệu thực tế.
- Xác nhận 2.195 cặp high-confidence:
  - 2.194 cặp cùng nhãn, nối 1.128 nhóm cũ thành 309 component;
  - 1 cặp Ngô cùng ảnh gốc nhưng khác nhãn.
- Giữ bản `Ngo___Dom_la_xam`, cách ly bản trùng `Ngo___Chay_la`.
- Tập active còn 75.025 ảnh thuộc 40.423 nhóm; không còn nhóm xuyên nhãn.

## 9. Chia train/validation/test theo `group_id`

- Chia 70/10/20 theo từng lớp với seed `20260919`; toàn bộ ảnh trong một `group_id` đi cùng split.
- Kết quả: train 52.517 ảnh, validation 7.504 ảnh và test 15.004 ảnh.
- Cả ba split đều có đủ 42 lớp và không có `group_id` xuất hiện ở nhiều split.
- Lớp lệch nhiều nhất là `Ca_phe___Khoe_manh` do chỉ có 62 ảnh trong 13 nhóm; giữ nguyên nhóm để ưu tiên chống leakage.

## 10. Tích hợp DataLoader và tạo dataset `v1.2`

- DataLoader đọc trực tiếp `train.csv`, `val.csv` và `test.csv`; không chia lại dữ liệu trong script training.
- Xác minh đủ 75.025 đường dẫn, 42 lớp và 40.423 `group_id` trước hậu kiểm resize.
- Tạo `v1.2` từ `v1.1` bằng cách resize giữ tỷ lệ theo cạnh dài nhất, căn giữa và pad về 224×224; không crop và không stretch.
- Kết quả: 68.223 ảnh resize, 2.365 ảnh resize + pad và 4.437 ảnh vốn đã 224×224 được sao chép nguyên byte.
- Giữ nguyên đường dẫn và nhãn; cập nhật kích thước, dung lượng, SHA-256 và dHash trong manifest `v1.2`.
- Mỗi ảnh nguồn được kiểm tra SHA-256 trước khi xử lý; mỗi ảnh đầu ra được mở lại và xác nhận đúng 224×224.
- Đã kiểm tra trực quan ảnh ngang/dọc đại diện: nội dung không bị cắt hoặc kéo méo.
- `v1.1` vẫn đủ 75.025 ảnh, manifest không đổi; không xóa hoặc chỉnh sửa trực tiếp file nguồn.
- Cấu hình DataLoader mặc định đã chuyển sang `<dataset_root>/v1.2`.
- Contact sheet dùng đúng train transform trên tám loại cây đã đạt sau khi sửa rotation sang bilinear và fill cùng màu padding.
- Audit Hamming 0–5 hậu-resize phát hiện 244 cặp group high-confidence; tất cả cùng nhãn. Đã gộp 367 group thành 144 component và chia lại theo group.
- Kết quả cuối: 40.200 group, 0 đường dẫn/`group_id`/SHA-256/near-duplicate high-confidence xuyên split; số ảnh split vẫn là 52.517/7.504/15.004.

## 11. Artifact chính

| Artifact | Vị trí |
|---|---|
| Manifest audit nguồn v1.0 | `<dataset_root>/v1.0/manifests/dataset_manifest.csv` |
| Phân bố lớp v1.0 | `<dataset_root>/v1.0/reports/class_distribution.csv` |
| Danh sách ảnh lỗi v1.0 | `<dataset_root>/v1.0/reports/corrupt_images.csv` |
| Báo cáo trùng lặp v1.0 | `<dataset_root>/v1.0/reports/duplicate_report.csv` |
| Ảnh đối chứng trùng lặp Cà phê | `<dataset_root>/v1.0/reports/coffee_duplicate_evidence` |
| Dataset resize dùng cho training | `<dataset_root>/v1.2/images` |
| Manifest hiện tại | `<dataset_root>/v1.2/manifests/dataset_manifest.csv` |
| Metadata phiên bản hiện tại | `<dataset_root>/v1.2/metadata/dataset_version.json` |
| Mapping resize | `<dataset_root>/v1.2/reports/resize_mapping.csv` |
| Dataset nguồn đã làm sạch | `<dataset_root>/v1.1/images` |
| Metadata dataset nguồn | `<dataset_root>/v1.1/metadata/dataset_version.json` |
| Mapping exact dedup | `<dataset_root>/v1.1/reports/exact_dedup_mapping.csv` |
| Review xung đột nhãn | `<dataset_root>/v1.1/reports/label_conflict_review.csv` |
| Mapping `group_id` | `<dataset_root>/v1.1/reports/group_id_assignments.csv` |
| Thống kê nhóm | `<dataset_root>/v1.1/reports/group_summary.csv` |
| Review near-duplicate xuyên nhãn | `<dataset_root>/v1.1/reports/near_duplicate_label_review.csv` |
| Báo cáo ảnh cách ly | `<dataset_root>/v1.1/reports/near_duplicate_label_quarantine.csv` |
| Ứng viên Hamming | `<dataset_root>/v1.1/reports/near_duplicate_hamming_candidates.csv` |
| Pixel similarity review | `<dataset_root>/v1.1/reports/near_duplicate_hamming_similarity_review.csv` |
| Quyết định Hamming | `<dataset_root>/v1.1/reports/near_duplicate_hamming_decisions.csv` |
| Báo cáo quarantine Hamming | `<dataset_root>/v1.1/reports/near_duplicate_hamming_quarantine.csv` |
| Ảnh cách ly | `<dataset_root>/v1.1/quarantine/near_duplicate_label_conflicts` |
| Ảnh cách ly Hamming | `<dataset_root>/v1.1/quarantine/hamming_near_duplicate_conflicts` |
| Backup trước review nhãn | `<dataset_root>/v1.1/reports/step1_backup_before_label_review` |
| Backup trước gán nhóm | `<dataset_root>/v1.1/reports/step2_backup_before_grouping` |
| Backup trước cách ly | `<dataset_root>/v1.1/reports/step3_backup_before_near_duplicate_quarantine` |
| Backup trước review Hamming | `<dataset_root>/v1.1/reports/step4_backup_before_hamming_review` |
| Train manifest hiện tại | `<dataset_root>/v1.2/manifests/train.csv` |
| Validation manifest hiện tại | `<dataset_root>/v1.2/manifests/val.csv` |
| Test manifest hiện tại | `<dataset_root>/v1.2/manifests/test.csv` |
| Mapping nhóm sang split hiện tại | `<dataset_root>/v1.2/reports/group_split_assignments.csv` |
| Phân bố lớp theo split hiện tại | `<dataset_root>/v1.2/reports/split_class_distribution.csv` |
| Tổng hợp split hiện tại | `<dataset_root>/v1.2/reports/split_summary.csv` |
| Kiểm tra leakage cuối | `<dataset_root>/v1.2/reports/post_resize_leakage_summary.json` |
| Audit Hamming 0–5 cuối | `<dataset_root>/v1.2/reports/post_resize_hamming_0_to_5_summary.json` |
| Mapping regroup hậu-resize | `<dataset_root>/v1.2/reports/post_resize_group_merge_mapping.csv` |
| Backup trước regroup/resplit | `<dataset_root>/v1.2/reports/step6_backup_before_post_resize_regroup` |
| Backup trước split | `<dataset_root>/v1.1/reports/step5_backup_before_split` |

## 12. Kiểm tra đã chạy

- [x] Manifest audit v1.0 có 129.867 dòng, 42 lớp và không có ảnh lỗi.
- [x] Kiểm tra độc lập ảnh trùng bằng SHA-256 và ảnh đối chứng Cà phê.
- [x] Dataset cùng báo cáo sinh tự động đã được xác nhận nằm ngoài Git.
- [x] Manifest v1.1 trước resize có 75.025 dòng và 75.025 SHA-256 duy nhất.
- [x] Thư mục `images` v1.1 có 75.025 ảnh; hai vùng quarantine near-duplicate có tổng 7 ảnh.
- [x] Mapping truy vết đủ 129.867 file nguồn.
- [x] Ảnh được copy có checksum đúng.
- [x] Không có `group_id` trống; backup bước 5 xác nhận không có split được ghi sớm.
- [x] Số file ảnh trước/sau gán nhóm đều là 75.032.
- [x] Unit test gán nhóm chạy thành công.
- [x] Không còn `group_id` chứa nhiều nhãn.
- [x] Unit test và kiểm tra checksum cách ly chạy thành công.
- [x] Mapping v1.1 có 75.025 dòng và group summary trước resize có 40.423 dòng.
- [x] Unit test audit Hamming, scoring, apply review và split chạy thành công.
- [x] Ba manifest con có tổng 75.025 đường dẫn duy nhất và khớp manifest chính.
- [x] Không có `group_id` xuất hiện ở nhiều split; leakage report có 0 dòng.
- [x] Train, validation và test đều có đủ 42 lớp.
- [x] Backup bước 5 xác nhận toàn bộ cột `split` trống trước khi chia.
- [x] DataLoader đọc trực tiếp ba manifest, không còn `train_test_split` hoặc `random_split`.
- [x] Khởi tạo DataLoader thực thành công với 52.517/7.504/15.004 record và mapping 42 lớp.
- [x] `v1.2` có đúng 75.025 file ảnh và 75.025 dòng manifest, tất cả kích thước 224×224.
- [x] Đường dẫn và nhãn của `v1.2` khớp `v1.1`; `group_id` và split đã được tính lại sau audit hậu-resize.
- [x] Split `v1.2` giữ nguyên 52.517/7.504/15.004 và có đủ 42 lớp.
- [x] Checksum manifest nguồn không đổi; `v1.1` vẫn có đủ 75.025 ảnh.
- [x] Contact sheet sau augmentation đã được kiểm tra và đạt yêu cầu.
- [x] Audit Hamming 0–5 hậu-resize còn 0 cặp high-confidence giữa các group khác nhau.
- [x] Leakage check cuối có 0 đường dẫn, `group_id`, SHA-256 và near-duplicate high-confidence xuyên split.
- [x] Toàn bộ 18 unit test pipeline dữ liệu và augmentation chạy thành công.

## 13. Trạng thái hiện tại

Đã hoàn thành audit, dedup, review xung đột nhãn, resize 224×224, kiểm tra trực quan augmentation và leakage check Hamming 0–5 hậu-resize. Dataset cuối có 75.025 ảnh, 40.200 group và split 52.517/7.504/15.004; cả ba tập có đủ 42 lớp và không còn leakage high-confidence. DataLoader mặc định dùng ba manifest cuối của `v1.2`, không chia lại dữ liệu trong script training.

**Trạng thái DoD dữ liệu: HOÀN THÀNH.**
