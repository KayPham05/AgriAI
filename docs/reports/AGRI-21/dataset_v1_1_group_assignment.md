# Dataset v1.1 — Gán `group_id` trước khi chia tập

- **Ngày thực hiện:** 2026-09-19
- **Input:** `<dataset_root>/v1.1`
- **Trạng thái mới:** `group_ids_assigned`
- **Phạm vi:** nhóm các ảnh near-duplicate/cùng ảnh gốc; chưa chia train/validation/test.

## 1. Quy tắc gán nhóm

- Cột `phash` hiện lưu **difference hash 64 bit (dHash)**, không phải pHash.
- Các ảnh có cùng dHash và cùng `compound_label` được gán chung một `group_id`.
- Ảnh không có ứng viên cùng dHash giữ nhóm riêng dạng `sha256:<hash>`.
- dHash xuất hiện ở nhiều nhãn phải được kiểm tra trực quan trước khi quyết định.
- Không xóa, đổi tên, di chuyển hoặc chỉnh sửa file ảnh trong bước này.

`group_id` chỉ phục vụ chống leakage: toàn bộ ảnh trong cùng nhóm phải đi vào cùng một split. Nó không khẳng định các file giống nhau tuyệt đối ở mức byte.

## 2. Kiểm tra trực quan

Đã xem 8 nhóm đại diện, gồm sáu nhóm Cam lớn nhất và hai nhóm Cà phê. Các ảnh trong mẫu là cùng ảnh gốc với biến thể blur, sáng/tối, grayscale hoặc crop nhẹ.

Ảnh đối chứng nằm tại:

```text
<dataset_root>/v1.1/reports/group_id_review/group_01.png
...
<dataset_root>/v1.1/reports/group_id_review/group_08.png
```

Phát hiện bốn dHash xuất hiện ở nhiều nhãn:

| dHash | Nhãn | Quyết định |
|---|---|---|
| `3b9a9133e7cbcfe2` | `Ot___Vang_la`, `Ot___Xoan_la` | Cùng ảnh gốc; dùng chung `group_id` và gắn cờ xung đột nhãn. |
| `5b1b1d6c333ef1bb` | `Ot___Vang_la`, `Ot___Xoan_la` | Cùng ảnh gốc; dùng chung `group_id` và gắn cờ xung đột nhãn. |
| `96979116b6cc2656` | `Ot___Vang_la`, `Ot___Xoan_la` | Cùng ảnh gốc; dùng chung `group_id` và gắn cờ xung đột nhãn. |
| `f5cf3bf3c68f8dda` | Hai nhãn Cam | Va chạm dHash, không cùng ảnh gốc; tách nhóm theo nhãn. |

Ba nhóm Ớt ban đầu được giữ chung `group_id` để không bị phân tán qua nhiều split. Sau bước này, cả sáu file đã được cách ly vì không đủ bằng chứng chọn một trong hai nhãn; xem `dataset_v1_1_near_duplicate_conflict_quarantine.md`.

## 3. Kết quả

| Chỉ số | Giá trị |
|---|---:|
| Ảnh trong manifest | 75.032 |
| Tổng số `group_id` | 41.246 |
| Nhóm có từ 2 ảnh | 3.602 |
| Ảnh thuộc nhóm nhiều thành viên | 37.388 |
| Nhóm lớn nhất | 332 ảnh |
| Nhóm xuyên nhãn đã review | 3 |
| Dòng thiếu `group_id` | 0 |
| Dòng đã có `split` | 0 |

## 4. Artifact

| Artifact | Vị trí |
|---|---|
| Manifest đã gán nhóm | `<dataset_root>/v1.1/manifests/dataset_manifest.csv` |
| Mapping từng ảnh sang nhóm | `<dataset_root>/v1.1/reports/group_id_assignments.csv` |
| Thống kê từng nhóm | `<dataset_root>/v1.1/reports/group_summary.csv` |
| Review dHash xuyên nhãn | `<dataset_root>/v1.1/reports/near_duplicate_label_review.csv` |
| Backup trước khi gán nhóm | `<dataset_root>/v1.1/reports/step2_backup_before_grouping` |
| Metadata phiên bản | `<dataset_root>/v1.1/metadata/dataset_version.json` |

## 5. Xác minh

- [x] Manifest trước và sau đều có 75.032 đường dẫn ảnh.
- [x] Thư mục output vẫn có 75.032 file ảnh.
- [x] Không có `group_id` trống.
- [x] Có đúng 41.246 nhóm trong manifest và báo cáo nhóm.
- [x] Chỉ ba nhóm Ớt đã review chứa nhiều nhãn.
- [x] Sáu ảnh trong ba nhóm trên có cờ `near_duplicate_label_conflict_reviewed`.
- [x] Toàn bộ cột `split` vẫn trống.
- [x] Unit test gán nhóm chạy thành công.

## 6. Bước tiếp theo

1. [x] Cách ly ba cặp Ớt xung đột nhãn, không ép chọn nhãn.
2. [x] Rà soát dHash ở khoảng cách Hamming 1–5 và gộp các component cùng nhãn có pixel similarity rất cao.
3. [x] Chia 70/10/20 theo `group_id` và giữ tỷ lệ lớp gần cân bằng.
4. [x] Kiểm tra không có `group_id` xuất hiện ở nhiều split.

Kết quả follow-up được ghi tại `dataset_v1_1_hamming_near_duplicate_review.md`: tập active còn 75.025 ảnh thuộc 40.423 nhóm và không có nhóm xuyên nhãn.

Kết quả chia tập được ghi tại `dataset_v1_1_group_aware_split.md`: train 52.517 ảnh, validation 7.504 ảnh, test 15.004 ảnh và 0 nhóm leakage.
