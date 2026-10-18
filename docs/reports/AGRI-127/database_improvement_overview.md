# AGRI-127 — Tổng quan công việc Database Improvement

- Ngày lập: 2026-10-17.
- Nhánh đã kiểm tra: `AGRI-127-database-improvement`.
- Trạng thái: hoàn tất phạm vi DB/migration/kiểm thử đã chốt qua phỏng vấn; UI/API mới ghi việc tiếp theo. Kết quả kiểm tra và áp dụng local xem [báo cáo triển khai](database_improvement_implementation.md) và task log. Không đổi trạng thái Jira.
- Task chính: [AGRI-127](https://phamtan.atlassian.net/browse/AGRI-127).

## 1. Mục tiêu và ranh giới

Yêu cầu của AGRI-127:

> Đọc các scope trong các subtask từ US-01 → US-10.
> Tổng hợp các tính năng sau đó đem so sánh với database hiện tại.
> Nếu database hiện tại cần bổ sung thêm gì thì bổ sung.

**US-01 → US-10 và các subtask là nguồn yêu cầu để làm AGRI-127.** Nhánh này không nhận triển khai toàn bộ giao diện, API và AI của 10 US. Chỉ bổ sung hoặc điều chỉnh phần dữ liệu có căn cứ từ đối chiếu; sửa code liên quan nếu cần để schema mới hoạt động và giữ tương thích. Chỗ thiếu ở UI/API nhưng schema đã đủ phải được ghi nhận riêng, không tự động trở thành việc cần làm của AGRI-127.

Các ràng buộc nghiệp vụ ở mục 1.1 là đầu vào đã chốt. Sau phỏng vấn, đã bổ sung source và migration DB; [báo cáo triển khai](database_improvement_implementation.md) ghi schema cụ thể, quyết định phỏng vấn, giới hạn và các bước UI/API cần làm sau. Không triển khai UI/API mới.

### 1.1. Ràng buộc đã chốt áp dụng cho AGRI-127

Nguồn: `docs/confirmed_decisions.md` (tài liệu quyết định cục bộ đã đọc ngày 2026-10-17) và chỉ dẫn trực tiếp của người dùng trong phiên ngày 2026-10-17 về hồ sơ tùy chọn. Mục này điều chỉnh cách áp dụng scope Jira; bảng mục 2 giữ nguồn truy vết, không thay thế các ràng buộc dưới đây.

**Hồ sơ nông nghiệp tùy chọn:**

- Sau đăng nhập, app mời người dùng tạo hồ sơ để nhóm các lần chẩn đoán riêng, tương tự project trong ứng dụng LLM. Người dùng có thể bỏ qua.
- Mỗi hồ sơ có tên bắt buộc và mô tả tùy chọn; cây/bệnh lấy từ từng kết quả. Khi đăng nhập, lượt dự đoán thành công vẫn tự động lưu thuộc tài khoản dù chưa tạo/chọn hồ sơ. Nếu người dùng chọn hồ sơ của mình trước khi chẩn đoán, kết quả mới tự lưu vào hồ sơ đó.
- Kết quả đã lưu không chuyển hồ sơ hoặc gắn lại sau khi gỡ. Gỡ kết quả khỏi hồ sơ hoặc xóa hồ sơ chỉ bỏ liên kết, vẫn giữ lịch sử tài khoản và snapshot; ảnh vẫn theo chính sách hết hạn 30 ngày.
- Hệ quả cho thiết kế: liên kết lịch sử → hồ sơ phải tùy chọn, kiểm tra cùng chủ sở hữu khi có liên kết. Lịch sử cũ được giữ nguyên và có thể chưa thuộc hồ sơ; không cần tạo hồ sơ mặc định để ép gắn dữ liệu.
- Hồ sơ chỉ có tên và mô tả theo quyết định phỏng vấn; không yêu cầu trường cây/thông tin canh tác từ mô tả Jira cũ. Cây/tình trạng lấy từ từng kết quả AI, không bắt chọn cây trước dự đoán.
- Guest không tạo/chọn hồ sơ, không lưu lịch sử nghiệp vụ và không lưu ảnh lâu dài; giữ nguyên luồng Guest đã chốt. Việc hiển thị lời mời tạo hồ sơ thuộc UI, AGRI-127 chỉ chuẩn bị dữ liệu hỗ trợ.

**Tài khoản, kết quả và lưu trữ:**

- Hỗ trợ email/mật khẩu và Google, xác minh email khi đăng ký, quên/đặt lại mật khẩu. Đối chiếu và dùng lại `user_identities`, `user_action_tokens`; chưa có căn cứ bắt buộc thêm username riêng. Cách liên kết Google/email vẫn chưa chốt.
- Tự nhận diện cây/tình trạng; nhận một hoặc nhiều ảnh JPG/JPEG/PNG, tổng dung lượng cả lượt dưới 30 MB. Nhiều ảnh chỉ có kết quả chung khi tất cả cùng cặp nhãn cây/tình trạng; confidence chung là trung bình cộng confidence từng ảnh. Khác nhãn thì từ chối kết quả chung; ảnh không phải lá hoặc ngoài nhóm cây hỗ trợ phải bị từ chối.
- Schema cần hỗ trợ một lượt nhiều ảnh, thứ tự ảnh, confidence từng ảnh và kết quả chung; tái sử dụng `prediction_images` trước khi thêm cấu trúc mới. Không coi yêu cầu này là quyền mở rộng sang detection/segmentation/mức độ nặng; giữ dataset v1.4, mapping nhãn và metric semantics hiện tại.
- Confidence ≤80% (gồm đúng 80%): vẫn hiện dự đoán, có cảnh báo, không thuốc. Confidence >80%: không cảnh báo độ tin cậy thấp; chỉ hiện thuốc cho tình trạng có bệnh và nội dung đã duyệt. Khỏe mạnh/thiếu dinh dưỡng chỉ có hướng chăm sóc. Nội dung chưa duyệt hiển thị “Thông tin đang được cập nhật”; phần thuốc vẫn phải tuân thủ điều kiện cho phép.
- Lịch sử lưu toàn bộ ảnh, thời gian và snapshot đầy đủ kết quả đã hiển thị, gồm cảnh báo/trạng thái chưa cập nhật. Người dùng được xem và xóa bản ghi của mình. Ảnh gốc hết hạn sau 30 ngày; giữ lịch sử và snapshot, không trả URL ảnh gốc hết hạn. Không tạo snapshot giả cho dữ liệu cũ thiếu bản gốc.
- Việc kiểm tra file, tổng hợp AI và hiển thị thuộc các luồng tính năng liên quan; AGRI-127 đánh giá dữ liệu/ràng buộc cần hỗ trợ, không tự nhận hoàn thiện các luồng này.

**Nguồn Jira bổ sung và mức ưu tiên:**

- Quản trị tài khoản, audit, danh mục tài liệu/thuốc có nguồn từ US-08/09. Tiếp tục đối chiếu cho AGRI-127 nhưng không gọi đây là nội dung đã có trong confirmed decisions; thiết kế tối thiểu phải giữ các quy tắc dữ liệu đã duyệt ở trên.
- US-10 là stretch goal đối với API khuyến nghị. Dữ liệu mô tả/hướng xử lý/gợi ý thuốc trong kết quả đã được chốt vẫn phải được hỗ trợ, kể cả khi chưa triển khai API stretch.
- Quyết định còn mở được quản lý tại [remaining_work.md](../../notes/remaining_work.md#3-quyết-định-còn-mở-cho-contract-apiui-và-vận-hành); không tự nâng giá trị đề xuất thành quyết định đã chốt.

## 2. Nguồn yêu cầu đã đọc trực tiếp trên Jira

Đã đọc Description, Scope of Work và Acceptance Criteria của 10 US và 10 subtask ngày 2026-10-17. Mỗi US hiển thị một subtask tại thời điểm đọc. Đây là bản tổng hợp yêu cầu phục vụ AGRI-127, không phải bản sao User Story draft hay ghi chú phỏng vấn.

| US | Story | Subtask đã đọc | Nội dung dùng để đối chiếu database |
|---|---|---|---|
| US-01 | [AGRI-104](https://phamtan.atlassian.net/browse/AGRI-104) | [AGRI-105 — User Authentication & Authorization](https://phamtan.atlassian.net/browse/AGRI-105) | Tài khoản, chống trùng email/tên tài khoản theo quy tắc hệ thống, password hash, vai trò User/Guest/Admin, phiên đăng nhập và đăng xuất có hiệu lực với API được bảo vệ. |
| US-02 | [AGRI-106](https://phamtan.atlassian.net/browse/AGRI-106) | [AGRI-107 — Profile & Password](https://phamtan.atlassian.net/browse/AGRI-107) | Thông tin cá nhân được phép chỉnh sửa, mật khẩu hash và quyền sở hữu tài khoản. |
| US-03 | [AGRI-108](https://phamtan.atlassian.net/browse/AGRI-108) | [AGRI-116 — Agricultural Profile CRUD & Ownership Management](https://phamtan.atlassian.net/browse/AGRI-116) | Hồ sơ nông nghiệp có tên, cây, mô tả, thông tin canh tác, chủ sở hữu; liên kết lịch sử và quy tắc cập nhật/xóa. |
| US-04 | [AGRI-109](https://phamtan.atlassian.net/browse/AGRI-109) | [AGRI-117 — AI Plant Disease Diagnosis Workflow Integration](https://phamtan.atlassian.net/browse/AGRI-117) | Cây/lớp bệnh/confidence khớp response AI; dùng mapping lớp chuẩn hiện có. Upload, xử lý lỗi và preprocessing là yêu cầu tích hợp, không mặc định cần bảng mới. |
| US-05 | [AGRI-110](https://phamtan.atlassian.net/browse/AGRI-110) | [AGRI-118 — Guest Plant Disease Diagnosis](https://phamtan.atlassian.net/browse/AGRI-118) | Guest không tạo lịch sử nghiệp vụ, không gắn hồ sơ; không lưu ảnh lâu dài khi chưa có chính sách duyệt. Rate limit là yêu cầu dịch vụ, không mặc định cần lưu trong PostgreSQL. |
| US-06 | [AGRI-111](https://phamtan.atlassian.net/browse/AGRI-111) | [AGRI-119 — Diagnosis History & Agricultural Record Integration](https://phamtan.atlassian.net/browse/AGRI-119) | Lịch sử đúng tài khoản/hồ sơ, thời gian/cây/bệnh/confidence/đường dẫn ảnh; cloud storage, không binary PostgreSQL; tránh bản ghi thiếu dữ liệu khi lưu lỗi. |
| US-07 | [AGRI-112](https://phamtan.atlassian.net/browse/AGRI-112) | [AGRI-120 — Smart Diagnosis History Filtering & Search](https://phamtan.atlassian.net/browse/AGRI-120) | Lọc đồng thời hồ sơ/cây/bệnh/khoảng ngày, gồm cả ngày đầu và cuối; sắp xếp/phân trang tại backend/database, giới hạn theo quyền sở hữu. |
| US-08 | [AGRI-113](https://phamtan.atlassian.net/browse/AGRI-113) | [AGRI-121 — Admin Account & Role Management](https://phamtan.atlassian.net/browse/AGRI-121) | Tìm kiếm tài khoản, vai trò, trạng thái kích hoạt/vô hiệu hóa và log thao tác quản trị nhạy cảm. Không lộ dữ liệu xác thực. |
| US-09 | [AGRI-114](https://phamtan.atlassian.net/browse/AGRI-114) | [AGRI-122 — Agricultural Knowledge Base & Medicine Management](https://phamtan.atlassian.net/browse/AGRI-122) | Cây/bệnh/tài liệu/thuốc và quan hệ; nguồn, ngày cập nhật, trạng thái công khai/phê duyệt. Thuốc có tên sản phẩm, hoạt chất, đối tượng sử dụng, nguồn, cảnh báo và trạng thái hiệu lực; không mặc định là khuyến nghị phù hợp. |
| US-10 | [AGRI-115](https://phamtan.atlassian.net/browse/AGRI-115) | [AGRI-126 — Farming Recommendation API](https://phamtan.atlassian.net/browse/AGRI-126) | Tra cứu kiến thức đã duyệt theo mã chẩn đoán hoặc cặp cây/bệnh, có nguồn cho mỗi mục; trả trạng thái thiếu dữ liệu khi cần. Story ghi **stretch goal**; không mặc định thêm bảng khuyến nghị hoặc triển khai API trong AGRI-127. |

## 3. Baseline database trước triển khai AGRI-127

Nguồn chính: [AppDbContext](../../../backend/src/AgriVision.Infrastructure/Persistence/AppDbContext.cs), [entities](../../../backend/src/AgriVision.Domain/Entities/), [configurations](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/) và [snapshot](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs).

Baseline trước thay đổi có 9 bảng nghiệp vụ: `users`, `plants`, `diseases`, `plant_diseases`, `predictions`, `prediction_details`, `prediction_images`, `user_identities`, `user_action_tokens`. `__EFMigrationsHistory` là bảng kỹ thuật. SQL/ERD baseline 6 bảng không phải nguồn đầy đủ cho database ứng dụng.

Baseline có `InitialCreate`, `ConfirmedRequirementsSchema`, `DatasetV14Catalog`; xem [thư mục migration](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/). Ba migration này được giữ nguyên. Source mới thêm `DatabaseImprovement`, `OptionalAgriculturalProfiles`, nâng tổng số bảng nghiệp vụ lên 16 và giữ mapping dataset v1.4.

Lần lập tài liệu ban đầu chỉ đọc source. Sau phỏng vấn đã kiểm tra PostgreSQL local: baseline đúng 3 migration/9 bảng nghiệp vụ, 59 lớp active; chưa có user/prediction/ảnh. Bằng chứng kiểm tra mới và kết quả sau migration nằm trong task log; kết quả AGRI-79 vẫn chỉ là bằng chứng lịch sử.

## 4. Ma trận đối chiếu baseline và định hướng thay đổi

Giữ ma trận khảo sát ban đầu để truy vết khoảng thiếu; đây không phải trạng thái source sau triển khai. Quyết định cuối cùng và ma trận dữ liệu đã xử lý nằm trong [báo cáo triển khai](database_improvement_implementation.md). “Có một phần” không xác nhận toàn bộ AC đã chạy đúng.

| Nhóm | Bằng chứng trong source | Đánh giá sơ bộ | Việc thuộc AGRI-127 |
|---|---|---|---|
| Tài khoản và phiên — US-01/02 + quyết định đã chốt | `User` có full name, email, password hash, role; email có unique index. Có `UserIdentity`, `UserActionToken` cho Google và email/reset. | Có dữ liệu nền; chưa chứng minh endpoint Google/verify/reset hoặc thu hồi phiên đã hoàn thiện. Username riêng không phải yêu cầu bắt buộc đã chốt. | Đối chiếu các bảng hiện có với email/mật khẩu, Google, xác minh/reset; rà soát logout/thu hồi phiên trước khi thêm dữ liệu. Không dùng action token thay cho phiên; không mở rộng trường cá nhân thiếu căn cứ. |
| Hồ sơ nông nghiệp — US-03 + quyết định 2026-10-17 | `Plant` là danh mục cây; `Prediction` chưa có khóa hồ sơ. | Thiếu mô hình nhóm lịch sử tùy chọn và quan hệ trong schema nguồn. | Thiết kế hồ sơ thuộc user, liên kết lịch sử → hồ sơ nullable và kiểm tra cùng chủ sở hữu. Có thể bỏ qua tạo/chọn hồ sơ; vẫn tự động lưu vào tài khoản. Giữ lịch sử cũ chưa gắn hồ sơ; chốt chính sách xóa. Không ép chọn cây trước. |
| Kết quả và ảnh — US-04/06 + quyết định đã chốt | `Prediction` có user, lớp chính, confidence, thời gian, đường dẫn/public ID, JSONB snapshot; có top-K và metadata ảnh. | Có phần lớn dữ liệu kết quả; thiếu liên kết hồ sơ tùy chọn. Có cấu trúc nhiều ảnh không chứng minh workflow nhiều ảnh đã chạy. | Tái sử dụng bảng; đối chiếu confidence từng ảnh/kết quả chung, snapshot cảnh báo/ngưỡng 80%/nội dung duyệt, lưu tự động kể cả không có hồ sơ. Giữ lịch sử/snapshot sau 30 ngày, không trả URL ảnh hết hạn. Kiểm tra DB/cloud lỗi; không nhận thêm triển khai AI nhiều ảnh trong task database. |
| Guest — US-05 | `PredictionService.PredictAsync` chỉ upload và gọi repository lưu khi có `userId`; `Prediction.UserId` nullable. | Source đã có nhánh Guest không lưu. Nullable không chứng minh có lịch sử Guest. | Giữ hành vi không lưu và kiểm thử hồi quy. Không tạo tài khoản Guest hoặc bảng lịch sử Guest chỉ để đáp ứng US này. |
| Lọc lịch sử — US-07 | `PredictionRepository.GetByUserIdAsync` lọc user, sort thời gian giảm dần, Skip/Take; chưa có bộ lọc hồ sơ/cây/bệnh/khoảng ngày tại phương thức này. Có index user và thời gian. | Có nền tảng; thiếu hồ sơ và truy vấn kết hợp. | Rà soát đường truy vấn, FK và index sau khi chốt schema. Chỉ thêm index có lý do; ghi phần API chưa đủ riêng. Không thêm bảng chỉ vì thiếu bộ lọc. |
| Quản trị — US-08 | `User.Role` có sẵn, `User` chưa có trạng thái hoạt động; không có entity audit trong DbContext. | Thiếu trạng thái tài khoản; nơi lưu audit cần xác minh thêm. | Thiết kế trạng thái tài khoản; xác định nơi lưu audit và dữ liệu cần tra soát. Chỉ thêm bảng audit nếu giải pháp log hiện tại không đáp ứng; không ghi mật khẩu/token. |
| Kho tri thức — US-09 | Có cây/bệnh/mapping; `Disease` có treatment, prevention, medication dạng chuỗi, content approval, active, updated time. | Có một phần; chưa có cấu trúc tài liệu/thuốc và quan hệ đầy đủ. | Thiết kế tài liệu, thuốc, nguồn, quan hệ cây/bệnh, phê duyệt/công khai và trường thuốc bắt buộc. Không coi chuỗi `Medication` là đã đủ thông tin thuốc theo AC. |
| Khuyến nghị — US-10 + quyết định đã chốt | Có treatment/prevention và approval theo bệnh; chưa có cấu trúc nguồn cho từng mục trong các entity đã đọc. | API riêng là stretch goal; dữ liệu hướng xử lý/thuốc trong kết quả là yêu cầu đã chốt. | Dùng lại cấu trúc US-09 khi phù hợp, bảo đảm nguồn/duyệt và điều kiện thuốc ở mục 1.1. Không yêu cầu hoàn thành API khuyến nghị để đóng AGRI-127; vẫn đối chiếu dữ liệu nội dung kết quả và snapshot. |

Nguồn bổ sung: [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), [PredictionRepository](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/PredictionRepository.cs), [UserConfiguration](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/UserConfiguration.cs), [PredictionConfiguration](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/PredictionConfiguration.cs), [DiseaseConfiguration](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/DiseaseConfiguration.cs).

## 5. Quyết định sau phỏng vấn và các chi tiết để lại cho UI/API

Đã chốt: hồ sơ tên/mô tả, FK nullable, cùng chủ sở hữu, chỉ gắn khi lưu lần đầu; xóa/gỡ hồ sơ vẫn giữ lịch sử; không chuyển/gắn lại. Phiên lưu riêng, vô hiệu hóa/đổi role thu hồi toàn bộ, logout thu hồi phiên hiện tại. Tri thức/thuốc có quan hệ nhiều cặp cây–bệnh, nguồn/ngày cập nhật, mặc định chưa duyệt và phải duyệt lại khi chỉnh nội dung. Xem bảng quyết định trong báo cáo triển khai.

Danh sách UI/API, quyết định còn mở và xác minh bàn giao nằm tại [remaining_work.md](../../notes/remaining_work.md). Các điểm này không yêu cầu thêm cột DB suy đoán trong AGRI-127 và không được trình bày như đã chốt.

## 6. Checklist triển khai AGRI-127

- [x] Kiểm tra nhánh và trạng thái Git trước khi chỉnh tài liệu.
- [x] Đọc US-01 → US-10 và các subtask, tổng hợp yêu cầu dữ liệu.
- [x] Đọc entity/configuration/snapshot và lập đối chiếu sơ bộ.
- [x] Đối chiếu confirmed decisions và áp dụng chỉ dẫn 2026-10-17: hồ sơ tùy chọn, giữ tự động lưu và luồng Guest.
- [x] Kiểm tra schema PostgreSQL thực tế và migration history; ghi bằng chứng mới, không lộ connection string.
- [x] Hoàn tất ma trận: yêu cầu → dữ liệu hiện có → thiếu gì → thay đổi cần thiết hoặc không cần đổi DB, kèm lý do.
- [x] Chốt các quyết định cần cho DB và phương án bảo toàn dữ liệu cũ; chi tiết UI/API ghi riêng.
- [x] Thiết kế bảng/cột/FK/index/CHECK/nullability tối thiểu; ERD phần mở rộng trong báo cáo triển khai.
- [x] Bổ sung entity/configuration/migration mới và cập nhật fixture schema cũ bị ảnh hưởng. Không sửa migration lịch sử.
- [x] Kiểm tra migration từ schema cũ có dữ liệu, DB mới và chạy lại không phát sinh thay đổi ngoài ý muốn.
- [x] Kiểm thử liên kết hồ sơ tùy chọn/cùng chủ sở hữu, lưu khi có/không có hồ sơ, lịch sử cũ, Guest không lưu, trạng thái tài khoản và quan hệ tri thức bị ảnh hưởng.
- [x] Chạy bộ backend hiện có về snapshot/confidence/ảnh hết hạn và 11 trường hợp kiểm thử DB mới; ghi rõ workflow nhiều ảnh/inference thật và UI/API còn ngoài phạm vi.
- [x] Cập nhật báo cáo và task log bằng lệnh/kết quả thực tế, giới hạn và phần còn lại.

Thứ tự triển khai đã thực hiện: xác minh baseline → chốt quy tắc → schema → migration/kiểm thử → bàn giao. Checklist trên là phạm vi DB đã hoàn tất; các hạng mục chưa làm chỉ theo dõi tại remaining_work.md.

## 7. Kiểm tra và điều kiện hoàn tất

Khi có thay đổi code, dùng [hướng dẫn backend](../../../.agents/commands/backend.md) và [database](../../../.agents/commands/database.md). Integration test cần Docker/PostgreSQL. Migration chạy riêng bằng `--migrate`; HTTP startup chỉ kiểm tra schema. Bảo toàn volume và dữ liệu, không dùng reset/drop để vượt lỗi migration.

AGRI-127 chỉ hoàn tất khi có đối chiếu đủ 10 nguồn yêu cầu, các thiếu sót dữ liệu cần thiết đã xử lý hoặc được ghi rõ quyết định loại khỏi phạm vi, migration/kiểm tra phù hợp có bằng chứng, ERD và tài liệu khớp source. Việc đã có UI, test dùng AI/storage fake hoặc health check không chứng minh tích hợp AI thật hay toàn bộ US đã hoàn tất.

**Bằng chứng theo giai đoạn:** lần lập tài liệu đầu chỉ kiểm tra Markdown; lần thực thi sau phỏng vấn đã chạy kiểm thử backend/PostgreSQL và build image. Kết quả cuối và áp dụng migration local được ghi riêng trong task log. Không dùng kết quả test của lần merge trước làm bằng chứng mới.
