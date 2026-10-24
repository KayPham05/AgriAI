# AGRI-128 / AGRI-119 — Kế hoạch tích hợp lịch sử và hồ sơ nông nghiệp

- Ngày khảo sát: 2026-10-21.
- Task: AGRI-119 — Diagnosis History & Agricultural Record Integration.
- Story: AGRI-111; hạng mục S3-06 trong pipeline AGRI-128.
- Nhánh: `AGRI-128-history-integration`.
- Base remote đã fetch: `origin/AGRI-128-backend-improvement`, commit `ad22a8a`.
- Trạng thái cập nhật 2026-10-23: người dùng yêu cầu tiếp tục History sau khi CRUD đã tích hợp; đang kiểm chứng phần A/B trên base mới `a43797d`.
- Phạm vi được duyệt: tiếp tục backend History và tích hợp CRUD sẵn có; không commit/push/PR trong lượt này. AGRI-122 để sau.
- Cập nhật giao việc ngày 2026-10-24: người dùng đã yêu cầu tạo PR riêng cho History,
  cho phép commit/push để gửi review; không viết E2E. Phạm vi code A/B giữ nguyên.

## 1. Mục tiêu và giới hạn

User đã đăng nhập có thể chọn một hồ sơ nông nghiệp thuộc mình khi gửi ảnh.
Kết quả hợp lệ được lưu cùng tài khoản, hồ sơ tùy chọn, thời gian, cây/bệnh,
confidence, snapshot và thông tin ảnh. Có thể đọc lại sau khi tải trang bằng API.
Guest vẫn dùng chẩn đoán mà không tạo lịch sử nghiệp vụ hoặc upload ảnh lâu dài.

Chỉ triển khai backend trong kế hoạch này. Không xây frontend, không viết lại
CRUD hồ sơ S3-03 hoặc bộ lọc S3-07. Không đổi dataset, model, schema/migration,
storage provider hay cơ chế xác thực của task khác. Nếu phát hiện cần đổi schema,
phải trình phương án riêng trước khi thực hiện.

## 2. Hiện trạng đã đối chiếu tại ad22a8a

| Thành phần | Đã có | Khoảng trống của AGRI-119 |
| --- | --- | --- |
| `Prediction` / `AgriculturalProfile` | Entity và `Prediction.AgriculturalProfileId` nullable | Luồng gửi ảnh chưa nhận/gắn profile ID. |
| Migration `OptionalAgriculturalProfiles` | FK SET NULL, trigger cùng owner, cấm chuyển owner và đổi liên kết sang hồ sơ khác trên prediction cũ | Giữ nguyên; kiểm chứng qua luồng API mới. |
| `PredictRequest`, `IPredictionService` | Nhận file và user ID | Thêm profile ID tùy chọn và kiểm tra quyền trước inference/upload. |
| `PredictionService` | Lưu User, Guest không lưu, snapshot JSONB, TTL ảnh 30 ngày, cleanup storage khi DB lỗi | Giữ hành vi có sẵn; bổ sung liên kết và nhánh lỗi liên quan hồ sơ. |
| `GET /api/predictions` | Bộ lọc gồm profile/cây/bệnh/ngày, phân trang, sort `CreatedAt DESC, Id DESC` | Kiểm tra lượt vừa lưu vào đúng nhóm; không viết lại S3-07. |
| `GET /api/predictions/{id}` | Kiểm owner, đọc snapshot, ẩn ảnh hết hạn | Trả thêm profile ID hiện tại nếu hợp đồng được duyệt. |
| CRUD hồ sơ | Chỉ thấy entity/configuration/migration; chưa có repository/service/controller | Phối hợp S3-03, không tự xây cả module. |

Route thực tế của danh sách là `GET /api/predictions`; task log tổng có chỗ ghi
`/api/predictions/history`. Kế hoạch theo controller hiện có, không đổi route.
Nhánh Guest riêng chưa được tích hợp vào base này; không coi kết quả test của
nhánh Guest hoặc task log đồng nghiệp là bằng chứng chạy mới trên nhánh này.

## 3. Phần A — Lịch sử chẩn đoán độc lập, không phụ thuộc CRUD hồ sơ

**Trách nhiệm: AGRI-119. Người dùng đã duyệt triển khai phần A ngày 2026-10-21.**
Không cần chờ API tạo/xem/sửa/xóa hồ sơ của S3-03. Trong phần A, User chẩn đoán
không chọn hồ sơ (`AgriculturalProfileId = null`). Các cơ chế đã có được tái sử
dụng, kiểm chứng và chỉ sửa khi phát hiện thiếu yêu cầu; không xây lại từ đầu.

