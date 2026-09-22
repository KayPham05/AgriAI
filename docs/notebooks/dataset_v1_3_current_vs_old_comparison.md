# So sánh dataset v1.3 hiện tại với bản v1.3 cũ

- **Bản cũ:** `D:\AgriVisionAI_Data\old v1.3\v1.3`
- **Bản hiện tại:** `D:\AgriVisionAI_Data\v1.3`
- **Ngày đối chiếu:** 2026-09-22
- **Nguồn số liệu:** manifest, metadata và report thực tế của hai thư mục
- **Phạm vi:** ảnh, nhãn, group, split, metadata, leakage và artifact audit

> Đường dẫn người dùng cung cấp là `D:\AgriVisionAI\_Data\old v1.3\v1.3`,
> nhưng thư mục tồn tại thực tế là `D:\AgriVisionAI_Data\old v1.3\v1.3`.

## 1. Kết luận nhanh

Hai bản chứa **cùng 82.073 ảnh, 10 nhóm cây và 58 lớp**. Bản hiện tại không thêm, xóa, đổi tên, đổi nhãn hoặc xử lý lại pixel so với bản cũ. Khác biệt nằm ở việc sửa group, đóng near-duplicate leakage, đồng bộ metadata và bổ sung đầy đủ artifact audit.

| Kết luận | Kết quả |
|---|---|
| Ảnh chỉ có ở bản cũ | 0 |
| Ảnh chỉ có ở bản hiện tại | 0 |
| Đường dẫn chung | 82.073/82.073 |
| Cặp file giống nhau byte-by-byte | 82.073/82.073 |
| Cặp file khác dung lượng hoặc nội dung byte | 0 |
| Dòng thay đổi nội dung ảnh hoặc nhãn | 0 |
| Dòng thay đổi `group_id` | 38 |
| Dòng thay đổi `quality_flags` | 34 |
| Dòng thay đổi split | 8 |
| Phân bố ảnh theo lớp/split bị thay đổi | 0 lớp |
| Cross-label group | 1 → 0 |
| Near-duplicate high-confidence xuyên split | Chưa có audit v1.3 đáng tin cậy → 0 |

**Khuyến nghị:** dùng bản hiện tại làm dataset chính thức. Bản cũ chỉ nên giữ làm snapshot truy vết trước khi xử lý.

## 2. So sánh quy mô và cấu trúc

| Chỉ số tính từ manifest | Bản cũ | Bản hiện tại | Thay đổi |
|---|---:|---:|---:|
| Tổng dòng/ảnh | 82.073 | 82.073 | 0 |
| Đường dẫn duy nhất | 82.073 | 82.073 | 0 |
| Nhóm cây | 10 | 10 | 0 |
| Lớp | 58 | 58 | 0 |
| Group | 47.003 | 46.989 | -14 |
| Group nhiều ảnh | 3.179 | 3.195 | +16 |
| Ảnh thuộc group nhiều ảnh | 38.249 | 38.279 | +30 |
| Group lớn nhất | 402 | 402 | 0 |
| Cross-label group | 1 | 0 | -1 |
| Group xuyên split | 0 | 0 | 0 |
| SHA-256 xuyên split | 0 | 0 | 0 |

Số group giảm 14 không phải do mất ảnh. Đây là kết quả tổng hợp của hai thay đổi ngược chiều:

- Tách một group Lúa sai thành bốn singleton: tăng 3 group.
- Merge 34 group near-duplicate thành 17 component: giảm 17 group.
- Thay đổi ròng: `+3 - 17 = -14` group.

## 3. So sánh split

### Số ảnh

| Split | Bản cũ | Bản hiện tại | Thay đổi |
|---|---:|---:|---:|
| Train | 57.449 | 57.449 | 0 |
| Validation | 8.209 | 8.209 | 0 |
| Test | 16.415 | 16.415 | 0 |

### Số group

| Split | Bản cũ | Bản hiện tại | Thay đổi |
|---|---:|---:|---:|
| Train | 32.921 | 32.911 | -10 |
| Validation | 4.690 | 4.689 | -1 |
| Test | 9.392 | 9.389 | -3 |
| **Tổng** | **47.003** | **46.989** | **-14** |

Tám ảnh Xoài được đổi split để các component near-duplicate nằm trọn trong một split:

| Chuyển đổi | Số ảnh |
|---|---:|
| Train → Validation | 1 |
| Validation → Train | 1 |
| Train → Test | 3 |
| Test → Train | 3 |

