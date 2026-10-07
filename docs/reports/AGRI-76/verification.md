# AGRI-76 — Kiểm chứng và Definition of Done

## Đối chiếu source/schema mới — 07/10/2026

Bộ mô hình hiện tại đã sửa theo working tree sau AGRI-70; commit 99d6e56 chỉ là
baseline trước thay đổi. ERD 6 bảng và metadata cũ giữ lịch sử; ERD hiện tại có
9 bảng/69 cột nghiệp vụ, metadata đọc live thành công ngày 07/10.

| Kiểm tra mới | Kết quả / nguồn |
|---|---|
| Database live | [database_schema_current.json](assets/database_schema_current.json): agrivision_db, 2 migration, 9 bảng/69 cột; metadata không chứa dữ liệu user. |
| ERD mới | [erd_current](diagrams/erd_current.puml): tên bảng/cột/nullability khớp metadata, đủ 9 FK và PK/unique/CHECK/default/type; erd cũ giữ riêng. |
| Source/behavior | Controller/PredictionService/Repositories/DTO/Program: AI + strict mapping trước storage; guest không persist; GET detail JWT/owner; snapshot/expiry/cleanup; catalog soft-delete. |
| PlantUML | 36 source render SVG/gallery thành công bằng renderer repo và jar 1.2025.2. |
| SVG/gallery | 36 XML/accessibility/title/desc đạt; IDs trong gallery không trùng; skill self_check.py trả OK. |
| Review độc lập | [Review resolution](review_resolution_2026-10-07.md): subagent PASS vòng 2, không còn P1/P2; kiểm trực tiếp SVG đủ 69 cột. Không thay Team Lead review. |
| Visual QA mới | Xem tám sơ đồ bị ảnh hưởng; ERD và DFD Level 1 refresh sau render cuối. DFD rộng đọc bằng cuộn ngang trong gallery. |
| Liên kết/anchors/fences | [Validation JSON](assets/documentation_validation_2026-10-07.json): kiểm các Markdown trong report và tài liệu tổng quan/tasklog liên quan; không có lỗi. |
| Runtime/model tests | Không chạy lại trong lần sửa tài liệu; bằng chứng AGRI-70 giữ riêng, không coi render/metadata là inference thật. |

## Checklist DoD hiện tại

Theo [Jira description](../../task-logs/AGRI-76/Jira-description.md), các mục kỹ thuật
đã có deliverable và subagent review vòng 2 xác nhận technical PASS.

- [x] Đọc và phân tích source hiện tại.
- [x] Phân tích database thực tế sau migration, giữ snapshot metadata.
- [x] Actor/functions/rules/dependencies và System Analysis.
- [x] BFD đến mức chức năng; migration/expiry là lệnh vận hành riêng.
- [x] DFD Level 0, Level 1, Level 2 prediction/auth; P3 đọc catalog và phân nhánh user/guest.
- [x] ERD hiện tại đủ 9 bảng, giữ baseline 6 bảng riêng.
- [x] Use Case Diagram và specification 10 mục tiêu.
- [x] Activity đúng prediction/result/history/auth hiện tại.
- [x] Sequence đúng endpoint/nhánh/status/owner/storage/DB hiện tại.
- [x] Class đúng 9 entity, DbSet/DTO/service signatures mới.
- [x] State đúng PredictionStatus UI; không tạo status DB giả.
- [x] Traceability giữa mô hình và nguồn; target_* tách mục tiêu khỏi hiện trạng.
- [x] Source editable và render/giải thích đã có trong workspace.
- [x] Review kỹ thuật độc lập của subagent và xử lý findings còn lại.
- [ ] Đã review với Team Lead (cần reviewer/feedback thật).
- [ ] Đã chỉnh theo feedback Team Lead.
- [x] Source/editable đã commit vào repository: `6fb0536` — `docs: AGRI-76 align requirements and diagrams with current schema`.

**DoD Jira chưa hoàn tất** vì còn review Team Lead/feedback. Source editable đã commit; không
đánh dấu subagent là Team Lead, không tạo phê duyệt/commit hash giả.

## Kiểm chứng lịch sử — 05/10/2026

Source baseline: `99d6e56b825f8448aae442b87a4b3e34ee338a52`. Đây là kiểm tra tài liệu/schema/render, không phải chạy các use case ứng dụng hoặc nghiệm thu model.

## Bằng chứng đã kiểm tra

