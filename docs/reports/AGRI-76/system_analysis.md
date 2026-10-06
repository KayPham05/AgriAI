# AGRI-76 — Phân tích hệ thống hiện trạng

- Cập nhật 07/10/2026 theo working tree sau thay đổi AGRI-70; nền commit `99d6e56` không đại diện toàn bộ source mới.
- Branch: `AGRI-76-requirements-analysis-design`. Chỉ sửa mô hình/tài liệu trong lần AGRI-76 này.
- Schema đọc live từ `agrivision_db`: [metadata hiện tại](assets/database_schema_current.json). Giữ [metadata 05/10](assets/database_schema.json) và ERD 6 bảng làm lịch sử.
- Chưa có nghiệm thu Team Lead hoặc commit bộ editable mới; review subagent không thay cho review Team Lead.

## 1. Mục tiêu và ranh giới

AgriVision phân loại cây/tình trạng lá từ một ảnh, trả confidence và top-k; tài khoản có lịch sử. Không thêm detection/segmentation/severity vào hiện trạng.

Boundary DFD gồm Next.js, ASP.NET Core, PostgreSQL, phiên trình duyệt và storage local. Cloudinary và HTTP AI là external entities. Client HTTP `/predict` có code; chưa có FastAPI bridge nối checkpoint thật trong checkout. Python CLI/model được mô tả riêng, không coi health mock là inference.

Root Compose chạy web/API/DB. Startup API kiểm pending migration rồi phục vụ; migration/seed chỉ qua lệnh `--migrate` riêng, seed demo chỉ Development. CI override có migration job riêng và AI health mock.

### Giới hạn truy cập web hiện tại

`App.tsx` khởi tạo `hasEnteredApp=false`; restore thành công hoặc login/register rồi chọn vào ứng dụng mở main UI. Logout trở về IntroPage/LoginModal. Khách chưa mở được Diagnose/Profile/History/catalog trên web. Các nhánh guest profile/history browser còn trong code nhưng chưa có đường vào UI; khả năng gọi API trực tiếp được ghi riêng.

## 2. Actor và quyền hiện trạng

| Actor | Hành vi | Giới hạn |
|---|---|---|
| Khách | Register/login web; API POST prediction và GET catalog công khai. Nhận DTO POST 200 của lượt hiện tại. | Không lưu ảnh/history trên server; GET list/detail 401 nếu không có JWT. Web main UI chưa mở cho khách. |
| User | Hồ sơ server, prediction với JWT, history/detail đúng owner, xóa bản ghi của mình. | Sửa hồ sơ web chỉ state; chưa có nhiều ảnh/request; chưa UI phân trang đầy đủ. |
| Admin | Quyền User + CRUD catalog qua API và xóa prediction của người khác. | GET detail vẫn cần owner; không có ngoại lệ đọc mọi history. Chưa thấy UI Admin hoặc CRUD tài khoản. |
| Người vận hành | Health DB/AI, migration riêng, cleanup ảnh hết hạn. | Không phải role nghiệp vụ users; cleanup chưa có scheduler. |
| HTTP AI | Nhận multipart `file` tại `/predict` và trả contract JSON. | Server/checkpoint HTTP chưa nghiệm thu. |
| Cloudinary | Upload/delete ảnh khi cấu hình phù hợp. | Upload lỗi/thiếu config fallback local; URL storage chưa có cơ chế truy cập riêng tư đầy đủ. |

Admin kế thừa User; User kế thừa khả năng API công khai của Khách. DB, controller, frontend không là actor Use Case toàn hệ thống.

## 3. Chức năng và endpoint

ID F/UC là truy vết tài liệu, không phải Jira key.

| BFD | UC | API/source | Hành vi hiện tại |
|---|---|---|---|
| F1.1 | UC-01 | POST `/api/auth/register` | BCrypt, tạo User, trả JWT ngay; chưa email verification. |
| F1.2 | UC-02 | POST `/api/auth/login` | Email/password; hash NULL bị từ chối. |
| F1.3/F1.5 | UC-03 | GET `/api/auth/me`; ProfilePage | JWT; restore; sửa UI chỉ state, không đổi DB/JWT role. |
| F1.4 | UC-04 | App/clearAuthSession | Xóa browser session; không revoke JWT server. |
| F2.1–F2.7 | UC-05 | POST `/api/predictions` | API public; khách 200 không persistence; user 201 sau lưu. |
| F3.1/F3.2 | UC-06 | GET `/api/predictions/{id}` / GET list | JWT; detail đúng owner; list lọc UserId/page. |
| F3.3 | UC-07 | DELETE `/api/predictions/{id}` | JWT + owner hoặc Admin; storage thành công rồi DB delete. |
| F4.1 | UC-08 | GET cây/bệnh list/ID | API public; web fallback static catalog. |
| F4.2–F4.4 | UC-09 | POST/PUT/DELETE cây/bệnh | Admin; DELETE soft-delete IsActive=false. |
| F5.1/F5.2 | UC-10 | GET `/api/health` / `/api/health/deps` | DB connectivity / HTTP AI health; không inference. |
| F5.3/F5.4 | UC-10 | Program `--migrate` / `--expire-images` | Lệnh vận hành riêng; seed demo Development; expiry giữ history/snapshot. |

