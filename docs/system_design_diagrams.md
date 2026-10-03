# Sơ đồ thiết kế hệ thống AgriVision

> AGRI-76, đối chiếu source ngày 2026-10-03 trên nền commit `094ec6e`. Phần 1 mô tả hiện trạng API; phần 2 giữ thiết kế mục tiêu ngày 2026-09-30 để tham khảo, không tính là chức năng đã có. ERD ở phần 3 phản ánh schema hiện có. Xem [đặc tả yêu cầu](system_requirements.md) và [báo cáo AGRI-76](reports/AGRI-76/README.md).

## 1. Phân tích hệ thống hiện tại — đầu ra AGRI-76

Ranh giới gồm web Next.js, API ASP.NET Core, PostgreSQL và adapter lưu ảnh. Adapter HTTP gọi AI là mã hiện có; FastAPI phục vụ checkpoint thật chưa được kiểm chứng xuyên tầng. Các sơ đồ phản ánh khả năng và thiếu sót của API, không khẳng định mọi thao tác đã có màn hình hoặc đã chạy thành công.

### 1.1. BFD hiện trạng

```mermaid
flowchart TD
    F0["AgriVision hiện tại"] --> F1["Tài khoản"]
    F0 --> F2["Phân loại một ảnh"]
    F0 --> F3["Kết quả và lịch sử"]
    F0 --> F4["Danh mục cây và bệnh"]
    F0 --> F5["Kiểm tra dịch vụ"]
    F1 --> F11["Đăng ký / đăng nhập / đọc hồ sơ"]
    F2 --> F21["Kiểm tra file rỗng và phần mở rộng"]
    F2 --> F22["Lưu ảnh, gọi adapter AI, ánh xạ nhãn"]
    F2 --> F23["Lưu prediction và top-k"]
    F3 --> F31["Danh sách theo user, có phân trang"]
    F3 --> F32["Đọc theo ID chưa kiểm tra quyền"]
    F3 --> F33["Xóa bởi chủ sở hữu hoặc admin"]
    F4 --> F41["Đọc danh mục công khai"]
    F4 --> F42["Admin thêm / sửa / xóa cây và bệnh"]
    F5 --> F51["Health DB và health AI riêng"]
```

Không đưa sửa hồ sơ, CRUD tài khoản, upload nhiều ảnh/request hay dọn ảnh 30 ngày vào BFD hiện trạng vì chưa có các luồng này trong source được đối chiếu.

### 1.2. DFD ngữ cảnh hiện trạng

```mermaid
flowchart LR
    G["Khách"] -->|"Đăng ký, đăng nhập, một ảnh, ID kết quả, tra cứu danh mục"| S(("0. AgriVision hiện tại"))
    S -->|"JWT, kết quả hoặc lỗi, danh mục"| G
    U["Người dùng đã đăng nhập"] -->|"JWT, ảnh, yêu cầu hồ sơ và lịch sử, yêu cầu xóa"| S
    S -->|"Hồ sơ, kết quả, lịch sử hoặc lỗi"| U
    A["Admin"] -->|"JWT, dữ liệu cây/bệnh, ID kết quả cần xóa"| S
    S -->|"Kết quả quản lý hoặc lỗi"| A
```

