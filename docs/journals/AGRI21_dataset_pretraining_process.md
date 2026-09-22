# Quy trình xử lý từ `datasets tunning` đến dataset v1.3

## 1. Mục tiêu

Biến dữ liệu thô trong `datasets tunning/Dataset` thành dataset thống nhất,
ít trùng lặp, không rò rỉ giữa các tập và sẵn sàng train mô hình phân loại.

Các tên `v1.0`–`v1.3` là **mốc lưu của cùng một pipeline**, không phải bốn
dataset độc lập:

```text
datasets tunning/Dataset (129.867 ảnh, 8 cây, 42 lớp)
  → audit và lập manifest (v1.0)
  → dedup, review nhãn, gom group và chia tập (v1.1)
  → chuẩn hóa ảnh 224×224 và hậu kiểm leakage (v1.2)
  → ghép batch Lúa/Xoài đã qua cùng pipeline (v1.3)
  → sẵn sàng train
```

## 2. Dataset nguồn ban đầu

Nguồn vật lý được dùng để bắt đầu pipeline:

```text
<repo_root>/datasets tunning/Dataset/
├── Cam/
├── Ca_chua/
├── Ca_phe/
├── Che/
├── Ngo/
├── Nho/
├── Ot/
└── Sau_rieng/
```

| Cây nguồn | Số lớp | Số ảnh thô |
|---|---:|---:|
| Cam | 4 | 38.432 |
| Cà chua | 10 | 18.160 |
| Cà phê | 5 | 58.549 |
| Chè | 5 | 1.539 |
| Ngô | 4 | 4.188 |
| Nho | 4 | 4.062 |
| Ớt | 5 | 500 |
| Sầu riêng | 5 | 4.437 |
| **Tổng** | **42** | **129.867** |

Thư mục nguồn chỉ có 8 cây trên. Lúa và Xoài là batch mở rộng được thêm sau
khi nền v1.2 hoàn tất; chúng phải đi qua cùng các gate resize, dedup/group,
split và leakage trước khi được ghép vào sản phẩm v1.3.

`datasets tunning` được xem là input chỉ đọc. Các output xử lý được tạo riêng
dưới `<dataset_root>/v1.0` đến `<dataset_root>/v1.3` để không làm hỏng nguồn.

## 3. Pipeline xử lý hoàn chỉnh

| Bước | Xử lý | Mục đích và kết quả |
|---:|---|---|
| 1 | Quét dữ liệu gốc | Đọc 129.867 ảnh thuộc 42 lớp; ghi đường dẫn, nhãn, kích thước, định dạng, SHA-256 và dHash vào manifest |
| 2 | Chuẩn hóa tên nhãn | Sửa tên cây/lớp chưa thống nhất nhưng không thay đổi nội dung ảnh |
| 3 | Exact dedup | Giữ một ảnh đại diện cho mỗi SHA-256 cùng nhãn; loại 54.819 bản sao khỏi bản xử lý |
| 4 | Review xung đột nhãn | Ảnh giống hệt hoặc gần giống nhưng mang nhãn khác được xem thủ công; trường hợp không chắc chắn được đưa vào quarantine |
| 5 | Gom near-duplicate | Dùng dHash Hamming 1–5 và độ giống pixel để tìm ảnh gần trùng; các ảnh liên quan được gán cùng `group_id` |
| 6 | Chia dữ liệu theo group | Chia gần 70/10/20; toàn bộ ảnh trong một group phải nằm trong cùng train, validation hoặc test |
| 7 | Chuẩn hóa hình ảnh | Resize giữ tỷ lệ theo cạnh dài, center pad về 224×224, lưu JPEG; không crop và không kéo méo |
| 8 | Hậu kiểm sau resize | Tính lại SHA-256/dHash vì resize có thể tạo quan hệ gần trùng mới; regroup và chia lại tối thiểu nếu cần |
| 9 | Ghép batch mở rộng | Thêm 7.048 ảnh Lúa và Xoài đã qua cùng pipeline, tăng từ 42 lên 58 lớp |
| 10 | Audit leakage cuối | Kiểm tra path, SHA-256, `group_id` và near-duplicate xuyên split; xử lý mọi trường hợp high-confidence |
| 11 | Đồng bộ release | Chốt manifest, metadata, mapping 58 lớp, report, checksum và ba split cố định |
| 12 | Kiểm tra runtime | DataLoader đọc đúng manifest; augmentation chỉ chạy trên train; validation/test chỉ normalize |

Nguyên tắc xuyên suốt là **copy-on-write**: mỗi mốc mới được tạo thành output
riêng, không sửa hoặc xóa trực tiếp dataset nguồn. Ảnh nghi ngờ được quarantine
có thể khôi phục thay vì bị ép nhãn hoặc xóa vĩnh viễn.

## 4. Dòng thay đổi số lượng ảnh

```text
129.867 ảnh gốc
  ├─ 75.028 canonical được copy
  ├─ 54.819 bản sao cùng nhãn được bỏ khỏi bản xử lý
  └─ 20 file thuộc 8 SHA xung đột được giữ để review

75.028 canonical + 4 canonical khôi phục sau review
= 75.032 ảnh active
  ├─ quarantine 6 ảnh xung đột near-duplicate
  └─ quarantine 1 ảnh xung đột phát hiện qua Hamming
= 75.025 ảnh sạch ở v1.1/v1.2

75.025 ảnh nền + 7.048 ảnh Lúa/Xoài
= 82.073 ảnh ở v1.3
```

