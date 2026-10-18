# AGRI-128 — Nhật ký Thực hiện Backend Improvement

Nhánh: `AGRI-128-backend-improvement`  
Bắt đầu: 2026-10-18.  
Mục tiêu: Xây dựng pipeline cải tiến backend toàn diện theo 10 task nghiệp vụ S3-01 -> S3-10 từ Sprint 3 Backlog (`writing-block.md`).

---

## 2026-10-18 — Đối chiếu Backlog S3-01 -> S3-10 và Chuẩn hóa Pipeline

- Đã đọc và phân tích toàn bộ 10 task trong `writing-block.md` (EPIC A đến EPIC E).
- Phát hiện các khoảng trống kỹ thuật trong backend hiện tại so với yêu cầu backlog:
  - S3-01: Thiếu API `LogoutAsync`, chưa kiểm tra cờ `is_active` khi login, chưa quản lý phiên `user_sessions`.
  - S3-02: Chưa có API xem/cập nhật thông tin tài khoản và đổi mật khẩu an toàn.
  - S3-03: Bảng `agricultural_profiles` đã có nhưng chưa có Repositories, Services, Controllers.
  - S3-04: Đã có API suy luận AI 1 ảnh, cần giữ vững quy tắc snapshot JSONB bất biến và cảnh báo khi confidence <= 80%.
  - S3-05: Cần bảo đảm luồng Guest không lưu lịch sử, không tạo hồ sơ, không upload cloud storage.
  - S3-06: Chẩn đoán cần nhận `agriculturalProfileId` tùy chọn và gắn kết quả vào hồ sơ.
  - S3-07: Cần xây dựng bộ lọc lịch sử thông minh đa tiêu chí tại database (cây, bệnh, hồ sơ, khoảng ngày) với phân trang và sắp xếp ổn định.
  - S3-08: Thiếu API quản trị danh sách người dùng, kích hoạt/vô hiệu hóa và ghi nhật ký vào `admin_audit_logs`.
  - S3-09: Thiếu API quản lý thuốc BVTV và tài liệu tri thức (ràng buộc kiểm duyệt `is_approved`, `is_public` và đối soát nhãn).
  - S3-10: Cần tích hợp Cố vấn Canh tác AI (ChatGPT / OpenAI API) kết hợp dữ liệu tri thức nông nghiệp Việt Nam, hỗ trợ fallback khi không có API key.
- Đã hoàn thiện tài liệu kế hoạch pipeline chuẩn hóa tại [`docs/plans/AGRI-128-backend-improvement-plan.md`](../plans/AGRI-128-backend-improvement-plan.md).
