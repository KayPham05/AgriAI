# AGRI-128 / AGRI-119 — Phần A: lịch sử không phụ thuộc CRUD hồ sơ

- Ngày thực hiện: 2026-10-21.
- Nhánh: `AGRI-128-history-integration`, base `ad22a8a`.
- Story AGRI-111; task AGRI-119 / S3-06.
- Người dùng đã duyệt triển khai phần A. Phần B vẫn chờ contract S3-03 và duyệt riêng.
- Trạng thái: phần A đã kiểm chứng tự động local, chờ người dùng nghiệm thu; chưa commit/push/PR/GitHub CI.

## 1. Phạm vi và thay đổi thực tế

Tái sử dụng luồng lưu User, Guest không lưu, snapshot JSONB, TTL 30 ngày và
cleanup khi DB lỗi đã có tại base. Không thêm endpoint hoặc contract hồ sơ,
không đổi schema/migration, model, dataset, storage provider hoặc global response.

Thay đổi runtime duy nhất: `PredictionService.MapToResultDto` sắp xếp
`PredictionDetails` theo `Rank` trước khi tạo DTO. Lịch sử legacy chưa có
snapshot được tái dựng từ quan hệ DB; thứ tự collection trước đây không bảo
đảm đúng top-k đã lưu. Test cố ý đưa rank 2 trước rank 1 tái hiện kết quả
class index `[1, 0]` thay vì `[0, 1]`. Sau sửa test đạt; không đổi nội dung
JSONB của các snapshot đã lưu hoặc xếp lại snapshot dựa trên danh mục mới.

| File | Thay đổi |
| --- | --- |
| `backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs` | Thêm `OrderBy(d => d.Rank)` khi map kết quả. |
| `backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs` | Thêm 7 ca, mở rộng test doubles để mô phỏng lỗi upload/cancellation/cleanup. |
| `backend/tests/AgriVision.IntegrationTests/Controllers/HistoryPersistenceTests.cs` | Thêm 9 ca HTTP và PostgreSQL thật, profile ID null. |
| `docs/plans/AGRI-128-history-integration-plan.md` | Ghi việc duyệt và thực hiện phần A, giữ phân định A/B. |
| `docs/reports/AGRI-128/` và `docs/task-logs/AGRI-128/AGRI-128-history-integration.md` | Ghi bằng chứng và giới hạn theo task. |

## 2. Ma trận yêu cầu và bằng chứng

| Yêu cầu phần A | Bằng chứng tự động |
| --- | --- |
| Lưu đúng User, không bắt buộc hồ sơ | `PredictionWithoutProfile_ShouldPersistCompleteHistory_AndReloadInANewSession`: UserId đúng, profile ID null, timestamp/confidence/label, hai detail theo rank, URL/public ID và một ảnh TTL 30 ngày. |
| Lịch sử tồn tại sau tải lại | Cùng test đăng nhập bằng HttpClient mới, đọc bằng request/DbContext mới; kiểm list/detail/snapshot. Đây là HTTP test, không phải kiểm thử thao tác reload frontend. |
| Phân trang và cô lập owner | `HistoryPagination_ShouldUseStableOrder_AndExcludeOtherAccounts`: ba lịch sử cùng timestamp, hai trang theo ID giảm dần, bản ghi tài khoản khác không lẫn vào count/items; detail khác owner trả 404. |
| Snapshot và TTL | `HistoryListAndDetail_ShouldKeepSnapshotLabels_WhenCatalogChangesAndImageExpires`: sửa tên cây và thời hạn ảnh trong fixture, list/detail giữ nhãn cũ, ẩn URL hết hạn; JSONB và metadata DB còn nguyên. |
| Tương thích legacy | Unit `LegacyHistory_ShouldReturnTopKInSavedRankOrder` và hai ca `LegacyHistoryWithoutImageRows_ShouldApplyTtlToListAndDetail` kiểm bản ghi không snapshot/không image rows. |
| Guest không ghi dữ liệu | `GuestPrediction_ShouldLeaveStoredUserHistoryAndStorageUntouched`: số dòng ba bảng và history User không đổi, storage chỉ được gọi bởi lượt User trước đó; ID Guest lookup trả 404. |
| AI lỗi | Hai ca `AiFailure_ShouldNotUploadOrPersistUserHistory`, HTTP 503/502: không upload và không tăng ba bảng. |
| Upload thất bại | `UploadFailure_ShouldNotCreateAnyHistoryRows` trả 500 từ hành vi middleware hiện tại, DB không đổi; unit bổ sung IOException/cancellation và dispose streams. |
| SaveChanges thất bại | Hai ca `DetailInsertFailure_ShouldRollbackWholeHistory_AndAttemptImageCleanup`: PostgreSQL từ chối insert detail, toàn bộ prediction/images/details rollback, trả 500, gọi xóa đúng public ID vừa upload. |
| Cleanup thất bại | Một nhánh integration cho storage throw khi cleanup; unit kiểm cleanup trả false vẫn giữ lỗi DB gốc và request bị hủy vẫn cleanup bằng token không bị hủy. |

Các test có sẵn về owner/Guest deletion, snapshot đổi nội dung bệnh và lệnh
expiry cleanup cũng nằm trong lượt full backend. Không nhân bản toàn bộ test
Guest từ nhánh `AGRI-128-guest-diagnosis` hoặc viết lại S3-07.

## 3. Test doubles và cô lập dữ liệu

- API/controller/service/repository/EF/PostgreSQL chạy thật qua `AgriVisionFactory`.
  PostgreSQL `postgres:16-alpine` do Testcontainers tạo riêng, không dùng database ứng dụng.
- AI fixture trả class 0 và 4 theo catalog v1.4; bytes ảnh là fixture nhỏ,
  không chứng minh decoder, accuracy hoặc inference checkpoint thật.
