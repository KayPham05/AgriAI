# Tổng quan bộ dữ liệu bệnh lá cây

Ngày rà soát: 2026-09-19  
Phạm vi cục bộ: `datasets tunning/Dataset/`

## 1. Mục đích và phạm vi rà soát

Tài liệu này mô tả tập ảnh đang có trong repository để chuẩn bị cho AGRI-21 - Preprocessing & Augmentation. Kết quả được tổng hợp từ:

- metadata của toàn bộ file và thư mục trong tập dữ liệu cục bộ;
- kiểm tra trực quan một nhóm nhỏ ảnh đại diện cho tám loại cây;
- [bảng danh mục nguồn dữ liệu do nhóm cung cấp](https://docs.google.com/spreadsheets/d/1B2q2pQxGz2S1ZjErqjKyFcDj9llivffCfjTvdbAqFDY/edit?usp=sharing);
- các trang nguồn được liên kết trong bảng và nguồn gốc có thể nhận diện chắc chắn từ tên lớp, số lượng ảnh.

Đây chưa phải là báo cáo kiểm định toàn bộ ảnh. Việc phát hiện ảnh hỏng, ảnh trùng, ảnh gần trùng, nhãn sai ở cấp từng ảnh và data leakage thuộc bước audit chính thức của AGRI-21.

## 2. Tổng quan dữ liệu cục bộ

| Chỉ số | Giá trị |
|---|---:|
| Loại cây | 8 |
| Thư mục tình trạng | 42 |
| Thư mục có ảnh | 42 |
| Tổng số file ảnh | 129.867 |
| Tổng dung lượng | 3.405.386.393 byte, khoảng 3,41 GB hoặc 3,17 GiB |
| Định dạng quan sát được | `.jpg`, `.jpeg` |
| Thư mục rỗng | Không có |

### Phân bố theo cây

| Cây | Số thư mục tình trạng | Thư mục có ảnh | Số ảnh | Dung lượng (MiB) |
|---|---:|---:|---:|---:|
| Nho | 4 | 4 | 4.062 | 69,31 |
| Cà chua | 10 | 10 | 18.160 | 274,61 |
| Cà phê | 5 | 5 | 58.549 | 1.753,89 |
| Cam | 4 | 4 | 38.432 | 248,56 |
| Chè | 5 | 5 | 1.539 | 685,56 |
| Ngô | 4 | 4 | 4.188 | 163,25 |
| Ớt | 5 | 5 | 500 | 4,95 |
| Sầu riêng | 5 | 5 | 4.437 | 47,50 |
| **Tổng** | **42** | **42** | **129.867** | **3.247,63** |

### Phân bố lớp chi tiết

| Cây | Tình trạng và số ảnh |
|---|---|
| Nho | `Chay_la`: 1.076; `Esca`: 1.383; `Khoe_manh`: 423; `Thoi_den`: 1.180 |
| Cà chua | `Chay_la_som`: 1.000; `Dom_la_Septoria`: 1.771; `Dom_muc_tieu`: 1.404; `Dom_vi_khuan`: 2.127; `Khoe_manh`: 1.591; `Moc_la`: 952; `Moc_suong`: 1.909; `Nhen_do`: 1.676; `Virus_kham_la`: 373; `Virus_xoan_vang_la`: 5.357 |
| Cà phê | `Dom_chay_phoma`: 6.571; `Dom_la_cercospora`: 7.681; `Gi_sat`: 8.336; `Khoe_manh`: 18.983; `Sau_duc_la`: 16.978 |
| Cam | `Khoe_manh`: 9.584; `Loet_vi_khuan`: 11.248; `Mac_nhieu_benh_cung_luc`: 4.800; `Vang_la_thieu_dinh_duong`: 12.800 |
| Chè | `Chay_la_nau`: 339; `Dom_la_do`: 429; `Dom_tao`: 339; `Khoe_manh`: 222; `Than_thu`: 210 |
| Ngô | `Chay_la`: 1.146; `Dom_la_xam`: 574; `Gi_sat`: 1.306; `Khoe_manh`: 1.162 |
| Ớt | `Dom_la`: 100; `Khoe_manh`: 100; `Ruoi_trang`: 100; `Vang_la`: 100; `Xoan_la`: 100 |
| Sầu riêng | `Chay_la`: 937; `Dom_la_phomopsis`: 878; `Dom_tao`: 733; `Khoe_manh`: 976; `Ray_gay_hai`: 913 |

Khoảng cách giữa lớp nhỏ nhất có ảnh và lớp lớn nhất là 100 so với 18.983 ảnh. Vì vậy tập gộp hiện tại mất cân bằng mạnh. Không nên chọn sampler hoặc loss chỉ dựa trên tổng toàn bộ tập; cần xem phân bố theo từng nhãn ghép `cây___tình_trạng` và kết quả split thực tế.

### Kết quả audit tự động

Audit ngày 2026-09-19 đã giải mã ảnh, tính SHA-256 và difference hash cho toàn bộ 129.867 file:

| Kết quả | Số file |
|---|---:|
| Đọc ảnh hợp lệ | 129.867 |
| Ảnh hỏng hoặc không đọc được | 0 |
| Có cạnh nhỏ hơn 224 pixel | 59.041 |
| Trùng SHA-256 tuyệt đối | 54.831 |
| Ứng viên cùng perceptual hash, không trùng SHA-256 | 33.787 |

Ảnh trùng SHA-256 tập trung chủ yếu trong nhóm Cà phê. Đây là trùng lặp xác định ở mức byte và phải được loại theo nhóm trước khi split. Các kết quả perceptual hash chỉ là ứng viên rà soát vì ảnh khác nhau vẫn có thể tạo cùng difference hash, đặc biệt với ảnh nhỏ hoặc ít chi tiết; không được tự động xóa dựa trên kết quả này.

Snapshot `v1.0` hiện ở trạng thái `audit-only`: mới có manifest, metadata và báo cáo, chưa sao chép ảnh sang bộ dữ liệu sạch.

## 3. Đối chiếu nguồn dữ liệu

Hai nguồn Cà phê và Cam dưới đây được kiểm tra lại ngày 2026-09-19. Khi nội dung mô tả và Data Explorer của Kaggle khác nhau, báo cáo ưu tiên số liệu của phiên bản file đang được Kaggle hiển thị và ghi rõ phần chưa thể xác minh độc lập.

| Nhóm cục bộ | Nguồn nhận diện | Mức độ đối chiếu |
|---|---|---|
| Nho | [Plant Disease Classification Merged Dataset](https://www.kaggle.com/datasets/alinedobrovsky/plant-disease-classification-merged-dataset) | Nguồn trực tiếp được nhóm xác nhận. Phần dữ liệu Nho có bốn lớp: Black Rot 1.180, Esca/Black Measles 1.383, Healthy 423 và Leaf Blight/Isariopsis Leaf Spot 1.076. Google Sheets hiện chưa mô tả riêng phần Nho của nguồn merged này. |
| Cà chua | [PlantVillage](https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset) | Mười lớp và tổng 18.160 ảnh khớp chính xác với nhóm cà chua PlantVillage. Nguồn này chưa có dòng riêng trong Google Sheets. |
| Cà phê | [JMuBEN Coffee Dataset trên Kaggle](https://www.kaggle.com/datasets/noamaanabdulazeem/jmuben-coffee-dataset/data), mirror của JMuBEN/JMuBEN2; [bài báo nguồn](https://doi.org/10.1016/j.dib.2021.107142) | **Đã xác nhận đúng nguồn.** Kaggle mô tả 58.555 ảnh 128 x 128 thuộc năm lớp Phoma, Cercospora, Rust, Healthy và Miner, đồng thời dẫn lại hai bộ JMuBEN/JMuBEN2 trên Mendeley. Tập cục bộ có đúng năm lớp nhưng chỉ 58.549 ảnh: Phoma 6.571, Cercospora 7.681, Rust 8.336, Healthy 18.983 và Miner 16.978. Mỗi lớp ít hơn nguồn một ảnh, riêng Healthy ít hơn hai ảnh. Audit đọc được toàn bộ 58.549 file và không loại file hỏng, nên sáu ảnh đã thiếu trước bước audit; chưa xác định chúng mất ở lần tải, giải nén hay gộp nào. Kaggle mirror không công bố giấy phép rõ ràng; bài báo và repository gốc phải được dùng để xác minh quyền sử dụng trước khi chia sẻ lại. |
| Cam | [Orange leaf disease dataset — Version 2](https://www.kaggle.com/datasets/shuvokumarbasak4004/orange-leaf-disease-dataset/data) | **Đã xác nhận đúng nguồn.** Data Explorer hiện hiển thị một thư mục `train`, năm thư mục lớp và khoảng 38,4 nghìn file; tổng local 38.432 file phù hợp với snapshot này. Năm tên lớp nguồn khớp cấu trúc local: `Citrus_Canker_Diseases_Leaf_Orange`, `Citrus_Nutrient_Deficiency_Yellow_Leaf_Orange`, `Healthy_Leaf_Orange`, `Multiple_Diseases_Leaf_Orange` và `Young_Healthy_Leaf_Orange`. Hai lớp khỏe local đã được gộp thành `Khoe_manh` 9.584 ảnh, nên năm lớp nguồn trở thành bốn nhãn. Số lượng local còn lại là Canker 11.248, Nutrient Deficiency 12.800 và Multiple Diseases 4.800. Phần mô tả Kaggle nói “hơn 41.000 ảnh”, mâu thuẫn với Data Explorer Version 2; vì vậy 38.432 chỉ được xác nhận là khớp snapshot file hiện tại, không phải con số trong phần mô tả. Kaggle ghi giấy phép MIT. |
| Chè | DS-013 - [Plant Disease Classification Merged Dataset](https://www.kaggle.com/datasets/alinedobrovsky/plant-disease-classification-merged-dataset) | Google Sheets mô tả sáu lớp, nhưng dữ liệu cục bộ chỉ có ảnh ở năm lớp. Không có ảnh `Dom_mat_chim`; thư mục rỗng tương ứng đã được xóa. Chưa cần sửa nguồn ngay, nhưng cần xác minh lại quá trình trích xuất trước khi bổ sung lớp này. |
| Ngô | DS-001 - [Corn or Maize Leaf Disease Dataset](https://www.kaggle.com/datasets/smaranjitghose/corn-or-maize-leaf-disease-dataset) | Bốn lớp và 4.188 ảnh khớp chính xác các số liệu trong Google Sheets. DS-002 cũng là dữ liệu ngô nhưng không khớp phân bố đang có, nên không xem DS-002 là nguồn trực tiếp của thư mục hiện tại. |
| Ớt | DS-012 - [Plant Disease Classification Merged Dataset](https://www.kaggle.com/datasets/alinedobrovsky/plant-disease-classification-merged-dataset) | Năm lớp cục bộ khớp mô tả trong Google Sheets. Tập hiện tại chỉ có 100 ảnh mỗi lớp; cần xác minh đây là toàn bộ dữ liệu hay một tập con đã chọn. |
| Sầu riêng | DS-003 - [Durian Leaf Disease Dataset](https://www.kaggle.com/datasets/cthng123/durian-leaf-disease-dataset) | Năm lớp và tổng 4.437 ảnh khớp chính xác nguồn. Ảnh đã được chuẩn hóa về 224 x 224. |

Các dòng DS-007 đến DS-011 trong Google Sheets mô tả dữ liệu lúa và xoài, nhưng không có thư mục tương ứng trong snapshot cục bộ đang rà soát. Không tính các nguồn này vào 129.867 ảnh phía trên.

Thông tin giấy phép trong Google Sheets cần được xem là dữ liệu danh mục. Trước khi công bố, chia sẻ lại hoặc phát hành model/dataset, nhóm phải kiểm tra giấy phép trên trang nguồn và lưu bằng chứng phiên bản cụ thể. Đặc biệt, các nguồn chưa có trong Google Sheets cần được bổ sung vào danh mục chính thức.

## 4. Rà soát và chuẩn hóa tên thư mục

Các thay đổi sau đã được áp dụng trực tiếp lên thư mục dữ liệu:

| Tên cũ | Tên mới | Lý do | Số file đã xác minh |
|---|---|---|---:|
| `Buoi` | `Nho` | Hình thái lá và bốn lớp đều khớp nhóm Grape/Nho trong Plant Disease Classification Merged Dataset; không phải bưởi. | 4.062 |
| `Ca_chua/Dom_la_som` | `Ca_chua/Chay_la_som` | `Early Blight` là bệnh cháy lá sớm, không phải đốm lá sớm. | 1.000 |
| `Ca_chua/Suong_mai_muon` | `Ca_chua/Moc_suong` | `Late Blight` thường được gọi là bệnh mốc sương hoặc sương mai trên cà chua; tên mới ngắn và không trộn bản dịch với từ “muộn”. | 1.909 |
| `Ca_phe/Ghi_sat` | `Ca_phe/Gi_sat` | Sửa lỗi chính tả: bệnh gỉ sắt. | 8.336 |
| `Cam/Gan_xanh_la_vang` | `Cam/Vang_la_thieu_dinh_duong` | Lớp nguồn là `Citrus_Nutrient_Deficiency_Yellow_Leaf_Orange`, không phải Citrus Greening/HLB. | 12.800 |
| `Ngo/Ghi_sat` | `Ngo/Gi_sat` | Sửa lỗi chính tả: bệnh gỉ sắt. | 1.306 |
| `Ot/Bo_phan_trang` | `Ot/Ruoi_trang` | Lớp nguồn là `Whitefly`; tên cũ dịch sai nghĩa. | 100 |

Chỉ tên thư mục được thay đổi. Tên file ảnh được giữ nguyên để tránh làm mất liên kết định danh hoặc gây rủi ro khi đổi tên hàng loạt. Sau khi đổi tên, tổng số file và tổng byte vẫn là 129.867 file và 3.405.386.393 byte.

Các tên còn lại được giữ vì khớp trực tiếp với nhãn nguồn hoặc vẫn mô tả đúng tình trạng. Hai trường hợp cần ghi chú:

- `Cam/Mac_nhieu_benh_cung_luc` là một nhãn nguồn hợp lệ nhưng không đại diện cho một bệnh đơn lẻ.
- `Sau_rieng/Ray_gay_hai` tương ứng `Allocaridara Attack`; tên hiện tại đúng theo nghĩa tổng quát nhưng nên lưu tên nguồn tiếng Anh trong metadata.

## 5. Quan sát chất lượng và rủi ro dữ liệu

### Độ phân giải và chất lượng ảnh

Mẫu quan sát có kích thước từ 100 x 100, 128 x 128, 224 x 224, 256 x 256, 525 x 395 đến 3120 x 4160. Một số ảnh cà phê 128 x 128 bị mờ mạnh. Resize lên 224 x 224 không thể phục hồi chi tiết đã mất, nên cần kiểm tra ngưỡng chất lượng hoặc gắn cờ ảnh độ phân giải thấp trước khi huấn luyện.

### Khác biệt miền ảnh

Dữ liệu trộn nhiều kiểu chụp: nền xám kiểu phòng lab, nền trắng, ảnh ngoài vườn và ảnh điện thoại. Mô hình có thể học nền, ánh sáng hoặc phong cách nguồn thay vì triệu chứng bệnh. Split ngẫu nhiên đơn giản cũng có thể đặt các ảnh rất giống nhau vào cả train và test.

### Dữ liệu đã augmentation trước

Tập cam có số lượng và cấu trúc khớp một nguồn đã chứa ảnh tăng cường. Nếu tiếp tục augmentation mạnh, mức biến đổi thực tế có thể lớn hơn dự kiến. Cần phát hiện near-duplicate và truy vết ảnh gốc trước khi split.

### Lớp còn thiếu và lớp đã gộp

- Nguồn Chè có mô tả lớp `Dom_mat_chim`, nhưng snapshot cục bộ không có ảnh của lớp này. Thư mục rỗng đã được xóa để pipeline không sinh nhãn có zero sample. Không tự tạo lại thư mục cho đến khi có ảnh từ nguồn đã xác minh.
- `Cam/Khoe_manh` là kết quả gộp hai lớp nguồn Healthy và Young Healthy. Quyết định gộp cần được ghi trong manifest và giữ nhất quán giữa train, evaluation và inference.

### Mất cân bằng lớp

Phân bố từ 100 đến 18.983 ảnh trên mỗi nhãn có dữ liệu. Weighted sampler, class-weighted loss hoặc Focal Loss chỉ nên được chọn sau khi split và đo phân bố train thực tế. Không mặc định kết hợp nhiều kỹ thuật cân bằng cùng lúc.

### Leakage và trùng lặp

Hash tuyệt đối chỉ phát hiện file giống byte. Dataset có tên tuần tự, nguồn đã augmentation và nhiều ảnh cùng nền, nên audit cần thêm perceptual hash hoặc embedding similarity. Nếu xác định được nhiều ảnh từ cùng lá, cây hoặc ảnh gốc, phải gán chung `group_id` trước khi chia train/validation/test.

## 6. Ảnh hưởng đến AGRI-21

Trước khi chốt preprocessing và augmentation, cần hoàn thành các đầu việc dữ liệu sau:

1. Tạo manifest với tối thiểu các cột `image_path`, `plant`, `condition`, `compound_label`, `source_id`, `width`, `height`, `file_size`, `hash`, `phash`, `group_id` và `split`.
2. Khi cần hoàn thiện provenance, bổ sung nguồn chính thức cho Cà chua, Cà phê và Cam vào Google Sheets; xác minh lại phần dữ liệu Chè. Nguồn Nho đã được nhóm xác nhận là Plant Disease Classification Merged Dataset.
3. Kiểm tra ảnh hỏng, trùng tuyệt đối, gần trùng, ảnh quá mờ và mẫu nghi sai nhãn.
4. Chia 70/10/20 theo `compound_label`, đồng thời group-aware khi có thể truy được nhóm ảnh gốc.
5. Xuất contact sheet sau augmentation cho từng nhóm nguồn, đặc biệt với ảnh bệnh có đốm nhỏ và ảnh độ phân giải thấp.
6. Tạo lại `class_to_idx` sau khi chuẩn hóa tên. Không tái sử dụng mapping được sinh từ tên thư mục cũ.

## 7. Kết luận

Dataset cục bộ đủ lớn và bao phủ nhiều cây, nhưng chưa thể coi là một tập huấn luyện đã sẵn sàng. Ba vấn đề ưu tiên là provenance chưa đầy đủ, mất cân bằng rất mạnh và nguy cơ leakage do dữ liệu gộp từ nhiều nguồn hoặc đã augmentation. Việc chuẩn hóa tên đã sửa các lỗi có bằng chứng rõ ràng mà không thay đổi hay làm mất bất kỳ file ảnh nào.
