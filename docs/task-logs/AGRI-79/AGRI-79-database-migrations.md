# AGRI-79 — Schema, migration và kiểm thử backend–PostgreSQL

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
| Migration có lịch sử | [ConfirmedRequirementsSchema](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs), Designer và [snapshot](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs); tool EF pin 9.0.2 tại [.config/dotnet-tools.json](../../../.config/dotnet-tools.json) |
| Startup/cleanup | [Program.cs](../../../backend/src/AgriVision.API/Program.cs), [DbInitializer](../../../backend/src/AgriVision.Infrastructure/Persistence/DbInitializer.cs), [ImageExpiryCleanup](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs), [CloudinaryImageStorage](../../../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs) |
| Prediction/auth | [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), DTO/controller/repository liên quan; [AuthService](../../../backend/src/AgriVision.Application/Services/Implementations/AuthService.cs) từ chối password login khi hash NULL |
| Kiểm thử | [Unit tests](../../../backend/tests/AgriVision.UnitTests/Services/), [integration controllers](../../../backend/tests/AgriVision.IntegrationTests/Controllers/), [migration/persistence tests](../../../backend/tests/AgriVision.IntegrationTests/Persistence/), [fixture](../../../backend/tests/AgriVision.IntegrationTests/Fixtures/AgriVisionFactory.cs) |
| Docker | [docker-compose.ci.yml](../../../docker-compose.ci.yml); image backend root Compose đã build lại từ source |
| Kiểm chứng local | [verify_database.ps1](../../../.agents/commands/verify_database.ps1) |
| Tài liệu/lệnh | [migration](../../notes/database_migrations.md), [entity/ERD](../../notes/database_entities.md), [commands index](../../../.agents/commands/README.md), hướng dẫn Docker và các tài liệu quyết định/hiện trạng liên quan |

## 3. Kết quả kiểm chứng

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
- Chưa nghiệm thu FastAPI/ConvNeXt-Tiny thật hoặc đồng bộ catalog 59 lớp. Catalog
  legacy hiện có không được coi là mapping v1.4 hoàn chỉnh.
- Multi-image upload, email verification/Google/reset endpoints chưa hoàn thiện;
  có schema hỗ trợ không đồng nghĩa chức năng đã triển khai đầy đủ.
- Chưa hoàn thiện validation nội dung/kích thước ảnh, UI hết hạn, cơ chế truy cập
  ảnh riêng tư hoặc scheduler cleanup 30 ngày.
- Chưa chạy GitHub Actions ở HEAD này hoặc thử restore. Coverage backend đã được ghi riêng trong báo cáo AGRI-75; không đo lại trong lần kiểm tra sau apply stash.
- Chờ xác nhận owner để đổi hậu tố tên file theo quy ước thành viên; hiện dùng
  `database-migrations` mô tả nội dung. Đặt bằng chứng vào `docs/reports/AGRI-79/`
  khi chuẩn bị PR. Chưa đánh dấu Jira Done.

## 5. Cách chạy lại

Theo [Docker](../../../.agents/commands/docker.md) và [database](../../../.agents/commands/database.md):
backup/review → build → PostgreSQL healthy → migration riêng → startup API.
Sau đó chạy [unit/integration/live smoke](../../../.agents/commands/backend.md) độc lập.
Live script tự dọn fixture; lệnh expire-images là thao tác xóa ảnh hết hạn thật,
không chạy kèm như một bước kiểm thử mặc định.
