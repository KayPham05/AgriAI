# Báo cáo phân tích ảnh trùng trong dữ liệu Cà phê

- **Ngày kiểm tra:** 2026-09-19
- **Dataset đang kiểm tra:** `datasets tunning/Dataset/Ca_phe`
- **Phiên bản audit:** `v1.0`
- **Manifest:** `<dataset_root>/v1.0/manifests/dataset_manifest.csv`
- **Phạm vi:** chỉ điều tra và lập báo cáo; không xóa, đổi tên hoặc ghi đè ảnh nguồn.

## 1. Kết luận ngắn

Số lượng lớn của bộ Cà phê **không phản ánh số ảnh độc lập thực tế**. Trong 58.549 file Cà phê, chỉ có 3.756 SHA-256 duy nhất; 54.793 file còn lại là bản trùng tuyệt đối, tương đương **93,58%**.

Trường hợp nghiêm trọng nhất là `Ca_phe___Khoe_manh`:

- 18.983 file nhưng chỉ có **62 SHA-256 duy nhất**;
- 18.921 file là bản lặp tuyệt đối, tương đương **99,67%**;
- một nội dung ảnh bị lặp tới **520 lần** dưới các tên file khác nhau;
- sau khi giải mã JPEG, 62 SHA file chỉ còn **26 nội dung pixel duy nhất**;
- 26 nội dung pixel chỉ tạo ra **13 dHash khác nhau**, cho thấy độ đa dạng cấu trúc rất thấp.

Nguồn JMuBEN2 xác nhận ảnh đã được crop, tiền xử lý và tăng cường ngoại tuyến bằng xoay/lật để làm lớn dataset. Tuy nhiên, xoay/lật hợp lệ thường phải làm thay đổi byte hoặc pixel. Vì vậy, việc hàng trăm file có cùng SHA-256 không thể được giải thích đơn thuần là “augmentation hợp lệ”; đây là dấu hiệu của việc **sao chép/lặp lại file trong quá trình tạo hoặc đóng gói dataset**.

Chưa đủ bằng chứng để khẳng định lỗi nằm hoàn toàn trong archive gốc hay phát sinh ở một bước tải, gộp hoặc đổi tên về sau. Muốn quy trách nhiệm chính xác cần đối chiếu checksum với archive gốc từ Mendeley.

## 2. Phương pháp kiểm tra

1. Đọc toàn bộ manifest do bước audit tạo ra.
2. Nhóm file theo SHA-256 của byte gốc.
3. Với lớp khỏe, lấy một file đại diện cho mỗi SHA-256 rồi:
   - tính SHA-256 trên pixel RGB sau khi giải mã JPEG;
   - tính difference hash 64 bit, được lưu ở cột `phash` trong manifest hiện tại, để ước lượng độ giống cấu trúc.
4. Kiểm tra lại 9 file minh họa bằng lệnh `Get-FileHash -Algorithm SHA256` độc lập với manifest.
5. Không chỉnh sửa bất kỳ file ảnh nguồn nào.

SHA-256 giống nhau nghĩa là hai file giống nhau từng byte; đây là bằng chứng xác định về trùng tuyệt đối. dHash chỉ là tín hiệu gần giống và không được dùng để khẳng định hai ảnh tuyệt đối giống nhau.

## 3. Thống kê theo lớp Cà phê

| Lớp | Tổng file | SHA-256 duy nhất | File trùng tuyệt đối | Tỷ lệ trùng | Nhóm trùng lớn nhất |
|---|---:|---:|---:|---:|---:|
| `Dom_chay_phoma` | 6.571 | 691 | 5.880 | 89,48% | 10 |
| `Dom_la_cercospora` | 7.681 | 322 | 7.359 | 95,81% | 24 |
| `Gi_sat` | 8.336 | 1.042 | 7.294 | 87,50% | 8 |
| `Khoe_manh` | 18.983 | 62 | 18.921 | 99,67% | 520 |
| `Sau_duc_la` | 16.978 | 1.639 | 15.339 | 90,35% | 80 |
| **Tổng** | **58.549** | **3.756** | **54.793** | **93,58%** | **520** |