Các chuyển đổi đối xứng giữ nguyên tổng ảnh từng split và giữ nguyên phân bố của mọi lớp. Không có file ảnh vật lý nào bị di chuyển.

## 4. Thay đổi chính xác trong manifest

Hai manifest có cùng schema 16 cột và cùng 82.073 `image_path`. So sánh từng
field cho từng đường dẫn cho kết quả:

| Field | Số dòng thay đổi | Giải thích |
|---|---:|---|
| `group_id` | 38 | 4 ảnh Lúa được tách group; 34 ảnh Xoài được merge component |
| `quality_flags` | 34 | Thêm `v1_3_hamming_reviewed` cho ảnh Xoài đã review |
| `split` | 8 | Giữ near-duplicate component trong cùng split |
| Các field còn lại | 0 | Ảnh, nhãn, checksum và trạng thái giữ nguyên |

Các field không đổi gồm:

- `image_path`, `plant`, `condition`, `compound_label`;
- `extension`, `image_format`, `width`, `height`, `file_size`;
- `sha256`, `phash`, `status`, `rejection_reason`.

Ngoài so sánh manifest, toàn bộ 82.073 cặp file trong hai thư mục `images/`
đã được mở và so sánh byte-by-byte. Hai thư mục đều có đúng 82.073 file;
không có file thiếu, khác dung lượng hoặc khác nội dung byte.

Manifest SHA-256:

| Phiên bản | SHA-256 |
|---|---|
| Bản cũ | `a58f760689813dc878dcb4ca2780e49d9652200dfd48f9dd9d52c7b26d7bd54d` |
| Bản hiện tại | `1d7f431440a7dc6e3e9ffc8f2d542f55d7cb358186e685c33fe54d86dab053eb` |

## 5. Sửa cross-label group của Lúa

Bản cũ có một group `grp_dhash_4fa1c91dad7ceea6` chứa bốn ảnh thuộc hai
nhãn:

- 2 ảnh `Lua___Dom_nau`;
- 2 ảnh `Lua___Khoe_manh`.

Đối chiếu pixel xác nhận đây là va chạm dHash, không phải near-duplicate.
Bản hiện tại giữ nguyên bốn ảnh, nhãn và split `train`, nhưng tách thành bốn group singleton theo SHA-256.

Thay đổi group theo lớp:

| Lớp | Group bản cũ | Group hiện tại | Thay đổi |
|---|---:|---:|---:|
| `Lua___Dom_nau` | 415 | 416 | +1 |
| `Lua___Khoe_manh` | 1.070 | 1.071 | +1 |

![Bằng chứng cross-label group](../reports/AGRI-21/assets/dataset_v1_3_gap_review/cross_label_group_evidence.svg)

## 6. Xử lý near-duplicate của Xoài

Full audit Hamming 0–5 sau lần sửa Lúa phát hiện 17 cặp high-confidence cùng
nhãn. Pipeline hiện tại đã merge 34 group cũ thành 17 component:

- 16 component thuộc `Xoai___bo_cat_la`;
- 1 component thuộc `Xoai___bo_xit`;
- 8 cặp ban đầu nằm khác split;
- 8 ảnh được đổi split tối thiểu;
- 0 ảnh bị xóa, đổi nhãn hoặc di chuyển vật lý.

| Lớp | Group bản cũ | Group hiện tại | Thay đổi |
|---|---:|---:|---:|
| `Xoai___bo_cat_la` | 264 | 248 | -16 |
| `Xoai___bo_xit` | 499 | 498 | -1 |

Sau regroup, full audit lại 155.950 ứng viên Hamming 0–5 trả về:

- 0 cặp high-confidence giữa các group;
- 0 cặp high-confidence xuyên split;
- 0 path, group hoặc SHA-256 xuyên split.

## 7. So sánh metadata

Metadata bản cũ trộn số liệu v1.2 và v1.3 trong cùng top-level. Vì vậy trạng
thái `dod_status = complete` của bản cũ không đủ để chứng minh dataset đã đạt.

| Field | Bản cũ | Bản hiện tại |
|---|---|---|
| `stage` | `v1_3_extended_complete` | `v1_3_complete` |
| `dod_status` | `complete` | `complete` |
| `active_image_count` | 75.025 | 82.073 |
| `classes` | 42 | 58 |
| `group_count` | 40.200 | 46.989 |
| `total_files` | 82.073 | 82.073 |
| `total_classes` | 58 | 58 |
| `total_plants` | 10 | 10 |
| `source_dataset_dir` | Trỏ đến v1.1 | Trỏ đến v1.2 |
| `source_manifest` | Trỏ đến manifest v1.0 | Trỏ đến manifest v1.2 |
| Unit test ghi nhận | 17 | 28 |

