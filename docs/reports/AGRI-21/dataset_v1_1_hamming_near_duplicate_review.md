# Dataset v1.1 — Rà soát near-duplicate bằng khoảng cách Hamming

- **Ngày thực hiện:** 2026-09-20
- **Input:** `<dataset_root>/v1.1` sau khi cách ly ba cặp Ớt xung đột nhãn
- **Trạng thái mới:** `hamming_near_duplicate_review_complete`
- **Phạm vi:** các `group_id` khác nhau có khoảng cách Hamming dHash từ 1 đến 5; chưa chia train/validation/test.

## 1. Checklist thực hiện

- [x] Xác nhận manifest có 75.026 ảnh, không thiếu `group_id` và chưa có split.
- [x] Tạo ứng viên giữa các dHash khác nhau bằng BK-tree, không sửa ảnh hoặc manifest.
- [x] Thống kê riêng cặp cùng nhãn, khác nhãn cùng cây và khác cây.
- [x] Hiệu chỉnh ngưỡng pixel similarity từ các cặp khác nhãn đã xem trực quan.
- [x] Không tự động gộp hoặc cách ly chỉ dựa trên khoảng cách Hamming.
- [x] Gộp `group_id` cho các cặp cùng nhãn đạt cả hai ngưỡng bảo thủ.
- [x] Review trực quan cặp khác nhãn đạt ngưỡng; giữ nhãn có bằng chứng tốt hơn.
- [x] Tạo backup trước khi đổi manifest, mapping hoặc di chuyển ảnh.
- [x] Xác minh SHA-256 của ảnh cách ly và kiểm tra lại toàn bộ invariant.

## 2. Phân bố ứng viên Hamming

| Khoảng cách | Cùng nhãn | Khác nhãn cùng cây | Khác cây | Tổng |
|---:|---:|---:|---:|---:|
| 1 | 4.306 | 6 | 0 | 4.312 |
| 2 | 8.157 | 17 | 0 | 8.174 |
| 3 | 12.227 | 75 | 0 | 12.302 |
| 4 | 15.558 | 238 | 1 | 15.797 |
| 5 | 18.370 | 591 | 8 | 18.969 |
| **Tổng** | **58.618** | **927** | **9** | **59.554** |

Số ứng viên tăng nhanh nên Hamming không được dùng làm quyết định tự động. Các cụm Cam có nền và bố cục gần giống nhau tạo nhiều va chạm dù lá khác nhau.

## 3. Bộ lọc xác nhận bằng pixel

Mỗi ảnh đại diện được chuyển grayscale và resize về 64×64. Cặp chỉ được xem là near-duplicate độ tin cậy cao khi đồng thời đạt:

- grayscale correlation `>= 0.9999`;
- normalized MAE `<= 0.005`.

Ngưỡng được chọn từ dữ liệu quan sát:

- cặp Ngô cùng ảnh gốc: correlation `0.999923`, MAE `0.002237`;
- năm va chạm khác nhãn ở Hamming 1: correlation `0.941251–0.958056`, MAE `0.049397–0.059927`.

Kết quả có **2.195 cặp high-confidence**:

| Khoảng cách | Cùng nhãn | Khác nhãn | Tổng |
|---:|---:|---:|---:|
| 1 | 747 | 1 | 748 |
| 2 | 704 | 0 | 704 |
| 3 | 432 | 0 | 432 |
| 4 | 237 | 0 | 237 |
| 5 | 74 | 0 | 74 |

## 4. Quyết định

### 4.1. Cùng nhãn

2.194 cạnh high-confidence cùng nhãn nối 1.128 `group_id` cũ thành 309 component. Các ảnh không bị xóa; chỉ cập nhật `group_id` để toàn bộ biến thể cùng ảnh gốc đi vào một split.

Mẫu trực quan ở mọi khoảng cách 1–5 cho thấy cùng chiếc lá với khác biệt nén, sáng/tối hoặc grayscale. Toàn bộ component được gộp thuộc bốn lớp Cam.

### 4.2. Khác nhãn

Trong 936 cặp khác nhãn, chỉ một cặp đạt ngưỡng high-confidence:

- giữ `Ngo/Dom_la_xam/Ngo_DomLaXam_00212.jpg`;
- cách ly `Ngo/Chay_la/Ngo_ChayLa_00070.jpg`.

Hai file là cùng ảnh gốc. Ảnh có nhiều vết chữ nhật hẹp với mép song song theo gân lá, phù hợp `Ngo___Dom_la_xam` hơn `Ngo___Chay_la`. University of Minnesota mô tả gray leaf spot bằng vết chữ nhật có cạnh song song rõ, trong khi northern corn leaf blight thường có vết dài dạng điếu xì gà/canoe: [UMN Extension](https://apps.extension.umn.edu/garden/diagnose/plant/vegetable/corn/leavesspotsstreaks.html).

935 cặp khác nhãn còn lại không đạt đồng thời hai ngưỡng nên được giữ riêng. Không có cặp nào bị cách ly chỉ vì Hamming gần nhau.

## 5. Kết quả

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Ảnh active | 75.026 | 75.025 |
| Tổng `group_id` | 41.243 | 40.423 |
| Nhóm nhiều thành viên | 3.599 | 3.126 |
| Ảnh thuộc nhóm nhiều thành viên | 37.382 | 37.728 |
| Nhóm lớn nhất | 332 | 379 |
| Nhóm xuyên nhãn | 0 | 0 |
| Ảnh cách ly thêm | 0 | 1 |

Tổng 75.025 ảnh active, 6 ảnh trong quarantine near-duplicate cũ và 1 ảnh trong quarantine Hamming vẫn bằng 75.032 canonical sau review nhãn; không mất file.

## 6. Artifact

| Artifact | Vị trí |
|---|---|
| Ứng viên Hamming thô | `<dataset_root>/v1.1/reports/near_duplicate_hamming_candidates.csv` |
| Thống kê theo khoảng cách | `<dataset_root>/v1.1/reports/near_duplicate_hamming_summary.csv` |
| Pixel similarity review | `<dataset_root>/v1.1/reports/near_duplicate_hamming_similarity_review.csv` |
| Quyết định cuối | `<dataset_root>/v1.1/reports/near_duplicate_hamming_decisions.csv` |
| Báo cáo ảnh cách ly | `<dataset_root>/v1.1/reports/near_duplicate_hamming_quarantine.csv` |
| Ảnh cách ly mới | `<dataset_root>/v1.1/quarantine/hamming_near_duplicate_conflicts/` |
| Backup trước khi áp dụng | `<dataset_root>/v1.1/reports/step4_backup_before_hamming_review/` |

## 7. Xác minh

- [x] Manifest và thư mục `images` đều có 75.025 ảnh.
- [x] Mapping có 75.025 dòng và group summary có 40.423 dòng.
- [x] Không có `group_id` trống hoặc chứa nhiều nhãn.
- [x] Không có split được ghi sớm.
- [x] Ảnh Ngô trong quarantine khớp SHA-256 từ manifest backup.
- [x] Tổng ảnh active và hai vùng quarantine là 75.032.
- [x] Unit test audit, similarity scoring, apply review và group-aware split đều chạy thành công.

## 8. Bước tiếp theo

Đã chia 70/10/20 theo `group_id` và xác minh không có group leakage; xem `dataset_v1_1_group_aware_split.md`.
