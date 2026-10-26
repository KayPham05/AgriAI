# AGRI-116 — Agricultural profile API

Ngày triển khai: 2026-10-21. Nhánh triển khai ban đầu: `AGRI-128-backend-improvement`.
Jira thực tế do người dùng xác nhận: **AGRI-116**. Nhánh bàn giao:
`AGRI-116-agricultural-profile` (từ HEAD `ad22a8a` của nhánh nền theo yêu cầu).
Phạm vi: backend S3-03 và tích hợp chọn hồ sơ tùy chọn của S3-06; giao diện được
loại khỏi yêu cầu. Đợt triển khai ban đầu chưa commit/push, thay đổi CI hoặc áp dụng
migration lên DB ứng dụng. Đợt bàn giao hiện tại được phép commit/push riêng phần backend.

## Quy tắc dữ liệu

Theo [implementation rules §3.3](../../plans/AGRI-128-implementation-rules.md)
và [pipeline S3-03/S3-06](../../plans/AGRI-128-backend-improvement-plan.md):

- Hồ sơ thuộc một tài khoản; chủ sở hữu lấy từ JWT, không nhận `userId` trong DTO ghi.
- `name` bắt buộc, trim, dài 1–150 ký tự sau trim (khớp cột hiện tại).
  `description` tùy chọn, trim; null/rỗng/toàn khoảng trắng được lưu null.
  Ghi chú đất, canh tác và thông tin bổ sung nằm trong description.
- Không thêm cột cây cố định: hồ sơ nhóm nhiều kết quả, cây/bệnh lấy từ từng kết quả.
  Không bắt buộc chọn cây hoặc giới hạn hồ sơ vào một loại cây/bệnh. Quy tắc này
  giữ quyết định đã có trong schema và [bàn giao AGRI-127](../../notes/remaining_work.md).
- Chỉ owner xem/sửa/xóa; cả User khác và Admin khác đều nhận 404 như ID không tồn tại.
  Guest không truy cập CRUD hồ sơ (401).
- Xóa hồ sơ là xóa hàng `agricultural_profiles`; FK hiện có đặt
  `predictions.agricultural_profile_id = NULL`. Giữ prediction, top-K, snapshot JSONB,
  ảnh và TTL 30 ngày. Không gọi xóa storage khi xóa hồ sơ.
- Chỉ chọn hồ sơ khi tạo chẩn đoán mới. Không có API chuyển/gắn lại kết quả cũ.
  Trigger hiện tại bảo vệ cùng chủ sở hữu và cấm chuyển liên kết đã lưu.
- Schema đã đủ; giữ nguyên 5 migration, entity, EF snapshot và volume.

## Contract HTTP

Các route hồ sơ cần `Authorization: Bearer <token>`; JSON dùng camelCase.

| Method / route | Kết quả |
| --- | --- |
| `GET /api/agricultural-profiles` | 200, mảng hồ sơ của owner, `createdAt DESC, id DESC`; rỗng trả `[]` |
| `GET /api/agricultural-profiles/{id}` | 200, chi tiết; thiếu/khác owner trả 404 |
| `POST /api/agricultural-profiles` | 201, DTO mới và Location chi tiết |
| `PUT /api/agricultural-profiles/{id}` | 200, DTO đã sửa; thay toàn bộ name/description |
| `DELETE /api/agricultural-profiles/{id}` | 204; thiếu/khác owner trả 404 |

Request tạo/cập nhật:

```json
{"name":"Vườn nhà","description":"Đất phù sa, ghi chú canh tác"}
```

Response `AgriculturalProfileDto`: `id`, `userId`, `name`, `description`, `createdAt`,
`updatedAt` (null trước khi sửa), `predictionCount`. Count tính ở DB, không tải toàn
bộ ảnh/lịch sử vào danh sách. Không áp đặt tên duy nhất khi schema chưa quy định.
Danh sách trả mảng theo pipeline S3-03, chưa có pagination; UI sau này có thể dùng
mảng này cho bộ chọn hồ sơ. Validation tên trả 400 qua middleware/model binding hiện có.

`POST /api/predictions` giữ multipart `file`, bổ sung `agriculturalProfileId` tùy chọn:

- User chọn hồ sơ của mình: lưu FK cùng prediction, ảnh/top-K/snapshot trong lần
  `SaveChangesAsync` hiện có. DTO kết quả/lịch sử bổ sung `agriculturalProfileId`.
- User không chọn: tiếp tục tự lưu vào tài khoản, FK null.
- Hồ sơ thiếu/khác owner: 404, kiểm tra trước inference và upload storage.
- Guest truyền profile ID: 401 trước inference/storage/DB; Guest không truyền ID
  tiếp tục nhận kết quả mà không lưu ảnh hoặc lịch sử server.
