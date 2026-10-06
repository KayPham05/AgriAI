# Đặc tả yêu cầu hệ thống AgriVision

> **Đối chiếu hiện trạng mới nhất 2026-10-07:** [System Analysis](reports/AGRI-76/system_analysis.md), [Use Case Specification](reports/AGRI-76/use_case_specifications.md), [truy vết xuyên sơ đồ](reports/AGRI-76/traceability.md). Các FR/NFR mục tiêu dưới đây vẫn là yêu cầu sản phẩm; không tự đổi thành chức năng đã hoàn tất. UI hiện kiểm JPEG/PNG và tối đa 15 MiB; sửa hồ sơ chỉ state; web chính yêu cầu đăng nhập/restore; lịch sử guest browser chỉ là nhánh code chưa có đường vào UI. Xem bộ cập nhật để phân biệt với API và schema live.

> Yêu cầu mục tiêu do nhóm cung cấp ngày 2026-09-30; phân tích hiện trạng AGRI-76 cập nhật ngày 2026-10-05 trên nền commit `99d6e56`, thay bản đối chiếu ngày 2026-10-03. FR/NFR bên dưới không phải danh sách tính năng đã hoàn thành. Phần 0 và ma trận ở phần 8 đối chiếu source và bộ AGRI-76 mới; [sơ đồ](system_design_diagrams.md) tách hiện trạng khỏi đề xuất.

## Nguồn cập nhật yêu cầu — 2026-10-06

Nguồn đồng bộ yêu cầu mục tiêu là [bản tổng hợp các quyết định đã chốt](confirmed_decisions.md). Nguồn phỏng vấn ngày 2026-10-05 được ghi tại [sổ quyết định](notes/user_story_decisions_2026-10-06.md). Chúng cập nhật quyền khách, giới hạn tổng lượt, kết quả nhiều ảnh, cảnh báo/thuốc, auth và snapshot lịch sử; thay những mục mục tiêu cũ tương ứng. Mô hình source/schema hiện tại đã cập nhật 07/10/2026; ma trận phần 8 giữ riêng baseline lịch sử 05/10; cập nhật triển khai database ngày 2026-10-06 được ghi riêng tại [quy trình migration và kiểm thử](notes/database_migrations.md). Quy tắc chi tiết dùng AC nguồn trong [bộ User Story](notebooks/user_stories_overview_nguyen_pham_bao_khanh_2026-10-05.md).

## 0. Hiện trạng và phạm vi phân tích AGRI-76

Mục tiêu phân tích là mô tả hệ thống đang có, chỉ ra chức năng, tác nhân, dữ liệu và khoảng trống so với yêu cầu nhóm; không triển khai chức năng mới trong task tài liệu này.

| Tác nhân hiện tại | Khả năng theo web/API source | Giới hạn / rủi ro |
|---|---|---|
| Khách | Register/login web; POST prediction API 200 không lưu ảnh/history; GET catalog public. | Main UI chưa mở cho khách; GET list/detail cần JWT, detail đúng owner. |
| Người dùng đã đăng nhập | Hồ sơ/restore, prediction 201 có image/snapshot, list/detail đúng owner, xóa của mình và logout. | Sửa hồ sơ UI chỉ state; API một ảnh, chưa UI phân trang/expiry đầy đủ hoặc private image ACL. |
| Admin | Các quyền người dùng; thêm/sửa/xóa cây và bệnh; xóa prediction của người khác theo kiểm tra role. | Chưa có CRUD tài khoản; không suy ra có toàn bộ màn hình hoặc quyền đọc toàn bộ lịch sử quản trị. |