## 4. Workflow

### 4.1. Tài khoản

Register kiểm email tồn tại, hash BCrypt, lưu User role User, trả JWT. Duplicate email →400; login user thiếu/hash NULL/sai password →401. Restore GET me cần JWT, user không còn tồn tại →404. Validators có source/DI nhưng chưa khẳng định được auto-execute chỉ từ đăng ký DI. Google/email/reset hiện mới có schema hỗ trợ, chưa có luồng API đầy đủ.

### 4.2. Chọn ảnh và prediction

Web kiểm JPEG/PNG, >0 và ≤15 MiB, decode preview, XHR multipart `file`, JWT nếu có. Callback upload-complete đổi trạng thái UI analyzing, không chứng minh model đã bắt đầu.

API kiểm rỗng/đuôi .jpg/.jpeg/.png → buffer → gọi AI qua stream độc lập → adapter kiểm contract → tra ClassIndex và kiểm ClassName khớp chính xác cho top-1/mọi top-k → tạo entity trong bộ nhớ.

Khách không UserId: map DTO và trả 200, không gọi storage/repository AddAsync. User có UserId: upload ảnh sau AI/mapping → thêm PredictionImage position=0, expiry +30 ngày → map kết quả, serialize ResultSnapshotJson → AddAsync/SaveChanges →201 + Location. Lỗi persistence cố xóa ảnh với CancellationToken.None; cleanup false/exception chỉ log rồi rethrow lỗi gốc.

API chưa kiểm nội dung ảnh hoặc giới hạn tổng lượt <30 MB; không có multi-image contract. AI timeout/HTTP lỗi →503, contract/JSON lỗi →502, mapping thiếu/sai →400, không fallback lớp đầu tiên. Storage lỗi dừng persistence; fallback local upload có trong adapter.

### 4.3. Kết quả, lịch sử, xóa và expiry

Kết quả POST được xem ngay. GET detail cần Authorize/claims, service so owner; record thiếu hoặc owner khác →404, guest/token sai →401. Admin không được đọc detail của người khác. List cần JWT, page/size dương, lọc UserId và sort/page; web hiện trang 1/100.

Repository Include images/catalog/details. ReadStoredResult dùng snapshot nếu có; legacy NULL map từ catalog và HasHistoricalSnapshot=false. ProjectImages ẩn URL hết hạn/DeletedAt; snapshot vẫn giữ. Frontend hiện lược bớt field DTO mới, chưa hiển thị đầy đủ trạng thái expiry.

DELETE cần owner/Admin; thu thập ID ảnh chưa DeletedAt cùng legacy ID, distinct; bool false →400 và giữ history, storage exception dừng DB delete. Thành công DeleteAsync cascade details/images →204; lỗi DB sau xóa storage có thể khiến ảnh đã mất nhưng history còn. Không có distributed transaction.

`--expire-images` đọc ảnh quá hạn/chưa DeletedAt; xóa storage, clear image references/mark DeletedAt, SaveChanges. Lỗi storage/DB giữ metadata để retry và trả exit 1; history/snapshot không xóa. Chưa scheduler và URL ảnh local/Cloudinary chưa có ACL hoàn chỉnh.

### 4.4. Danh mục

GET list mặc định active; includeInactive public; GET ID có thể đọc inactive. Admin tạo/sửa/soft-delete qua API. DeleteAsync đặt IsActive=false/UpdatedAt và SaveChanges, không xóa cứng hay cascade history. FK RESTRICT vẫn có trong schema cho xóa vật lý; không mô tả nó như thao tác DELETE catalog thực tế. Web có static fallback khi API lỗi.

## 5. Dữ liệu và hợp đồng