- `GET /api/predictions?agriculturalProfileId=<id>` tái sử dụng filter S3-07,
  vẫn giới hạn theo userId. Dùng kết quả lịch sử này để lấy cây/bệnh trong hồ sơ.
- Khi xóa hồ sơ, response chi tiết/lịch sử phản ánh FK hiện tại là null. Nội dung
  snapshot gốc giữ nguyên; không hồi sinh liên kết cũ từ JSON snapshot.

## Source và kiểm thử

- [Request/response DTO hồ sơ](../../../backend/src/AgriVision.Application/DTOs/AgriculturalProfile/AgriculturalProfileDtos.cs).
- [Repository interface](../../../backend/src/AgriVision.Application/Common/Interfaces/Persistence/IAgriculturalProfileRepository.cs),
  [implementation](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/AgriculturalProfileRepository.cs).
- [Service](../../../backend/src/AgriVision.Application/Services/Implementations/AgriculturalProfileService.cs),
  [controller](../../../backend/src/AgriVision.API/Controllers/AgriculturalProfilesController.cs).
- [Prediction service](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs),
  [prediction DTO](../../../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs).
- [Service unit tests](../../../backend/tests/AgriVision.UnitTests/Services/AgriculturalProfileServiceTests.cs),
  [prediction unit tests](../../../backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs),
  [HTTP/PostgreSQL tests](../../../backend/tests/AgriVision.IntegrationTests/Controllers/AgriculturalProfilesControllerTests.cs).

TDD ngày 2026-10-21: integration mới **16 fail / 0 pass** trước triển khai (CRUD
chưa có trả 404; Guest có profile ID bị bỏ qua và trả 200). Sau triển khai:
**16 pass / 0 fail / 0 skip**. TRX local ignored:
`.cache/qa-verification/agri128/profiles/{red,green}/profiles-{red,green}.trx`.

Máy có SDK 10.0.401 nhưng thiếu runtime .NET 9; lần đầu testhost aborted chưa chạy
case nào. Đã tải ASP.NET Core runtime **9.0.21** từ Microsoft, kiểm SHA-512 theo
release metadata và giải nén riêng tại `.cache/tooling/dotnet9/`. Tests chạy bằng
runtime này với `DOTNET_ROOT`/`DOTNET_ROOT_X64` tạm theo process; target vẫn net9.0.
Không đổi framework/dependency dự án hoặc cài runtime toàn hệ thống.

## Kiểm chứng toàn bộ backend

Kết quả đợt triển khai ban đầu ngày 2026-10-21 (artifact `agri128` giữ nguyên để truy vết):

| Kiểm tra | Kết quả | Nguồn local ignored |
| --- | --- | --- |
| Build solution | pass, 0 warning / 0 error | `dotnet build backend/AgriVision.sln --no-restore --verbosity minimal` |
| Unit suite | 79/79 pass, failed/skipped 0 | `.cache/qa-verification/agri128/profiles/unit/unit.trx` |
| Integration suite, loại RealCheckpoint | 99/99 pass, failed/skipped 0 | `.cache/qa-verification/agri128/profiles/full/backend.trx` |
| Branch coverage gộp | 308/500 = 61,60%; gate 60% PASS | `.cache/qa-verification/agri128/profiles/coverage/Cobertura.xml`, `Summary.json` |
| Whitespace diff | pass | `git diff --check` |

Lệnh đã chạy (PowerShell tại root):

```powershell
$env:DOTNET_ROOT = (Resolve-Path '.cache/tooling/dotnet9').Path
$env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
dotnet test backend/AgriVision.sln --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=backend.trx' --results-directory .cache/qa-verification/agri128/profiles/full --verbosity quiet
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --logger 'trx;LogFileName=unit.trx' --results-directory .cache/qa-verification/agri128/profiles/unit --verbosity quiet
& '.cache/tooling/reportgenerator/reportgenerator.exe' '-reports:.cache/qa-verification/agri128/profiles/full/**/coverage.cobertura.xml' '-targetdir:.cache/qa-verification/agri128/profiles/coverage' '-reporttypes:Html;Cobertura;JsonSummary'
python .github/scripts/check_coverage.py .cache/qa-verification/agri128/profiles/coverage/Cobertura.xml --minimum-branches 60 --label Backend
dotnet build backend/AgriVision.sln --no-restore --verbosity minimal
git diff --check
```

ReportGenerator 5.5.4 khớp CI, cài riêng trong `.cache/tooling/reportgenerator/`.
Lệnh solution dùng cùng tên TRX khiến integration ghi đè TRX unit; đã chạy lại unit
với output riêng như trên. Hai report coverage độc lập vẫn được giữ và gộp đầy đủ.
Build đầu trong sandbox báo thất bại không có compiler diagnostic; chạy lại ngoài
sandbox thành công với 0 warning/error.

