# AGRI-131 — Báo cáo phân tích hệ thống

- **Phạm vi:** Biên soạn lại tài liệu HTML do người dùng chỉ định thành Markdown.
- **DoD Jira:** Chưa xác nhận; hoàn thành tài liệu không đồng nghĩa nghiệm thu hệ thống hoặc hoàn tất Jira.
- **Tài liệu chính:** [Báo cáo phân tích hệ thống](bao_cao_phan_tich_he_thong.md).
- **Nguồn:** HTML buổi thực hành 2 (`bao_cao_phan_tich_he_thong.html`, lưu cục bộ).
- **Sơ đồ:** [3 ảnh đính kèm báo cáo](assets/session_2/), sao chép từ tài nguyên buổi thực hành 2 của AGRI-76.
- **Nhánh báo cáo:** `AGRI-131-requirements-analyst-report`, tạo từ `origin/main`.

## Nội dung và giới hạn

Giữ 13 yêu cầu chức năng, 9 yêu cầu phi chức năng, 10 use case và 3 sơ đồ từ HTML; phân biệt yêu cầu mục tiêu với trạng thái được mô tả trong nguồn. Các con số là thông tin thiết kế/cấu hình được trích lại, không phải kết quả đo mới.

Các thành phần liên quan được tài liệu nguồn đề cập nằm tại [backend](../../../backend/src/), [frontend](../../../frontend/src/) và [AI](../../../ai/). Lần biên soạn này không rà soát lại mã nguồn hoặc chạy kiểm thử ứng dụng.

Phạm vi xuất bản theo yêu cầu người dùng chỉ gồm báo cáo AGRI-131 và ảnh cần để đọc báo cáo. HTML nguồn, file phân công Jira, task log cục bộ và các thay đổi khác không nằm trong commit báo cáo.

## Kiểm tra ngày 31/10/2026

- Đối chiếu tự động: giữ đủ 163 khối nội dung văn bản từ HTML, 13 FR, 9 NFR, 10 UC và 3 sơ đồ.
- Cả 3 liên kết ảnh trong báo cáo và tổng cộng 8 liên kết trong hai file Markdown đều trỏ tới tài nguyên tồn tại trong worktree xuất bản; không còn CSS, script hoặc dữ liệu base64 của bản xuất HTML; không có ký tự lỗi mã hóa UTF-8.
- Không chạy kiểm thử ứng dụng, mô hình, database hoặc kiểm chứng lại trạng thái triển khai trong tài liệu nguồn.

## Đóng gói để chia sẻ ngày 31/10/2026

Tách báo cáo trên nhánh riêng từ `main`; chuyển 3 ảnh vào thư mục AGRI-131 để người đọc trên GitHub xem được mà không phụ thuộc tài nguyên chưa commit của AGRI-76. Bản đóng gói đã được đối chiếu đủ 163 khối văn bản; 3 ảnh PNG khớp từng byte với nguồn. Chỉ kiểm tra tài liệu, không chạy kiểm thử ứng dụng.