| Công việc của AGRI-119 | Kết quả cần kiểm chứng |
| --- | --- |
| Lưu kết quả theo tài khoản | Prediction, chi tiết và metadata ảnh được lưu đầy đủ cho đúng User; có thời gian, cây/bệnh và confidence. |
| Xem danh sách/chi tiết lịch sử | Đọc lại bằng request mới, có phân trang; User không đọc được lịch sử người khác. Đây là đọc lịch sử chẩn đoán, không phải CRUD hồ sơ. |
| Snapshot bất biến | Thay đổi danh mục cây/bệnh không làm đổi nội dung lịch sử đã lưu; bản ghi cũ vẫn đọc được. |
| Lưu ảnh và TTL | Lưu URL/public ID thay vì binary trong PostgreSQL; hết 30 ngày thì ẩn ảnh, giữ snapshot và metadata. |
| Lỗi AI/upload/lưu DB | Không tạo dữ liệu dở dang; DB lỗi sau upload thì thử cleanup ảnh, giữ lỗi gốc nếu cleanup cũng lỗi. |
| Bảo vệ luồng Guest | Guest không tạo bản ghi hoặc upload lâu dài; không ảnh hưởng lịch sử User. Phối hợp S3-05 cho ranh giới token, không coi đây là phụ thuộc CRUD hồ sơ. |

**Điều kiện xong phần A:** test các hành vi trên với profile ID null; báo cáo
đúng kết quả trên nhánh này. Hoàn thành A chưa có nghĩa hoàn thành toàn AGRI-119,
vì yêu cầu gắn kết quả vào hồ sơ còn ở phần B.

## 4. Phần B — Tích hợp với CRUD hồ sơ nông nghiệp của S3-03

**Trách nhiệm: S3-03 xây CRUD hồ sơ; AGRI-119 tích hợp kết quả chẩn đoán với hồ sơ.**
Đối tượng CRUD là `AgriculturalProfile` (ví dụ “Vườn cà chua A”), không phải
`Prediction`. AGRI-119 không nhận làm lại module CRUD này.

| CRUD hồ sơ do S3-03 cung cấp | Phần AGRI-119 sử dụng hoặc kiểm chứng |
| --- | --- |
| Create — tạo hồ sơ thuộc User | Dùng ID hồ sơ đã tạo để gắn vào lượt chẩn đoán mới; không tạo hồ sơ tự động khi chẩn đoán. |
| Read — danh sách/chi tiết hồ sơ và repository đọc hồ sơ | Nhận profile ID tùy chọn; kiểm hồ sơ tồn tại và thuộc User trước AI/upload. Không bắt service gọi HTTP vòng lại API của chính backend. |
| Update — sửa tên/mô tả hồ sơ | Kiểm chứng liên kết và snapshot chẩn đoán cũ vẫn nguyên vẹn; không triển khai endpoint sửa hồ sơ. |
| Delete — xóa hồ sơ theo quyền sở hữu | Kiểm chứng FK SET NULL, lịch sử vẫn còn, response trả profile ID null; không triển khai endpoint xóa hồ sơ. |

Các việc AGRI-119 thực hiện ở phần B:

1. Thêm `agriculturalProfileId` tùy chọn vào request/service, kiểm quyền qua
   repository dùng chung đã thống nhất với S3-03, gắn FK khi lưu prediction mới.
2. Trả metadata profile hiện tại trong result/history; kiểm tra bộ lọc profile
   có sẵn của S3-07, không viết lại bộ lọc.
3. Xử lý profile sai/khác owner, Guest gửi profile ID, và hồ sơ bị xóa trong
   lúc inference hoặc lưu DB. Giữ các guard/trigger hiện có.
4. Kiểm thử luồng tạo hồ sơ → chẩn đoán → xem lịch sử → sửa/xóa hồ sơ bằng API
   sau khi S3-03 sẵn sàng; giữ snapshot, TTL và quyền sở hữu.

### Điều kiện bắt đầu và phần có thể chuẩn bị sớm

- Cần xác nhận nhánh/contract của S3-03 để dùng chung repository kiểm tra hồ sơ.
  Nếu S3-03 chưa sẵn sàng, đề xuất thống nhất một phương thức đọc tối thiểu qua
  repository trước; không tạo service CRUD cạnh tranh với đồng nghiệp.
- Có thể lập/triển khai test service và integration với hồ sơ seed trong DB
  Testcontainers riêng sau khi kế hoạch và contract repository được duyệt.
  Đây là chuẩn bị/kiểm chứng phần B, không phải phần A và không cần đợi giao diện CRUD.