| Check | Kết quả / căn cứ |
|---|---|
| Git baseline | Branch AGRI-76-requirements-analysis-design, working tree sạch trước thay đổi; ghi commit source cố định |
| PostgreSQL metadata | [Snapshot](assets/database_schema.json) từ Compose psql; không xuất dữ liệu người dùng |
| Migration ↔ DB | Sáu bảng, 43 cột nghiệp vụ khớp tên/kiểu/nullable/varchar length; đối chiếu defaults, 14 PK/FK/check constraints và 13 secondary indexes khai báo trong InitialCreate |
| ERD ↔ DB | Kiểm từng cột/kiểu/nullability trong erd.puml với snapshot; kiểm sáu FK/cardinality/delete rules và unique/check ở [DB verification](database_verification.md) |
| PlantUML | 28 source render SVG thành công bằng Java + PlantUML 1.2025.2; [script tái tạo](diagrams/render_diagrams.ps1) chạy thành công |
| SVG/HTML | Parse XML, accessible title/desc, DFD datastore hai đường song song, SVG inline; kiểm không trùng ID trong gallery |
| Skill validator | `self_check.py docs/reports/AGRI-76/diagrams/index.html` trả OK sau render cuối |
| Liên kết tài liệu | Kiểm relative file links tồn tại, fences cân bằng; heading anchors cho gallery/specification/traceability được đối chiếu |
| Visual QA | Render preview offline bằng Chrome headless với profile tạm; xem bốn DFD, nhóm BFD/Use Case/ERD/Class/State, Activity và Sequence; kiểm kỹ prediction/errors/history |
| Chỉnh sau visual QA | Thu gọn ba DFD sang layout dọc; sửa JSON validation về lane HTTP client và các nhánh 401/404 history về lane Backend; render lại và xem prediction/history |
| Whitespace | `git diff --check` đạt; kiểm thêm whitespace của file mới vì Git diff không quét untracked |

## Chỉnh theo review

- Đối chiếu `App.tsx`: `hasEnteredApp=false` ban đầu, restore thành công hoặc đăng nhập rồi chọn vào ứng dụng mới mở main UI; logout đóng main UI. UC-03 chỉ thuộc User; guest prediction/detail/catalog chỉ qua API trực tiếp. Các nhánh guest browser được ghi rõ là code chưa truy cập được từ UI và đã loại khỏi luồng nghiệp vụ khả dụng của BFD/DFD/Activity.
- Bổ sung `D2 → P2: kết quả ghi / lỗi DB` ở DFD Level 1, khớp `D2 → P2.6` ở Level 2; cập nhật balancing ledger.
- Render lại toàn bộ 28 SVG và gallery từ source; `self_check.py` trả OK. Kiểm XML/title/desc, ID gallery không trùng, relative links/fences và association guest đều đạt. Xem ảnh Chrome headless mới của DFD Level 1/2, BFD/Use Case và activity upload/result/history; sửa ghi chú lặp ở swimlane và ký tự xuống dòng trước lần render cuối. SVG giữ kích thước tự nhiên trong gallery để đọc các sơ đồ rộng bằng cuộn ngang.

## Phạm vi chưa kiểm chứng

- Không chạy lại unit/integration/frontend tests hoặc prediction E2E: thay đổi chỉ tài liệu và script render đã thực thi.
- Không chạy checkpoint thật; không đánh giá accuracy/F1 hoặc HTTP/CLI parity.
- Chưa review với Team Lead; không ghi feedback hoặc phê duyệt giả.
- Chưa stage/commit/push; lưu source editable tại working tree để review.
- State UI có source thực tế, nhưng không phải lifecycle DB Prediction; cần Team Lead xác nhận lựa chọn này đáp ứng DoD State Diagram.

## Checklist tại baseline 05/10/2026 — không thay checklist hiện tại

- [x] Đọc và đối chiếu source liên quan đến actor, API, workflows, DI, storage, AI và frontend.
- [x] Phân tích DB hiện tại và giữ snapshot metadata.
- [x] System Analysis, danh sách actor/functions, business/system rules và dependencies.
- [x] BFD đến chức năng có thể đặc tả.
- [x] DFD context, Level 1, Level 2 prediction và authentication; balancing ledger.
- [x] ERD khớp schema live.
- [x] Use Case Diagram và specification UC-01–10.
- [x] Activity cho auth, chọn/upload ảnh, prediction, inference Python, result và history.
- [x] Sequence prediction/errors/auth/history/delete/session/catalog và inference Python riêng.
- [x] Class Diagram theo các nhóm controller/service/repository/entity/DTO/AI/configuration.
- [x] State Diagram đúng PredictionStatus frontend, ghi rõ không có DB lifecycle.
- [x] Traceability xuyên các mô hình; phân biệt hiện trạng và Planned/Future.
- [x] Source editable và bản render/giải thích có trong workspace.
- [ ] Team Lead review, gồm ranh giới AI và State UI.
- [ ] Chỉnh sửa theo feedback của Team Lead.
- [ ] Commit source/editable files sau khi được yêu cầu thực hiện Git commit.

DoD Jira **chưa hoàn tất** vì còn bước nghiệm thu và commit, dù bộ tài liệu kỹ thuật đã được tạo và kiểm tra tại workspace.

