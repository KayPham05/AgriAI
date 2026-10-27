# AGRI-128 / AGRI-119 — Diagnosis History & Agricultural Record Integration

- Story: AGRI-111, hạng mục S3-06.
- Nhánh: `AGRI-128-history-integration`.
- Base/đích tích hợp theo người dùng: `AGRI-128-backend-improvement`.
- Owner: chưa xác minh; reviewer backend theo rules: Tran Trung Thong.
- Trạng thái hiện tại: backend A/B đã kiểm chứng lại và gửi [PR #45](https://github.com/KayPham05/AgriAI/pull/45) ngày 2026-10-24; chờ CI, review và nghiệm thu thủ công, chưa hoàn tất Jira.

## 2026-10-21 — Tạo nhánh và khảo sát

- Theo yêu cầu chỉ tạo nhánh cùng lập kế hoạch, fetch origin và tạo worktree tại
  `D:/AgriAI/.worktrees/AGRI-128-history-integration` từ `ad22a8a`.
- Giữ `D:/AgriAI` ở nhánh Guest `2d2c875`; giữ nguyên ba file untracked
  `Dockerfile.ai`, `docker-compose.ai.yml`, `frontend/package-lock.json`.
- Bổ sung `/.worktrees/` vào local `.git/info/exclude`, không sửa `.gitignore`.
- Đọc rules/base mới: auth/profile user/admin/filter history đã có thay đổi;
  schema hồ sơ đã có, nhưng chưa thấy CRUD hồ sơ hoặc contract repository của S3-03.
- Lập [kế hoạch](../../plans/AGRI-128-history-integration-plan.md) về profile tùy chọn,
  ownership trước AI/storage, snapshot/TTL, SET NULL, failure cleanup và test matrix.
- [Báo cáo khảo sát](../../reports/AGRI-128/README.md) ghi nguồn kiểm chứng cụ thể.

## Kiểm chứng và giới hạn

- Đã kiểm tra Git worktree, commit base và source liên quan; không chạy test/build
  vì chưa thay implementation. Không lấy kết quả nhánh Guest làm bằng chứng mới.
- Chưa chạy môi trường mới hoặc migration; không tác động PostgreSQL/AI/API đang
  phục vụ kiểm thử Guest. Không copy secrets/checkpoints/uploads sang worktree.
- Chưa stage/commit/push/PR. Nhánh và tài liệu mới chỉ ở local.

## Việc cần chốt trước triển khai

- Người dùng duyệt kế hoạch; xác nhận nhánh/contract repository của S3-03.
- Chốt đề xuất 404 cho profile không tồn tại/khác owner và Guest bỏ qua profile ID.
- Chốt metadata profile trên response; giữ snapshot chẩn đoán bất biến khi xóa hồ sơ.
- Phối hợp tích hợp S3-05 để không ghi đè thay đổi xác thực của nhánh Guest.

## 2026-10-21 — Phân định hai phần theo yêu cầu người dùng

- Tách kế hoạch thành A: lịch sử độc lập với CRUD hồ sơ, và B: tích hợp hồ sơ
  với S3-03. Chia cả trình tự thực hiện và ma trận kiểm thử theo hai phần.
- Ghi rõ CRUD AgriculturalProfile do S3-03 xây; AGRI-119 dùng repository đọc/
  kiểm quyền, gắn kết quả và kiểm chứng ảnh hưởng của cập nhật/xóa hồ sơ.
- Phần A không cần chốt repository hồ sơ mới bắt đầu; phần B cần thống nhất
  contract trước, có thể dùng fixture DB khi API CRUD chưa sẵn sàng.
- Chỉ chỉnh kế hoạch, report và log; chưa thay code hoặc chạy test ứng dụng.

## 2026-10-21 — Triển khai phần A theo yêu cầu người dùng

- Chạy baseline trong worktree mới: 57 unit + 83 integration đạt, 0 fail/skip;
  coverage 283/476 = 59.45%, chưa đạt gate 60% ngay trước sửa.
- Áp dụng TDD cho lỗi top-k legacy: test RED trả `[1, 0]` sai rank, sửa
  `MapToResultDto` thêm OrderBy Rank, test GREEN 1/1. Không viết lại snapshot cũ.
- Thêm 7 unit cases và 9 HTTP/PostgreSQL cases, kiểm phần A không gắn hồ sơ:
  lưu đầy đủ, đọc phiên mới, phân trang/owner, snapshot/TTL, Guest no-write,
  upload/AI/SaveChanges/cleanup/cancellation failures.
- Test rollback dùng constraint tạm trong DB Testcontainers riêng; không đụng
  database ứng dụng hoặc migration. AI/storage là test doubles được ghi rõ.
- Focused 27 service + 9 integration đạt. Build cuối 0 warnings/errors;
  full verification/coverage cuối đang chạy.
- File runtime sửa duy nhất: `PredictionService.cs`; tests sửa/thêm:
  `PredictionServiceTests.cs`, `HistoryPersistenceTests.cs`.
- Bằng chứng chi tiết: [history_part_a.md](../../reports/AGRI-128/history_part_a.md).
- Chưa thực hiện phần B; chưa stage/commit/push/PR hoặc cập nhật Jira Done.

### Kết quả full verification và bàn giao phần A

- `dotnet build backend/AgriVision.sln --no-restore`: đạt, 0 warnings/errors.
- Unit 64/64; integration thường 92/92; 0 fail/skip. Category RealCheckpoint
  được loại theo workflow CI, không phải đã chạy inference thật.
- ReportGenerator 5.5.4 gộp 289/476 nhánh = 60.71%; coverage checker gate 60%
  PASS, cao hơn baseline 59.45%; target 80% chưa đạt. Hai TRX checker đều PASS.
- Gitleaks v8.24.2 quét diff và file mới không phát hiện leak; `git diff --check`
  đạt. Artifact và lệnh đầy đủ tại báo cáo phần A, dưới `.cache/history-part-a/`.
- Không cập nhật môi trường Guest đang chạy hoặc migrate database ứng dụng;
  toàn bộ test DB trong lượt này dùng PostgreSQL disposable của Testcontainers.
- Chờ người dùng nghiệm thu phần A; không tự bắt đầu phần B, commit, push hoặc PR.

## 2026-10-23–2026-10-24 — Tiếp tục History sau khi CRUD tích hợp

- Người dùng yêu cầu làm tiếp History, AGRI-122 để sau. Fast-forward nhánh
  `AGRI-128-history-integration` lên `a43797d`; bảo toàn phần A qua stash
  `18e23c987d6c619f5cfbf8b85b22d32da93a7746` vẫn giữ làm dự phòng.
- Base đã có repository/CRUD hồ sơ và luồng chọn profile trên prediction.
  Tái sử dụng code này; giữ sửa top-k legacy và 7 test unit phần A; giải quyết
  xung đột test bằng cách giữ test cả hai phía, dùng named cancellationToken.
- Thêm 7 integration cases phần B vào `HistoryPersistenceTests.cs` (tổng 16 ca
  A/B): lifecycle qua CRUD, snapshot bất biến, filter/owner, ID lỗi, race xóa
  hồ sơ trong upload và cleanup ảnh khi lưu không thành công.
- RED: 98 unit đạt; integration 154/156, fail GUID rỗng 404 thay vì 400 và
  assertion thời gian .NET/PostgreSQL. Thêm guard Guid.Empty trong service,
  test timestamp dùng dung sai 1 microsecond, snapshot vẫn so JSONB chính xác.
- GREEN: 16/16 History integration đạt, 0 fail/skip. Build đạt 0 warning/error.
  Full suite/coverage đang chạy, cập nhật kết quả ở phần tiếp theo.
- SDK9 cũ không còn trên host: tải SDK 9.0.305 chính thức, kiểm SHA512 và dùng
  trong cache. Restore lại fallback NuGet cũ; không đổi framework/dependency.
- Gitleaks v8.24.2 quét diff code + test mới: không phát hiện leak.
- Các sửa đổi runtime nằm trong `PredictionService.cs`; tests ở
  `PredictionServiceTests.cs` và `HistoryPersistenceTests.cs`. Không thay CRUD,
  schema, auth, frontend hoặc worktree gốc. Không commit/push/PR.
- [Báo cáo, lệnh kiểm chứng và hướng dẫn manual phần B](../../reports/AGRI-128/history_part_b.md).
- Còn chờ chốt Guest gửi profile ID: base trả 401; hiện giữ nguyên, không tự
  chuyển sang bỏ qua profile. Race xóa sau ownership trả 500 theo save error,
  rollback bảo vệ dữ liệu; cleanup thất bại có thể còn ảnh orphan để xử lý.

### Kết quả full verification 2026-10-24

- Build đạt 0 warning/error. Full suite đạt 98 unit + 156 integration, tổng
  254/254, 0 fail/skip; Category RealCheckpoint được loại đúng CI thường.
- ReportGenerator 5.5.4: 369/554 branch = 66.61%; checker gate 60% PASS,
  target 80% chưa đạt. Không đổi ngưỡng hay exclusions.
- Checker TRX ban đầu từ chối thư mục có hai suite; tách bản sao artifact
  theo suite rồi kiểm lại: 98/98 và 156/156 PASS. Chi tiết/lệnh tại báo cáo B.
- `git diff --check` đạt; quét secret diff code/test mới đạt. Báo cáo có hướng
  dẫn manual 8 bước khi chạy đúng nhánh History; chưa thực hiện manual ở lượt này.
- Worktree gốc giữ nguyên các sửa đổi khác; không commit, push, PR hoặc migrate
  database ứng dụng. Chờ người dùng nghiệm thu và chốt Guest profile 401/bỏ qua.

## 2026-10-24 — Chuẩn bị PR History theo yêu cầu người dùng

- Người dùng yêu cầu tạo PR, đọc danh sách 7 unit + 16 integration mới, xác nhận tiếp tục;
  không viết E2E. Rà ma trận 6 AC với các test mới và test ranh giới quyền có sẵn.
- Fetch remote: base vẫn `a43797d`, không có PR trùng cho nhánh History. Target theo
  người dùng là `AGRI-128-backend-improvement`, khác default main của rules.
- Reviewer backend xác minh trên GitHub: Trần Trung Thông (`trunthong09012005`).
  Tài khoản gửi PR/commit: `nguyenquangvinh159`; không tự approve.
- Lần chạy mới trước PR: build 0 warning/error; 98 unit + 156 integration = 254/254 đạt,
  không skip theo bộ lọc CI; coverage 369/554 = 66.61%, gate 60% PASS, target 80% chưa đạt.
  Bằng chứng `.cache/history-pr/{build.log,unit/unit.trx,integration/integration.trx,merged/Cobertura.xml}`.
- Checker TRX cả hai bộ đạt; commitlint subject 0 problem/warning; diff whitespace đạt.
  Review và quét chữ ký private key/token cho 8 file thay đổi/mới không thấy credential.
- Chỉ gửi code/test/tài liệu History, không chứa AGRI-122, không đổi schema, auth, CRUD
  hồ sơ hoặc frontend. Không migrate database ứng dụng. Worktree khác giữ nguyên.
- Manual History chưa thực hiện theo người dùng; giữ 401 khi Guest gửi profile của base.
  Race hồ sơ bị xóa vẫn có thể trả 500 nhưng rollback/cleanup được kiểm thử. Ghi rõ trong PR.
- PR đang được chuẩn bị từ kết quả trên; chưa xác nhận CI hoặc chuyển Jira Done.

### PR đã tạo

- [PR #45 — AGRI-119 Complete diagnosis history and profile integration](https://github.com/KayPham05/AgriAI/pull/45).
- Head `AGRI-128-history-integration` → base `AGRI-128-backend-improvement`.
- Commit code/test: `6e88927`; chỉ 8 file History. Đã push và yêu cầu review từ
  `trunthong09012005`; không tự approve hoặc merge.
- GitHub Actions đã khởi chạy khi tạo PR; chưa ghi nhận thành công, giữ checklist CI
  chưa tick. Cập nhật đường dẫn PR là thay đổi tài liệu, không thay code đã kiểm chứng.

## 2026-10-26 — Sửa CI History sau conflict resolution

- Đồng bộ fast-forward từ `d1e96fe` tới remote `116205b`, giữ phần người dùng đã
  giải quyết conflict và base `7aa28c9`. Worktree Guest/Knowledge giữ nguyên.
- Xác minh PR #45 lỗi build do fixture/interface storage cũ; `ci-gate` thất bại theo.
- Chuyển 16 ca HTTP History vào ApiTests/TestSupport, cập nhật private storage double,
  11 ApiCase và các kỳ vọng cleanup/journal/legacy image của unit tests.
- Không đổi code nghiệp vụ, migrations hoặc workflow; không giảm gate, bỏ test hay viết E2E.
- Bằng chứng, các ca lỗi trung gian và kiểm chứng cuối:
  [History phần B, mục 7](../../reports/AGRI-128/history_part_b.md#7-sửa-ci-sau-tích-hợp-nhánh-128--2026-10-26).
- Kiểm chứng cuối local: 163 unit + 65 integration + 255 API = 483/483, không skip trong bộ lọc CI; branch 881/1054 = 83.59%, gate 70% PASS; ba checker TRX/Cobertura đạt. Không E2E/RealR2/RealCheckpoint. Chờ CI remote sau push và review/manual.