Trong 20 file xung đột ban đầu, 8 file thuộc 4 SHA được giải quyết thành 4
canonical; 12 file còn lại tiếp tục nằm trong quarantine xung đột nhãn.
Quarantine không có nghĩa file nguồn bị mất. Các file này được giữ riêng để
truy vết nhưng không tham gia train, validation hoặc test.

## 5. Kết quả cuối của pipeline

| Chỉ số | Kết quả v1.3 |
|---|---:|
| Tổng ảnh | 82.073 |
| Loại cây | 10 |
| Lớp phân loại | 58 |
| Group | 46.989 |
| Train | 57.449 |
| Validation | 8.209 |
| Test | 16.415 |
| Kích thước ảnh | 224×224 |
| Cross-label group | 0 |
| Path/SHA-256/group xuyên split | 0 |
| Near-duplicate high-confidence xuyên split | 0 |

Đầu ra dùng cho training:

```text
<dataset_root>/v1.3/
├── images/
├── manifests/
│   ├── train.csv
│   ├── val.csv
│   ├── test.csv
│   └── dataset_manifest.csv
├── metadata/dataset_version.json
└── reports/
```

## 6. Preprocessing và augmentation khác nhau thế nào?

| Nội dung | Preprocessing | Augmentation |
|---|---|---|
| Thời điểm | Trong pipeline tạo dataset | Trong lúc nạp batch train |
| Áp dụng | Toàn bộ ảnh đầu ra | Chỉ train |
| Thao tác | Resize, padding, mã hóa JPEG | Flip, rotation, ColorJitter |
| Ghi thành ảnh mới trong dataset | Có, ở phiên bản output riêng | Không |
| Validation/test | Dùng ảnh đã chuẩn hóa | Không biến đổi ngẫu nhiên |

Augmentation không tạo lớp mới và không làm tăng số ảnh trong manifest. Mỗi
biến thể vẫn giữ nguyên nhãn của ảnh train ban đầu.

## 7. Kiểm tra trước khi train

- Dùng đúng `<dataset_root>/v1.3`, không dùng snapshot `old v1.3`.
- Chỉ đọc `train.csv`, `val.csv`, `test.csv`; không tự chia lại dữ liệu.
- Xác nhận count là 57.449/8.209/16.415 và mapping có đủ 58 lớp.
- SHA-256 của manifest chính phải là
  `1d7f431440a7dc6e3e9ffc8f2d542f55d7cb358186e685c33fe54d86dab053eb`.
- Chỉ augmentation trên train; không dùng test để chọn checkpoint hoặc chỉnh
  hyperparameter.
- Do dataset mất cân bằng, ưu tiên Macro-F1 và metric từng lớp thay vì chỉ xem
  accuracy.

## 8. Bảng thuật ngữ

| Thuật ngữ | Giải thích ngắn gọn |
|---|---|
| Audit | Kiểm tra có hệ thống dữ liệu và ghi lại bằng chứng |
| Manifest | File CSV quản lý đường dẫn ảnh, nhãn, hash, group và split |
| Metadata | Thông tin về phiên bản, số lượng và phương pháp tạo dataset |
| Label/Class | Nhãn mô hình cần dự đoán, ví dụ `Lua___Chay_la` |
| Exact duplicate | Hai file có nội dung byte giống hệt nhau |
| SHA-256 | Mã băm dùng để nhận biết file giống nhau chính xác |
| dHash | Mã băm hình ảnh dùng để tìm các ảnh có hình thức gần giống |
| Hamming distance | Số bit khác nhau giữa hai dHash; càng nhỏ càng giống |
| Near-duplicate | Ảnh gần trùng nhưng có thể khác nén, màu hoặc chỉnh sửa nhẹ |
| `group_id` | ID gom các ảnh liên quan để chúng không bị tách qua nhiều split |
| Split | Một phần dữ liệu: train, validation hoặc test |
| Leakage | Thông tin từ train lọt sang validation/test làm metric lạc quan |
| Quarantine | Vùng giữ riêng ảnh chưa chắc nhãn, có thể review và khôi phục |
| Preprocessing | Xử lý cố định để chuẩn hóa ảnh trước khi train |
| Center pad | Thêm viền để đạt 224×224 mà không crop nội dung |
| Augmentation | Biến đổi ngẫu nhiên ảnh train nhằm giảm overfitting |
| Class mapping | Ánh xạ tên của 58 lớp sang chỉ số mô hình từ 0 đến 57 |
| Checksum | Giá trị dùng để phát hiện file hoặc manifest đã thay đổi |
| Copy-on-write | Tạo phiên bản output mới và giữ nguyên phiên bản nguồn |

## 9. Kết luận

Pipeline bắt đầu trực tiếp từ `datasets tunning/Dataset`, không phải từ một
dataset đã làm sạch sẵn. Dữ liệu được audit, loại trùng, xử lý nhãn, gom group,
chia tập, chuẩn hóa ảnh và audit leakage; sau đó mới ghép batch Lúa/Xoài và
khóa v1.3. Khi training, phải giữ nguyên ba manifest cuối và mapping 58 lớp để
không làm mất các bảo đảm đã đạt được trong pipeline.
