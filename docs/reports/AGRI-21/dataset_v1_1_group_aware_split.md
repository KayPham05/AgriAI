# Dataset v1.1 — Chia train/validation/test theo `group_id`

- **Ngày thực hiện:** 2026-09-20
- **Input:** `<dataset_root>/v1.1` ở trạng thái `hamming_near_duplicate_review_complete`
- **Trạng thái mới:** `group_aware_split_complete`
- **Tỷ lệ mục tiêu:** train/validation/test = 70/10/20
- **Seed:** `20260919`

## 1. Phương pháp

- Chia riêng trong từng `compound_label` để giữ phân bố lớp gần tỷ lệ mục tiêu.
- Xếp nhóm lớn trước; với mỗi nhóm, chọn split đang thiếu nhiều nhất theo tỷ lệ tương đối.
- Tối ưu cục bộ các lần chuyển nhóm nếu làm giảm sai số tỷ lệ.
- Toàn bộ ảnh trong một `group_id` luôn nhận cùng một split.
- Không di chuyển hoặc sao chép file ảnh; chỉ cập nhật manifest và tạo các manifest con.

## 2. Kết quả tổng thể

| Split | Mục tiêu | Số ảnh | Tỷ lệ thực tế | Số nhóm | Số lớp |
|---|---:|---:|---:|---:|---:|
| Train | 70% | 52.517 | 69,9993% | 28.315 | 42 |
| Validation | 10% | 7.504 | 10,0020% | 4.032 | 42 |
| Test | 20% | 15.004 | 19,9987% | 8.076 | 42 |
| **Tổng** | **100%** | **75.025** | **100%** | **40.423** | **42** |

## 3. Kiểm tra cân bằng lớp

- Cả 42 lớp đều có ảnh trong train, validation và test.
- 41/42 lớp có độ lệch tuyệt đối lớn nhất so với tỷ lệ mục tiêu không quá 0,66 điểm phần trăm.
- Lớp lệch nhiều nhất là `Ca_phe___Khoe_manh`: 62 ảnh thuộc 13 nhóm, được chia 46/6/10 ảnh, tương ứng 74,1935%/9,6774%/16,1290%.

Sai lệch của `Ca_phe___Khoe_manh` được giữ lại thay vì tách `group_id`, vì chống leakage được ưu tiên hơn việc ép tỷ lệ ảnh chính xác tuyệt đối.

## 4. Artifact

| Artifact | Vị trí |
|---|---|
| Manifest đầy đủ đã có split | `<dataset_root>/v1.1/manifests/dataset_manifest.csv` |
| Train manifest | `<dataset_root>/v1.1/manifests/train.csv` |
| Validation manifest | `<dataset_root>/v1.1/manifests/val.csv` |
| Test manifest | `<dataset_root>/v1.1/manifests/test.csv` |
| Mapping nhóm sang split | `<dataset_root>/v1.1/reports/group_split_assignments.csv` |
| Phân bố từng lớp | `<dataset_root>/v1.1/reports/split_class_distribution.csv` |
| Tổng hợp split | `<dataset_root>/v1.1/reports/split_summary.csv` |
| Kiểm tra leakage | `<dataset_root>/v1.1/reports/split_leakage_check.csv` |
| Backup trước split | `<dataset_root>/v1.1/reports/step5_backup_before_split/` |

## 5. Xác minh

- [x] Manifest chính và thư mục `images` đều có 75.025 ảnh.
- [x] Ba manifest con cộng lại có 75.025 dòng và 75.025 đường dẫn duy nhất.
- [x] Tập đường dẫn trong ba manifest con khớp hoàn toàn manifest chính.
- [x] Không có dòng thiếu split hoặc ghi sai tên split.
- [x] Có 40.423 group assignment, bằng số `group_id` trong manifest.
- [x] Không có `group_id` xuất hiện ở nhiều split.
- [x] Báo cáo leakage có 0 dòng dữ liệu.
- [x] Cả ba split đều có đủ 42 lớp.
- [x] Backup trước split có 75.025 dòng và toàn bộ cột `split` trống.
- [x] Unit test group-aware split chạy thành công.

## 6. Bước tiếp theo

Dùng trực tiếp `train.csv`, `val.csv` và `test.csv` trong data loader. Không tạo lại split theo ảnh hoặc random seed khác trong script training.
