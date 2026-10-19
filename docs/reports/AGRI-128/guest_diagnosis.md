# AGRI-128 / AGRI-118 — Backend Guest Plant Disease Diagnosis

- Ngày thực hiện: 2026-10-19.
- Task: AGRI-118, thuộc story AGRI-110; tương ứng S3-05 trong AGRI-128.
- Nhánh: `AGRI-128-guest-diagnosis`.
- Base/đích PR: `AGRI-128-backend-improvement`, base khảo sát `0fa664a`.
- Trạng thái: backend đã kiểm chứng local; chưa xác nhận GitHub CI/reviewer.

## 1. Phạm vi và quyết định

Người dùng xác nhận chỉ làm backend, frontend sẽ giao sau. Guest được chẩn đoán
như User đã đăng ký, dùng cùng pipeline AI/catalog và cùng quy tắc nội dung.
Guest không được lưu lịch sử/ảnh hoặc truy cập API dữ liệu cá nhân. Không thêm
quota riêng cho Guest. Giới hạn upload và chống quá tải chung cần phối hợp với
S3-04; không tự chọn ngưỡng thay cho nhóm.

Giữ nguyên schema/migration, model ConvNeXt-Tiny, dataset v1.4, nhãn, confidence
và các ngưỡng coverage. Source tại base chưa có entity/API hồ sơ nông nghiệp;
không triển khai phần đó hoặc ghi test cho một route chưa tồn tại.

## 2. Hợp đồng HTTP cho frontend sau này

Endpoint dùng chung: `POST /api/predictions`, multipart field `file`.

| Request | Kết quả |
| --- | --- |
| Không có `Authorization`, ảnh và AI hợp lệ | 200 với `PredictionResultDto`, không lưu DB/storage. |
| Token hợp lệ và user ID hợp lệ | Giữ 201 và luồng lưu lịch sử của User. |
| Có `Authorization` nhưng không xác thực được | 401, không gọi AI/storage hoặc tạo prediction. |
| Token được xác thực nhưng thiếu/sai định dạng user ID | 401, không hạ thành Guest. |
| File thiếu/rỗng hoặc đuôi không hỗ trợ | 400 theo pipeline hiện có. |
| AI không khả dụng / phản hồi AI không hợp lệ | Giữ mã lỗi adapter 503 / 502. |
| AI trả mapping không khớp catalog | Giữ 400 hiện tại, không lưu dữ liệu. |

Response Guest giữ đầy đủ `predictedPlantDisease`, `confidence`,
`predictionDetails`, `warning`, `informationPending`, `medication`, `createdAt`.
`id` là ID kết quả tạm, **không phải bản ghi lịch sử có thể đọc lại**.
`imagePath` rỗng, `imagePublicId` null, `images` rỗng và
`hasHistoricalSnapshot` false. Không có header `Location` trỏ tới lịch sử.
Frontend cần dùng ảnh preview tại máy và không coi `imagePath` rỗng là lỗi.

Các API history list/detail/delete, `/api/auth/me` và thao tác Admin hiện có vẫn
yêu cầu xác thực. Gửi `userId` hay `agriculturalProfileId` trong multipart không
cấp quyền hoặc biến lượt Guest thành lượt được lưu.

## 3. Lỗi được tái hiện và sửa

Controller trước đây chỉ thử đọc user ID từ claims. Nếu JWT bị từ chối hoặc
claim không hợp lệ, `userId` giữ null và request chạy như Guest, trả 200. Điều
này làm request của người đang dùng token lỗi âm thầm mất hành vi lưu lịch sử.

Năm integration test ban đầu tái hiện đúng lỗi: token sai cấu trúc, hết hạn,
sai chữ ký, thiếu subject và subject không phải GUID đều nhận 200 thay vì 401.
Sau đó sửa riêng `PredictionsController.Predict`: phân biệt request Guest thật
với request có thông tin xác thực không hợp lệ; chỉ đọc user ID cho identity đã
xác thực. Năm test chạy lại đạt. Không đổi cơ chế cấp token, login/logout hoặc
luồng nội dung của `PredictionService`.

## 4. Đường dẫn thay đổi

| Đường dẫn | Vai trò |
| --- | --- |
| `backend/src/AgriVision.API/Controllers/PredictionsController.cs` | Chặn hạ request có credentials lỗi thành Guest. |
| `backend/tests/AgriVision.IntegrationTests/Controllers/GuestPredictionsControllerTests.cs` | HTTP thật, PostgreSQL thật; AI/storage test doubles để kiểm side effects. |
| `backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs` | Cancellation, file thiếu và kết quả Guest không đọc lại như history. |
| `docs/plans/AGRI-128-guest-diagnosis-plan.md` | Phạm vi, trình tự và tiêu chí bàn giao. |
| `docs/reports/AGRI-128/` | Bằng chứng kỹ thuật của S3-05. |
| `docs/task-logs/AGRI-128/AGRI-128-guest-diagnosis.md` | Diễn biến thực hiện và giới hạn. |

## 5. Kiểm chứng ngày 2026-10-19

Môi trường: Windows, .NET SDK 9.0.305, Docker Desktop engine 29.7.2,
PostgreSQL `postgres:16-alpine` qua Testcontainers. Fixture chạy API/EF/DB thật;
AI và storage được thay ở biên ngoài. Byte ảnh fixture không phải bằng chứng
kiểm tra decoder hoặc model thật.

