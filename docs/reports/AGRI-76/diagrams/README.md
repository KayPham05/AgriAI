# AGRI-76 — Sơ đồ hiện tại, mục tiêu và baseline editable

Cập nhật 07/10/2026 theo working tree sau AGRI-70. 36 bản chính gồm 28 mô hình hiện tại,
1 ERD baseline 6 bảng và 7 mô hình mục tiêu. [Gallery](index.html), [analysis](../system_analysis.md),
[Use Case](../use_case_specifications.md), [traceability](../traceability.md), [DB](../database_verification.md).

Giữ PlantUML/SVG và gallery inline offline, theme đang có, Arial cho diagram, font trang có fallback.
Preset fit theo nội dung. Ưu tiên ký pháp UML/Yourdon/crow's-foot và đầy đủ yêu cầu Jira;
các giới hạn editorial node/arrow của skill không làm mất class/column/flow bắt buộc.
Chia Class theo nhóm. Không thêm dark variants hoặc dependency ứng dụng.

`erd.puml`/SVG giữ nguyên baseline 05/10; `erd_current` là schema mới. Các bản source/render
trước chỉnh sửa khác lưu tại [baseline_2026-10-05](baseline_2026-10-05/README.md), không dùng nghiệm thu hiện tại.
Khách chưa vào main UI; khả năng POST/catalog API trực tiếp được ghi riêng.

### activity_ai_cli

[Source](activity_ai_cli.puml) · [SVG](activity_ai_cli.svg). Khởi tạo predictor và chạy inference Python riêng: checkpoint/RGB/transform/model/softmax/topk. Không ghép thành workflow HTTP. Nguồn: ai/predict.py, convnext.py, augmentations.py.

### activity_authentication

[Source](activity_authentication.puml) · [SVG](activity_authentication.svg). Register/login và restore phiên, quyết định email trùng/BCrypt/JWT, lanes User/Frontend/Backend. Nguồn: AuthService, authApi. DB call thuộc backend action ở diagram này, sequence thể hiện DB riêng.

### activity_history

[Source](activity_history.puml) · [SVG](activity_history.svg). List theo user/page; detail JWT/owner; DELETE owner/Admin. Storage false/exception giữ history, DB xóa cascade details/images sau storage thành công.

### activity_prediction

[Source](activity_prediction.puml) · [SVG](activity_prediction.svg). API AI → strict mapping → nhánh khách 200 không persist / User upload+image+snapshot+DB 201. Lỗi trước upload không tạo ảnh; lỗi persistence cố cleanup giữ lỗi gốc.

### activity_result

[Source](activity_result.puml) · [SVG](activity_result.svg). DTO POST của lượt hiện tại; GET detail Authorize/UserId/owner, 401 hoặc 404. Snapshot hoặc catalog legacy, URL hết hạn ẩn. UI/storage ACL vẫn có khoảng trống.

### activity_upload

[Source](activity_upload.puml) · [SVG](activity_upload.svg). Chọn/drag-drop, validation UI, decode preview, gửi XHR và nhánh file lỗi. Không chứng minh server validation đầy đủ. Nguồn: DiagnosePage/imageFileValidation/predictionApi.

### bfd

[Source](bfd.puml) · [SVG](bfd.svg). F0 → F1–F5 → chức năng source hiện tại; UC-01–10. Tree phân rã, không là thứ tự thời gian. User persist sau AI/mapping; GET detail cần owner. F5.3/F5.4 là migration/expiry chạy riêng, chưa scheduler.

### class_ai

[Source](class_ai.puml) · [SVG](class_ai.svg). LeafDiseasePredictor, ConvNeXtLeafClassifier/nn.Module, dependencies tới modules transform/build_model. Không thêm FastAPI class không tồn tại.

### class_auth_catalog

[Source](class_auth_catalog.puml) · [SVG](class_auth_catalog.svg). Authentication và các chuỗi controller → service → repository của danh mục. Disease operations tương tự Plant và lược trong hình, không phải lớp chưa implement.

### class_dtos

[Source](class_dtos.puml) · [SVG](class_dtos.svg). PredictionResultDto/HistoryDto thêm Images/HasHistoricalSnapshot; Result warning/content/medication; PredictionImageDto. DTO/AI records là payload, không bảng.

### class_entities

[Source](class_entities.puml) · [SVG](class_entities.svg). Chín entity, public auto-properties và navigation đúng tên C#; PasswordHash nullable/EmailVerifiedAt, Disease condition/approval/medication, ResultSnapshotJson/Images và ba entity mới. Không dùng cascade DB để tự suy composition.

