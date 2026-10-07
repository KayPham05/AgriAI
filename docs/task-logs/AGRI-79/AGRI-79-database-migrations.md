# AGRI-79 — Schema, migration và kiểm thử backend–PostgreSQL

## Kiểm tra lại integration trước commit — 07/10/2026

- Chạy lại toàn bộ integration tests với quyền truy cập Docker:
  **33/33 đạt**, failed/skipped 0; lần kiểm tra này không tái diễn lỗi kết nối
  Docker được ghi nhận trong đợt review trước. Unit gần nhất vẫn là **33/33 đạt**.
- Lệnh: `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --verbosity quiet --logger trx --results-directory .cache/database-verification/integration-precommit-recheck`.
- TRX local/ignored: `.cache/database-verification/integration-precommit-recheck/Admin_ADMIN-PC_2026-10-07_14_19_10.trx`.
  PostgreSQL Testcontainers thật, AI/storage giả; không kiểm chứng inference
  thật hoặc GitHub Actions. `git diff --check` đạt.

## Sửa cleanup thiếu public ID trên nhánh database — 07/10/2026

- Áp dụng bản sửa từ worktree `5dd4` vào `AGRI-79-database-integration`,
  giữ nguyên thay đổi catalog v1.4 và tài liệu hiện có.
- `ImageExpiryCleanup` từ chối public ID NULL/rỗng/khoảng trắng; giữ URL,
  metadata, snapshot và `DeletedAt = null`, ghi lỗi và trả exit code 1.
  Chỉ đánh dấu đã xóa sau khi storage xác nhận thành công.
- Thêm 3 ca integration: chạy lặp vẫn giữ dữ liệu, API ẩn URL ảnh hết hạn,
  retry thành công sau khi bổ sung public ID. Dùng PostgreSQL Testcontainers
  thật, AI/storage giả; không thay migration hoặc chạy cleanup trên DB ứng dụng.
- Kiểm chứng trên nhánh hiện tại: **33 unit + 33 integration đạt**,
  failed/skipped 0; `git diff --check` đạt. Lệnh:
  `dotnet test backend/AgriVision.sln --no-restore --verbosity quiet --logger trx --results-directory .cache/database-verification/missing-public-id-fix`.
- TRX local/ignored: `.cache/database-verification/missing-public-id-fix/Admin_ADMIN-PC_2026-10-07_13_57_21.trx`
  (unit) và `Admin_ADMIN-PC_2026-10-07_13_57_25.trx` (integration).
  Chưa commit/push hoặc chạy GitHub Actions/inference thật.

## Sửa tài liệu sau review trước commit — 07/10/2026

- Xóa 12 link tới User Story/quyết định phỏng vấn local khỏi docs index;
  các file bản nháp vẫn giữ local và được `.gitignore` loại khỏi Git.
- Thống nhất hướng dẫn: `DatasetV14Catalog` nạp catalog v1.4 qua migration
  trong mọi môi trường; import SQL riêng là tùy chọn, DB mới không cần chạy thêm.
- Phân biệt số liệu kiểm chứng lịch sử với kết quả migration catalog mới;
  hướng dẫn dùng cổng PostgreSQL do Compose trả về thay vì cổng local cố định.
- Review trước đợt sửa tài liệu này đã chạy lại backend: **33 unit + 30 integration
  đạt**, failed/skipped 0; TRX local tại `.cache/database-verification/precommit-review/`.
  Đợt sửa chỉ thay Markdown, không chạy lại backend tests hoặc thao tác DB.
- Kiểm tra sau sửa: 109 link nội bộ trong 6 file tồn tại trong phạm vi Git,
  không còn link tới bản nháp ignored; kiểm tra whitespace và `git diff --check` đạt.

## Hoàn thiện hướng dẫn migration dùng chung — 07/10/2026

- Gộp hai bản hướng dẫn thành một, rút gọn theo hai tình huống chính: pull code
  có migration mới để áp dụng vào DB local; sửa Entity/configuration để tạo,
  review, test và chia sẻ migration mới.
- Chuyển file từ `docs/notes/` sang
  [docs/docker_database_guide.md](../../docker_database_guide.md); bỏ bản
  `database_workflow_guide.md`. Cập nhật liên kết từ docs index, database README,
  command guides và các báo cáo/task log liên quan.
- Bổ sung lưu ý khi nhiều người tạo migration, migration lỗi, chỉ cập nhật dữ liệu
  và chuyển branch có schema khác. Giữ backup, EF history và volume ứng dụng.
