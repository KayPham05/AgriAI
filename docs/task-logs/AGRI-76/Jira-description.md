Description
Mục tiêu
Phân tích toàn bộ hệ thống AgriVision AI dựa trên source code, database, architecture và các chức năng hiện tại để xây dựng bộ tài liệu Phân tích & Thiết kế Hệ thống.

Các sơ đồ phải phản ánh đúng hệ thống đang được triển khai, không tự thêm các chức năng chưa có trong hệ thống. Member cần nghiên cứu hệ thống trước, sau đó xây dựng các mô hình từ mức tổng quan đến mức chức năng chi tiết.

1. System Analysis
Thực hiện phân tích tổng thể hệ thống:

Xác định mục tiêu và phạm vi hệ thống.

Xác định các Actor/User của hệ thống.

Xác định các chức năng chính.

Phân tích workflow của các chức năng.

Phân tích dữ liệu được tạo, sử dụng và lưu trữ.

Phân tích interaction giữa Frontend, Backend, AI Service, Database và các external services.

Xác định các business rules và system rules hiện tại.

Xác định các dependency giữa các module/service.

2. BFD — Business Function Diagram
Xây dựng BFD (Business Function Diagram) để phân rã chức năng của AgriVision AI từ mức tổng quan đến mức chức năng.

Yêu cầu:

Xác định chức năng cấp hệ thống.

Phân rã thành các nhóm chức năng chính.

Phân rã tiếp xuống các chức năng con.

Thể hiện hierarchy giữa các chức năng.

Phân tích đến mức chức năng có thể triển khai/đặc tả được.

Ví dụ:



AgriVision AI
├── User Management
│   ├── Register
│   ├── Login
│   └── Manage Profile
│
├── Plant Disease Prediction
│   ├── Upload Image
│   ├── Validate Image
│   ├── Preprocess Image
│   ├── Run Prediction
│   └── Display Result
│
└── Prediction Management
    ├── View Prediction
    └── View Prediction History
Chỉ sử dụng các chức năng thực tế của hệ thống. Nếu chức năng chưa implement thì phải đánh dấu rõ Planned/Future.

3. DFD — Data Flow Diagram
Xây dựng DFD (Data Flow Diagram) để mô tả luồng dữ liệu trong hệ thống.

DFD Level 0 — Context Diagram
Thể hiện:

External Entities.

System.

Input/Output data flow.

DFD Level 1
Phân rã hệ thống thành các process chính.

Tập trung vào các flow:

User → Upload Image.

Frontend → Backend.

Backend → AI Service.

AI Service → AI Model.

AI Model → Prediction Result.

Backend → Database.

Backend → Cloud Storage nếu có.

Backend → Frontend → User.

DFD Level 2 — Functional Level
Đối với các chức năng quan trọng, tiếp tục phân rã process đến mức chức năng.

Đặc biệt cần phân tích chi tiết:

Plant Disease Prediction



Receive Image
      ↓
Validate Image
      ↓
Store Image
      ↓
Preprocess Image
      ↓
Run AI Model
      ↓
Process Prediction
      ↓
Save Prediction
      ↓
Return Result
4. ERD — Entity Relationship Diagram
Phân tích database hiện tại và xây dựng ERD.

Yêu cầu:

Xác định tất cả entity cần thiết trong phạm vi hệ thống.

Xác định primary key.

Xác định foreign key.

Xác định attributes.

Xác định relationship giữa các entity.

Xác định cardinality.

Đối chiếu ERD với database implementation thực tế.

ERD phải phản ánh database hiện tại, không tự tạo entity chỉ để hoàn thiện sơ đồ.

5. Use Case Diagram
Xây dựng Use Case Diagram dựa trên các chức năng đã xác định trong BFD.

Yêu cầu:

Xác định Actor.

Xác định Use Case.

Xác định association.

Xác định <<include>>.

Xác định <<extend>> khi thực sự cần thiết.

Xác định generalization nếu có.

Các Use Case phải liên kết được với các chức năng trong BFD.

6. Activity Diagram
Xây dựng Activity Diagram cho các chức năng nghiệp vụ quan trọng.

Tối thiểu bao gồm:

User Authentication.

Upload Plant Leaf Image.

AI Prediction.

View Prediction Result.

Prediction History nếu hệ thống có chức năng này.

Activity Diagram cần thể hiện:

Start/End.

Action.

Decision.

Condition.

Flow.

Exception/Alternative Flow nếu có.

Swimlane khi cần thể hiện trách nhiệm của User, Frontend, Backend và AI Service.