Kiến trúc source hiện có: Next.js → ASP.NET Core Web API → adapter HTTP AI; PostgreSQL lưu tài khoản/danh mục/prediction, Cloudinary hoặc local lưu ảnh tùy cấu hình. Đăng ký/đăng nhập, history và upload có mã tích hợp web/API; điều này không chứng minh E2E với model thật. Health mock trong CI không thay cho FastAPI inference. [BFD/DFD hiện trạng](system_design_diagrams.md#1-phân-tích-hệ-thống-hiện-tại--đầu-ra-agri-76) và [ERD](system_design_diagrams.md#3-erd-và-cấu-trúc-dữ-liệu-hiện-tại) là đầu ra hiện trạng; phạm vi phiên bản đầu ở phần 1 là mục tiêu chưa hoàn thành.

## 1. Mục tiêu và phạm vi

AgriVision là ứng dụng web phục vụ **nhà nông, người làm nông nghiệp và sinh viên nông nghiệp**, hỗ trợ **phân loại loại cây và tình trạng bệnh từ ảnh lá**. Khách và người dùng có tài khoản tải ảnh lên để nhận dự đoán loại cây và tình trạng. Khi đã đăng nhập, kết quả được tự lưu để xem lại và xóa; khách không có lịch sử cá nhân. Kết quả chỉ mang tính tham khảo; chất lượng mô hình phải được đánh giá bằng thí nghiệm trước khi công bố khả năng chẩn đoán.

Kiến trúc mục tiêu: **Next.js → ASP.NET Core Web API (.NET 9) → PostgreSQL**; API gọi **FastAPI phục vụ ConvNeXt-Tiny** để suy luận. Phương án kho ảnh và cấu hình hạ tầng cụ thể cần được chốt khi triển khai. ConvNeXt-Tiny là một kiến trúc CNN. Hệ thống không xử lý khoanh vùng tổn thương, phân đoạn ảnh hay ước lượng mức độ nặng trong phiên bản đầu.

Phạm vi cây theo **dataset v1.4** gồm **cà chua, cà phê, cam, chè, lúa, ngô, nho, ớt, sầu riêng và xoài**. Không tự thêm cây hoặc đổi nhãn ngoài phiên bản đã thống nhất.

| Phạm vi đã chốt | Ngoài phạm vi đã chốt |
|---|---|
| Dự đoán cho khách; một/nhiều ảnh theo cùng cặp nhãn; kết quả/cảnh báo; nội dung và thuốc kiểm duyệt; email+xác minh, Google, quên/đặt lại mật khẩu; tự lưu/xem/xóa lịch sử khi đăng nhập | Detection, segmentation, mức độ nặng; gợi ý theo giai đoạn bệnh; giải thích nguyên nhân bằng mô hình |

Sửa hồ sơ và quản trị là các mục tham chiếu từ đặc tả trước. Giữ mã FR-03/08/09 để truy vết, nhưng không coi phạm vi chi tiết của chúng đã được xác nhận trong `confirmed_decisions.md`.

## 2. Tác nhân và quyền

| Tác nhân | Quyền mong muốn |
|---|---|
| Khách | Đăng ký/xác minh, đăng nhập bằng email hoặc Google, quên mật khẩu; dự đoán và xem kết quả của lượt hiện tại theo US-01. Không truy cập lịch sử tài khoản. |
| Người dùng đã đăng nhập | Dự đoán; tự lưu kết quả thành công; xem danh sách/chi tiết và xóa bản ghi của chính mình; đăng xuất. Sửa hồ sơ còn chờ phạm vi chi tiết. |
| Quản trị viên — phạm vi chi tiết chưa chốt | Các thao tác quản trị giữ để truy vết đặc tả cũ; không mặc định được đọc toàn bộ ảnh/lịch sử tài khoản. Quyền dữ liệu cá nhân phải được duyệt và kiểm tra trên server. |

Quyền quản trị dữ liệu cá nhân là ngoại lệ cần được chốt riêng, không mặc định áp dụng đối với nguyên tắc "chỉ chủ tài khoản xem lịch sử". Nhóm cần chốt quản trị viên được xem **nội dung ảnh và kết quả** hay chỉ metadata, cùng cách ghi nhận thao tác quản trị.

## 3. Yêu cầu chức năng

| ID | Yêu cầu | AC nguồn / phần còn cần làm rõ |
|---|---|---|
| FR-01 | Đăng ký và xác minh email | Người dùng đăng ký email/mật khẩu và xác minh email theo US-04. Có chức năng quên/đặt lại mật khẩu theo US-06. Thời hạn liên kết, chính sách mật khẩu và quyền khi chưa xác minh chưa chốt. |
| FR-02 | Đăng nhập và đăng xuất | Hỗ trợ email/mật khẩu và Google; đăng xuất theo US-05/07. Lịch sử cần phiên hợp lệ; dự đoán khách không cần đăng nhập. Giới hạn nhập sai và liên kết danh tính Google/email chưa chốt. |
| FR-03 | Sửa thông tin cá nhân — phạm vi chi tiết chưa chốt | Giữ yêu cầu tham chiếu từ đặc tả cũ; chốt trường được sửa và thao tác lưu server trước khi nghiệm thu. Không cho phép tự đổi vai trò hoặc sửa tài khoản khác. |
| FR-04 | Gửi ảnh và phân loại | Nhận một/nhiều ảnh JPG/JPEG, PNG; tổng dung lượng cả lượt dưới 30 MB. Tự dự đoán loại cây và tình trạng, không yêu cầu chọn cây. Từ chối ảnh không phải lá hoặc cây ngoài phạm vi. Với nhóm ảnh chỉ trả một kết quả chung nếu mọi ảnh có cùng cặp nhãn; tổng hợp theo US-01/AC-13. Nhóm khác nhãn bị từ chối, yêu cầu kiểm tra lại ảnh. Số byte và số ảnh tối đa chưa chốt. |
| FR-05 | Kết quả, cảnh báo và hướng xử lý | Hiển thị cây, tình trạng, confidence, mô tả và hướng xử lý. Cảnh báo và quyền thuốc theo US-02/AC-04–06; chỉ dùng nội dung đã nghiên cứu/kiểm duyệt cho đúng nhãn theo US-03. Nội dung thiếu dùng chuỗi tại US-03/AC-07. Không tự sinh thuốc hoặc phác đồ. |
| FR-06 | Tự lưu kết quả và ảnh | Lượt thành công khi đăng nhập tự lưu mọi ảnh, thời gian và snapshot toàn bộ nội dung đã hiển thị, kể cả cảnh báo/trạng thái nội dung thiếu. Khách không có lịch sử tài khoản; lỗi AI không tạo kết quả thành công. Theo US-08; vòng đời ảnh theo NFR-03. |
| FR-07 | Xem và xóa lịch sử | Theo US-08/US-09: chỉ chủ tài khoản truy cập/xóa; kiểm tra owner cả danh sách, ID và ảnh. Danh sách có phân trang theo US-08/AC-12–13. |
| FR-08 | Quản trị — phạm vi chi tiết chưa chốt | Giữ để truy vết đặc tả trước; chốt thao tác quản trị và quyền đọc/xóa dữ liệu cá nhân trước khi nghiệm thu. |
| FR-09 | Xác nhận xóa — phạm vi chi tiết chưa chốt | Giữ yêu cầu tham chiếu về tài khoản/danh mục từ đặc tả trước. Xác nhận trước khi xóa bản ghi chẩn đoán và xóa ảnh ngay vẫn là đề xuất tại US-09, chưa được xem là đã chốt. |

**Luồng mục tiêu:** chọn ảnh → API kiểm tra đầu vào → suy luận từng ảnh → kiểm tra nhãn/tổng hợp theo US-01 → trả kết quả theo US-02/03 → tự lưu snapshot khi có phiên đăng nhập. Tài khoản có thể đăng ký/xác minh hoặc đăng nhập Google trước khi sử dụng lịch sử. Cần cleanup ảnh khi AI/DB lỗi.

**Nhiều ảnh:** đã chốt một kết quả chung theo US-01/AC-13–15. PredictionDetail là top-k, không là danh sách ảnh. Schema prediction_images đã có; contract nhiều ảnh/tổng hợp và UI vẫn cần triển khai trước nghiệm thu.

### Quy tắc hiển thị kết quả đã chốt

AC nguồn vẫn là căn cứ xây dựng Test Case; bảng này tóm tắt để đọc đặc tả độc lập, không đặt thêm chính sách khác.

| Điều kiện | Kết quả cần hiển thị | AC nguồn |
|---|---|---|
| Độ tin cậy ≤ 80%, kể cả đúng 80% | Giữ dự đoán, có cảnh báo, không gợi ý thuốc | US-02/AC-04, AC-06 |
| Độ tin cậy > 80% và tình trạng có bệnh | Không cảnh báo độ tin cậy thấp; hiển thị thuốc khi có nội dung đã kiểm duyệt | US-02/AC-05–06; US-03/AC-05 |
| Khỏe mạnh hoặc thiếu dinh dưỡng | Hướng chăm sóc; không thuốc trị bệnh | US-02/AC-06; US-03/AC-03–04 |
| Chưa có nội dung được kiểm duyệt | “Thông tin đang được cập nhật”; phần thuốc chỉ áp dụng khi được phép hiển thị | US-03/AC-07 |

Số chữ số và cách làm tròn confidence trước so sánh chưa chốt. Trung bình confidence của nhóm ảnh là cách tổng hợp hiển thị theo US-01/AC-13, không phải metric đánh giá hoặc bằng chứng xác suất đã hiệu chuẩn.

## 4. Yêu cầu phi chức năng và tiêu chí kiểm chứng

| ID | Yêu cầu | Cách kiểm chứng / điểm cần chốt |
|---|---|---|
| NFR-01 | Bảo mật | JWT, phân quyền tại API, kiểm tra chủ sở hữu theo từng bản ghi; secret ngoài Git; lưu hash mật khẩu. Kiểm thử người A không đọc dữ liệu người B. |
| NFR-02 | An toàn ảnh | Giới hạn tổng lượt tại US-01/AC-02 ở client/server; kiểm tra nội dung thực; URL ảnh lịch sử không công khai ngoài chính sách. Số byte và số ảnh tối đa chưa chốt. |
| NFR-03 | Vòng đời ảnh | Ảnh gốc hết hạn sau 30 ngày kể từ lúc tải lên, theo US-09/AC-07; giữ lịch sử/snapshot và không trả URL ảnh đã hết hạn. Lịch dọn tự động còn cần chốt. |
| NFR-04 | Hiệu năng | Phản hồi "nhanh" chưa có ngưỡng định lượng. Cần thống nhất thời gian mục tiêu, điều kiện đo, kích thước/số lượng ảnh và mức tải trước khi viết tiêu chí đạt. |
| NFR-05 | Độ tin cậy kết quả | Dùng cùng tiền xử lý và mapping nhãn giữa huấn luyện, CLI và FastAPI. Báo cáo metric bằng kết quả đo thực; không coi health check hoặc mock là bằng chứng phân loại. |
| NFR-06 | Truy vết | Ghi thời điểm, người dùng, ảnh và phiên bản model/dataset nếu cần giải thích kết quả cũ sau khi đổi model. Cột phiên bản hiện chưa có trong DB. |

### Định hướng triển khai

Docker Compose và GitHub Actions là nền tảng hiện tại. Mô hình GitHub Actions → registry → VPS đã được review nhưng vẫn là phương án đề xuất; chưa chốt VPS, Docker Hub/GHCR, domain, cấu hình máy, backup hoặc rollback. Xem [review triển khai](notes/vps_deployment_review.md). CI/health/mock không thay thế kiểm chứng suy luận model thật.

## 5. Quy trình phát triển và bằng chứng cho báo cáo môn học

| Giai đoạn | Công việc | Bằng chứng cần lưu |
|---|---|---|
| Khảo sát và phân tích | Chốt vai trò, luồng, FR/NFR, quyết định còn mở, tiêu chí chấp nhận. | Tài liệu này và biên bản/nguồn yêu cầu của nhóm. |
| Thiết kế | Đối chiếu ERD với migration; chốt hợp đồng web–API–AI, lưu ảnh, quyền và xóa dữ liệu. | [Tài liệu sơ đồ](system_design_diagrams.md), schema/API contract, quyết định thiết kế. |
| Xây dựng | Triển khai các phần độc lập với model trước; tích hợp FastAPI sau khi checkpoint/mapping đạt yêu cầu. | Mã nguồn, migration, commit/PR theo Jira task. |
| Kiểm thử | Unit, integration, kiểm tra quyền A/B, lỗi upload, lỗi AI, thời hạn ảnh và E2E với checkpoint thật khi sẵn sàng. | Test run và kết quả thực; ghi rõ mock, local pass và phần chưa kiểm chứng. |
| Đánh giá và bàn giao | So sánh tính năng với yêu cầu, báo cáo metric model và giới hạn, hướng dẫn vận hành. | Báo cáo task trong `docs/task-logs/`, kết quả thí nghiệm có nguồn, checklist nghiệm thu. |

Các điều kiện nghiệm thu quan trọng: khách dự đoán được nhưng không truy cập lịch sử tài khoản; người A không xem ảnh/kết quả của B qua danh sách hoặc ID; ảnh không hợp lệ hoặc quá giới hạn không được lưu; AI lỗi không tạo bản ghi thành công; ảnh hết hạn được xóa theo US-09/AC-07; kết quả model thật được đánh giá riêng với test giao diện/API.

## 6. Quyết định còn mở

Theo mục 6 của [bản tổng hợp](confirmed_decisions.md):

1. **Ảnh đầu vào:** quy đổi MB sang byte, số ảnh tối đa; xử lý lỗi một ảnh trong nhóm. Quyền dự đoán khách, định dạng, giới hạn tổng lượt và cách gộp kết quả đã chốt.
2. **Confidence:** số chữ số/cách làm tròn. Ngưỡng cảnh báo và điều kiện không gợi ý thuốc đã chốt; cơ chế kỹ thuật nhận biết ảnh ngoài phạm vi cần thiết kế và kiểm chứng, không phải quyền tùy chọn trả một nhãn cho ảnh lạ.
3. **Tài khoản:** thời hạn liên kết email/reset, chính sách mật khẩu, giới hạn nhập sai, quyền tài khoản chưa xác minh; liên kết Google/email. Không mặc định các giá trị đề xuất trong story đã được duyệt.
4. **Khách:** có lời nhắc đăng nhập hay không. Khách được dự đoán nhưng không lưu/xem lịch sử tài khoản đã chốt.
5. **Xóa và hết hạn:** xác nhận xóa thủ công, xóa ảnh ngay cùng bản ghi; URL ảnh riêng tư, lịch dọn và xử lý lỗi. Giữ bản ghi khi ảnh hết hạn đã chốt; thời hạn ảnh không bị thay bằng lưu vô thời hạn.
6. **Contract và dữ liệu:** schema/API cho nhiều ảnh và snapshot; đơn vị confidence HTTP, cách chuyển đổi với CLI, mapping/preprocessing và phiên bản model để kiểm chứng xuyên tầng. Yêu cầu tự nhận cây, nhóm ảnh cùng nhãn và giữ nội dung lúc dự đoán không còn là quyết định nghiệp vụ mở.
7. **Triển khai:** VPS, registry, domain, cấu hình máy, kho ảnh, phân phối checkpoint, backup/restore và rollback.

**Các mục tham chiếu từ đặc tả trước chưa được chốt thêm trong bản tổng hợp:** trường sửa hồ sơ; phạm vi quản trị; xóa tài khoản/danh mục; mục tiêu thời gian phản hồi và tải đồng thời. Giữ mã để truy vết, không đưa chúng vào danh sách yêu cầu đã xác nhận mới.

## 7. Tài liệu liên quan

- [Tổng hợp các quyết định đã chốt](confirmed_decisions.md)
- [Nguồn quyết định phỏng vấn](notes/user_story_decisions_2026-10-06.md)
- [User Story và AC](notebooks/user_stories_overview_nguyen_pham_bao_khanh_2026-10-05.md)
- [Review triển khai VPS](notes/vps_deployment_review.md)

- [ERD, BFD và DFD](system_design_diagrams.md)
- [Lộ trình phát triển](development_roadmap.md)
- [Báo cáo AGRI-76](reports/AGRI-76/README.md)

## 8. Ma trận truy vết yêu cầu và baseline khảo sát 2026-10-05

Ma trận dưới đây giữ kết quả khảo sát trước thay đổi database. Cập nhật 2026-10-06:
migration riêng, schema bổ sung, snapshot, kiểm owner khi đọc ID, không lưu lượt
khách và dọn ảnh có kiểm thử local tại [database migrations](notes/database_migrations.md).
Chưa nghiệm thu toàn bộ chức năng FR/NFR; không dùng baseline này để phủ nhận hoặc
khẳng định kết quả chạy ở source mới.

`Có mã` không đồng nghĩa đã kiểm thử đạt; `Một phần` là còn thiếu so với mục tiêu; `Chưa có / chưa chốt` không tính vào chức năng hoàn thành. Các case dẫn tới tài liệu thiết kế, không phải kết quả chạy trong lần sửa này.

Nguồn: [AuthController](../backend/src/AgriVision.API/Controllers/AuthController.cs), [AuthService](../backend/src/AgriVision.Application/Services/Implementations/AuthService.cs), [PredictionsController](../backend/src/AgriVision.API/Controllers/PredictionsController.cs), [PredictionService](../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), [PlantsController](../backend/src/AgriVision.API/Controllers/PlantsController.cs), [DiseasesController](../backend/src/AgriVision.API/Controllers/DiseasesController.cs), [CloudinaryImageStorage](../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs), [DTO prediction](../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs), [web predictionApi](../frontend/src/services/predictionApi.ts) và [viewpoint kiểm thử](notes/agri_test_viewpoints.md).

| Yêu cầu | Source / endpoint hiện có | Trạng thái và khoảng trống | Kiểm chứng liên quan / còn cần |
|---|---|---|---|
| FR-01 | AuthController/AuthService: `POST /api/auth/register` | Có mã đăng ký, hash mật khẩu và kiểm tra email; trả JWT ngay sau đăng ký, chưa có xác minh email mục tiêu. | [INT-AUTH-01](notes/agri_integration_test_cases.md); chưa chạy lại. |
| FR-02 | `POST /api/auth/login`, App restore/hasEnteredApp/logout, GET history có Authorize | Một phần: web chính yêu cầu login/restore; logout trở về IntroPage. POST công khai đúng quyền khách mới nhưng chưa tách lưu lịch sử khách; GET bản ghi tài khoản vẫn thiếu owner; thiếu xác minh/Google/reset. | INT-AUTH-01; UC-02/UC-03/UC-04; cần case khách dự đoán không lưu lịch sử, token sai trên lịch sử và quyền đọc ID/ảnh. |
| FR-03 | `GET /api/auth/me`, ProfilePage.handleSave/App.setUserProfile | Một phần: đọc hồ sơ server và sửa name/role hiển thị/location chỉ trong state UI (UC-03/F1.5); không lưu DB, không đổi JWT role. Trường được phép lưu server chưa chốt. | [UC-03](reports/AGRI-76/use_case_specifications.md#uc-03--quản-lý-hồ-sơ-và-khôi-phục-phiên); chờ quyết định trường và endpoint lưu trước nghiệm thu FR-03. |
| FR-04 | PredictRequest.File, PredictionService, imageFileValidation/DiagnosePage, web gửi `file` | Một phần: một ảnh/request; UI kiểm JPEG/PNG, file >0 và <=15 MiB, decode để preview; API kiểm rỗng/đuôi, chưa kiểm tra nội dung và giới hạn nghiệp vụ 30 MB. | [API-PRED-01/02](notes/agri_api_test_cases.md), INT-CONTRACT-01; cần case biên dung lượng/nhiều ảnh theo policy được duyệt. |
| FR-05 | Adapter AI, PredictionService, PredictionResultDto | Có luồng gọi HTTP và DTO top-k; mapping DB vẫn fallback, model thật chưa kiểm chứng xuyên tầng. | API-PRED-03/04/05, VP-E2E-01; không coi stub là chất lượng model. |
| FR-06 | PredictionService, CloudinaryImageStorage, migration | Một phần: một ảnh/prediction và top-k; chưa lưu nhiều ảnh theo lượt/snapshot, còn owner nullable và local fallback; chưa có cleanup lỗi/hết hạn theo US-09/AC-07. | API-PRED-03/04, INT-PRED-01/02, INT-DB-01; cần kiểm thử lifecycle. |
| FR-07 | GET danh sách / GET ID / DELETE prediction | Danh sách lọc owner và phân trang, xóa kiểm tra quyền; GET ID chưa kiểm tra owner. | API-HIST-01/02, INT-HIST-01/02; cần case đọc ID của user khác. |
| FR-08 | PlantsController/DiseasesController; DELETE prediction cho admin | Một phần: CRUD cây/bệnh và xóa kết quả; chưa có quản trị tài khoản, phạm vi dữ liệu cá nhân chưa chốt. | Cần case role trên CRUD danh mục và quyết định quyền admin. |
| FR-09 | DELETE cây/bệnh có kiểm tra role, FK có ràng buộc | Chưa xác nhận popup theo yêu cầu; chưa có xóa tài khoản. | Cần kiểm tra giao diện và policy xóa; không suy từ endpoint ra popup đạt. |
| NFR-01 | AuthService, controller Authorize/role, owner khi xóa | Một phần: thiếu bảo vệ GET ID/ảnh tài khoản, thiếu tách lượt khách khỏi lịch sử; secret cần kiểm chứng riêng. | VP-API-03, ca A/B và secret scan; chưa chạy lại scanner. |
| NFR-02 | imageFileValidation/DiagnosePage, PredictionService và kho ảnh | Một phần: UI kiểm MIME/15 MiB/decode preview; API chỉ kiểm rỗng/đuôi, chưa có validation nội dung và giới hạn nghiệp vụ 30 MB; chính sách URL ảnh chưa đạt mục tiêu. | VP-API-01, ca ảnh hỏng/quá giới hạn/truy cập ảnh; không coi kiểm tra UI là bảo vệ server. |
| NFR-03 | Chưa có scheduler xóa ảnh 30 ngày trong luồng đối chiếu | Chưa có; không liên quan health endpoint. | Cần policy, scheduler và case thời hạn/retry trước khi nghiệm thu. |
| NFR-04 | Chưa có ngưỡng hiệu năng được duyệt | Chưa chốt; không tự đặt số đo hoặc ngưỡng đạt. | Chốt p95/thời gian mục tiêu, môi trường, số ảnh và tải; sau đó benchmark. |
| NFR-05 | Mã AI và adapter HTTP; báo cáo [AGRI-21](reports/AGRI-21/README.md) | Có bằng chứng đánh giá nội bộ; parity CLI–HTTP–API–web chưa xác nhận. | VP-DATA-01, VP-ML-01, VP-E2E-01. |
| NFR-06 | Prediction entity/migration và DTO | Có thời điểm, user và ảnh; chưa có cột model/dataset version. | Cần quyết định version, migration và đối chiếu response/DB; placeholder web không phải version thật. |

### Điều kiện chốt các mục còn mở

Dùng `confirmed_decisions.md` và AC nguồn để phân biệt yêu cầu đã xác nhận với thông số đề xuất. Chỉ các mục ở phần 6 còn cần quyết định/thiết kế bổ sung; không hỏi lại quyền khách, cách tổng hợp, ngưỡng cảnh báo hoặc các luồng tài khoản đã chốt. Các phần chưa có bằng chứng triển khai/kiểm thử phải giữ trạng thái chưa nghiệm thu. Yêu cầu mới không được đưa vào sơ đồ hiện trạng như chức năng đã hoàn tất.