- Thêm **3 sơ đồ Mermaid**: áp dụng sau pull, tạo migration mới và quyết định
  hủy bản nháp hay sửa bằng migration mới.
- Kiểm tra tài liệu: **12 khối PowerShell** không lỗi cú pháp; ba sơ đồ không có
  liên kết tới nút thiếu, các đường dẫn tài liệu và source hợp lệ.
- Đợt này chỉ cập nhật Markdown; không chạy lại backend tests, migration, rollback
  hoặc restore DB. Kết quả backend gần nhất vẫn là **33 unit + 30 integration**
  ở [báo cáo migration catalog](../../reports/AGRI-79/catalog_ef_migration.md),
  không phải kết quả kiểm thử mới. Chưa commit/push/merge hoặc chạy CI HEAD.

## Backend catalog migration chạy bằng dotnet — 07/10/2026

- Theo yêu cầu mới, tạo `20261007032722_DatasetV14Catalog` bằng EF CLI rồi
  áp dụng vào `agrivision_db` bằng `dotnet ef database update`.
- `Up()` đồng bộ catalog trong transaction EF; `Down()` chặn downgrade để
  bảo vệ identity/history. Bỏ seed demo 11 lớp; catalog mới đi qua migration.
- DB có 3 migration, 59 lớp active và 3 legacy inactive; 62 ID/index/name/status
  không đổi. `.env` local chuyển PostgreSQL host port từ 55434 bị Windows chặn
  sang 5432; volume/data giữ nguyên, có backup trước cập nhật.
- Toàn bộ backend tests: **33 unit + 30 integration đạt**, failed/skipped 0;
  gồm upgrade DB trống/đã import, rollback conflict và chặn downgrade.
- [Báo cáo và bằng chứng](../../reports/AGRI-79/catalog_ef_migration.md).
  Chưa commit/push/merge hoặc chạy GitHub Actions/inference thật.

## Tổ chức SQL, hướng dẫn Docker và bổ sung test — 07/10/2026

- Chuyển SQL catalog vào `database/`, cập nhật resource test và các đường dẫn;
  migration schema C# giữ trong backend. SQL EF xuất để xem đặt local ở
  `database/generated/`, được ignore.
- Thêm [hướng dẫn Docker/database dùng chung](../../docker_database_guide.md),
  liên kết từ mục lục docs, database và command guide.
- Test catalog có 9 case, gồm đủ 59 nhãn, giữ nội dung duyệt, sáu nhánh lỗi và
  rollback toàn bộ 9 bảng nghiệp vụ. Bản cuối **33 unit + 22 integration đạt**,
  failed/skipped 0; PostgreSQL test containers thật đã tự dọn.
- [Bằng chứng và giới hạn](../../reports/AGRI-79/database_guide_testing.md).
  Không thay migration/runtime startup, không rollback DB ứng dụng hoặc xóa
  volume; chưa commit/push/merge và chưa chạy GitHub Actions.

## Cập nhật catalog v1.4 — 07/10/2026

- Theo yêu cầu bổ sung đủ dataset v1.4, đã backup và chạy SQL import riêng
  vào `agrivision_db`: **59 lớp active, 10 cây, 44 condition**.
- Đối chiếu đủ **59/59 index/name** với manifest chính thức và các split;
  giữ nguyên **11/11 ID legacy**, 3 lớp Potato giữ lại inactive ở index 59–61.
- Thêm SQL import lặp lại được, test PostgreSQL cho DB trống/legacy/giữ lịch sử
  và hướng dẫn vận hành; không sửa migration cũ hoặc seed demo của test.
- Bộ integration đạt **15/15**; sau chỉnh sửa cuối ở import, hai case import
  chạy lại đạt **2/2**. API qua Next.js trả 10 cây, 44 condition, DB Healthy.
- Chi tiết và bằng chứng: [catalog v1.4](../../reports/AGRI-79/dataset_v1_4_catalog.md).
  Các số 11 lớp/thiếu mapping trong phần lịch sử bên dưới thuộc trước import.
- Chưa commit/push/merge; inference thật, UI danh mục hoàn chỉnh và review/CI
  vẫn chưa được nghiệm thu.

