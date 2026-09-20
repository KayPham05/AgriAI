# Dataset v1.1 — Kết quả bước 1: exact dedup

> **Cập nhật sau bước 2:** `v1.1` hiện có 75.032 ảnh sau khi review 8 nhóm xung đột. Báo cáo này giữ nguyên số liệu tại thời điểm kết thúc bước 1; trạng thái mới nằm trong `dataset_v1_1_label_conflict_review.md`.

- **Ngày thực hiện:** 2026-09-19
- **Trạng thái:** hoàn thành bước loại trùng SHA-256
- **Nguồn:** `datasets tunning/Dataset`
- **Manifest nguồn:** `<dataset_root>/v1.0/manifests/dataset_manifest.csv`
- **Output local:** `<dataset_root>/v1.1`
- **Drive:** chưa đồng bộ tự động vì Google Drive không được mount trong workspace.

## 1. Phạm vi của bước này

- Giữ đúng một file đại diện cho mỗi SHA-256 không có xung đột nhãn.
- Copy ảnh sang dataset mới; không xóa, đổi tên hoặc sửa ảnh nguồn.
- Xác minh SHA-256 của từng file sau khi copy.
- Không tự động chọn nhãn khi cùng một SHA-256 xuất hiện ở nhiều lớp.
- Chưa xử lý ảnh gần giống theo dHash và chưa chia train/validation/test.

## 2. Kết quả

| Chỉ số | Số lượng |
|---|---:|
| Ảnh hợp lệ nguồn | 129.867 |
| Ảnh được copy và xác minh | 75.028 |
| Bản trùng tuyệt đối cùng nhãn bị bỏ | 54.819 |
| File bị cách ly do xung đột nhãn | 20 |
| SHA-256 xung đột nhãn | 8 |
| Số lớp còn trong manifest | 42 |

Phép kiểm tra cân bằng:

```text
75.028 copied + 54.819 skipped + 20 quarantined = 129.867 source files
```

Dung lượng ảnh trong `v1.1`: 1.676.162.175 byte, khoảng 1,68 GB. Tổng thư mục gồm báo cáo và manifest: 1.725.947.681 byte, khoảng 1,73 GB.

## 3. Kết quả riêng nhóm Cà phê

| Lớp | Nguồn | Sau exact dedup | Đã bỏ |
|---|---:|---:|---:|
| `Ca_phe___Dom_chay_phoma` | 6.571 | 691 | 5.880 |
| `Ca_phe___Dom_la_cercospora` | 7.681 | 322 | 7.359 |
| `Ca_phe___Gi_sat` | 8.336 | 1.042 | 7.294 |
| `Ca_phe___Khoe_manh` | 18.983 | 62 | 18.921 |
| `Ca_phe___Sau_duc_la` | 16.978 | 1.639 | 15.339 |
| **Tổng Cà phê** | **58.549** | **3.756** | **54.793** |

Không có xung đột nhãn SHA-256 trong năm lớp Cà phê. Tuy nhiên, lớp khỏe chỉ còn 62 ảnh theo SHA-256 nên chưa phù hợp để coi là một lớp có gần 19 nghìn mẫu độc lập.

## 4. Xung đột nhãn đã cách ly

Có 8 SHA-256 xuất hiện trong từ hai nhãn trở lên, gồm 20 file thuộc các nhóm:

- `Ngo___Chay_la` và `Ngo___Dom_la_xam`;
- `Ot___Khoe_manh` và `Ot___Xoan_la`;
- `Ot___Ruoi_trang` và `Ot___Xoan_la`;
- `Ot___Vang_la` và `Ot___Xoan_la`.

Các file này vẫn còn nguyên trong dataset nguồn nhưng không được copy vào `v1.1`. Danh sách đầy đủ nằm trong `reports/label_conflicts.csv` để kiểm tra nhãn thủ công.

## 5. Artifact để kiểm tra

```text
<dataset_root>/v1.1/
├── images\
│   └── <cây>\<tình_trạng>\<ảnh>
├── manifests\
│   └── dataset_manifest.csv
├── metadata\
│   └── dataset_version.json
└── reports\
    ├── class_distribution.csv
    ├── exact_dedup_mapping.csv
    └── label_conflicts.csv
```

| File | Cách kiểm tra |
|---|---|
| `dataset_version.json` | Xem trạng thái `exact_dedup_only` và các tổng số |
| `dataset_manifest.csv` | Phải có 75.028 dòng dữ liệu và 75.028 SHA-256 duy nhất |
| `class_distribution.csv` | So sánh số lượng trước/sau theo từng lớp |
| `exact_dedup_mapping.csv` | Truy vết mọi file nguồn sang canonical hoặc lý do bị bỏ |
| `label_conflicts.csv` | Duyệt 20 file có cùng nội dung nhưng khác nhãn |

## 6. Xác minh đã chạy

- [x] Unit test exact dedup và label conflict chạy thành công.
- [x] 75.028 file ảnh tồn tại trong output.
- [x] Manifest có 75.028 dòng.
- [x] Manifest có 75.028 SHA-256 duy nhất.
- [x] SHA-256 từng ảnh copy khớp manifest.
- [x] Mapping có đủ 129.867 hành động.
- [x] Dataset nguồn vẫn có 129.867 ảnh.
- [x] Không còn thư mục staging `v1.1.incomplete`.

## 7. Chưa thực hiện

- [ ] Kiểm tra trực quan 20 file xung đột nhãn và chốt nhãn đúng.
- [ ] Nhóm ảnh gần giống theo dHash/original source và gán `group_id`.
- [ ] Quyết định giữ, bổ sung hay tạm loại dữ liệu Cà phê thiếu đa dạng.
- [ ] Chia train/validation/test 70/10/20 theo `group_id`.

`v1.1` hiện là bản **exact-dedup-only**, chưa phải dataset train-ready.