Các ca mới kiểm chứng CRUD, tên thiếu/khoảng trắng/quá dài, trim/null description,
owner lấy từ token dù request có userId giả, Guest/User/Admin khác bị chặn,
count ở list/detail, FK và lọc history theo hồ sơ, snapshot/ảnh/top-K được giữ sau xóa,
đọc lại FK null sau xóa, từ chối chọn hồ sơ sai trước inference/storage và hành vi
không chọn hồ sơ của User/Guest qua regression suite có sẵn.

Testcontainers dùng PostgreSQL 16 tạm, tự dọn container; AI/storage là fake của fixture.
Không chạy migration lên DB ứng dụng hoặc thực hiện cleanup ảnh thật.
Không chạy frontend/Python/checkpoint suites vì không đổi UI/AI; bộ RealCheckpoint
bị loại bằng filter, không tính là một ca pass hoặc skip. Không dùng các kết quả
này làm nghiệm thu inference/storage thật hoặc GitHub Actions. Coverage vượt gate
nhưng chưa đạt target 80%. UI quản lý/chọn hồ sơ sẽ được triển khai ở hạng mục riêng.

## Bàn giao AGRI-116

Chỉ đưa backend hồ sơ, tests và tài liệu liên quan vào commit. AI ensemble,
notebook, ghi chú AI, `ai/tasks/agri_128/` và trạng thái local của
`docker-compose.ai.yml` được giữ ngoài commit.

Kiểm chứng mới trước push ngày 2026-10-21 trên nhánh AGRI-116:

- `dotnet build backend/AgriVision.sln --no-restore --verbosity quiet`: pass,
  0 warning/error.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=unit.trx' --results-directory .cache/qa-verification/agri116/prepush/unit --verbosity quiet`:
  **79 pass, 0 failed/skipped**; source evidence `unit/unit.trx`.
- `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=integration.trx' --results-directory .cache/qa-verification/agri116/prepush/integration --verbosity quiet`:
  **99 pass, 0 failed/skipped**; source evidence `integration/integration.trx`.
- Gộp hai report bằng ReportGenerator 5.5.4, chạy
  `python .github/scripts/check_coverage.py .cache/qa-verification/agri116/prepush/merged/Cobertura.xml --minimum-branches 60 --label Backend`:
  **308/500 = 61,60%, gate 60% PASS**; evidence `merged/Cobertura.xml`, `Summary.json`.

Các artifact tương đối phía trên nằm trong `.cache/qa-verification/agri116/prepush/`.
Rà trước commit: `git diff --cached --check` đạt trên 21 đường dẫn bàn giao;
commit message AGRI-116 qua commitlint (0 problems/warnings). Gitleaks v8.24.2
quét staged diff với `--redact`: **0 finding**, report local
`secrets/gitleaks-staged.json`. Đây không phải quét toàn lịch sử Git hoặc xác nhận CI.
Vẫn dùng runtime .NET 9 local, PostgreSQL Testcontainers, fake AI/storage và loại
RealCheckpoint như đợt trước. Đây là kiểm chứng local, không xác nhận GitHub Actions
hoặc review của con người. Không chạy lại frontend/Python vì chúng ngoài commit backend.

Các giới hạn đã rà: action controller chưa có hậu tố Async, helper private chưa
có giá trị mặc định cho CancellationToken; kiểm tra JWT theo trạng thái tài khoản/
session tại mỗi request vẫn là khoảng trống xác thực có sẵn. Đợt push này giữ
nguyên phạm vi code đã triển khai, không tự mở rộng sang sửa xác thực toàn hệ thống.

## Docker local verification — 2026-10-25

`docker compose build` hoàn tất cho ba image ứng dụng. Frontend image xác nhận route
`/agricultural-profiles` trong danh sách production routes. PostgreSQL volume được giữ
nguyên; role local `agrivision_user` được cập nhật credential theo `.env` sau khi người
dùng xác nhận. Migration explicit hoàn tất cho `PrivateImageUploadJournal` và
`SessionRevocationClockSafety`.

Trạng thái sau khởi động lại: PostgreSQL, AI service, backend và frontend đều healthy;
backend `/api/health` và AI `/health` trả về OK. Route hồ sơ được phục vụ và chuyển user
chưa đăng nhập về trang giới thiệu. Đây là bằng chứng local Docker, không phải kết quả
CI, remote hoặc production.

## Rebase integration verification — 2026-10-26

Branch AGRI-116 được rebase lên `origin/AGRI-128-backend-improvement` tại `7aa28c9`,
sau khi base đã tích hợp AGRI-122. Conflict ở hai provider frontend được resolve bằng
cách giữ auth changes của base cùng state và CRUD callbacks hồ sơ của AGRI-116.

Revision sau rebase là `9afb350`. Typecheck, Biome lint, Webpack production build và
36/36 test mục tiêu AGRI-116 đều pass. Đây là kiểm chứng local sau rebase, chưa phải
bằng chứng GitHub Actions.