Không phát hiện cùng một SHA-256 xuất hiện ở hai lớp Cà phê khác nhau. Vấn đề hiện tại là lặp file rất lớn **bên trong từng lớp**, không phải cùng một file bị gán nhãn chéo giữa các lớp.

Các kích thước nhóm lặp có tính hệ thống:

- `Gi_sat`: phần lớn mỗi nội dung xuất hiện 8 lần;
- `Dom_chay_phoma`: trung vị 10 lần;
- `Dom_la_cercospora`: trung vị 24 lần;
- `Khoe_manh`: trung vị nhóm trùng 284 lần, lớn nhất 520 lần.

Mẫu lặp đều theo bội số như trên là dấu hiệu của một pipeline tạo/nhân bản dữ liệu, không giống hiện tượng vô tình chụp hai ảnh giống nhau trong thực địa.

## 4. Bằng chứng trực tiếp của lớp khỏe

### Nhóm 1 — 520 file cùng SHA-256

- SHA-256: `135f67df6da4a652aa76cdd39492e274d6f11f06cd7ab8b3279fa5926865e2ea`
- Ví dụ: `CaPhe_KhoeManh_03521.jpg`, `CaPhe_KhoeManh_03528.jpg`, `CaPhe_KhoeManh_03537.jpg`
- Mỗi file: 128 × 128, 26.953 byte.

Ảnh đối chứng — Ba file khác tên nhưng cùng SHA-256, nhóm 1: `<dataset_root>/v1.0/reports/coffee_duplicate_evidence/exact_duplicate_group_01.png`.

### Nhóm 2 — 520 file cùng SHA-256

- SHA-256: `47ed776b3135f72a789404295d23b219314d6c087a5b90644300a995f93fe457`
- Ví dụ: `CaPhe_KhoeManh_03520.jpg`, `CaPhe_KhoeManh_03527.jpg`, `CaPhe_KhoeManh_03536.jpg`
- Mỗi file: 128 × 128, 26.352 byte.

Ảnh đối chứng — Ba file khác tên nhưng cùng SHA-256, nhóm 2: `<dataset_root>/v1.0/reports/coffee_duplicate_evidence/exact_duplicate_group_02.png`.

### Nhóm 3 — 516 file cùng SHA-256

- SHA-256: `c55ba3db5a7cbd5009b45eecdc0a210f06705bd96667d55b5b09eba937fbe173`
- Ví dụ: `CaPhe_KhoeManh_03522.jpg`, `CaPhe_KhoeManh_03529.jpg`, `CaPhe_KhoeManh_03538.jpg`
- Mỗi file: 128 × 128, 26.543 byte.

Ảnh đối chứng — Ba file khác tên nhưng cùng SHA-256, nhóm 3: `<dataset_root>/v1.0/reports/coffee_duplicate_evidence/exact_duplicate_group_03.png`.

### Đại diện cho 13 dHash còn lại

Ảnh dưới lấy file đầu tiên của mỗi dHash trong lớp khỏe. Đây không phải bằng chứng trùng tuyệt đối, nhưng cho thấy 18.983 file thực tế chỉ xoay quanh một số rất ít bố cục lá gần giống nhau.

Ảnh đối chứng — Đại diện 13 dHash của lớp khỏe: `<dataset_root>/v1.0/reports/coffee_duplicate_evidence/healthy_dhash_representatives.png`.

Các ảnh minh họa được lưu ngoài repository tại:

```text
<dataset_root>/v1.0/reports/coffee_duplicate_evidence/
```

## 5. Vì sao dữ liệu bị lặp nhiều như vậy?

### Điều đã được nguồn công bố xác nhận