- **Jira:** `AGRI-79`; đồng bộ task log theo yêu cầu sửa tài liệu lệch ngày 07/10/2026.
- **Trạng thái tài liệu:** Bản nháp đã gắn Jira, chờ review.
- **Owner:** Chưa xác nhận, không tự gán.
- **Ngày thực hiện/kiểm chứng runtime ban đầu:** 06/10/2026; kiểm tra lại sau apply stash: 07/10/2026.
- **Cập nhật task log/lệnh:** 07/10/2026.
- **Branch làm việc:** `AGRI-79-database-integration`.
- **PR/commit:** Commit local được ghi trong lịch sử nhánh AGRI-79; chưa tạo PR hoặc đánh dấu Jira Done.
- **Nguồn yêu cầu:** [yêu cầu hệ thống](../../system_requirements.md) và yêu cầu người dùng về migration riêng, giữ lịch sử, unit/integration tests, dọn dữ liệu kiểm tra. Tài liệu User Story và biên bản phỏng vấn local được giữ ngoài commit.

## 1. Công việc đã thực hiện

Kiểm tra PostgreSQL image và kết nối bằng image backend thật trong Docker Compose.
Database ứng dụng là `agrivision_db`, không phải database ERD riêng. Hoàn thiện
schema theo các quyết định đã chốt trong phạm vi persistence và tạo migration có
lịch sử. Startup API không tự migration: chạy job `--migrate` riêng trước khi mở API.
Kiểm thử cũng chạy bằng lệnh riêng.

- Thêm `prediction_images`, `user_identities`, `user_action_tokens`; cập nhật trường
  User/Disease/Prediction, EF configurations và model snapshot. Schema hiện có
  9 bảng nghiệp vụ, không tính `__EFMigrationsHistory`.
- Migration backfill metadata ảnh cũ với thời hạn 30 ngày; snapshot gốc không tồn
  tại được giữ NULL. Không xóa lịch sử để nâng schema.
- Lưu snapshot kết quả cho prediction mới có chủ sở hữu, bảo vệ quyền xem lịch sử,
  không lưu ảnh/lịch sử của guest. Chặn mapping lớp không khớp trước bước lưu ảnh.
- Hiển thị thuốc khi nội dung được duyệt và confidence >80%; cảnh báo ở ngưỡng
  ≤80%. Khi lưu prediction lỗi, cố gắng dọn ảnh đã upload và giữ lỗi gốc.
- Thêm lệnh `--expire-images`: xóa ảnh hết hạn, giữ prediction/snapshot; giữ metadata
  để retry khi storage lỗi. API ẩn URL hết hạn. Chưa có lịch chạy cleanup tự động.
- CI Compose override có job migration riêng. Production migration không seed catalog demo.
- Gate backend được nâng riêng từ 35% lên 50% theo yêu cầu; frontend/Python giữ nguyên. Coverage đã đo 213/364 = 58,52%, xem [báo cáo coverage](../../reports/AGRI-75/ci_branch_coverage.md).
- Bổ sung unit/integration tests và script kiểm tra API–DB có marker/cleanup riêng.
- Viết hướng dẫn migration, giải thích entity/ERD và tách lệnh trong `.agents/commands`.

## 2. Các thay đổi chính

| Thành phần | Nguồn thay đổi |
|---|---|
| Domain và mapping | [Entities](../../../backend/src/AgriVision.Domain/Entities/), [Configurations](../../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/), [AppDbContext](../../../backend/src/AgriVision.Infrastructure/Persistence/AppDbContext.cs) |
| Migration có lịch sử | [ConfirmedRequirementsSchema](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs), [DatasetV14Catalog](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261007032722_DatasetV14Catalog.cs), Designer và [snapshot](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs); tool EF pin 9.0.2 tại [.config/dotnet-tools.json](../../../.config/dotnet-tools.json) |
| Startup/cleanup | [Program.cs](../../../backend/src/AgriVision.API/Program.cs), [DbInitializer](../../../backend/src/AgriVision.Infrastructure/Persistence/DbInitializer.cs), [ImageExpiryCleanup](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs), [CloudinaryImageStorage](../../../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs) |
| Prediction/auth | [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), DTO/controller/repository liên quan; [AuthService](../../../backend/src/AgriVision.Application/Services/Implementations/AuthService.cs) từ chối password login khi hash NULL |
| Kiểm thử | [Unit tests](../../../backend/tests/AgriVision.UnitTests/Services/), [integration controllers](../../../backend/tests/AgriVision.IntegrationTests/Controllers/), [migration/persistence tests](../../../backend/tests/AgriVision.IntegrationTests/Persistence/), [fixture](../../../backend/tests/AgriVision.IntegrationTests/Fixtures/AgriVisionFactory.cs) |
| Docker | [docker-compose.ci.yml](../../../docker-compose.ci.yml); image backend root Compose đã build lại từ source |
| Kiểm chứng local | [verify_database.ps1](../../../.agents/commands/verify_database.ps1) |
| Tài liệu/lệnh | [hướng dẫn migration dùng chung](../../docker_database_guide.md), [chi tiết migration](../../notes/database_migrations.md), [entity/ERD](../../notes/database_entities.md), [commands index](../../../.agents/commands/README.md) và các tài liệu quyết định/hiện trạng liên quan |