### class_infrastructure

[Source](class_infrastructure.puml) · [SVG](class_infrastructure.svg). Repos/adapters/DbContext inheritance/DI; đủ 9 DbSet, ImageExpiryCleanup.RunAsync/DbInitializer.SeedAsync static. Không tự thêm UnitOfWork/settings class.

### class_prediction

[Source](class_prediction.puml) · [SVG](class_prediction.svg). Controller/service/repository/storage/predictor interfaces; chữ ký GetPredictionByIdAsync(id,ct,userId), logger, private static MapToResultDto/ReadStoredResult/ProjectImages theo source.

### dfd_context

[Source](dfd_context.puml) · [SVG](dfd_context.svg). Boundary web/API/DB/local/browser session; Cloudinary/HTTP AI bên ngoài. Khách API POST/catalog, không GET detail tài khoản. Ops health/migrate/expiry; payload vào/ra cân bằng Level 1.

### dfd_level_1

[Source](dfd_level_1.puml) · [SVG](dfd_level_1.svg). P1–P8; D1 users, D2 predictions/details/images/snapshot, D3 catalog, D4 browser session, D5 local images, D6 EF history/schema. P3 ↔ D3 có catalog Includes/legacy fallback DTO. P2 khách không ghi D2/storage; cleanup persistence có phản hồi storage. P8 là lệnh riêng, Development seed có điều kiện.

### dfd_level_2_auth

[Source](dfd_level_2_auth.puml) · [SVG](dfd_level_2_auth.svg). P1.1–P1.5: register/login/ký token/restore/profile UI/logout. Không có refresh-token table hoặc profile-update API. Nguồn: AuthController/AuthService, JwtTokenGenerator, authApi, ProfilePage/App.

### dfd_level_2_prediction

[Source](dfd_level_2_prediction.puml) · [SVG](dfd_level_2_prediction.svg). Phân rã P2; AI/strict mapping trước storage. Khách qua P2.7 trả DTO không persistence, User qua P2.3/P2.6 lưu image/snapshot. Cleanup ID/lỗi DB và phản hồi storage được cân bằng với Level 1. Không thêm FastAPI/model nội bộ chưa tồn tại.

### erd

[Source](erd.puml) · [SVG](erd.svg). BASELINE LỊCH SỬ 05/10/2026: giữ nguyên sáu bảng theo InitialCreate và metadata cũ; không là ERD database ứng dụng sau AGRI-70. Chen/SQL agrivision_erd cũng thuộc baseline.

### erd_current

[Source](erd_current.puml) · [SVG](erd_current.svg). HIỆN TẠI 07/10/2026: chín bảng/69 cột nghiệp vụ từ database_schema_current.json; PK/FK/type/nullable/default/unique/CHECK và ON DELETE. Property ResultSnapshotJson map cột result_snapshot. Bảng EF history kỹ thuật nằm trong metadata, không tính entity nghiệp vụ. Schema auth/nhiều ảnh không chứng minh endpoint đã hoàn thiện.

### sequence_ai_cli

[Source](sequence_ai_cli.puml) · [SVG](sequence_ai_cli.svg). Inference Python riêng với model thật trong code, chưa chạy checkpoint trong khảo sát tài liệu. Nêu HTTP/CLI contract khác nhau.

### sequence_authentication

[Source](sequence_authentication.puml) · [SVG](sequence_authentication.svg). Register/login, UserRepository, BCrypt và JwtTokenGenerator; 200/400/401. Không có refresh hoặc endpoint logout tự thêm.

### sequence_catalog

[Source](sequence_catalog.puml) · [SVG](sequence_catalog.svg). GET public; CRUD Admin; DELETE đặt IsActive=false/UpdatedAt, không xóa cứng. Unique/DB update error vẫn qua middleware; UI Admin chưa có.

### sequence_delete

[Source](sequence_delete.puml) · [SVG](sequence_delete.svg). JWT + owner/Admin; distinct IDs mới/legacy. Storage false →400 giữ history, exception dừng DB; true rồi DeleteAsync cascade details/images. Không distributed transaction.

### sequence_history

[Source](sequence_history.puml) · [SVG](sequence_history.svg). GET list/detail có Authorize và claims. Detail gọi GetPredictionByIdAsync(id,ct,userId), missing/sai owner 404; guest 401. Snapshot/legacy + images expiry; Admin không đọc record khác.