- Bài báo giới thiệu JMuBEN/JMuBEN2 công bố tổng cộng 58.555 ảnh, gồm 18.985 ảnh khỏe và các lớp bệnh Cà phê khác. Số lượng này gần như trùng với 58.549 file local hiện tại. Nguồn: [Data in Brief/DOAJ, DOI 10.1016/j.dib.2021.107142](https://doaj.org/article/832f5b1033dd4a7599ac9b755b17c7b9).
- Trang dữ liệu JMuBEN2 cho biết ảnh đã được crop theo vùng quan tâm, lọc nhiễu/tăng tương phản và tăng cường bằng **rotation** và **flipping** để tăng kích thước dataset. Nguồn: [Mendeley Data JMuBEN2, DOI 10.17632/tgv3zb82nd.1](https://data.mendeley.com/datasets/tgv3zb82nd/1).

### Suy luận phù hợp nhất với bằng chứng local

Khả năng cao bộ công bố đã được tạo từ một tập ảnh gốc nhỏ bằng augmentation ngoại tuyến, sau đó một bước tạo hoặc đóng gói dữ liệu đã ghi lại cùng một kết quả nhiều lần dưới tên khác nhau. Các dấu hiệu hỗ trợ suy luận này là:

1. nhóm lặp có kích thước đều và rất lớn;
2. tên file khác nhau nhưng SHA-256, kích thước byte và pixel giống nhau;
3. lớp khỏe chỉ còn 62 SHA file và 26 nội dung pixel;
4. tổng số file local gần khớp số lượng đã công bố của JMuBEN/JMuBEN2.

Đây là **suy luận**, không phải kết luận đã xác minh về vị trí phát sinh lỗi. Có thể xảy ra ở một trong các bước:

- code augmentation lặp vòng nhưng đôi lúc không áp dụng biến đổi;
- kết quả augmentation được copy nhiều lần khi export;
- nhiều thư mục/archive được merge rồi đổi tên mà không kiểm tra checksum;
- bản mirror hoặc bản đã xử lý lại khác với archive tác giả ban đầu.

## 6. Ảnh hưởng nếu dùng trực tiếp để train

- Random split 70/10/20 ở cấp file gần như chắc chắn đưa cùng một ảnh vào train, validation và test, gây **data leakage**.
- Accuracy/F1 có thể rất cao nhưng chủ yếu đo khả năng ghi nhớ ảnh đã thấy, không phản ánh khả năng nhận diện lá mới.
- Con số 18.983 ảnh khỏe tạo cảm giác lớp lớn, trong khi kích thước mẫu độc lập hiệu dụng chỉ ở mức vài chục ảnh.
- Resize từ 128 × 128 lên 224 × 224 không khôi phục chi tiết đã mất và không giải quyết vấn đề trùng.
- Augmentation mới trong train không thể bù cho thiếu đa dạng nguồn nếu train/validation/test vẫn có chung ảnh gốc.

## 7. Khuyến nghị xử lý

1. **Không split hoặc train bộ Cà phê hiện tại theo từng file.**
2. Giữ nguyên dữ liệu nguồn; không xóa ảnh tại chỗ.
3. Tạo dataset mới ngoài repository/ở Drive:
   - exact dedup theo SHA-256, giữ một file đại diện cho mỗi nhóm;
   - gán `group_id` chung cho các ảnh gần giống theo dHash và kiểm tra trực quan;
   - split theo `group_id`, tuyệt đối không để cùng nhóm đi qua nhiều tập.
4. Với lớp khỏe, không nên xem 62 SHA là đủ cho mô hình production. Cần bổ sung ảnh khỏe độc lập hoặc tạm loại bộ Cà phê khỏi baseline chính.
5. Trước khi xóa bản trùng trong bản dataset đã làm sạch, đối chiếu checksum với archive Mendeley gốc để xác định trùng đã có từ nguồn hay phát sinh sau khi tải/gộp.
6. Lưu manifest ánh xạ `canonical_path -> duplicate_path` để có thể truy vết và khôi phục; chỉ upload bản đã làm sạch sau khi kiểm tra số lượng lớp.

## 8. Trạng thái

- [x] Xác nhận thống kê trùng tuyệt đối bằng SHA-256.
- [x] Kiểm tra độc lập 9 file minh họa.
- [x] Tạo 4 ảnh bằng chứng ngoài repository.
- [x] Không thay đổi ảnh nguồn.
- [ ] Đối chiếu checksum với archive JMuBEN/JMuBEN2 gốc.
- [ ] Tạo dataset Cà phê đã dedup và group-aware split.
- [ ] Kiểm tra trực quan toàn bộ 62 đại diện SHA của lớp khỏe trước khi quyết định giữ/loại.
