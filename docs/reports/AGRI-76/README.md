# AGRI-76 — Phân tích hiện trạng và thiết kế hệ thống

- **Ngày đối chiếu:** 2026-10-03.
- **Branch:** `AGRI-76-requirements-analysis-design`.
- **Nền source:** `094ec6e6f6fe8c75a3256f5d7e73d43fd01852a5`; commit tài liệu tiếp theo ghi trong lịch sử branch, không thay đổi nền source được phân tích.
- **DoD:** Chưa hoàn tất nghiệm thu Jira. Đã bổ sung phân tích hiện trạng và truy vết; cần nhóm duyệt phạm vi, các quyết định còn mở và đối chiếu đầy đủ checklist AGRI-76 trước khi Done.

## Kết quả và điểm vào

- [Yêu cầu và ma trận truy vết](../../system_requirements.md): tác nhân/quyền hiện tại, FR/NFR mục tiêu, source và case liên quan, trạng thái còn thiếu.
- [BFD/DFD và ERD](../../system_design_diagrams.md): phần 1 là hiện trạng; phần 2 là đề xuất, không tính là chức năng đã triển khai; phần 3 là schema hiện có.
- [Tech stack](../../tech_stack.md), [lộ trình](../../development_roadmap.md): kiến trúc và giới hạn bằng chứng CI/inference.
- [Tasklog](../../task-logs/AGRI-76-documentation.md): danh sách thay đổi, kiểm tra và việc còn lại trong lần chỉnh sửa này.

## Nguồn source chính

- [Controllers API](../../../backend/src/AgriVision.API/Controllers/): auth, prediction, danh mục và health.
- [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs): upload trước AI, mapping và lưu/xóa kết quả.
- [Migration InitialCreate](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20260925161222_InitialCreate.cs): ERD, nullable owner, FK và unique/check constraints.
- [Web predictionApi](../../../frontend/src/services/predictionApi.ts): multipart `file`, gọi API và chuyển đổi response.
- [Mã AI](../../../ai/) và [báo cáo AGRI-21](../AGRI-21/README.md): bằng chứng dữ liệu/model riêng, không suy ra parity triển khai từ health mock.

## Giới hạn kết luận

Đây là cập nhật tài liệu, không sửa bảo mật, mapping fallback, kiểm tra ảnh hay scheduler trong ứng dụng. Chức năng có source không đồng nghĩa kiểm thử Passed. CI run thành công đã ghi trong lộ trình chỉ áp dụng commit của run; không chứng minh working tree AGRI-76 hoặc checkpoint thật đã nghiệm thu. Tasklog ghi cụ thể kiểm tra tài liệu và phần chưa chạy.