- Nghiệm thu đầy đủ tạo/sửa/xóa hồ sơ qua HTTP cần S3-03 tích hợp. Test DB seed
  không được ghi thành bằng chứng API CRUD đã hoạt động.
- S3-04 và S3-05 cùng sửa `PredictionService`/`PredictionsController`; đồng bộ
  nhánh tích hợp theo kế hoạch được duyệt, giữ cả kiểm token Guest và liên kết
  hồ sơ. Không tự cherry-pick nhánh Guest hoặc merge nhánh đồng nghiệp lúc này.
- Nhánh mới có schema mới hơn DB của môi trường Guest đang chạy. Không dùng
  chung DB hoặc tự chạy migration vào môi trường đó. Dùng DB test cô lập;
  môi trường manual riêng phải chốt project Compose, ports, volumes trước.

## 5. Hợp đồng API của hai phần, đề xuất để duyệt

Giữ `POST /api/predictions` multipart, thêm `agriculturalProfileId` dạng GUID
tùy chọn cùng `file`. Không nhận user ID từ client; owner lấy từ claims hợp lệ.
DTO request dùng `record` hoặc thuộc tính `init` theo implementation rules.

| Trường hợp | Hành vi đề xuất |
| --- | --- |
| User không chọn hồ sơ | Giữ 201; lưu theo tài khoản, profile ID null. |
| User chọn hồ sơ thuộc mình | 201; lưu FK cùng owner, trả ID kết quả và Location như hiện tại. |
| Profile ID sai định dạng hoặc GUID rỗng | 400 trước AI/storage. |
| Hồ sơ không tồn tại hoặc thuộc người khác | Đề xuất cùng 404, không lộ thông tin owner, không gọi AI/upload. |
| Guest không token | Giữ 200, không lưu DB/storage. |
| Guest gửi thêm profile ID hợp lệ | Đề xuất bỏ qua trường này, không tra cứu/gắn hồ sơ, giữ quy tắc Guest hiện có. |
| Request có token không hợp lệ | 401 theo phần S3-05 cần tích hợp; không hạ thành Guest. |

Đề xuất thêm `Guid? AgriculturalProfileId { get; init; }` vào response kết quả
và item lịch sử, không thay các trường cũ. Đây là metadata liên kết hiện tại:
khi hồ sơ bị xóa, trả null từ entity, không lấy lại ID cũ trong snapshot.
Snapshot nội dung cây/bệnh/confidence/khuyến nghị vẫn bất biến. Không đưa tên
hồ sơ đang thay đổi vào snapshot như một bản sao mặc định chưa được thống nhất.

Admin không tự có quyền dùng hồ sơ hoặc đọc lịch sử của người khác trên các
endpoint cá nhân; giữ chính sách owner hiện có, không mở rộng quyền trong task này.
Chuẩn hóa toàn bộ response lỗi là công việc riêng; chỉ dùng hợp đồng lỗi thống
nhất với S3-03 cho các lỗi mới, không nhân dịp này đổi global middleware.

## 6. Trình tự triển khai sau khi duyệt

### Đợt A — Có thể bắt đầu mà không chờ CRUD hồ sơ

1. Chạy baseline trên nhánh mới, ghi lỗi có sẵn nếu có; không tự sửa task ngoài phạm vi.
2. Đối chiếu phần A với source/test hiện có. Bổ sung test cho các khoảng trống
   thực tế; nếu cần sửa hành vi thì tái hiện test đỏ trước khi sửa tối thiểu.
3. Kiểm chứng lưu/đọc lịch sử theo User, snapshot, TTL, Guest và các lỗi không
   liên quan hồ sơ. Chạy kiểm tra phù hợp, cập nhật bằng chứng riêng cho phần A.
4. Dừng ở phạm vi A nếu contract S3-03 hoặc phần B chưa được duyệt; không tự thêm
   repository/service CRUD để giải quyết phụ thuộc.

### Đợt B — Sau khi chốt contract với S3-03

1. Chốt contract repository và các đề xuất HTTP/Guest ở mục 5.
2. Viết test đỏ cho profile tùy chọn, owner, hồ sơ không tồn tại và không gọi
   AI/storage khi profile sai. Mở rộng DTO/interface/call sites với cancellation
   token đặt cuối, giữ tương thích các lời gọi hiện tại một cách tường minh.
3. Kiểm tra quyền qua repository trước AI/upload, gắn FK khi tạo Prediction;
   giữ một lần SaveChanges cho prediction/details/images và snapshot.