### sequence_prediction

[Source](sequence_prediction.puml) · [SVG](sequence_prediction.svg). HTTP contract / DB mapping trước storage; khách 200 không AddAsync, User 201 sau SaveChanges image/snapshot. Web guest chưa mở main UI; AI HTTP chưa nghiệm thu model.

### sequence_prediction_errors

[Source](sequence_prediction_errors.puml) · [SVG](sequence_prediction_errors.svg). 400 file/mapping, 503 AI/502 contract; không upload trước AI. Guest 200; User DB error cố cleanup, log cleanup lỗi rồi rethrow persistence error gốc.

### sequence_session

[Source](sequence_session.puml) · [SVG](sequence_session.svg). Restore qua me, nhánh token/user lỗi, sửa hồ sơ state và logout browser không revoke JWT. Nguồn: App, ProfilePage, authApi, AuthController/AuthService.

### state_prediction_ui

[Source](state_prediction_ui.puml) · [SVG](state_prediction_ui.svg). State machine đúng union PredictionStatus: idle/uploading/analyzing/success/error, events/guards/reset/abort. Upload resolve có thể thành success trực tiếp nếu callback analyzing chưa xảy ra. Ảnh hợp lệ vẫn idle; isPreparing là state riêng. Entity Prediction không có lifecycle field; lựa chọn State UI thay Prediction DB cần Team Lead xác nhận khi nghiệm thu.

### target_activity_authentication

[Source](target_activity_authentication.puml) · [SVG](target_activity_authentication.svg). FR-02: nhập credentials, kiểm BCrypt, lưu phiên hoặc báo lỗi; swimlane User/Frontend/Backend.

### target_activity_history

[Source](target_activity_history.puml) · [SVG](target_activity_history.svg). MỤC TIÊU UX history/detail/delete của owner. JWT/owner/snapshot/expiry đã có source; UI phân trang/field mới và private image access còn thiếu.

### target_activity_prediction

[Source](target_activity_prediction.puml) · [SVG](target_activity_prediction.svg). MỤC TIÊU nhánh một ảnh tài khoản: validation đầy đủ/HTTP model/UI field mới còn Planned; AI/mapping trước storage, snapshot/cleanup DB đã có source.

### target_sequence_authentication

[Source](target_sequence_authentication.puml) · [SVG](target_sequence_authentication.svg). POST login, đọc users, JWT và nhánh 401.

### target_sequence_history

[Source](target_sequence_history.puml) · [SVG](target_sequence_history.svg). MỤC TIÊU owner history/list/detail/delete; không gắn JWT/owner GET ID là Planned nữa. Không chứng minh UI hoặc private storage đã nghiệm thu.

### target_sequence_prediction

[Source](target_sequence_prediction.puml) · [SVG](target_sequence_prediction.svg). MỤC TIÊU FastAPI → ConvNeXt HTTP chưa nghiệm thu. Mapping strict trước upload; persistence/snapshot/cleanup theo source đã có. POST khách vẫn public, nhánh này chỉ tài khoản.

### target_state_prediction

[Source](target_state_prediction.puml) · [SVG](target_state_prediction.svg). State logic đề xuất một ảnh tài khoản; validation → AI/mapping → storage → DB/snapshot → completed/failed. Không enum/cột DB; khác PredictionStatus UI.

### use_cases

[Source](use_cases.puml) · [SVG](use_cases.svg). Đúng 10 mục tiêu nghiệp vụ. Khách association UC-05/UC-08; không association UC-06. User detail/history đúng owner; Admin CRUD catalog/xóa khác owner nhưng không đọc detail khác owner. UC-10 gồm health và lệnh vận hành. Không thêm include/extend cho bước xử lý nội bộ.

## Render lại

Java + PlantUML 1.2025.2 đã có ở thư mục tạm, không thêm vào Git. Chạy từ root:

```powershell
& docs/reports/AGRI-76/diagrams/render_diagrams.ps1 -JarPath '<path-to-plantuml.jar>'
```

Renderer fail khi lỗi, thêm title/desc/accessibility, namespace IDs và gallery.
DFD PlantUML dùng usecase làm bubble và rectangle datastore làm anchor; renderer normalize
datastore thành hai đường song song. Render source đơn lẻ chưa normalize không phải bản DFD giao nộp.
Không cần DB để render; cập nhật ERD phải đối chiếu metadata/migration riêng.
