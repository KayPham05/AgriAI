# Entities và ảnh hưởng đến ERD

Đối chiếu source và migration ngày 06/10/2026; bổ sung giải thích ngày 07/10/2026.

## Vì sao có nhiều file?

`backend/src/AgriVision.Domain/Entities/` hiện có 9 class, mỗi class đặt trong một file
để dễ tìm, đọc và sửa. Entity mô tả dữ liệu nghiệp vụ và quan hệ; cấu hình EF Core
trong `Infrastructure/Persistence/Configurations/` quyết định cách ánh xạ dữ liệu.

Tách hoặc gộp file C# không tự đổi schema hay ERD. Thay đổi class được EF mapping,
khóa ngoại, ràng buộc và migration mới là những thay đổi cần phản ánh lên ERD.
Không phải mọi class/DTO trong backend đều tạo một bảng.

## Chín entity hiện tại

| Class/file | Bảng | Vai trò |
|---|---|---|
| `User.cs` | `users` | Tài khoản, quyền và trạng thái xác minh email. |
| `Plant.cs` | `plants` | Danh mục cây. |
| `Disease.cs` | `diseases` | Bệnh/tình trạng lá, nội dung và trạng thái duyệt hướng dẫn. |
| `PlantDisease.cs` | `plant_diseases` | Kết hợp cây–bệnh và mapping lớp dự đoán. |
| `Prediction.cs` | `predictions` | Bản ghi chẩn đoán, chủ sở hữu và snapshot kết quả. |
| `PredictionDetail.cs` | `prediction_details` | Các lớp ứng viên top-K, xác suất và thứ hạng. |
| `PredictionImage.cs` | `prediction_images` | Metadata ảnh, thứ tự, thời điểm hết hạn/xóa. **Bảng mới.** |
| `UserIdentity.cs` | `user_identities` | Liên kết tài khoản với định danh nhà cung cấp, hỗ trợ schema Google. **Bảng mới.** |
| `UserActionToken.cs` | `user_action_tokens` | Hash token xác minh email/đặt lại mật khẩu, thời hạn và trạng thái dùng. **Bảng mới.** |

`PredictionDetail` lưu lớp dự đoán, không phải ảnh. `UserActionToken` lưu token thao
tác tài khoản, không phải JWT đăng nhập. `__EFMigrationsHistory` là bảng kỹ thuật
do EF quản lý, không thuộc 9 entity nghiệp vụ.

## Quan hệ cần thể hiện trong ERD hiện tại

| Bảng cha → bảng con | Quan hệ | Khi xóa cha |
|---|---|---|
| `users` → `predictions` | Một user có 0..n prediction; mỗi prediction có thể không có user. | Đặt `user_id` về NULL. |
| `plants` → `plant_diseases` | 1 → 0..n. | Restrict. |
| `diseases` → `plant_diseases` | 1 → 0..n. | Restrict. |
| `plant_diseases` → `predictions` | 1 → 0..n qua lớp kết quả chính. | Restrict. |
| `predictions` → `prediction_details` | 1 → 0..n. | Cascade. |
| `plant_diseases` → `prediction_details` | 1 → 0..n qua lớp ứng viên. | Restrict. |
| `predictions` → `prediction_images` | **Mới:** 1 → 0..n; mỗi ảnh thuộc đúng một prediction. | Cascade. |
| `users` → `user_identities` | **Mới:** 1 → 0..n; mỗi identity thuộc đúng một user. | Cascade. |
| `users` → `user_action_tokens` | **Mới:** 1 → 0..n; mỗi token thuộc đúng một user. | Cascade. |

Các ràng buộc mới gồm unique `(prediction_id, position)`, unique
`(provider, provider_subject)`, unique `token_hash`, CHECK thời hạn/position/purpose
và định dạng hash token. User có thể không có password hash cho định danh bên ngoài.
Prediction có `result_snapshot` kiểu JSONB; Disease thêm phân loại tình trạng,
trạng thái duyệt nội dung và thuốc. Vì vậy ERD chi tiết cũng cần cập nhật thuộc tính,
nullability và ràng buộc, không chỉ thêm ba hình chữ nhật.

## ERD cũ và migration mới

ERD/SQL 6 bảng trong [tài liệu sơ đồ](../system_design_diagrams.md) và
[database/](../../database/README.md) là baseline trước migration mới. Database
ứng dụng `agrivision_db` đã áp dụng
[ConfirmedRequirementsSchema](../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs),
có 9 bảng nghiệp vụ. Database ERD riêng không phải nguồn migration của ứng dụng.

Giữ nguyên ERD 6 bảng; lần chỉnh AGRI-76 ngày 07/10 bổ sung [ERD 9 bảng hiện tại](../reports/AGRI-76/diagrams/erd_current.puml). Bảng đối chiếu trên mô tả
schema hiện tại; không coi sơ đồ cũ là đầy đủ cho database đang chạy. Nguồn kỹ thuật
để cập nhật ERD là [configurations](../../backend/src/AgriVision.Infrastructure/Persistence/Configurations/),
[model snapshot](../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs)
và schema PostgreSQL sau migration.

Schema hỗ trợ nhiều ảnh, Google và token email/reset không đồng nghĩa các endpoint
đó đã hoàn thiện: API upload hiện vẫn một file; Google/email/reset chưa được tích hợp
đầy đủ. Snapshot giúp giữ nội dung kết quả khi ảnh hết hạn; bản ghi cũ không có
snapshot gốc được giữ NULL thay vì tạo nội dung giả.

Xem [quy trình migration](database_migrations.md), [lệnh database](../../.agents/commands/database.md)
và [task log AGRI-79](../task-logs/AGRI-79/AGRI-79-database-migrations.md).
