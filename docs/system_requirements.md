# Đặc tả yêu cầu hệ thống AgriVision

> Yêu cầu mục tiêu do nhóm cung cấp ngày 2026-09-30; bổ sung phân tích hiện trạng AGRI-76 ngày 2026-10-03 trên nền commit `094ec6e`. FR/NFR bên dưới không phải danh sách tính năng đã hoàn thành. Phần 0 và ma trận ở phần 8 đối chiếu source; [sơ đồ](system_design_diagrams.md) tách hiện trạng khỏi đề xuất.

## 0. Hiện trạng và phạm vi phân tích AGRI-76

Mục tiêu phân tích là mô tả hệ thống đang có, chỉ ra chức năng, tác nhân, dữ liệu và khoảng trống so với yêu cầu nhóm; không triển khai chức năng mới trong task tài liệu này.

| Tác nhân hiện tại | Khả năng theo API source | Giới hạn / rủi ro |
|---|---|---|
| Khách | Đăng ký, đăng nhập; đọc danh mục cây/bệnh; POST một ảnh và GET kết quả theo ID hiện không có `[Authorize]`. | Hai endpoint prediction công khai là khoảng trống so với FR-02/07, không phải quyền được sản phẩm phê duyệt. |
| Người dùng đã đăng nhập | Đọc hồ sơ qua `/api/auth/me`; gửi một ảnh; xem danh sách lịch sử theo user, phân trang; xóa kết quả của mình. | Chưa có sửa hồ sơ; GET chi tiết chưa kiểm tra owner; chưa có upload nhiều ảnh/request. |
| Admin | Các quyền người dùng; thêm/sửa/xóa cây và bệnh; xóa prediction của người khác theo kiểm tra role. | Chưa có CRUD tài khoản; không suy ra có toàn bộ màn hình hoặc quyền đọc toàn bộ lịch sử quản trị. |

