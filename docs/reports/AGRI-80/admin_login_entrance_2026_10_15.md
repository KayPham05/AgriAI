# AGRI-80 - Khôi phục hiệu ứng đăng nhập thành công Admin (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Người dùng báo mất hiệu ứng đăng nhập Admin. Nguyên nhân ở frontend: nhánh vai trò trong AppProvider gọi router.replace('/admin') quá sớm, bỏ qua điều kiện hoàn tất hiệu ứng.

## Cách sửa giao diện

Giữ luồng đăng nhập có sẵn; tách chuyển trang Admin khỏi tải dữ liệu khởi động User. Tại `/`, Admin không chờ danh mục/lịch sử User nhưng phải chờ LoginSuccessScreen báo entranceReady rồi mới tới `/admin`.

Tái sử dụng logo/thương hiệu/lời chào bằng GSAP có phạm vi. Không thêm timeout, hiệu ứng, thư viện hay token. Áp dụng khi đăng nhập mới và khôi phục phiên; giữ luồng User, đường dẫn quay lại và thử lại lỗi. Giảm chuyển động hoàn tất ngay.

Đường dẫn: `frontend/src/providers/AppProvider.tsx`, `frontend/src/App.adminEntrance.test.tsx`, `frontend/src/components/common/LoginSuccessScreen.tsx`.

## Bằng chứng frontend đã ghi nhận

- Hai ca điều khiển thời điểm hoàn tất hiệu ứng RED: Admin mới/khôi phục bị chuyển trước khi hoàn tất. Sau sửa cả hai đạt, chứng minh chỉ chuyển sau hàm gọi lại và không chờ dữ liệu khởi động dành cho User.
- Mốc sửa hiệu ứng: nhóm chọn 11/11 đạt 13.58s; toàn bộ frontend 188/188, 28 tệp đạt 66.49s; typecheck/lint 160 tệp/định dạng 2 tệp sửa/diff và frontend production build đạt.
- Chromium ở mốc đó: đăng nhập mới 1280 và phiên khôi phục 375 đều thấy thương hiệu/lời chào tại `/` trước `/admin`; giảm chuyển động 768 vào trang không đợi hoạt ảnh; không lỗi trang.
- Bằng chứng bị Git bỏ qua: `.cache/admin-verification/admin_entrance_review.py`, `admin_entrance_{1280,375}.png`. Đã xem ảnh lời chào máy tính.
- Kiểm thử hiệu ứng tiếp tục có trong bộ frontend hiện hành 174/174. Kiểm chứng trang mock và đăng nhập trên 1280/768/375 tại cổng 3000: xem [báo cáo hiện hành](admin_mock_frontend_2026_10_15.md).

Các kết quả thuộc lần triển khai trước, không chạy lại khi dọn tài liệu. Chưa có số đo bao phủ/CI mới hay chứng nhận thiết bị thật/nhiều trình duyệt. Chưa staging/commit/push.
