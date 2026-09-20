# Dataset preparation commands

Các lệnh trong thư mục này tái lập quá trình chuẩn bị dataset; chúng không được
import bởi DataLoader khi train hoặc inference. Chạy từ root repository bằng
dạng module:

```powershell
.\.venv\Scripts\python.exe -m ai.scripts.dataset.<script_name> --help
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