| Dữ liệu | Lưu trữ / sử dụng |
|---|---|
| User/password hash nullable/EmailVerifiedAt | users; password hash không trả web. Google/email/reset chưa implement đầy đủ. |
| External identity / action token hash | user_identities / user_action_tokens; schema supporting, chưa workflow active. |
| JWT/browser session | localStorage/sessionStorage; không DB session table. |
| Catalog/class mapping | plants/diseases/plant_diseases; catalog legacy chưa là mapping 59 lớp hoàn chỉnh. |
| Prediction chính/top-k | predictions/prediction_details; details không phải nhiều ảnh. |
| Metadata ảnh/expiry | prediction_images; bytes ở Cloudinary/local, khách không lưu. |
| Snapshot gốc | predictions.result_snapshot JSONB; property C# ResultSnapshotJson; legacy NULL. |
| Hồ sơ sửa / guest history code | State browser; nhánh guest history chưa khả dụng từ UI. |
| Checkpoint/mapping AI | Artifact ngoài DB; không ghi model/dataset version trong prediction. |

HTTP AI dùng confidence [0,1], CLI Python hiển thị %; không suy ra contract parity. ModelVersion web hardcode không là version DB.

## 6. Business/system rules

| Rule | Hành vi theo source |
|---|---|
| R01/R02 | Email unique, BCrypt/password NULL login reject; JWT issuer/audience/lifetime/signing key. |
| R03 | UI JPEG/PNG ≤15 MiB; API chỉ rỗng/đuôi .jpg/.jpeg/.png. |
| R04 | AI và strict mapping trước upload; chỉ user persist. |
| R05 | AI HTTP/timeout 503, contract 502. |
| R06 | Top-1/top-k index và name phải khớp; không fallback. |
| R07 | List theo user; detail JWT/owner, sai owner 404. |
| R08 | DELETE owner/Admin; bool storage false giữ history; cascade details/images. |
| R09 | Catalog Admin CRUD, DELETE soft-delete. |
| R10 | Local fallback; expiry 30 ngày; cleanup riêng giữ snapshot, chưa scheduler. |
| R11 | Không DB status/model version; State UI đúng union PredictionStatus. |
| R12 | Health DB và AI health riêng, không chạy inference. |
| R13 | Confidence ≤0.8f cảnh báo; thuốc chỉ khi >0.8f, ConditionType=Disease và nội dung duyệt. Field API có code; UI chưa đồng bộ đầy đủ. |

## 7. Dependencies

Next.js rewrite → API → Application interfaces/services → Infrastructure DB/AI/storage; DI nối implementation. Domain chứa 9 entity. Không tự thêm UnitOfWork/FastAPI server class. DbContext có 9 DbSet; configurations áp dụng từ assembly. Middleware ánh xạ exceptions.

Program normal startup kiểm pending migrations; --migrate chạy migrate/seed rồi thoát, --expire-images cleanup rồi thoát. Compose API đợi DB, web đợi API. Cloudinary credentials/JWT/connection string chỉ nêu tên, không ghi giá trị secret.

Python CLI: LeafDiseasePredictor → transforms → ConvNeXtLeafClassifier/build_model → softmax/top-k/checkpoint mapping; không ghép thành HTTP inference đã triển khai.

## 8. Planned/Future

Chưa đầy đủ: Google/email/reset endpoints, guest main UI, server image validation/tổng lượt, multi-image/tổng hợp, UI field DTO mới/phân trang, URL ảnh riêng tư, scheduler, model/dataset version và FastAPI bridge/parity. Không gọi strict mapping/owner/snapshot/cleanup DB là chưa có source sau AGRI-70.

## 9. Source và bằng chứng

- [Controllers](../../../backend/src/AgriVision.API/Controllers/), [Program](../../../backend/src/AgriVision.API/Program.cs), [middleware](../../../backend/src/AgriVision.API/Middleware/GlobalExceptionMiddleware.cs).
- [Services](../../../backend/src/AgriVision.Application/Services/Implementations/), [prediction DTO](../../../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs), [repositories](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/).
- [Entities](../../../backend/src/AgriVision.Domain/Entities/), [migration mới](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs), [cleanup](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs).
- [App](../../../frontend/src/App.tsx), [DiagnosePage](../../../frontend/src/views/DiagnosePage.tsx), [predictionApi](../../../frontend/src/services/predictionApi.ts), [image validation](../../../frontend/src/utils/imageFileValidation.ts).
- [CLI](../../../ai/predict.py), [ConvNeXt](../../../ai/networks/convnext.py), [transforms](../../../ai/data/augmentations.py).
- [DB verification](database_verification.md), [Use Case](use_case_specifications.md), [traceability](traceability.md), [diagrams](diagrams/README.md), [AGRI-79 task log](../../task-logs/AGRI-79/AGRI-79-database-migrations.md).