## 3. Kết quả kiểm chứng

### Lịch sử kiểm chứng trước migration catalog v1.4

Bảng và bằng chứng dưới đây thuộc đợt schema ban đầu và kiểm tra sau apply stash,
trước khi có `DatasetV14Catalog`. Kết quả mới hơn (3 migration, 59 lớp active,
33 unit + 30 integration) được ghi ở phần cập nhật phía trên và báo cáo catalog.

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| Build/backend image | Đã build, container chạy đúng image mới; web/API/PostgreSQL healthy. | Không phải bằng chứng CI HEAD. |
| Migration DB ứng dụng | InitialCreate + ConfirmedRequirementsSchema được áp dụng; chạy lần hai không áp dụng trùng. | Không thử downgrade hoặc restore production. |
| Unit tests | **33/33 đạt**, executed 33, failed 0. | Chưa đo coverage. |
| Integration tests | **13/13 đạt**, executed 13, failed 0; PostgreSQL thật qua Testcontainers. | Prediction dùng fake AI/storage, không inference thật. |
| API–DB bằng image đang chạy | Register/login/me, catalog create/read/update/soft-delete, migration history, owner A/B, snapshot/expiry và xóa lịch sử đều đạt. | History dùng SQL fixture, không upload ảnh hay chạy model. |
| Dọn sau kiểm tra | Script báo CLEANUP PASS; tài khoản/catalog/history fixture đã dọn. Container/database probe và Testcontainers tạm đã dọn. | Giữ database/volume ứng dụng và backup, không xóa dữ liệu thường. |
| Startup trên DB trống | Từ chối khi còn pending migration, tạo 0 bảng; `--migrate` sau đó áp dụng 2 migration, seed 0 cây trong Production. | Probe riêng đã dọn. |
| Proxy web → API | `/api/health` trả database Healthy. | Không kiểm chứng inference xuyên web–AI. |

Bằng chứng local (ignored, không đưa vào Git vì có dữ liệu/log môi trường):

- `.cache/database-verification/final/Admin_ADMIN-PC_2026-10-06_23_23_59.trx`: unit 33/33.
- `.cache/database-verification/final/Admin_ADMIN-PC_2026-10-06_23_24_00.trx`: integration 13/13.
- `.cache/database-verification/live_api_db.txt`: log lần kiểm tra API–DB cuối, 986 bytes, có CLEANUP PASS. Capture với `*>&1` để giữ cả `Write-Host`.
- `.cache/database-verification/startup_without_migrations.txt`: log startup từ chối, 918 bytes.
- `.cache/database-verification/agrivision_before_confirmed_schema.dump`: backup trước nâng schema, 17.784 bytes; chưa kiểm thử restore.

Khi bổ sung tài liệu, đã đọc lại counters TRX và log API–DB; không chạy lại bộ C# tests
chỉ vì thay đổi Markdown. Live smoke đã chạy lại và dọn xong. Các hướng dẫn mới là
lệnh để sử dụng về sau, không khẳng định mọi ví dụ (tạo migration mới/coverage/mock
smoke/frontend/AI) đã chạy trong lần này.

Kiểm tra tài liệu bổ sung ngày 07/10/2026: 11 Markdown, 116 liên kết nội bộ hợp lệ,
60 dấu code fence cân bằng, không có trailing whitespace; parse 28 ví dụ PowerShell
không lỗi cú pháp và không thực thi các ví dụ. `git diff --check` đạt với diff tracked;
file mới cũng được kiểm tra riêng. Log live smoke và backup vẫn được Git ignore.

### Kiểm tra lại sau apply stash — 07/10/2026