Bản hiện tại đã:

- đồng bộ các field đếm với manifest thật;
- ghi đúng v1.2 là nguồn trực tiếp;
- chuyển số liệu audit lịch sử sang `source_v1_2_pipeline_audit`;
- bổ sung `v1_3_cross_label_resolution`,
  `v1_3_near_duplicate_resolution` và `v1_3_final_audit`;
- lưu trạng thái augmentation và kết quả 28 unit test.

## 8. So sánh artifact audit

Bản cũ chỉ có ba report cơ bản:

- `extension_resize_mapping.csv`;
- `split_leakage_check.csv`;
- `split_summary.csv`.

Bản hiện tại bổ sung:

- `cross_label_group_resolution.csv`;
- `post_resize_hamming_0_to_5_summary.json`;
- `post_resize_hamming_0_to_5_review.csv`;
- `post_resize_leakage_summary.json`;
- `post_resize_cross_split_dhash_review.csv`;
- `v1_3_final_audit.json`;
- `v1_3_near_duplicate_group_merge_mapping.csv`;
- `v1_3_split_move_log.csv`;
- ba thư mục backup trước cross-label resolution, regroup và release sync.

![Bằng chứng hậu kiểm bản hiện tại](../reports/AGRI-21/assets/dataset_v1_3_gap_review/finalization_evidence.svg)

## 9. Điểm giống nhau cần giữ nguyên

- 82.073 ảnh JPEG 224×224.
- 10 nhóm cây và 58 compound label.
- Tổng ảnh 57.449/8.209/16.415 ở train/validation/test.
- Phân bố của từng lớp trong từng split.
- Nội dung ảnh, kích thước, dung lượng, SHA-256 và dHash.
- Preprocessing `resize_longest_side_then_center_pad` kế thừa v1.2.
- Không có SHA-256 xuất hiện xuyên split.

## 10. Trạng thái sử dụng

| Phiên bản | Khuyến nghị |
|---|---|
| Bản v1.3 cũ | Chỉ giữ để truy vết; không dùng cho training/evaluation mới |
| Bản v1.3 hiện tại | Dùng làm dataset chính thức cho thí nghiệm |

Bản cũ chưa xử lý cross-label group của Lúa, chưa regroup các cặp
near-duplicate Xoài và thiếu bằng chứng leakage dành riêng cho v1.3. Bản hiện
tại đã đóng các điểm này mà không thay đổi tập ảnh hoặc phân bố lớp.

## 11. Artifact dùng để tái kiểm tra

| Artifact | Đường dẫn |
|---|---|
| Manifest bản cũ | `D:\AgriVisionAI_Data\old v1.3\v1.3\manifests\dataset_manifest.csv` |
| Metadata bản cũ | `D:\AgriVisionAI_Data\old v1.3\v1.3\metadata\dataset_version.json` |
| Manifest hiện tại | `D:\AgriVisionAI_Data\v1.3\manifests\dataset_manifest.csv` |
| Metadata hiện tại | `D:\AgriVisionAI_Data\v1.3\metadata\dataset_version.json` |
| Full Hamming audit | `D:\AgriVisionAI_Data\v1.3\reports\post_resize_hamming_0_to_5_summary.json` |
| Leakage audit | `D:\AgriVisionAI_Data\v1.3\reports\post_resize_leakage_summary.json` |
| Log 8 ảnh đổi split | `D:\AgriVisionAI_Data\v1.3\reports\v1_3_split_move_log.csv` |
| Mapping merge group | `D:\AgriVisionAI_Data\v1.3\reports\v1_3_near_duplicate_group_merge_mapping.csv` |

## 12. Kết luận

Bản v1.3 hiện tại là bản sửa và hoàn thiện của snapshot cũ, không phải một
tập ảnh khác. Phép so sánh trực tiếp xác nhận 82.073/82.073 cặp ảnh giống
nhau byte-by-byte. Bản hiện tại giữ nguyên 100% đường dẫn, nhãn và phân bố lớp, đồng
thời sửa group semantics, loại bỏ near-duplicate leakage đã xác nhận, đồng bộ
metadata và bổ sung khả năng truy vết. Vì vậy các experiment mới phải dùng
`D:\AgriVisionAI_Data\v1.3`; bản trong `old v1.3` chỉ nên dùng cho đối chiếu.
