# AGRI-128 / AGRI-119 — History integration with agricultural profile CRUD

- Thực hiện: 2026-10-23–2026-10-24.
- Nhánh: `AGRI-128-history-integration`; base cập nhật `a43797d` từ
  `origin/AGRI-128-backend-improvement`.
- Phạm vi: backend History, tích hợp CRUD S3-03 đã có; AGRI-122 để sau.
- Trạng thái: backend kiểm chứng local đạt 254/254 test, branch coverage 66.61%; chờ nghiệm thu thủ công và chốt chính sách Guest chọn hồ sơ.
- PR: [#45](https://github.com/KayPham05/AgriAI/pull/45), target `AGRI-128-backend-improvement`; đã yêu cầu reviewer backend, CI đang chạy tại thời điểm ghi nhận.
- [Kế hoạch A/B](../../plans/AGRI-128-history-integration-plan.md),
  [bằng chứng phần A trước đồng bộ](history_part_a.md),
  [task log](../../task-logs/AGRI-128/AGRI-128-history-integration.md).

## 1. Kết quả đối chiếu và thay đổi thực tế

Base mới đã cung cấp CRUD hồ sơ, `IAgriculturalProfileRepository`, request
`agriculturalProfileId` tùy chọn, kiểm ownership trước AI/upload, FK trên
Prediction, metadata profile trên result/history và đọc metadata hiện tại từ
entity thay vì khôi phục ID hồ sơ cũ từ snapshot. Không triển khai lại các phần này.

Phần A được bảo toàn trước fast-forward bằng stash
`18e23c987d6c619f5cfbf8b85b22d32da93a7746`, sau đó áp dụng lại. Giữ cả test mới
của đồng nghiệp và test A; cập nhật lời gọi có CancellationToken sang named
argument theo chữ ký mới. Stash dự phòng vẫn giữ; không tạo commit/push/PR.
README báo cáo đã có trên base được giữ và bổ sung liên kết, không ghi đè bằng
bản README cũ của phần A.

| Đường dẫn | Thay đổi trên nhánh History |
| --- | --- |
| `backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs` | Giữ sửa A: top-k legacy sắp xếp theo Rank; thêm kiểm GUID hồ sơ rỗng, trả 400 trước repository/AI/storage cho User. |
| `backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs` | Giữ 7 ca phần A, tương thích chữ ký service mới; không xóa test upstream. |
| `backend/tests/AgriVision.IntegrationTests/Controllers/HistoryPersistenceTests.cs` | 9 ca A + 7 ca B, API/EF/PostgreSQL thật với AI/storage doubles. |
| `docs/plans/AGRI-128-history-integration-plan.md` | Ghi base mới, phạm vi được giao tiếp và khác biệt Guest đang chờ chốt. |
| `docs/reports/AGRI-128/`, `docs/task-logs/AGRI-128/AGRI-128-history-integration.md` | Giữ bằng chứng cũ, bổ sung bằng chứng lần chạy mới. |

Không thay schema/migration, auth, CRUD hồ sơ, frontend, model, dataset hoặc
storage provider. Không tác động các thay đổi tại worktree gốc `D:/AgriAI`.

## 2. Ma trận kiểm chứng phần B

| Ca | Kết quả cần giữ |
| --- | --- |
| User chọn hồ sơ của mình | 201, profile ID đúng; lượt không chọn hồ sơ không xuất hiện trong filter hồ sơ. |
| Sửa tên/mô tả hồ sơ qua CRUD | Nội dung chẩn đoán và snapshot JSONB giữ nguyên. |
| User khác dùng filter/profile ID | Không thấy lịch sử của owner; GET prediction của owner trả 404. |
| Xóa hồ sơ qua CRUD | Prediction còn; profile ID null trong detail/list; filter hồ sơ đã xóa rỗng; snapshot JSONB nguyên vẹn. |
| GUID sai định dạng hoặc toàn số 0 | 400; không gọi inference/upload hoặc ghi history. |
| GUID hợp lệ nhưng hồ sơ mất/khác owner | Cùng 404, trước inference/upload; không tạo dữ liệu. |
| Hồ sơ bị xóa trong upload | Guard PostgreSQL từ chối save, response hiện tại 500; không lưu dở dang prediction/images/details; thử cleanup ảnh. |
| Cleanup cũng lỗi sau race xóa hồ sơ | Vẫn không có history dở dang, thử cleanup với token không bị hủy; lỗi cleanup không thay lỗi lưu gốc. |

Race được tạo có kiểm soát bằng callback của storage double gọi API DELETE
hồ sơ sau khi ownership đã được kiểm tra và trước khi save. Không dùng sleep
để đoán thời điểm, không tắt trigger và không sửa database ứng dụng.

## 3. RED/GREEN và môi trường

- Trước khi chạy được test, host chỉ có SDK 7.0.410: lỗi NETSDK1045.
- Tải SDK 9.0.305 từ Microsoft, kiểm SHA512 theo release metadata, giải nén
  tại `D:/AgriAI/.cache/tools/dotnet-9.0.305`; không thay SDK hệ thống.
- Cache restore cũ trỏ tới thư mục fallback Visual Studio không còn tồn tại:
  MSB4018. Restore lại với `--force -p:RestoreFallbackFolders=` đã đạt.
- Docker được khởi động; các integration fixture sử dụng PostgreSQL Testcontainers
  riêng. Không migrate hoặc xóa volume database ứng dụng.
- RED ngày 2026-10-23: unit 98/98; integration 154/156, 2 fail, 0 skip.
  Lỗi sản phẩm được tái hiện: GUID rỗng trả 404 thay vì 400. Lỗi thứ hai ở
  assertion test: timestamp response sau PostgreSQL mất phần dưới microsecond.
- Sửa production đúng nhánh GUID rỗng. Test lifecycle so thời gian với dung sai
  1 microsecond; các trường khác vẫn so tương đương, snapshot JSONB vẫn so chính xác.
- GREEN ngày 2026-10-24: `HistoryPersistenceTests` 16/16, 0 fail/skip.

Artifact local bị Git bỏ qua:

- `.cache/history-part-b/red/*.trx`, `.cache/history-part-b-red.log`.
- `.cache/history-part-b/green/*.trx`, `.cache/history-part-b-green.log`.
- `.cache/history-part-b-restore.log`, `.cache/history-part-b-build.log`.
- Full suite: `.cache/history-part-b/verification/` và
  `.cache/history-part-b-verification.log`.

Lệnh chạy từ worktree History (PATH chỉ áp dụng cho tiến trình kiểm thử):

```powershell
$env:DOTNET_ROOT='D:\AgriAI\.cache\tools\dotnet-9.0.305'
$env:PATH=$env:DOTNET_ROOT+';'+$env:PATH
dotnet restore backend/AgriVision.sln --force -p:RestoreFallbackFolders=
dotnet build backend/AgriVision.sln --no-restore
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --filter 'FullyQualifiedName~HistoryPersistenceTests' --logger trx --results-directory .cache/history-part-b/green
dotnet test backend/AgriVision.sln --no-build --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger trx --results-directory .cache/history-part-b/verification
```

Không cộng các đợt RED/GREEN vào số test full suite. Kết quả A ngày 2026-10-21
không thay thế bằng chứng hiện tại. Category RealCheckpoint được loại giống CI;
chưa kiểm live Cloudinary hoặc model thật trong task này.

## 4. Hướng dẫn nghiệm thu thủ công khi chạy đúng nhánh History

### Kết quả full verification ngày 2026-10-24

| Kiểm tra | Kết quả |
| --- | --- |
| Build solution | 0 warning, 0 error. |
| Unit suite | 98/98 đạt, 0 fail/skip. |
| Integration suite | 156/156 đạt, 0 fail/skip; loại Category RealCheckpoint theo CI. |
| Tổng | 254/254 test thường đạt. |
| Coverage gộp ReportGenerator 5.5.4 | 369/554 nhánh = 66.61%; checker PASS gate 60%; target 80% chưa đạt. |
| TRX checker | Unit và integration đều PASS sau khi tách artifact theo suite. |
| Gitleaks v8.24.2 | Diff code và file test mới không phát hiện leak. |
| Whitespace | `git diff --check` đạt. |

Lệnh gộp/check bổ sung:

```powershell
& D:\AgriAI\.cache\dotnet-tools\reportgenerator.exe '-reports:.cache/history-part-b/verification/**/coverage.cobertura.xml' '-targetdir:.cache/history-part-b/verification-merged' '-reporttypes:Cobertura'
python .github/scripts/check_coverage.py .cache/history-part-b/verification-merged/Cobertura.xml --minimum-branches 60 --label Backend
python .github/scripts/check_dotnet_test_results.py .cache/history-part-b/trx-check/unit
python .github/scripts/check_dotnet_test_results.py .cache/history-part-b/trx-check/integration
```

TRX nguồn: `ICT_DESKTOP-5EDUJT2_2026-10-24_00_58_06.trx` (unit) và
`ICT_DESKTOP-5EDUJT2_2026-10-24_00_58_08.trx` (integration). Lần đầu đưa cả
thư mục solution vào checker bị từ chối vì checker yêu cầu đúng một suite;
đã sao chép từng TRX và coverage tương ứng vào `trx-check/unit`, `integration`
rồi kiểm lại thành công, không chạy lại hoặc thay nội dung kết quả test.
Gate dùng report gộp, không cộng branch count hoặc lấy trung bình phần trăm
của từng collector. Không đổi coverage exclusions hoặc ngưỡng CI.

### Các bước manual

1. Đăng nhập User A, Authorize `Bearer <token>`; tạo hồ sơ qua
   `POST /api/agricultural-profiles`, ghi lại ID.
2. POST ảnh ở `/api/predictions` kèm `agriculturalProfileId`; kiểm 201 và ID
   hồ sơ trong response. GET detail/list/filter bằng request mới phải thấy kết quả.
3. Chẩn đoán thêm lần không chọn hồ sơ: vẫn 201; item có profile null và không
   nằm trong filter của hồ sơ ở bước 1.
4. Sửa tên/mô tả hồ sơ: kết quả bệnh, confidence và lịch sử cũ giữ nguyên.
5. Dùng User B gọi detail hoặc chẩn đoán bằng hồ sơ của A: 404; lọc history
   bằng ID hồ sơ A không trả dữ liệu của A.
6. Xóa hồ sơ bằng User A: 204; chẩn đoán cũ vẫn xem được, profile ID null;
   filter ID hồ sơ đã xóa rỗng. Không xóa ảnh chẩn đoán chỉ vì xóa hồ sơ.
7. Dùng User A gửi GUID rỗng/sai định dạng: 400; GUID hợp lệ không tồn tại: 404.
8. Bỏ Authorization và không chọn hồ sơ: Guest 200, không tăng history.

Chưa chạy các ca thủ công này trong lượt tích hợp; API đang chạy ở checkout
khác không tự trở thành bản History mới. Không yêu cầu gửi token thật qua chat.

## 5. Giới hạn và quyết định còn mở

- Base mới trả 401 khi Guest gửi profile ID; đã hỏi người dùng giữ 401 hay bỏ
  qua trường này. Trong lúc chờ giữ nguyên base, không sửa hành vi Guest.
- Race hồ sơ bị xóa sau kiểm ownership hiện trả lỗi save 500; không chuyển
  mọi DbUpdateException thành 404 và không tự bỏ profile để lưu sai lựa chọn.
- Cleanup storage lỗi có thể để lại ảnh orphan; cơ chế hiện tại ghi log để xử
  lý. Không có transaction phân tán hoặc scheduler cleanup mới.
- TTL 30 ngày là ẩn ảnh qua API theo cơ chế sẵn có; không chứng nhận private
  access của storage hay xóa vật lý theo lịch.
- Chưa nghiệm thu UI, manual trên nhánh History, reviewer hoặc GitHub CI;
  chưa commit/push/PR và chưa chuyển Jira Done.

## 6. Chuẩn bị PR theo yêu cầu ngày 2026-10-24

Người dùng đã yêu cầu commit/push/tạo PR cho riêng History và xác nhận tiếp tục sau
khi xem danh sách test. Đích là `AGRI-128-backend-improvement` theo chỉ định người dùng,
thay cho đích mặc định trong rules. Không đưa thay đổi AGRI-122 từ worktree khác vào PR.
Reviewer backend được đối chiếu GitHub: Trần Trung Thông (`trunthong09012005`), khác
tài khoản gửi PR `nguyenquangvinh159`. Chưa có PR History trùng khi kiểm tra remote.

### Đối chiếu acceptance criteria với test tự động

| Yêu cầu AGRI-119 | Bằng chứng kiểm thử |
| --- | --- |
| Kết quả User lưu đúng tài khoản/hồ sơ | `PredictionWithoutProfile_ShouldPersistCompleteHistory_AndReloadInANewSession`, `ProfileLifecycle_ShouldKeepSnapshot_AndExposeOnlyCurrentGrouping` |
| Lịch sử truy vấn lại được sau tải lại | Ca phiên đăng nhập mới ở trên đọc detail/list bằng HTTP client mới; không xem đây là browser E2E |
| Chỉ xem dữ liệu trong phạm vi được phép | `HistoryPagination_ShouldUseStableOrder_AndExcludeOtherAccounts`, `UnavailableProfile_ShouldReturnNotFound_BeforeExternalWork`, các test `SecurityAuthorizationTests` hiện có |
| Guest không tạo lịch sử nghiệp vụ | `GuestPrediction_ShouldLeaveStoredUserHistoryAndStorageUntouched` kiểm cả ba bảng và số lần gọi storage; `GuestPredictionsControllerTests` có sẵn kiểm ranh giới token |
| PostgreSQL lưu đường dẫn/metadata, không lưu ảnh binary | Ca lưu đầy đủ kiểm URL/public ID và bảng ảnh; entity/schema hiện hành không có cột binary ảnh, nhánh này không đổi schema |
| Lỗi lưu không tạo bản ghi dở dang | `UploadFailure_ShouldNotCreateAnyHistoryRows`, `AiFailure_ShouldNotUploadOrPersistUserHistory`, `DetailInsertFailure_ShouldRollbackWholeHistory_AndAttemptImageCleanup`, `ProfileDeletedDuringUpload_ShouldRejectSave_RollbackAndAttemptCleanup` |

Kiểm thêm ngoài AC: Top-K legacy theo Rank; TTL ảnh cũ/mới; snapshot không đổi khi
danh mục hoặc hồ sơ thay đổi; phân trang ổn định; GUID rỗng/sai định dạng; hủy thao tác;
cleanup thất bại vẫn giữ lỗi gốc. Tổng phần mới là 7 unit + 16 integration, không cộng
các lần chạy lặp thành số test mới. Các API/DB integration chạy PostgreSQL thật và
AI/storage doubles. Không viết E2E theo yêu cầu người dùng; không tự coi test double
là nghiệm thu checkpoint hoặc Cloudinary thật. Mục tiêu coverage 80% vẫn là mục tiêu,
không đổi gate hay exclusions để đạt số liệu.

### Lần kiểm chứng dành riêng cho PR

Bằng chứng mới được lưu tại `.cache/history-pr/` trong worktree History, tách khỏi
các lần kiểm chứng phần A/B trước đó. Lần chạy ngày 2026-10-24, khoảng 20:15–20:19
giờ local: build đạt 0 warning/error; 98/98 unit và 156/156 integration đạt, không skip;
tổng 254/254. Hai checker TRX đạt. Coverage gộp ReportGenerator 5.5.4 là 369/554 =
66.61%, checker gate 60% PASS; target 80% chưa đạt.

Nguồn: `build.log`, `unit/unit.trx`, `integration/integration.trx`, `merged/Cobertura.xml`
dưới `.cache/history-pr/`. Lệnh giống bộ CI: `--no-build --no-restore`, coverage settings
`backend/coverage.runsettings`, `--collect 'XPlat Code Coverage'`; integration dùng
`--filter 'Category!=RealCheckpoint'`. Không chạy hoặc viết E2E. Không thay exclusions.

`git diff --check` đạt; review diff 8 file và quét chữ ký private key/token phổ biến
không thấy credential mới. Các mật khẩu trong test là fixture. Đây không phải lần quét
Gitleaks mới; kết quả Gitleaks ở phần trước là bằng chứng lịch sử. Commit subject được
commitlint 21.2.3 kiểm: 0 problem, 0 warning. Không chạy formatter toàn repository.
Manual acceptance và GitHub Actions chưa được tick thay bằng kết quả local.