4. Bổ sung metadata profile trên result/history; kiểm chứng đọc lại snapshot,
   phân trang và filter hiện có; xử lý bản ghi cũ/snapshot thiếu trường mới.
5. Kiểm chứng lỗi storage/DB và race hồ sơ bị xóa giữa bước kiểm tra và lưu.
   FK/trigger là lớp bảo vệ cuối; không tắt trigger. Khi lưu thất bại, không
   trả 201, không có bản ghi dở dang; cleanup ảnh đã upload bằng cơ chế sẵn có.
   Nếu cleanup cũng lỗi, giữ lỗi gốc và ghi nhận orphan cần xử lý; không cam kết
   transaction nguyên tử giữa Cloudinary và PostgreSQL hoặc tự thêm scheduler.
   Chỉ map lỗi DB liên quan chính xác tới profile, không biến mọi lỗi DB thành 404.
6. Kiểm chứng cập nhật tên/mô tả hồ sơ không đổi snapshot; xóa hồ sơ chỉ SET NULL,
   giữ lịch sử và ảnh theo TTL. Không thêm API đổi hồ sơ cho prediction cũ vì
   trigger hiện hành cấm hành vi này.
7. Chạy unit/integration liên quan, toàn suite backend theo CI, gộp coverage,
   cập nhật report/log. Chỉ chuẩn bị commit/push/PR khi người dùng yêu cầu tiếp.

## 7. Ma trận kiểm thử dự kiến theo hai phần

| Nhóm | Phần A — Không dùng hồ sơ | Phần B — Tích hợp hồ sơ |
| --- | --- | --- |
| Lưu thành công | Đúng User; đủ thời gian, label, confidence và metadata ảnh; profile ID null. | Đúng User và hồ sơ được chọn; lưu FK, trả metadata profile. |
| Quyền | Guest history 401; User không xem lịch sử người khác; Admin endpoint cá nhân vẫn theo owner. | Hồ sơ không tồn tại/khác owner bị chặn trước AI/storage. |
| Guest | Không insert ba bảng, không gọi storage; không thay lịch sử User. | Gửi thêm profile ID vẫn không tra cứu/gắn hồ sơ hoặc lưu lịch sử. |
| Đọc lại | Request/DbContext mới vẫn đọc được list/detail; pagination/sort không hồi quy. | Filter profile không vượt owner; metadata phản ánh liên kết hiện tại. |
| Snapshot/TTL | Sửa danh mục vẫn giữ nội dung cũ; hết hạn chỉ ẩn ảnh; đọc được bản ghi cũ. | Đổi tên/mô tả hồ sơ không sửa snapshot. |
| Xóa hồ sơ | Không thuộc phần A. | SET NULL giữ history; trigger chống chuyển owner/đổi liên kết vẫn hoạt động. |
| Lỗi | AI/upload/SaveChanges/cleanup lỗi, cancellation không tạo dữ liệu dở dang. | Hồ sơ bị xóa trong lúc inference/lưu không tạo bản ghi sai FK hoặc che mất lỗi gốc. |

Unit dùng test doubles; integration dùng PostgreSQL Testcontainers. Fake AI và
storage chỉ chứng minh contract/side effects, không chứng minh model accuracy
hoặc Cloudinary live. Kiểm thử real checkpoint/Cloudinary chỉ thực hiện riêng
khi được yêu cầu và có môi trường phù hợp.

## 8. Verification và tiêu chí hoàn tất

Sau khi được duyệt triển khai, chạy từ worktree mới:

```powershell
dotnet restore backend/AgriVision.sln
dotnet build backend/AgriVision.sln --no-restore
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=unit.trx' --results-directory .cache/coverage/backend/unit
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=integration.trx' --results-directory .cache/coverage/backend/integration
```

Gộp coverage theo `.github/workflows/ci.yml`, chạy TRX checker và coverage checker.
CI base hiện yêu cầu backend branch coverage >=60%, target 80%; không hạ gate
hoặc đổi exclusions. Không tái sử dụng con số 90 test/62.64% từ nhánh Guest.
CI GitHub chỉ được xác nhận sau run thực tế trên commit được gửi lên.

DoD task chưa hoàn tất. Cần các AC trong ảnh Jira được ánh xạ đủ tới test,
baseline và kết quả mới, report/log cập nhật, người dùng duyệt triển khai và
nghiệm thu; PR/reviewer/CI là bước sau được yêu cầu riêng. Reviewer domain theo
rules là Tran Trung Thong, chưa xác minh GitHub login, không tự gán tài khoản.

## 9. File dự kiến bị ảnh hưởng

