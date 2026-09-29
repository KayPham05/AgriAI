# Dataset preparation commands

Các lệnh trong thư mục này tái lập quá trình chuẩn bị dataset; chúng không được
import bởi DataLoader khi train hoặc inference. Chạy từ root repository bằng
dạng module:

```powershell
.\.venv\Scripts\python.exe -m ai.tasks.agri_21.scripts.<script_name> --help
```

Thứ tự pipeline AGRI-21:

1. `audit_dataset`
2. `build_exact_dedup_dataset`
3. `apply_label_conflict_review`
4. `assign_group_ids`
5. `quarantine_near_duplicate_label_conflicts`
6. `audit_near_duplicates_by_hamming`
7. `score_near_duplicate_hamming_candidates`
8. `apply_hamming_near_duplicate_review`
9. `split_dataset_by_group`
10. `build_resized_dataset`
11. `generate_augmentation_contact_sheet`
12. `audit_post_resize_near_duplicates`
13. `resolve_post_resize_leakage`
14. `check_post_resize_leakage`

Dataset đã hoàn tất không cần chạy lại các bước thay đổi dữ liệu. Xem bằng
chứng và trạng thái cuối tại `docs/reports/AGRI-21/README.md`.

Batch Ớt thay thế và dataset v1.4 dùng các script `prepare_v1_4_pepper.py`,
`build_v1_4_dataset.py`, `finalize_v1_4_dataset.py`. Thứ tự và bằng chứng ở
`docs/notebooks/dataset_v1_4_overview.md`. Không chạy các decision hard-code
cho ảnh Ớt v1.1 lên batch v1.4.

Khi tạo riêng batch Ớt v1.4, truyền `--dataset-version v1.4` cho
`build_exact_dedup_dataset` và `build_resized_dataset`. Hai bước ghi phiên bản
nguồn từ metadata đầu vào để truy vết đúng từng stage.

Sau khi finalize batch tiếng Anh, `relocate_v1_4_vietnamese_labels.py` tạo bản
sao tại `D:/AgriVisionAI_Data/v1.4`, đổi đồng bộ sáu nhãn Ớt và xác minh SHA-256
toàn bộ ảnh trước khi công bố thư mục đích. Bản nguồn không bị xóa. Checkpoint
train từ nhãn cũ cần chạy `relabel_v1_4_checkpoint.py` sau khi train xong để
hoán vị classifier theo thứ tự nhãn mới; không chỉ sửa tên trong JSON.