- Storage fake ghi nhận upload/delete và trả URL `.test`; không gọi Cloudinary
  hoặc ghi file upload thật. Chỉ metadata URL/public ID đi vào graph persistence.
- Test rollback thêm CHECK `history_test_reject_details` với NOT VALID vào
  `prediction_details` của DB disposable để chỉ chặn insert mới. DROP constraint
  trong finally; không sửa migration hoặc tắt trigger dự án. Lỗi child insert
  kiểm tra transaction SaveChanges thật, không mock repository persistence.
- Việc khôi phục tên cây sau test dùng finally. Các test cùng class chạy tuần tự;
  class có PostgreSQL riêng, không thay fixture của class khác.

## 4. Kết quả ngày 2026-10-21

| Đợt | Kết quả | Artifact local trong worktree |
| --- | --- | --- |
| Restore/baseline | 57 unit + 83 integration đạt, failed/skipped 0 | `.cache/history-part-a/baseline/unit/unit.trx`, `baseline/integration/integration.trx` |
| Baseline coverage | 283/476 = 59.45%; checker gate 60% FAIL, là hiện trạng trước sửa | `.cache/history-part-a/baseline-merged/Cobertura.xml` |
| RED | 1 test legacy rank fail đúng lỗi `[1, 0]` thay vì `[0, 1]` | `.cache/history-part-a/red/legacy-order.trx` |
| GREEN | Cùng regression test 1/1 đạt sau sửa | `.cache/history-part-a/green/legacy-order.trx` |
| Focused | 27 service + 9 integration đạt | `.cache/history-part-a/focused/` |
| Build cuối | Đạt, 0 warnings/errors | `dotnet build backend/AgriVision.sln --no-restore` |
| Full verification | 64 unit + 92 integration đạt; failed/skipped 0 trong phạm vi đã chọn | `.cache/history-part-a/verification/unit/unit.trx`, `verification/integration/integration.trx` |
| Coverage cuối | 289/476 = 60.71%; gate 60% PASS, target 80% chưa đạt | `.cache/history-part-a/verification-merged/Cobertura.xml` |
| TRX/Cobertura checker của CI | Hai suite đều PASS, có executed tests và branch counts hợp lệ | `.github/scripts/check_dotnet_test_results.py` chạy với từng thư mục verification |
| Secret scan thay đổi | Gitleaks v8.24.2 không phát hiện leak trong diff và file mới; không phải scan toàn history | `.cache/history-part-a/gitleaks-changes.json` |
| Whitespace | `git diff --check` đạt | Kiểm working diff sau sửa |

Lệnh baseline và full giữ cùng phạm vi CI, chỉ đổi results directory:

```powershell
dotnet restore backend/AgriVision.sln
dotnet build backend/AgriVision.sln --no-restore
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=unit.trx' --results-directory .cache/history-part-a/verification/unit --verbosity minimal
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=integration.trx' --results-directory .cache/history-part-a/verification/integration --verbosity minimal
```

Baseline dùng `dotnet test --no-restore` để build từng project trước chạy.
RED/GREEN dùng unit project với filter
`FullyQualifiedName~LegacyHistory_ShouldReturnTopKInSavedRankOrder`.
Focused dùng `FullyQualifiedName~PredictionServiceTests` và
`FullyQualifiedName~HistoryPersistenceTests`, không thu coverage.
Coverage gộp bằng ReportGenerator 5.5.4 theo workflow, không trung bình phần trăm,
không thay exclusions/gate. `.cache/` bị ignore, không có sẵn trong clone mới.

Lệnh kiểm cuối:

```powershell
python .github/scripts/check_dotnet_test_results.py .cache/history-part-a/verification/unit
python .github/scripts/check_dotnet_test_results.py .cache/history-part-a/verification/integration
python .github/scripts/check_coverage.py .cache/history-part-a/verification-merged/Cobertura.xml --minimum-branches 60 --label Backend
```

Category `RealCheckpoint` được loại bằng filter giống CI thường, không chạy
rồi coi skip là pass. Kết quả mới là 156 test thường; không bao gồm kiểm thử
artifact/model thật. Các kết quả focused và RED/GREEN là các lượt riêng, không
cộng chúng vào tổng 156. Coverage đơn lẻ của unit/integration lần lượt là
194/476 và 217/476; gate áp dụng coverage gộp 289/476, không cộng số nhánh trùng.

## 5. Giới hạn và công việc còn lại

- Phần B chưa triển khai: chọn/gắn/kiểm owner hồ sơ và nghiệm thu qua CRUD S3-03.
- Nhánh Guest chưa merge vào base; sửa token lỗi bị hạ thành Guest thuộc S3-05
  vẫn cần phối hợp tích hợp. Lượt này không sửa auth/session hoặc tự cherry-pick.
- Chưa chạy frontend, live Cloudinary hoặc category RealCheckpoint; không thay
  API đang phục vụ kiểm thử Guest ở thư mục gốc và không migrate database đó.
- TTL ở đây là projection ẩn ảnh qua API; không tuyên bố URL storage riêng tư,
  ảnh vật lý đã bị xóa hoặc scheduler expiry đã được cấu hình.
- Cleanup storage thất bại có thể để lại ảnh orphan; cơ chế sẵn có giữ lỗi gốc
  và log để xử lý. Không thêm cơ chế retry/scheduler hoặc cam kết transaction
  phân tán giữa storage và DB trong phạm vi phần A.
- Chưa có GitHub CI, reviewer approval hoặc nghiệm thu thủ công phần A trên
  nhánh mới; không dùng kết quả Guest trước đây thay thế bằng chứng phần A.
- Không commit/push/PR trong lượt này.