Phần A ưu tiên test và các sửa tối thiểu nếu có bằng chứng lỗi trong service/
repository hiện hữu; không mở rộng contract hồ sơ. Danh sách dưới đây chủ yếu
là phạm vi phần B, không phải tất cả đều cần sửa trong đợt A:

- `backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs`.
- `backend/src/AgriVision.Application/Services/Interfaces/IPredictionService.cs`.
- `backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs`.
- `backend/src/AgriVision.API/Controllers/PredictionsController.cs`.
- Contract/implementation repository hồ sơ và đăng ký DI: tùy phần S3-03 được thống nhất.
- Tests của PredictionService/PredictionsController và persistence khi cần bổ sung,
  tái sử dụng test snapshot/TTL/ownership có sẵn.
- Report/task log AGRI-128 liên kết task thật AGRI-119. Không dự kiến migration mới.

## 10. Theo dõi thực hiện phần A

- Baseline mới: 57 unit + 83 integration đạt; coverage gộp 283/476 = 59.45%,
  dưới gate 60% ngay trước sửa. Không lấy kết quả nhánh Guest làm baseline.
- Tái hiện và sửa lỗi lịch sử legacy chưa có snapshot trả top-k không theo Rank.
  Chỉ thêm sắp xếp khi map result; snapshot đã lưu không bị viết lại.
- Bổ sung 7 ca unit và 9 ca integration; tập trung lịch sử không gắn hồ sơ,
  đọc lại, phân trang/ownership, snapshot/TTL và lỗi lưu trữ/rollback.
- Theo dõi lệnh, kết quả và giới hạn tại [báo cáo phần A](../reports/AGRI-128/history_part_a.md).
- Full verification: 64 unit + 92 integration đạt, 0 fail/skip trong phạm vi CI
  thường; merged branch coverage 289/476 = 60.71%, gate 60% PASS, target 80% chưa đạt.
- Không triển khai request/response profile ID, repository CRUD hoặc migration phần B.

## 11. Tiếp tục phần B ngày 2026-10-23

- Fast-forward nhánh History từ `ad22a8a` lên `a43797d`. Phần A được giữ bằng
  stash dự phòng và khôi phục; kết hợp test hai phía, cập nhật lời gọi cancellation
  token theo chữ ký service mới. Không thay công việc ở worktree gốc.
- Base mới đã có CRUD S3-03, repository hồ sơ, request/profile FK, metadata trên
  result/history, kiểm ownership trước AI và override profile ID từ entity khi
  đọc snapshot. Tái sử dụng các chức năng này, không viết lại.
- Kiểm chứng bổ sung: đổi tên/mô tả hồ sơ giữ snapshot; filter không vượt owner;
  xóa hồ sơ trả profile null dù snapshot vẫn chứa ID ban đầu; hồ sơ bị xóa trong
  upload không tạo history dở dang và vẫn thử cleanup khi storage báo lỗi.
- Tái hiện khoảng trống GUID rỗng và sửa tối thiểu nếu test xác nhận: 400 cho
  đầu vào không hợp lệ; GUID hợp lệ không tồn tại/khác owner giữ 404.
- Khác biệt cần người dùng chốt: đề xuất Guest bỏ qua profile ở mục 5 là lịch sử;
  base mới chủ động trả 401 khi Guest chọn profile. Đã hỏi người dùng; giữ nguyên
  code base trong lúc chờ, chưa coi đây là quyết định được nghiệm thu.
- Trường hợp profile bị xóa sau kiểm ownership: giữ DB trigger/FK và cơ chế rollback/
  cleanup; ghi nhận response hiện tại. Không sửa global error mapping hoặc schema.
- Bằng chứng mới được ghi riêng tại [báo cáo phần B](../reports/AGRI-128/history_part_b.md),
  không dùng số test ngày 2026-10-21 làm kết quả mới.

### Kết quả ngày 2026-10-24

- Lỗi GUID rỗng được tái hiện 404 và sửa thành 400. Focused History 16/16 đạt.
- Full suite: 98 unit + 156 integration đạt, 0 fail/skip; build 0 warning/error.
- Coverage gộp 369/554 = 66.61%, gate 60% PASS; mục tiêu 80% chưa đạt.
- Các yêu cầu A/B đã kiểm chứng tự động trên CRUD mới, gồm snapshot, ownership,
  filter, profile SET NULL và rollback/cleanup khi xóa hồ sơ trong upload.
- Chờ manual acceptance và quyết định Guest chọn hồ sơ; hiện giữ 401 của base.
  Chưa commit/push/PR; chưa xác nhận GitHub CI hoặc task Done.