7. Sequence Diagram
Xây dựng Sequence Diagram để mô tả interaction giữa các thành phần theo thời gian.

Tối thiểu cần có:

Prediction Sequence


User
 ↓
Frontend
 ↓
ASP.NET Core Backend
 ↓
FastAPI AI Service
 ↓
ConvNeXt-Tiny
 ↓
FastAPI AI Service
 ↓
ASP.NET Core Backend
 ↓
Frontend
 ↓
User
Sequence phải thể hiện:

Request.

Response.

API endpoint.

Processing.

Database interaction.

AI Service interaction.

Error/exception flow nếu có.

Có thể xây dựng thêm Sequence Diagram cho Authentication và Prediction History nếu các chức năng này tồn tại.

8. Class Diagram
Phân tích source code và xây dựng Class Diagram.

Yêu cầu:

Xác định các class chính.

Attributes.

Methods.

Visibility.

Relationships.

Association.

Dependency.

Inheritance.

Aggregation/Composition nếu có.

Class Diagram phải phản ánh kiến trúc và source code thực tế.

Đặc biệt cần xem xét các nhóm:



Controller
Service
Repository
Entity/Model
DTO
AI Service Client
Configuration
Không đưa các class không liên quan hoặc không tồn tại vào diagram.

9. State Diagram
Xây dựng State Diagram cho các đối tượng có lifecycle rõ ràng.

Ưu tiên phân tích:

Prediction State
Ví dụ:



Created
   ↓
ImageUploaded
   ↓
Processing
   ↓
Predicted
   ↓
Completed
Và các trạng thái lỗi nếu hệ thống thực tế có:



Processing
    ↓
Failed
Nếu hệ thống có các entity khác có lifecycle phù hợp, có thể xây dựng thêm State Diagram cho entity đó.

State Diagram phải dựa trên trạng thái thực tế được sử dụng trong source code/database.

10. Traceability giữa các sơ đồ
Các sơ đồ phải nhất quán với nhau.

Yêu cầu mapping:



BFD
 ↓
Use Case
 ↓
DFD
 ↓
Activity
 ↓
Sequence
 ↓
Class / ERD
Ví dụ chức năng AI Prediction xuất hiện trong BFD thì phải có thể trace được đến:

Use Case: Predict Plant Disease

DFD: Prediction Process

Activity: Prediction Workflow

Sequence: Prediction Interaction

Class: Prediction-related classes

ERD: Prediction-related entities

State: Prediction lifecycle nếu có.

Deliverables
Member cần hoàn thành:

System Analysis Document

BFD

DFD Level 0

DFD Level 1

DFD Level 2 cho chức năng quan trọng

ERD

Use Case Diagram

Use Case Specification cho các Use Case chính

Activity Diagram

Sequence Diagram

Class Diagram

State Diagram

Source/editable files của toàn bộ diagram

Tài liệu giải thích ngắn cho từng diagram

Requirements
Phải phân tích hệ thống AgriVision AI hiện tại trước khi xây dựng diagram.

Không được tự ý thêm chức năng chưa tồn tại.

Nếu chức năng đang nằm trong roadmap nhưng chưa implement, phải ghi rõ Planned/Future.

Tên Entity, Class, API, Service và Component phải thống nhất với source code.

ERD phải khớp với database thực tế.

Sequence Diagram phải khớp với API/architecture thực tế.

Class Diagram phải khớp với source code.

DFD phải phản ánh đúng data flow.

Các diagram phải có khả năng trace lẫn nhau.

Sử dụng notation đúng chuẩn của từng loại diagram.

Ưu tiên Flowchart Maker & Online Diagram Software  / PlantUML / Mermaid / Visual Paradigm / StarUML.

Phải lưu file ở dạng editable, không chỉ export thành PNG/PDF.

Definition of Done
Đã đọc và phân tích source code.

Đã phân tích database.

Đã xác định đầy đủ Actor và chức năng hiện tại.

BFD hoàn chỉnh đến mức chức năng.

DFD Level 0 hoàn chỉnh.

DFD Level 1 hoàn chỉnh.

DFD Level 2 được xây dựng cho chức năng quan trọng.

ERD hoàn chỉnh và khớp database.

Use Case Diagram hoàn chỉnh.

Activity Diagram hoàn chỉnh.

Sequence Diagram hoàn chỉnh.

Class Diagram hoàn chỉnh.

State Diagram hoàn chỉnh.

Các diagram thống nhất với nhau.

Đã review với Team Lead.

Đã chỉnh sửa theo feedback.

Source/editable files đã được commit vào repository.