## Bổ sung quy trình mục tiêu cốt lõi — 2026-10-06

- Theo xác nhận của người dùng, bổ sung 3 Activity, 3 Sequence và 1 State cho đăng nhập, dự đoán một ảnh/xem kết quả và lịch sử/chi tiết/xóa của mình. [Phạm vi, mapping và Planned](core_target_workflows.md).
- PlantUML renderer tạo thành công 35 SVG/gallery (28 hiện trạng + 7 mục tiêu); validator `diagram-design/scripts/self_check.py` trả OK. Đã mở và kiểm tra trực quan ảnh render mới của cả 7 sơ đồ mục tiêu: swimlane, nhánh lỗi, participant, transition và chú thích đọc được, không thấy cắt nội dung hoặc chồng chữ.
- Kiểm tra XML/title/desc của SVG, figure IDs của gallery, liên kết local/anchors và fences của các tài liệu cập nhật; `git diff --check` trong phạm vi tài liệu đạt.
- Không chạy application/E2E/model tests hoặc xác minh lại DB live vì thay đổi chỉ là tài liệu/renderer; không dùng các kiểm tra trên làm bằng chứng inference thật. State là đề xuất, không thêm status vào ERD/SQL. Team Lead review và commit vẫn chờ thực hiện.

## Tối ưu Use Case và đồng bộ sơ đồ — 2026-10-06

- Use Case từ 14 mục tiêu + 4 bước include (18 oval) còn đúng 10 mục tiêu nghiệp vụ; gộp hồ sơ, kết quả/lịch sử và CRUD danh mục. Đặc tả giữ toàn bộ nhánh nghiệp vụ, điều kiện quyền và bảng chuyển ID cũ → mới. Không thêm chức năng vào source hoặc schema.
- BFD bổ sung mapping UC; DFD giữ process IDs và data flows, chỉ thêm UC vào process labels. Activity/Sequence/State liên quan và các sơ đồ mục tiêu cập nhật mã UC; Class/ERD giữ nguyên source. Đồng bộ phân tích, đặc tả, requirements, traceability, README, story lịch sử và file tổng hợp.
- Render thành công 35 SVG/gallery. Mọi source dùng cú pháp `usecase` đều không vượt 10: Context 1, DFD Level 1 là 7, Level 2 auth là 5, Level 2 prediction là 7, Use Case là 10. Oval DFD là process, không phải UML Use Case. Đặc tả có đúng 10 heading UC duy nhất; source sơ đồ không còn mã UC vượt 10.
- Kiểm 406 liên kết local/26 anchors, fences, 35 SVG XML/title/desc và IDs gallery đạt; skill validator trả OK. Kiểm trực quan preview mới của Use Case, BFD, Sequence catalog/history và bản SVG DFD Level 1 đã normalize qua Chrome: nhãn đọc được ở kích thước tự nhiên, không thấy clipping. Gallery giữ cuộn ngang cho DFD rộng; không tuyên bố đã review trực quan lại mọi SVG có thay đổi title.
- `git diff --check` trong phạm vi tài liệu đạt. Không chạy runtime/E2E/model/DB tests cho thay đổi tài liệu; chưa commit hoặc nghiệm thu Team Lead.

## Rà soát tài liệu liên quan sau khi gộp Use Case — 2026-10-06

- Rà soát 26 tài liệu: README root/docs, báo cáo AGRI-76, mục lục/source sơ đồ, requirements/design, database README, biên bản quyết định, bộ User Story và tasklog. Các mã UC cũ còn trong bảng chuyển ID hoặc ghi chép lịch sử được đánh dấu theo thời điểm; không xem là ID của bộ hiện tại.
- Sửa các điểm còn sót: mục lục gọi gallery chỉ là hiện trạng; mô tả State/gallery trong report; ngày/phạm vi mục tiêu ở tài liệu tổng quan; nhận định POST công khai trái quyền mục tiêu; nhánh JWT và giới hạn ảnh trong giải thích core workflows. Ghi rõ sơ đồ mục tiêu cốt lõi chỉ vẽ nhánh một ảnh đã đăng nhập, không thay thế quyền khách dự đoán hoặc giới hạn tổng lượt theo QD-01/QD-02. Chuẩn hóa các tham chiếu UC ghép và thêm đường dẫn file tổng hợp.
- Cập nhật phần giới thiệu gallery trong renderer, giữ encoding/BOM. Không thay source các sơ đồ, API hoặc schema/SQL trong lượt rà soát này.
- Kiểm 523 liên kết local và 27 anchors trong 26 tài liệu, fences, IDs gallery và giới hạn oval: không có lỗi. Render 35 SVG/gallery thành công, skill validator OK; kiểm XML/accessibility và whitespace đạt. Không chạy application/E2E/inference/DB tests; chưa commit.
