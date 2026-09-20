# Dataset v1.1 — Cách ly xung đột nhãn near-duplicate

- **Ngày thực hiện:** 2026-09-19
- **Input:** `<dataset_root>/v1.1` sau khi gán `group_id`
- **Trạng thái mới:** `group_ids_assigned_and_near_duplicate_conflicts_quarantined`
- **Phạm vi:** ba cặp ảnh Ớt cùng ảnh gốc nhưng mang hai nhãn khác nhau.

## 1. Quyết định

Ba nhóm đều xuất hiện đồng thời trong `Ot___Vang_la` và `Ot___Xoan_la`. Ảnh có biểu hiện vàng/khảm và biến dạng lá chồng lấn, không có bằng chứng đủ tin cậy để ép chọn một nhãn.

Quyết định: **cách ly cả hai file trong mỗi nhóm**. Sáu file được chuyển khỏi `images/` sang vùng quarantine, giữ nguyên tên, đường dẫn tương đối và SHA-256 để có thể phục hồi.

## 2. Kết quả

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Ảnh hoạt động trong manifest | 75.032 | 75.026 |
| Tổng `group_id` | 41.246 | 41.243 |
| Nhóm nhiều thành viên | 3.602 | 3.599 |
| Ảnh thuộc nhóm nhiều thành viên | 37.388 | 37.382 |
| Nhóm xuyên nhãn | 3 | 0 |
| Nhóm/file được cách ly | 0 | 3/6 |

## 3. Artifact

- Báo cáo sáu file: `<dataset_root>/v1.1/reports/near_duplicate_label_quarantine.csv`
- Ảnh cách ly: `<dataset_root>/v1.1/quarantine/near_duplicate_label_conflicts/`
- Backup trước khi cách ly: `<dataset_root>/v1.1/reports/step3_backup_before_near_duplicate_quarantine/`
- Manifest hiện tại: `<dataset_root>/v1.1/manifests/dataset_manifest.csv`

## 4. Xác minh

- [x] Manifest và mapping nhóm đều có 75.026 dòng.
- [x] Thư mục `images` có 75.026 file.
- [x] Quarantine có đủ 6 file và toàn bộ SHA-256 khớp manifest backup.
- [x] Tổng ảnh hoạt động và cách ly vẫn là 75.032; không mất file.
- [x] Không còn `group_id` chứa nhiều nhãn.
- [x] Không có split được ghi sớm.
- [x] Unit test cách ly chạy thành công.

## 5. Follow-up

Ngày 2026-09-20 đã rà soát rộng hơn các dHash có khoảng cách Hamming 1–5. Kết quả gộp các component cùng nhãn có pixel similarity rất cao và cách ly thêm một bản Ngô trùng ảnh nhưng sai nhãn; xem `dataset_v1_1_hamming_near_duplicate_review.md`.