Kiến trúc source hiện có: Next.js → ASP.NET Core Web API → adapter HTTP AI; PostgreSQL lưu tài khoản/danh mục/prediction, Cloudinary hoặc local lưu ảnh tùy cấu hình. Đăng ký/đăng nhập, history và upload có mã tích hợp web/API; điều này không chứng minh E2E với model thật. Health mock trong CI không thay cho FastAPI inference. [BFD/DFD hiện trạng](system_design_diagrams.md#1-phân-tích-hệ-thống-hiện-tại--đầu-ra-agri-76) và [ERD](system_design_diagrams.md#3-erd-và-cấu-trúc-dữ-liệu-hiện-tại) là đầu ra hiện trạng; phạm vi phiên bản đầu ở phần 1 là mục tiêu chưa hoàn thành.

## 1. Mục tiêu và phạm vi

AgriVision là ứng dụng web hỗ trợ **phân loại bệnh trên ảnh lá cây**. Người dùng có tài khoản tải ảnh lên, nhận kết quả từ mô hình CNN, xem lại kết quả và ảnh đã gửi. Kết quả chỉ mang tính tham khảo; chất lượng mô hình phải được đánh giá bằng thí nghiệm trước khi công bố khả năng chẩn đoán.

Kiến trúc mục tiêu: **Next.js → ASP.NET Core Web API → FastAPI phục vụ ConvNeXt-Tiny**, PostgreSQL lưu dữ liệu nghiệp vụ, cloud storage lưu ảnh. ConvNeXt-Tiny là một kiến trúc CNN. Hệ thống không xử lý khoanh vùng tổn thương, phân đoạn ảnh hay ước lượng mức độ nặng trong phiên bản đầu.

| Phạm vi phiên bản đầu | Để sau |
|---|---|
| Đăng ký, đăng nhập, chỉnh sửa thông tin cá nhân; tải một hoặc nhiều ảnh trong một lần; phân loại bệnh; lưu và xem lịch sử của chính mình; quản trị tài khoản, ảnh, kết quả và dữ liệu người dùng | Gợi ý thuốc theo giai đoạn bệnh; giải thích nguyên nhân bệnh |

## 2. Tác nhân và quyền

| Tác nhân | Quyền mong muốn |
|---|---|
| Khách | Đăng ký, đăng nhập. Không được gửi ảnh để phân loại hoặc xem lịch sử. |
| Người dùng | Sửa thông tin cá nhân; gửi ảnh; xem ảnh và kết quả thuộc tài khoản của mình. |
| Quản trị viên | Quản lý tài khoản, ảnh, kết quả và dữ liệu người dùng theo phạm vi quản trị được duyệt. Mọi thao tác đọc/xóa dữ liệu cá nhân cần xác thực và kiểm tra vai trò. |

Quyền quản trị là ngoại lệ có kiểm soát đối với nguyên tắc "chỉ chủ tài khoản xem lịch sử". Nhóm cần chốt quản trị viên được xem **nội dung ảnh và kết quả** hay chỉ metadata, cùng cách ghi nhận thao tác quản trị.

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Tiêu chí chấp nhận đề xuất |
|---|---|---|
| FR-01 | Đăng ký | Người dùng nhập họ tên, email, mật khẩu; email không trùng; mật khẩu được lưu dưới dạng hash. |
| FR-02 | Đăng nhập và xác thực | Đăng nhập hợp lệ nhận phiên/token JWT; yêu cầu gửi ảnh và xem lịch sử thiếu token hoặc token sai bị từ chối. |
| FR-03 | Sửa thông tin cá nhân | Người dùng đã đăng nhập sửa thông tin được phép; không tự đổi vai trò hoặc sửa tài khoản khác. Danh sách trường được sửa cần chốt. |
| FR-04 | Tải ảnh và phân loại | Người dùng đã đăng nhập gửi một hoặc nhiều ảnh lá của cùng một trường hợp bệnh. Mỗi ảnh có kích thước **dưới 30 MB**; API kiểm tra kích thước, định dạng và nội dung ảnh trước khi lưu/gọi model. |
| FR-05 | Nhận kết quả | Hiển thị bệnh/cây tương ứng và ảnh đã gửi; kết quả và độ tin cậy phải dựa trên checkpoint thật và mapping nhãn đã duyệt. Đầu ra chi tiết của model còn chờ chốt. |
| FR-06 | Lưu kết quả và ảnh | PostgreSQL lưu chủ sở hữu, kết quả, thời điểm và tham chiếu ảnh; ảnh gốc nằm trên cloud storage, thời hạn tồn tại **30 ngày**. Không lưu kết quả giả khi AI lỗi. |
| FR-07 | Xem lịch sử | Người dùng chỉ xem được bản ghi và ảnh của chính mình; truy vấn danh sách và từng ID đều kiểm tra quyền trên server. Danh sách có phân trang. |
| FR-08 | Quản trị | Quản trị viên quản lý tài khoản, ảnh, kết quả và dữ liệu người dùng theo các thao tác/giới hạn sẽ được chốt. |
| FR-09 | Xác nhận xóa | Giao diện hỏi xác nhận trước khi xóa tài khoản hoặc danh mục cây/bệnh. Đây là bước giao diện; quyền, ràng buộc tham chiếu và cách xử lý dữ liệu liên quan do server quyết định. |

**Luồng chính:** đăng ký/đăng nhập → chọn ảnh → API xác thực và kiểm tra ảnh → lưu ảnh trên cloud → FastAPI suy luận bằng model đã chốt → API xác thực nhãn và lưu kết quả → hiển thị kết quả → người dùng xem lịch sử. Cần làm rõ cách dọn ảnh đã tải lên nếu suy luận hoặc ghi DB thất bại.

**Nhiều ảnh trong một lần gửi:** hiện chưa chốt một kết luận chung hay kết quả riêng cho từng ảnh. Đề xuất tạm thời là **mỗi ảnh có một kết quả riêng**, cùng một thao tác gửi của người dùng; không gộp xác suất từ nhiều ảnh khi chưa có quy tắc/model được đánh giá. Schema hiện tại đã hỗ trợ một `prediction` cho một ảnh, nhưng chưa có thực thể nhóm lần gửi. Không thêm bảng nhóm nếu giao diện và nghiệp vụ không cần xem theo nhóm.

## 4. Yêu cầu phi chức năng và tiêu chí kiểm chứng

| ID | Yêu cầu | Cách kiểm chứng / điểm cần chốt |
|---|---|---|
| NFR-01 | Bảo mật | JWT, phân quyền tại API, kiểm tra chủ sở hữu theo từng bản ghi; secret ngoài Git; lưu hash mật khẩu. Kiểm thử người A không đọc dữ liệu người B. |
| NFR-02 | An toàn ảnh | Giới hạn từng ảnh dưới 30 MB ở client và server; kiểm tra nội dung ảnh thực, không chỉ phần mở rộng; đường dẫn/cloud ID không cấp quyền truy cập công khai ngoài chính sách. |
| NFR-03 | Vòng đời ảnh | Ảnh trên cloud được xóa sau 30 ngày kể từ thời điểm tải lên. Cần chốt lịch dọn, xử lý lỗi xóa và hiển thị lịch sử khi ảnh đã hết hạn. |
| NFR-04 | Hiệu năng | Phản hồi "nhanh" chưa có ngưỡng định lượng. Cần thống nhất thời gian mục tiêu, điều kiện đo, kích thước/số lượng ảnh và mức tải trước khi viết tiêu chí đạt. |
| NFR-05 | Độ tin cậy kết quả | Dùng cùng tiền xử lý và mapping nhãn giữa huấn luyện, CLI và FastAPI. Báo cáo metric bằng kết quả đo thực; không coi health check hoặc mock là bằng chứng phân loại. |
| NFR-06 | Truy vết | Ghi thời điểm, người dùng, ảnh và phiên bản model/dataset nếu cần giải thích kết quả cũ sau khi đổi model. Cột phiên bản hiện chưa có trong DB. |

## 5. Quy trình phát triển và bằng chứng cho báo cáo môn học

| Giai đoạn | Công việc | Bằng chứng cần lưu |
|---|---|---|
| Khảo sát và phân tích | Chốt vai trò, luồng, FR/NFR, quyết định còn mở, tiêu chí chấp nhận. | Tài liệu này và biên bản/nguồn yêu cầu của nhóm. |
| Thiết kế | Đối chiếu ERD với migration; chốt hợp đồng web–API–AI, lưu ảnh, quyền và xóa dữ liệu. | [Tài liệu sơ đồ](system_design_diagrams.md), schema/API contract, quyết định thiết kế. |
| Xây dựng | Triển khai các phần độc lập với model trước; tích hợp FastAPI sau khi checkpoint/mapping đạt yêu cầu. | Mã nguồn, migration, commit/PR theo Jira task. |
| Kiểm thử | Unit, integration, kiểm tra quyền A/B, lỗi upload, lỗi AI, thời hạn ảnh và E2E với checkpoint thật khi sẵn sàng. | Test run và kết quả thực; ghi rõ mock, local pass và phần chưa kiểm chứng. |
| Đánh giá và bàn giao | So sánh tính năng với yêu cầu, báo cáo metric model và giới hạn, hướng dẫn vận hành. | Báo cáo task trong `docs/task-logs/`, kết quả thí nghiệm có nguồn, checklist nghiệm thu. |

Các điều kiện nghiệm thu quan trọng: khách không dự đoán được; người A không xem ảnh/kết quả của B qua danh sách hoặc ID; ảnh không hợp lệ hoặc quá giới hạn không được lưu; AI lỗi không tạo bản ghi thành công; ảnh quá 30 ngày được xóa đúng chính sách; kết quả model thật được đánh giá riêng với test giao diện/API.

## 6. Quyết định còn mở

1. **Nhiều ảnh:** kết quả riêng từng ảnh (đề xuất) hay một kết luận chung; số ảnh tối đa trong một lần gửi; xử lý khi chỉ một ảnh lỗi.
2. **Đầu ra model:** cấu trúc top-1/top-k, lớp khỏe mạnh/không xác định, đơn vị confidence, ngưỡng từ chối, `class_index` và nhãn chuẩn, phiên bản model/dataset. Chỉ chốt mapping khi checkpoint được duyệt.
3. **Ảnh hết hạn:** giữ bản ghi lịch sử và hiển thị "ảnh đã hết hạn" hay xóa cả kết quả; URL ảnh riêng tư được cấp và hết hạn như thế nào.
4. **Xóa tài khoản/danh mục:** xóa cứng, xóa mềm hay ẩn danh; dữ liệu dự đoán và ảnh liên quan xử lý ra sao; quyền admin đọc/xóa ở mức nào.
5. **Hồ sơ và hiệu năng:** trường người dùng được sửa; mục tiêu thời gian phản hồi và tải đồng thời để đo.

## 7. Tài liệu liên quan

- [ERD, BFD và DFD](system_design_diagrams.md)
- [Lộ trình phát triển](development_roadmap.md)
- [Báo cáo AGRI-76](reports/AGRI-76/README.md)

## 8. Ma trận truy vết yêu cầu và hiện trạng

`Có mã` không đồng nghĩa đã kiểm thử đạt; `Một phần` là còn thiếu so với mục tiêu; `Chưa có / chưa chốt` không tính vào chức năng hoàn thành. Các case dẫn tới tài liệu thiết kế, không phải kết quả chạy trong lần sửa này.

Nguồn: [AuthController](../backend/src/AgriVision.API/Controllers/AuthController.cs), [AuthService](../backend/src/AgriVision.Application/Services/Implementations/AuthService.cs), [PredictionsController](../backend/src/AgriVision.API/Controllers/PredictionsController.cs), [PredictionService](../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), [PlantsController](../backend/src/AgriVision.API/Controllers/PlantsController.cs), [DiseasesController](../backend/src/AgriVision.API/Controllers/DiseasesController.cs), [CloudinaryImageStorage](../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs), [DTO prediction](../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs), [web predictionApi](../frontend/src/services/predictionApi.ts) và [viewpoint kiểm thử](notes/agri_test_viewpoints.md).

| Yêu cầu | Source / endpoint hiện có | Trạng thái và khoảng trống | Kiểm chứng liên quan / còn cần |
|---|---|---|---|
| FR-01 | AuthController/AuthService: `POST /api/auth/register` | Có mã đăng ký, hash mật khẩu và kiểm tra email. | [INT-AUTH-01](notes/agri_integration_test_cases.md); chưa chạy lại. |
| FR-02 | `POST /api/auth/login`, GET history có Authorize | Một phần: POST prediction và GET theo ID chưa yêu cầu auth. | INT-AUTH-01; cần case khách và token sai trên prediction. |
| FR-03 | `GET /api/auth/me` | Chỉ đọc; chưa có sửa hồ sơ, trường được sửa chưa chốt. | Chờ quyết định trường và endpoint trước khi nghiệm thu. |
| FR-04 | PredictRequest.File, PredictionService, web gửi `file` | Một phần: một ảnh/request; kiểm tra rỗng/đuôi, chưa kiểm tra nội dung và giới hạn nghiệp vụ 30 MB. | [API-PRED-01/02](notes/agri_api_test_cases.md), INT-CONTRACT-01; cần case biên dung lượng/nhiều ảnh theo policy được duyệt. |
| FR-05 | Adapter AI, PredictionService, PredictionResultDto | Có luồng gọi HTTP và DTO top-k; mapping DB vẫn fallback, model thật chưa kiểm chứng xuyên tầng. | API-PRED-03/04/05, VP-E2E-01; không coi stub là chất lượng model. |
| FR-06 | PredictionService, CloudinaryImageStorage, migration | Một phần: lưu prediction/top-k và tham chiếu ảnh; owner nullable, có local fallback, chưa có cleanup khi lỗi và hạn 30 ngày. | API-PRED-03/04, INT-PRED-01/02, INT-DB-01; cần kiểm thử lifecycle. |
| FR-07 | GET danh sách / GET ID / DELETE prediction | Danh sách lọc owner và phân trang, xóa kiểm tra quyền; GET ID chưa kiểm tra owner. | API-HIST-01/02, INT-HIST-01/02; cần case đọc ID của user khác. |
| FR-08 | PlantsController/DiseasesController; DELETE prediction cho admin | Một phần: CRUD cây/bệnh và xóa kết quả; chưa có quản trị tài khoản, phạm vi dữ liệu cá nhân chưa chốt. | Cần case role trên CRUD danh mục và quyết định quyền admin. |
| FR-09 | DELETE cây/bệnh có kiểm tra role, FK có ràng buộc | Chưa xác nhận popup theo yêu cầu; chưa có xóa tài khoản. | Cần kiểm tra giao diện và policy xóa; không suy từ endpoint ra popup đạt. |
| NFR-01 | AuthService, controller Authorize/role, owner khi xóa | Một phần: thiếu bảo vệ POST/GET ID prediction; secret cần kiểm chứng riêng. | VP-API-03, ca A/B và secret scan; chưa chạy lại scanner. |
| NFR-02 | PredictionService và kho ảnh | Một phần: chỉ kiểm tra rỗng/đuôi; nội dung, dung lượng và chính sách URL ảnh chưa đạt mục tiêu. | VP-API-01, ca ảnh hỏng/quá giới hạn/truy cập ảnh. |
| NFR-03 | Chưa có scheduler xóa ảnh 30 ngày trong luồng đối chiếu | Chưa có; không liên quan health endpoint. | Cần policy, scheduler và case thời hạn/retry trước khi nghiệm thu. |
| NFR-04 | Chưa có ngưỡng hiệu năng được duyệt | Chưa chốt; không tự đặt số đo hoặc ngưỡng đạt. | Chốt p95/thời gian mục tiêu, môi trường, số ảnh và tải; sau đó benchmark. |
| NFR-05 | Mã AI và adapter HTTP; báo cáo [AGRI-21](reports/AGRI-21/README.md) | Có bằng chứng đánh giá nội bộ; parity CLI–HTTP–API–web chưa xác nhận. | VP-DATA-01, VP-ML-01, VP-E2E-01. |
| NFR-06 | Prediction entity/migration và DTO | Có thời điểm, user và ảnh; chưa có cột model/dataset version. | Cần quyết định version, migration và đối chiếu response/DB; placeholder web không phải version thật. |

### Điều kiện chốt các mục còn mở

Không biến đề xuất thành tiêu chí đã duyệt. Trước nghiệm thu sản phẩm, nhóm cần ghi quyết định có ngày/nguồn cho: trường sửa hồ sơ; thao tác và phạm vi quyền admin; số ảnh, kết quả và lỗi từng ảnh; đơn vị MB/MiB cùng ngưỡng chính xác; lifecycle ảnh và xóa tài khoản; model contract/version; ngưỡng và điều kiện đo hiệu năng. Những mục chưa chốt phải giữ trạng thái chờ, không ghi Passed. AGRI-76 có thể mô tả chúng là khoảng trống, không đưa vào sơ đồ hiện trạng.
