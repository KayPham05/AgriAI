# AGRI-128 / AGRI-122 — Knowledge and medicine backend A/B

- Task AGRI-122, story AGRI-114, S3-09; base `a43797d` trên `AGRI-128-backend-improvement`.
- Nhánh `AGRI-128-knowledge-medicine`; người dùng duyệt triển khai A/B ngày 2026-10-24.
- Chỉ backend: không thực hiện phần C/frontend. Không commit/push/PR trong lượt triển khai.
- Tài liệu là nội dung văn bản và link nguồn; không upload file.
- Xóa thuốc/tài liệu bằng `IsActive=false`, đồng thời gỡ công khai để đúng constraint DB.
- Quyết định mới nhất ngày 2026-10-24: giữ trigger hiện tại; sửa nội dung/hướng dẫn
  nhãn cần duyệt lại. Quyết định này thay thế lựa chọn giữ trạng thái duyệt trước đó.

## A. Quản lý và tra cứu

1. Tái sử dụng danh mục cây/bệnh và cặp cây–bệnh hiện có, giữ mapping AI v1.4.
   Không cho CRUD tri thức thay `ClassIndex`, nhãn hoặc tự sinh cặp AI mới.
   Bổ sung thao tác Admin duyệt nội dung bệnh để công khai thông tin và đáp ứng cờ
   `IsContentApproved` trong chẩn đoán. Sửa nội dung bệnh thu hồi duyệt; không đổi loại
   tình trạng của mapping AI qua thao tác duyệt.
2. Admin CRUD thuốc, nội dung bài viết, liên kết tài liệu tới cặp cây–bệnh và
   hướng dẫn sử dụng thuốc theo từng cặp. Validate trường bắt buộc, độ dài,
   URL HTTP(S), ID liên kết, trạng thái công khai/duyệt/hoạt động.
3. Public list/detail chỉ trả nội dung approved/public/active; lọc cây/bệnh,
   phân trang PagedResult, thứ tự ổn định. Không lộ liên kết thuốc chưa được
   duyệt hoặc nhãn chưa xác minh. Public không thể bật includeInactive.
4. Tách routes Admin/public, service nghiệp vụ và repository EF; đọc AsNoTracking,
   DTO record/get-init, cancellation token xuyên suốt. Tái sử dụng schema hiện có.

### Quyết định database đã xác nhận (2026-10-24)

Kiểm thử PostgreSQL phát hiện các trigger từ migration `20261017084014_DatabaseImprovement`
tự thu hồi duyệt khi sửa thuốc, tài liệu, hướng dẫn nhãn hoặc liên kết tài liệu.
Ban đầu điều này mâu thuẫn với lựa chọn giữ duyệt. Sau khi được giải thích, người dùng
chọn **giữ trigger hiện tại, sửa xong cần duyệt lại**. Không thêm/sửa migration.

API đọc lại bản ghi sau lưu để response phản ánh cờ và thời điểm do trigger cập nhật.
Sửa thuốc thu hồi duyệt/công khai sản phẩm và xác minh/duyệt các use; sửa hướng dẫn
nhãn thu hồi use và sản phẩm; sửa nội dung/liên kết bài viết thu hồi duyệt/công khai bài.
Duyệt lại là thao tác riêng với nội dung giữ nguyên. Khôi phục `isActive` cũng tuân theo
trigger hiện hành, cần duyệt/công khai lại sau khi khôi phục.

## B. Tích hợp chẩn đoán

- Chỉ lấy thuốc thuộc đúng cặp AI dự đoán, còn hoạt động/công khai/duyệt,
  liên kết được duyệt và nhãn xác minh; confidence > 0.8 và condition Disease.
- Thêm danh sách `recommendedMedicines` có cấu trúc vào result/snapshot.
  Giữ kiểu string/null của `medication` cho frontend hiện tại, nhưng lượt mới
  chỉ dựng từ danh mục đủ điều kiện; không lấy chuỗi Disease.Medication chưa
  kiểm theo nhãn làm gợi ý mới. Snapshot lịch sử cũ không bị viết lại.
- User lưu snapshot; Guest nhận kết quả nhưng không lưu history/storage.
- Không làm OpenAI advisor S3-10, không tự tạo tên thuốc/liều lượng/dữ liệu thật.

## Kiểm chứng và bàn giao

- TDD HTTP/PostgreSQL cho routes chưa có, validation, công khai/duyệt, soft delete,
  thu hồi duyệt sau chỉnh sửa, duyệt lại, CRUD links và snapshot.
- Unit test nghiệp vụ invalid/public/label/threshold; integration Guest/User/Admin.
- Build, full backend tests theo CI, gộp coverage >=60% (target 80%), diff/secret checks.
- Báo cáo và task log AGRI-128 tham chiếu AGRI-122; ghi kết quả thực tế và giới hạn.

## Tiến độ ngày 2026-10-24

A/B backend đã triển khai; build đạt, 109 unit + 171 integration đạt, không skip.
Coverage nhánh gộp 73.92%, đạt sàn 60% nhưng chưa đạt target 80%.
Không đổi migration theo quyết định giữ trigger, sửa cần duyệt lại. Chưa commit/push/PR.
Chi tiết endpoint, payload test, bằng chứng và giới hạn tại
[báo cáo kỹ thuật](../reports/AGRI-128/knowledge_medicine.md).

## Mở rộng kế hoạch ngày 2026-10-25 — phần C

Người dùng xác nhận được giao cả trang Admin quản lý cây/bệnh/thuốc/bài viết
và trang tra cứu User/Guest. Đã lập [kế hoạch frontend C](AGRI-128-knowledge-medicine-frontend-plan.md)
riêng để duyệt; chưa triển khai. Giới hạn “chỉ backend” phía trên ghi nhận phạm vi
lượt A/B ngày 2026-10-24, không còn là phạm vi tổng thể AGRI-122 được giao mới.