POST dự đoán và GET kết quả theo ID hiện chưa có `[Authorize]`; việc khách gọi được là **khoảng trống bảo mật**, không phải quyền sản phẩm mong muốn. GET danh sách chỉ trả dữ liệu theo user; DELETE kiểm tra chủ sở hữu hoặc admin. Chi tiết ở [ma trận hiện trạng](system_requirements.md#8-ma-trận-truy-vết-yêu-cầu-và-hiện-trạng).

### 1.3. DFD mức 1 hiện trạng

```mermaid
flowchart LR
    G["Khách / người dùng"] -->|"Đăng ký, đăng nhập; JWT khi đọc hồ sơ"| P1(("1. Tài khoản"))
    P1 -->|"Tạo tài khoản / truy vấn"| D1[("D1. Users")]
    D1 -->|"Thông tin tài khoản và hash"| P1
    P1 -->|"JWT / hồ sơ / lỗi"| G
    G -->|"Một file; user ID từ JWT nếu có"| P2(("2. Dự đoán"))
    P2 -->|"Ảnh sau kiểm tra rỗng / đuôi"| C[("Kho ảnh: Cloudinary hoặc local")]
    C -->|"URL và public ID"| P2
    P2 -->|"Ảnh qua adapter HTTP"| M["Dịch vụ AI cấu hình bên ngoài; chưa xác nhận model thật"]
    M -->|"Class index, nhãn, confidence, top-k hoặc lỗi"| P2
    D3[("D3. Plants / diseases / plant_diseases")] -->|"Mapping DB; có fallback khi không khớp"| P2
    P2 -->|"Prediction, owner nullable, chi tiết top-k"| D2[("D2. Predictions / prediction_details")]
    P2 -->|"Kết quả / lỗi"| G
    G -->|"JWT để lấy danh sách; ID để đọc chi tiết"| P3(("3. Đọc kết quả"))
    P3 -->|"Danh sách theo user hoặc chi tiết theo ID"| D2
    D2 -->|"Kết quả, URL ảnh"| P3
    P3 -->|"Dữ liệu / lỗi"| G
    U["Chủ sở hữu / admin"] -->|"JWT và ID cần xóa"| P4(("4. Xóa kết quả"))
    D2 -->|"Bản ghi và owner để kiểm tra quyền"| P4
    P4 -->|"Xóa ảnh theo public ID nếu có"| C
    P4 -->|"Xóa prediction và chi tiết"| D2
    P4 -->|"Kết quả / lỗi"| U
    A["Admin"] -->|"JWT và dữ liệu cây/bệnh"| P5(("5. Quản lý cây / bệnh"))
    P5 -->|"Thêm / sửa / xóa cây và bệnh"| D3
    D3 -->|"Danh mục / ràng buộc tham chiếu"| P5
    P5 -->|"Kết quả / lỗi"| A
    G -->|"Yêu cầu tra cứu danh mục"| P6(("6. Đọc danh mục"))
    D3 -->|"Cây và bệnh"| P6
    P6 -->|"Danh mục / lỗi"| G
```

`D1`–`D3` là nhóm bảng trong cùng PostgreSQL. API upload trước khi gọi AI; source chưa có cleanup ảnh khi AI/DB lỗi. Adapter AI báo lỗi dịch vụ, nhưng `PredictionService` vẫn fallback sang lớp DB đầu tiên nếu top-1 không khớp và sang lớp chính nếu top-k không khớp. Không diễn giải luồng này thành mapping đúng hoặc model đã được nghiệm thu. GET theo ID chưa lọc owner; chưa có kiểm tra nội dung ảnh, giới hạn nghiệp vụ 30 MB hay scheduler hết hạn ảnh. Health DB ở `/api/health`, health AI ở `/api/health/deps`, là luồng vận hành riêng, không phải suy luận.

## 2. Thiết kế mục tiêu — không phải hiện trạng AGRI-76

Giữ các sơ đồ đề xuất bên dưới để không mất yêu cầu nhóm đã cung cấp. Chỉ dùng sau khi chốt phạm vi, tiêu chí chấp nhận và triển khai; không dùng làm bằng chứng hoàn thành chức năng.

### 2.1. BFD mục tiêu — phân rã chức năng

BFD chia chức năng của phiên bản đầu thành bốn nhóm. Các mục gợi ý thuốc theo giai đoạn và giải thích nguyên nhân bệnh nằm ngoài phiên bản này. Sơ đồ thể hiện **chức năng**, không biểu diễn thứ tự thực hiện hay luồng dữ liệu.

```mermaid
flowchart TD
    F0["0. AgriVision"] --> F1["1. Tài khoản"]
    F0 --> F2["2. Phân loại ảnh lá"]
    F0 --> F3["3. Lịch sử"]
    F0 --> F4["4. Quản trị"]

    F1 --> F11["1.1 Đăng ký / đăng nhập"]
    F1 --> F12["1.2 Xem / sửa hồ sơ"]
    F2 --> F21["2.1 Nhận và kiểm tra ảnh"]
    F2 --> F22["2.2 Suy luận và trả kết quả"]
    F2 --> F23["2.3 Lưu kết quả và ảnh"]
    F3 --> F31["3.1 Xem danh sách / chi tiết"]
    F3 --> F32["3.2 Kiểm soát quyền truy cập"]
    F4 --> F41["4.1 Quản lý tài khoản"]
    F4 --> F42["4.2 Quản lý ảnh / kết quả / danh mục"]
```

Các nhánh tương ứng [FR-01–FR-09](system_requirements.md#3-yêu-cầu-chức-năng). Thao tác quản trị cụ thể và sửa hồ sơ vẫn cần được chốt ở đặc tả.

### 2.2. DFD mức ngữ cảnh mục tiêu

Ở mức này, AgriVision là một tiến trình duy nhất. Người dùng và quản trị viên là tác nhân bên ngoài. FastAPI, PostgreSQL và cloud storage được triển khai bên trong ranh giới hệ thống nên xuất hiện ở sơ đồ chi tiết thay vì mức ngữ cảnh.

```mermaid
flowchart LR
    U["Người dùng"] -->|"Thông tin tài khoản, ảnh, yêu cầu xem lịch sử"| S(("0. Hệ thống AgriVision"))
    S -->|"Token, kết quả phân loại, lịch sử của mình"| U
    A["Quản trị viên"] -->|"Yêu cầu quản lý dữ liệu"| S
    S -->|"Kết quả quản lý theo quyền"| A
```

Yêu cầu phân loại và xem lịch sử chỉ được xử lý khi người dùng đã đăng nhập. Quyền quản trị đối với ảnh và dữ liệu cá nhân cần được giới hạn theo quyết định ở [đặc tả](system_requirements.md#6-quyết-định-còn-mở).

### 2.3. DFD mức 1 mục tiêu — luồng người dùng

Sơ đồ dưới đây phân rã các luồng tài khoản, phân loại và lịch sử. Mũi tên mang **dữ liệu**, không phải thứ tự gọi hàm. `D1`–`D3` là các nhóm dữ liệu trong cùng PostgreSQL: `D1` là tài khoản, `D2` là kết quả/chi tiết xếp hạng, `D3` là danh mục cây/bệnh/lớp nhãn. Cloud storage chỉ lưu ảnh; database lưu tham chiếu ảnh.

```mermaid
flowchart LR
    U["Người dùng"] -->|"Đăng ký / đăng nhập / sửa hồ sơ"| P1(("1. Quản lý tài khoản"))
    P1 -->|"Thông tin tài khoản / JWT"| U
    P1 -->|"Tạo / cập nhật / tra cứu tài khoản"| D1[("D1. Tài khoản")]
    D1 -->|"Thông tin tài khoản"| P1

    U -->|"JWT và ảnh lá"| P2(("2. Phân loại ảnh"))
    P2 -->|"Ảnh hợp lệ"| C[("Cloud storage")]
    C -->|"Tham chiếu ảnh"| P2
    P2 -->|"Ảnh cần phân loại"| M["FastAPI / model"]
    M -->|"Nhãn và độ tin cậy"| P2
    D3[("D3. Danh mục nhãn")] -->|"Mapping lớp cây / bệnh"| P2
    P2 -->|"Chủ sở hữu, kết quả, tham chiếu ảnh"| D2[("D2. Kết quả")]
    P2 -->|"Kết quả hoặc lỗi"| U

    U -->|"JWT và yêu cầu lịch sử"| P3(("3. Tra cứu lịch sử"))
    P3 -->|"Truy vấn theo chủ sở hữu"| D2
    D2 -->|"Kết quả và tham chiếu ảnh"| P3
    P3 -->|"Lịch sử được phép xem"| U
```

Tại tiến trình 2, API phải kiểm tra JWT và quyền gửi ảnh, giới hạn dung lượng/định dạng/nội dung. Chỉ khi model trả kết quả hợp lệ và mapping `D3` khớp mới ghi `D2`; lỗi AI không tạo bản ghi dự đoán thành công. Cần xử lý ảnh đã tải lên nếu bước suy luận hoặc lưu DB thất bại. Tại tiến trình 3, API lọc theo chủ tài khoản trước khi trả bản ghi hoặc đường dẫn ảnh.

### 2.4. DFD mức 1 mục tiêu — luồng quản trị và hết hạn ảnh

Các tiến trình quản trị sau đây là **thiết kế mục tiêu**, chưa được xác nhận đã triển khai đầy đủ. `D1`–`D3` mang cùng ý nghĩa như sơ đồ ở phần 2.3. Tiến trình dọn ảnh là tác vụ hệ thống; thời điểm chạy, cách xử lý lỗi và việc giữ bản ghi lịch sử cần chốt.

```mermaid
flowchart LR
    A["Quản trị viên"] -->|"Yêu cầu quản lý tài khoản"| P4(("4. Quản lý tài khoản"))
    P4 -->|"Tra cứu / cập nhật được phép"| D1[("D1. Tài khoản")]
    D1 -->|"Thông tin tài khoản"| P4
    P4 -->|"Kết quả thao tác"| A

    A -->|"Yêu cầu quản lý danh mục"| P5(("5. Quản lý danh mục"))
    P5 -->|"Tra cứu / cập nhật được phép"| D3[("D3. Danh mục nhãn")]
    D3 -->|"Dữ liệu danh mục"| P5
    P5 -->|"Kết quả thao tác"| A

    A -->|"Yêu cầu quản lý kết quả / ảnh"| P6(("6. Quản lý kết quả"))
    P6 -->|"Tra cứu / cập nhật được phép"| D2[("D2. Kết quả")]
    D2 -->|"Metadata kết quả"| P6
    P6 -->|"Yêu cầu xóa ảnh được phép"| C[("Cloud storage")]
    P6 -->|"Kết quả thao tác"| A

    D2 -->|"Ảnh đến hạn 30 ngày"| P7(("7. Dọn ảnh đến hạn"))
    P7 -->|"Yêu cầu xóa ảnh"| C
    P7 -->|"Cập nhật trạng thái theo chính sách"| D2
```

Popup xác nhận xóa ở giao diện đi trước tiến trình quản trị; server vẫn phải kiểm tra quyền và ràng buộc dữ liệu. Không xóa bản ghi lịch sử hoặc thay đổi khóa ngoại theo một quy tắc chưa được nhóm duyệt.

## 3. ERD và cấu trúc dữ liệu hiện tại

### ERD khái niệm theo ký pháp Chen

Sơ đồ dưới đây dùng **hình chữ nhật cho thực thể, hình bầu dục cho thuộc tính và hình thoi cho quan hệ**, theo phong cách hình mẫu. Thuộc tính `id` được gạch chân để chỉ khóa chính. Sơ đồ chỉ giữ những thuộc tính tiêu biểu để dễ đọc; phần ERD bảng bên dưới liệt kê các trường còn lại.

![ERD kiểu Chen của sáu thực thể AgriVision](assets/agrivision_initial_create_chen_erd.svg)

[Mở SVG ở kích thước đầy đủ](assets/agrivision_initial_create_chen_erd.svg). Bội số `0..1` ở phía `User` phản ánh `predictions.user_id` **đang cho phép NULL**. Mục tiêu sản phẩm yêu cầu đăng nhập trước khi dự đoán; việc đổi ràng buộc DB chỉ thực hiện sau khi xử lý dữ liệu cũ và chốt quy tắc xóa tài khoản. Hai quan hệ tới `Prediction Detail` lần lượt biểu diễn bản ghi dự đoán sở hữu các hạng và mỗi hạng tham chiếu một lớp cây/bệnh.

### ERD bảng và ràng buộc hiện tại

Sơ đồ sau phản ánh sáu bảng trong [`InitialCreate` migration](../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs) và [EF Core configurations](../backend/src/AgriVision.Infrastructure/Persistence/Configurations/). Các trường khóa và trường có ý nghĩa nghiệp vụ được thể hiện; bảng bên dưới bổ sung ràng buộc. `users` và `predictions` hiện là quan hệ tùy chọn do `user_id` cho phép `NULL`.

```mermaid
erDiagram
    users o|--o{ predictions : owns
    plants ||--o{ plant_diseases : has
    diseases ||--o{ plant_diseases : has
    plant_diseases ||--o{ predictions : predicted_as
    predictions ||--o{ prediction_details : contains
    plant_diseases ||--o{ prediction_details : ranked_as

    users {
        uuid id PK
        string full_name
        string email UK
        string password_hash
        string role
        datetime created_at
        datetime updated_at
    }
    plants {
        uuid id PK
        string name UK
        string vietnamese_name
        string scientific_name
        string description
        bool is_active
        datetime created_at
        datetime updated_at
    }
    diseases {
        uuid id PK
        string name UK
        string vietnamese_name
        string description
        string symptoms
        string treatment
        string prevention
        bool is_active
        datetime created_at
        datetime updated_at
    }
    plant_diseases {
        uuid id PK
        uuid plant_id FK
        uuid disease_id FK
        string class_name
        int class_index UK
        bool is_active
    }
    predictions {
        uuid id PK
        uuid user_id FK "nullable hien tai"
        string image_path
        string image_public_id
        uuid predicted_plant_disease_id FK
        double confidence
        datetime created_at
    }
    prediction_details {
        uuid id PK
        uuid prediction_id FK
        uuid plant_disease_id FK
        double probability
        int rank
    }
```

`UK` biểu thị unique index. `image_path` và `image_public_id` là tham chiếu tới nơi lưu ảnh, không phải dữ liệu ảnh nhị phân. `prediction_details` biểu diễn các lớp xếp hạng của **một ảnh**, không phải nhiều ảnh của một lần gửi.

| Bảng | Khóa, ràng buộc và mục đích hiện tại |
|---|---|
| `users` | PK `id`; `email` duy nhất; `role` mặc định `User`. Lưu thông tin tài khoản và hash mật khẩu. |
| `plants` | PK `id`; `name` duy nhất; danh mục cây. |
| `diseases` | PK `id`; `name` duy nhất; thông tin bệnh. Các cột `treatment`/`prevention` đã tồn tại, nhưng **gợi ý thuốc theo giai đoạn** chưa thuộc MVP. |
| `plant_diseases` | PK `id`; FK tới cây/bệnh; duy nhất `(plant_id, disease_id)` và `class_index`; `class_index >= 0`. Lớp nhãn cần khớp mapping model được duyệt. |
| `predictions` | PK `id`; FK `user_id` hiện nullable, xóa user thì `SET NULL`; FK lớp dự đoán có `RESTRICT`; lưu tham chiếu một ảnh, confidence và thời điểm. |
| `prediction_details` | PK `id`; FK prediction `CASCADE`, FK lớp `RESTRICT`; `(prediction_id, rank)` duy nhất và `rank > 0`. |

### Điều chỉnh cần thiết so với yêu cầu mới

| Chủ đề | Hiện tại | Hướng điều chỉnh cần duyệt và triển khai |
|---|---|---|
| Bắt buộc đăng nhập | `predictions.user_id` nullable; POST dự đoán chưa có `[Authorize]`. | Yêu cầu xác thực cho POST và các đường đọc kết quả; sau khi xử lý dữ liệu guest cũ, cân nhắc migration `user_id NOT NULL`. |
| Quyền xem kết quả | GET theo ID chưa xác thực/kiểm tra chủ sở hữu. | Kiểm tra quyền trên server trước khi trả metadata và URL ảnh; chốt quyền admin. |
| Sửa hồ sơ | Có `/api/auth/me` để đọc; chưa thấy endpoint sửa hồ sơ. | Thêm thao tác sửa các trường được duyệt, xác thực chủ tài khoản. |
| Nhiều ảnh | API và bảng `predictions` nhận/lưu từng ảnh. | Nếu cần một request nhiều ảnh, xử lý từng ảnh và trả trạng thái từng ảnh; chốt có cần nhóm lần gửi và giới hạn số ảnh/request. |
| Cloud và hạn lưu | Có adapter Cloudinary với đường lui lưu local; chưa có chính sách xóa sau 30 ngày. | Đảm bảo ảnh sản phẩm lên cloud; thêm chính sách xóa 30 ngày và trạng thái ảnh đã hết hạn; kiểm tra ảnh và dung lượng ở server. |
| Vòng đời tài khoản | Xóa user hiện làm `predictions.user_id = NULL`. | Chốt xóa cứng, xóa mềm hay ẩn danh; quyết định xóa/giữ lịch sử, ảnh và cách tuân thủ quyền riêng tư rồi mới đổi FK. |
| Danh mục cây/bệnh | FK `RESTRICT` ngăn xóa khi còn quan hệ tham chiếu. | Ưu tiên ngừng sử dụng bằng `is_active` nếu cần giữ lịch sử; popup không thay ràng buộc DB. |
| Phiên bản model | Chưa có cột model/dataset version. | Chốt nguồn/version trước khi thêm migration; không dùng seed minh họa làm mapping thật. |

## 4. Nguồn đối chiếu trong repo

- [Entity](../backend/src/AgriVision.Domain/Entities/) và [migration đầu tiên](../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs): bảng, khóa, quan hệ hiện có.
- [PredictionsController](../backend/src/AgriVision.API/Controllers/PredictionsController.cs), [AuthController](../backend/src/AgriVision.API/Controllers/AuthController.cs), [PredictionService](../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs): luồng API hiện tại.
- [CloudinaryImageStorage](../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs), [FastApiPlantDiseasePredictor](../backend/src/AgriVision.Infrastructure/Services/FastApiPlantDiseasePredictor.cs): adapter đang có, không chứng minh checkpoint thật đã sẵn sàng.
- [PlantsController](../backend/src/AgriVision.API/Controllers/PlantsController.cs), [DiseasesController](../backend/src/AgriVision.API/Controllers/DiseasesController.cs), [HealthController](../backend/src/AgriVision.API/Controllers/HealthController.cs): phạm vi quản trị danh mục và health hiện có.
- [Lộ trình phát triển](development_roadmap.md): kế hoạch và bằng chứng CI theo commit, không thay cho nghiệm thu model thật.