- Unit **33/33**, integration **13/13**, failed 0, skipped 0; integration dùng PostgreSQL thật, AI/storage giả lập.
- Backend container đang chạy đọc/ghi PostgreSQL thật đạt: tài khoản, CRUD danh mục, lịch sử/snapshot/expiry, quyền owner và xóa. Migration source khớp lịch sử DB; script báo CLEANUP PASS.
- Log/TRX: `.cache/database-verification/after-stash-apply/Admin_ADMIN-PC_2026-10-07_02_59_42.trx` (unit), `.cache/database-verification/after-stash-apply/Admin_ADMIN-PC_2026-10-07_02_59_43.trx` (integration), `.cache/database-verification/recheck-20261007/after-apply-live.txt` (API–DB).
- Không chạy lại build Docker, đo coverage, inference thật hoặc restore trong lần này. Các bằng chứng phía trên thuộc những lần kiểm tra trước; việc sửa liên kết/Jira không tạo kết quả test mới.

## 4. Giới hạn và việc còn lại

- ERD hình/SQL 6 bảng là baseline lịch sử; AGRI-76 đã bổ sung ERD hiện tại. Tài liệu entity mô tả 9 bảng
  và quan hệ mới; migration/schema ứng dụng là nguồn đối chiếu hiện tại.
- Catalog v1.4 đã đồng bộ đủ 59 lớp active qua migration backend; giữ lớp legacy
  inactive để bảo toàn lịch sử. Chưa nghiệm thu FastAPI/ConvNeXt-Tiny thật xuyên
  CLI–HTTP–API–web; UI danh mục bệnh còn trộn dữ liệu tĩnh.
- Multi-image upload, email verification/Google/reset endpoints chưa hoàn thiện;
  có schema hỗ trợ không đồng nghĩa chức năng đã triển khai đầy đủ.
- Chưa hoàn thiện validation nội dung/kích thước ảnh, UI hết hạn, cơ chế truy cập
  ảnh riêng tư hoặc scheduler cleanup 30 ngày.
- Chưa chạy GitHub Actions ở HEAD này hoặc thử restore. Coverage backend đã được ghi riêng trong báo cáo AGRI-75; không đo lại trong lần kiểm tra sau apply stash.
- Chờ xác nhận owner để đổi hậu tố tên file theo quy ước thành viên; hiện dùng
  `database-migrations` mô tả nội dung. Đặt bằng chứng vào `docs/reports/AGRI-79/`
  khi chuẩn bị PR. Chưa đánh dấu Jira Done.

## 5. Cách chạy lại

Theo [hướng dẫn migration dùng chung](../../docker_database_guide.md),
[Docker](../../../.agents/commands/docker.md) và [database](../../../.agents/commands/database.md):
PostgreSQL healthy → backup/review → build → migration riêng → startup API.
Sau đó chạy [unit/integration/live smoke](../../../.agents/commands/backend.md) độc lập.
Live script tự dọn fixture; lệnh expire-images là thao tác xóa ảnh hết hạn thật,
không chạy kèm như một bước kiểm thử mặc định.

## 6. Hướng dẫn repo, skill và phương án VPS — 07/10/2026

- Theo yêu cầu người dùng, phần cập nhật hướng dẫn/skill/phương án VPS được gắn `AGRI-79`; tài liệu skill vẫn giữ thông tin lịch sử về lần bổ sung ban đầu thuộc AGRI-76.
- Rút gọn `AGENTS.md`, cập nhật trạng thái DB/FastAPI và gate coverage; `.gitignore` giữ User Story/biên bản local, backup DB và credential ngoài Git, vẫn cho phép cấu hình mẫu và migration/schema SQL.
- Chuyển các tài liệu hỗ trợ skill DevOps sang tiếng Anh; giữ Compose/CI và giới hạn quyền thao tác, không thay helper, cài công cụ hoặc deploy.
- Ghi [phương án VPS demo](../../vps_deployment.md): Compose một máy, Caddy/GHCR, Cloudinary mặc định hoặc GCS, migration riêng, backup/rollback và checklist nghiệm thu. Sửa đường dẫn liên kết theo vị trí `docs/vps_deployment.md`.
- Kiểm tra ignore, liên kết tài liệu, whitespace, commitlint và quét nội dung staged bằng Gitleaks; không chạy lại test ứng dụng vì chỉ thay tài liệu/ignore. Kết quả backend tại phần 3 thuộc lần kiểm tra trước.
- Các commit liên quan xem lịch sử nhánh AGRI-79. Chưa push, tạo PR, chạy CI HEAD, thuê VPS hoặc triển khai; không commit tài liệu User Story hay các thay đổi/xóa tài liệu ngoài phạm vi.
