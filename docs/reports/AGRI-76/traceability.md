# AGRI-76 — Truy vết chức năng và mô hình

Cập nhật 07/10/2026 theo working tree sau AGRI-70; commit `99d6e56` là baseline lịch sử. BFD/UC/process ID là ID tài liệu, không phải endpoint hoặc Jira task mới. `—` là không áp dụng, không phải chức năng thiếu implementation.

## 1. Ma trận xuyên sơ đồ

Bộ Use Case được tối ưu còn 10 mục tiêu ngày 2026-10-06. [Bảng đổi ID cũ → mới](use_case_specifications.md#tối-ưu-còn-10-use-case--2026-10-06) giữ khả năng đọc tài liệu lịch sử. BFD vẫn phân rã đến chức năng chi tiết; một UC có thể bao phủ nhiều chức năng/nhánh với điều kiện quyền riêng. DFD giữ process ID và data flow, chỉ bổ sung mã UC để truy vết. Class cập nhật source mới; `erd_current` mô tả schema 9 bảng, `erd` giữ baseline 6 bảng.

| BFD | Use Case | DFD process | Activity | Sequence | Class/source | ERD/data | State |
|---|---|---|---|---|---|---|---|
| F1.1 | UC-01 | 1 / 1.1,1.3 | authentication | authentication | AuthController/AuthService/UserRepository/JwtTokenGenerator | users + browser session | — |
| F1.2 | UC-02 | 1 / 1.2,1.3 | authentication | authentication | AuthController/AuthService/UserRepository/JwtTokenGenerator | users đọc + browser session | — |
| F1.3 | UC-03 | 1 / 1.4 | authentication (restore) | session | AuthController.GetMe/AuthService.GetCurrentUserAsync/authApi.restoreAuthSession | users đọc | — |
| F1.4 | UC-04 | 1 / 1.5 | — | session | App/authApi.clearAuthSession | browser session; không bảng mới | — |
| F1.5 | UC-03 | 1 / 1.5 | — | session | ProfilePage.handleSave/App.setUserProfile | state frontend; không users update | — |
| F2.1 | UC-05 | 2 / 2.1 | upload | prediction | DiagnosePage/selectFile/imageFileValidation | File/preview bộ nhớ | PredictionStatus |
| F2.2 | UC-05: bước kiểm file | 2 / 2.2 | prediction | prediction/errors | PredictionService.PredictAsync/PredictRequest | buffer bytes | UI uploading |
| F2.3 | UC-05: bước lưu ảnh | 2 / 2.3 | prediction | prediction/errors | IImageStorage/CloudinaryImageStorage | User: Cloudinary/local + prediction_images; khách không lưu ảnh | UI uploading/analyzing không xác định backend step |
| F2.4 | UC-05: bước HTTP AI | 2 / 2.4 | prediction | prediction/errors | IPlantDiseasePredictor/FastApiPlantDiseasePredictor | AiPredictionResult DTO; không bảng AI | UI uploading/analyzing |
| F2.5 | UC-05: bước mapping | 2 / 2.5 | prediction | prediction/errors | PredictionService/IPlantDiseaseRepository | plant_diseases/plants/diseases | — |
| F2.6 | UC-05: bước lưu kết quả | 2 / 2.6 | prediction | prediction/errors | PredictionRepository/AppDbContext/Prediction/PredictionDetail | User: predictions/details/images/result_snapshot; khách không ghi DB | DB không status |
| F2.7 | UC-05 | 2 / 2.7 | result | prediction | PredictionResultDto/predictionApi.mapPredictionResult/DiagnosePage | DTO + state web sau đăng nhập | success/error |
| F3.1 | UC-06 | 3 | result | history | PredictionsController.GetById/PredictionService/PredictionRepository | JWT/owner: predictions/details/images/snapshot + catalog legacy; khách DTO POST | — |
| F3.2 | UC-06 | 3 | history | history | GetHistory/GetPredictionHistoryAsync/App | predictions theo user (JWT) | — |
| F3.3 | UC-07 | 4 | history | delete | Delete/DeletePredictionAsync/IImageStorage | predictions/details/images/ảnh (owner/Admin) | — |
| F4.1 | UC-08 | 6 | — | catalog | PlantsController/DiseasesController/PlantService/DiseaseService/catalogApi | plants/diseases | — |
| F4.2 | UC-09 | 5 | — | catalog | Create/CreateAsync + repository | plants hoặc diseases | — |
| F4.3 | UC-09 | 5 | — | catalog | Update/UpdateAsync + repository | plants hoặc diseases/IsActive | — |
| F4.4 | UC-09 | 5 | — | catalog | Delete/DeleteAsync + repository | plants/diseases soft-delete IsActive=false; FK chỉ ngăn xóa vật lý | — |
| F5.1 | UC-10 | 7 | — | — | HealthController.CheckHealth/AppDbContext | DB connectivity, không đọc user | — |
| F5.2 | UC-10 | 7 | — | — | HealthController.CheckDependencies/IHttpClientFactory | HTTP /health; không prediction | — |
| F5.3/F5.4 | UC-10 | 8 | — | — | Program/DbInitializer/ImageExpiryCleanup/AppDbContext | migration history/schema; Development seed; expired images metadata; giữ snapshot | — |

Không bắt mọi chức năng có activity/sequence riêng; task yêu cầu tối thiểu các luồng nghiệp vụ quan trọng. Các nhánh của 10 UC đã có specification, BFD, DFD và source mapping. Inference Python riêng có activity_ai_cli, sequence_ai_cli, class_ai; không gắn chúng vào UC-05 như một đường HTTP đã tích hợp.

## 2. Chỉ mục source cho Class Diagram

| Diagram | Source |
|---|---|
| class_prediction | [PredictionsController](../../../backend/src/AgriVision.API/Controllers/PredictionsController.cs), [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), [service interface](../../../backend/src/AgriVision.Application/Services/Interfaces/IPredictionService.cs), [repository interfaces](../../../backend/src/AgriVision.Application/Common/Interfaces/Persistence/), [storage/predictor interfaces](../../../backend/src/AgriVision.Application/Common/Interfaces/Services/) |
| class_infrastructure | [Repositories](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/), [AppDbContext](../../../backend/src/AgriVision.Infrastructure/Persistence/AppDbContext.cs), [image storage](../../../backend/src/AgriVision.Infrastructure/Services/CloudinaryImageStorage.cs), [HTTP AI adapter](../../../backend/src/AgriVision.Infrastructure/Services/FastApiPlantDiseasePredictor.cs), [DI Infrastructure](../../../backend/src/AgriVision.Infrastructure/DependencyInjection.cs) |
| class_auth_catalog | [Controllers](../../../backend/src/AgriVision.API/Controllers/), [services](../../../backend/src/AgriVision.Application/Services/Implementations/), [JWT](../../../backend/src/AgriVision.Infrastructure/Authentication/JwtTokenGenerator.cs), [repositories](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/) |
| class_dtos | [Prediction DTOs](../../../backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs), [PlantDisease DTO](../../../backend/src/AgriVision.Application/DTOs/PlantDisease/PlantDiseaseDtos.cs), [AiPrediction records](../../../backend/src/AgriVision.Application/Common/Interfaces/Services/IPlantDiseasePredictor.cs) |
| class_entities | [Domain entities](../../../backend/src/AgriVision.Domain/Entities/) với C# property/navigation names; không dùng SQL tên cột thay class |
| class_ai | [LeafDiseasePredictor](../../../ai/predict.py), [ConvNeXtLeafClassifier](../../../ai/networks/convnext.py), [transforms](../../../ai/data/augmentations.py) |
| state_prediction_ui | [PredictionStatus và setStatus](../../../frontend/src/views/DiagnosePage.tsx); [Prediction không có status](../../../backend/src/AgriVision.Domain/Entities/Prediction.cs) |
| erd_current | [Entities](../../../backend/src/AgriVision.Domain/Entities/), [migration](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs), [snapshot DB hiện tại](assets/database_schema_current.json) |

Class diagram chọn lọc thành viên để dễ đọc; visibility + public, - private, # protected. Interface realization dùng nét đứt/tam giác rỗng; inheritance chỉ nơi source có (DbContext, nn.Module). DI references là association, không tự coi là composition. Cascade DB được thể hiện ở ERD, không đủ căn cứ để áp diamond composition cho mọi navigation property C#.

## 3. Kiểm tra balancing DFD

Boundary tất cả mức giữ web/API/DB/local ảnh/browser state bên trong; HTTP AI và Cloudinary bên ngoài. Context không có data store hoặc truy cập trực tiếp actor → DB.

| Flow context | Level 1 | Level 2 tương ứng |
|---|---|---|
| Credentials/JWT/profile UI/logout ↔ hồ sơ/phiên/lỗi | P1 | P1.1–P1.5 với cùng nhóm dữ liệu; D1/D4 chỉ lộ sau phân rã |
| Ảnh/JWT ↔ kết quả/lỗi | P2 | P2.1–P2.7; errors được trả về actor tại điểm phát sinh |
| Ảnh ↔ AI JSON | P2 ↔ external AI | P2.4 ↔ external AI; không thêm model HTTP nội bộ chưa có |
| Ảnh/public ID ↔ Cloudinary URL/kết quả | P2/P4 ↔ Cloudinary | P2.3 ↔ Cloudinary cho upload; DELETE thuộc P4 không phải process 2 |
| ID/history request ↔ kết quả/history | P3 | Không phân rã riêng; activity/sequence/specification bổ sung chi tiết |
| ID/JWT xóa ↔ xác nhận/lỗi | P4 | Không phân rã riêng; không đưa flow delete vào P2.6 |
| Dữ liệu cây/bệnh ↔ kết quả quản lý | P5 | Không phân rã riêng |
| Tra cứu ↔ danh mục | P6 | Không phân rã riêng |
| Health request ↔ checks/status | P7 | Không phân rã riêng |
| --migrate/--expire-images ↔ exit code/log | P8 | Lệnh riêng; schema/migration store D6; expiry giữ history; không scheduler |

Đối chiếu biên process 2: Level 1 có P2 → D2 (User: Prediction/details/images/snapshot) và D2 → P2 (kết quả ghi/lỗi DB); Level 2 giữ cùng dữ liệu user qua P2.6 → D2 và D2 → P2.6. Không còn flow guest history browser tại biên P2 ở cả hai mức vì nhánh này chưa truy cập được từ UI hiện tại. D4 chỉ biểu diễn phiên trình duyệt ở P1.

DFD chỉ biểu diễn dữ liệu; bước kiểm tra quyền, thứ tự AI/mapping trước upload và exception path được giải thích ở activity/sequence. Truy vấn DB là thông tin yêu cầu truy vấn/ID, không phải control flow vô danh.

## 4. Những điểm không được làm đồng nhất giả

1. Guest history/profile/prediction UI chưa có đường vào từ App hiện tại; các nhánh code browser không phải chức năng web khả dụng. Khách gọi POST prediction/catalog công khai; GET list/detail cần JWT/owner.
2. GET prediction đã có Authorize/owner; URL ảnh storage chưa có ACL đầy đủ.
3. UI analyzing bắt đầu từ upload-complete callback, không đồng nghĩa model bắt đầu inference.
4. Python confidence % khác HTTP confidence [0,1].
5. State UI không phải trạng thái prediction lưu DB.
6. Top-k details không phải nhóm nhiều ảnh; ModelVersion hardcode trong web không phải model version lưu DB.
7. Trường treatment/prevention trong danh mục không chứng minh có engine đề xuất thuốc.

## 5. Truy vết mục tiêu cập nhật ngày 2026-10-06

Bổ sung [mapping Activity/Sequence/State cho quy trình mục tiêu cốt lõi](core_target_workflows.md#sơ-đồ-và-mapping): đăng nhập → `target_*_authentication`; nhánh người đã đăng nhập phân loại một ảnh/xem kết quả → `target_*_prediction`; lịch sử/chi tiết/xóa của mình → `target_*_history`. State `target_state_prediction` là lifecycle logic đề xuất cho một lần xử lý ảnh, không phải `PredictionStatus` UI hoặc cột trạng thái DB. Mapping hiện trạng phía trên đã đối chiếu lại; các bước Planned được ghi riêng trong tài liệu mục tiêu.

Nguồn [FR/NFR mục tiêu](../../system_requirements.md) → [đối chiếu UC mục tiêu](use_case_specifications.md#đối-chiếu-use-case-mục-tiêu-sau-phỏng-vấn). Bộ User Story riêng giữ local ngoài PR; mã US/AC chỉ là tham chiếu lịch sử. Ma trận trên đã cập nhật source sau AGRI-70, không chứng minh nghiệm thu toàn bộ yêu cầu mới. Ngưỡng cảnh báo không phải ngưỡng từ chối ảnh; trung bình confidence không phải thay đổi metric đánh giá checkpoint.

## 6. Delta sau AGRI-70

P3 ↔ D3 thể hiện catalog qua Includes, dùng dựng DTO khi snapshot NULL; snapshot là data trong D2, không là process hay bảng riêng. P2 ↔ storage có cleanup lỗi persistence ở cả Level 1/2; P2 khách không ghi D2/storage. Class DTO/Domain/DbContext phản ánh Images, nullable password, EmailVerifiedAt và ResultSnapshotJson; cột SQL tên result_snapshot. ERD hiện tại: [erd_current](diagrams/erd_current.puml); bản cũ chỉ lịch sử.