| Đợt | Lệnh / artifact | Kết quả |
| --- | --- | --- |
| Baseline trước sửa runtime | `dotnet test backend/AgriVision.sln --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger trx --results-directory .cache/agri128-guest/baseline --verbosity minimal` | 33 unit + 33 integration đạt; failed/skipped 0. |
| Baseline coverage | ReportGenerator 5.5.4, `.cache/agri128-guest/baseline-merged/Cobertura.xml` | 207/358 nhánh = 57.82%; dưới yêu cầu AGRI-128 60%, trên sàn workflow 50%. |
| RED | Filter `FullyQualifiedName~GuestPredictionsControllerTests`, `.cache/agri128-guest/red/guest-red.trx` | 5/5 thất bại đúng lỗi 200 thay cho 401. |
| GREEN sau sửa controller | Cùng filter, `.cache/agri128-guest/green/guest-green.trx` | 5/5 đạt. |
| Full suite sau bổ sung test | `.cache/agri128-guest/verification/` | 36 unit + 54 integration đạt; failed/skipped 0. |
| Coverage cuối | `.cache/agri128-guest/verification-merged/Cobertura.xml` | 228/364 nhánh = 62.64%; đạt ngưỡng AGRI-128 60% và workflow 50%; chưa đạt mục tiêu 80%. |
| Commit tooling | `node --test .github/scripts/test_lint_commits.cjs`; commitlint cho subject dự kiến | 1/1 test đạt; subject không có lỗi/cảnh báo. Lần chạy sandbox bị EPERM, lần ngoài sandbox đạt. |
| Secret scan lịch sử trước commit | Gitleaks v8.24.2, `git /repo --log-opts='--all' --redact` | 133 commit, không phát hiện leak; chưa bao gồm thay đổi chưa commit. |
| Whitespace | `git diff --check` | Đạt. |
| Staged diff | Gitleaks v8.24.2 `stdin --redact` trên `git diff --cached` | Không phát hiện leak trong 7 file của task. |
| Liên kết tài liệu | Kiểm local Markdown links trong 4 file tài liệu mới | Không có liên kết local bị hỏng. |

Lệnh full suite giữ nguyên baseline, thay results directory bằng
`.cache/agri128-guest/verification`. Kiểm ngưỡng bằng
`python .github/scripts/check_coverage.py .cache/agri128-guest/verification-merged/Cobertura.xml --minimum-branches 60 --label Backend`
trả PASS. Hai TRX ghi nhận lần lượt 36/36 và 54/54, không fail, abort hoặc skip.

Lệnh filter dùng project
`backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj`,
`--no-restore --logger trx --results-directory <đường dẫn đợt>`.
Coverage gộp từ hai suite bằng ReportGenerator với cấu hình collector hiện có;
không lấy trung bình phần trăm và không đổi exclusions để tăng tỷ lệ.

Ma trận kiểm chứng bổ sung:

- Guest nhận cùng dữ liệu chẩn đoán với User trên cùng fixture, chỉ khác metadata lưu trữ.
- Bốn tập ID users/predictions/prediction_images/prediction_details trước/sau Guest không đổi.
- Lịch sử User đã có giữ nguyên; User đọc ID Guest nhận 404.
- Storage double báo lỗi nếu bị gọi; đồng thời kiểm tra số lần gọi bằng 0.
- Guest gọi history, auth/me hoặc tạo danh mục quản trị bị 401.
- File thiếu/rỗng/sai đuôi không gọi AI/storage; AI/mapping lỗi không tạo dữ liệu.
- Stream phục vụ inference được dispose sau thành công/lỗi; request bị hủy
  trước khi đọc upload không gọi AI/storage.

Artifact ở `.cache/` bị Git bỏ qua và không có sẵn trên một checkout mới.

## 6. Dữ liệu tạm và giới hạn

Application không tạo file ảnh Guest hoặc upload vào kho ảnh. `PredictionService`
đọc ảnh vào bộ nhớ theo request và dispose stream. ASP.NET multipart có thể
buffer upload ra thư mục tạm của host theo
[tài liệu ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-9.0);
test này không chứng nhận việc xóa file
spool ở cấp hệ điều hành hoặc việc xóa an toàn từng byte bộ nhớ. Khi triển khai,
chính sách thư mục tạm/proxy/AI service phải được kiểm chứng riêng.

- Frontend Guest chưa sửa/kiểm thử: lối vào còn yêu cầu đăng nhập, adapter còn
  từ chối `imagePath` rỗng và provider còn cơ chế history local.
- Các API hồ sơ nông nghiệp sẽ cần kiểm tra Guest sau khi task phụ thuộc bổ sung.
- Không huấn luyện model, đo accuracy, kiểm Cloudinary hoặc chạy inference thật.
- Không tuyên bố GitHub CI hoặc DoD toàn AGRI-118 đạt khi chưa có UI và review.
- PR đích là nhánh tích hợp AGRI-128; không tự merge hoặc tự phê duyệt.
- GitHub CLI chưa đăng nhập; cần đăng nhập chính thức để tạo PR và kiểm CI.
  Backend reviewer theo rules là Tran Trung Thong; chưa xác minh GitHub login.
