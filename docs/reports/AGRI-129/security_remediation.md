

## 2026-10-23 — Quy tắc tài liệu theo Jira

Cập nhật `AGENTS.md`: tạo/tái sử dụng thư mục đúng Jira key; tasklog ngắn gọn, dẫn link bằng chứng, không tạo README.md trong task-logs. Giữ README của technical report. Kiểm diff/whitespace pass; chỉ sửa tài liệu.


## Browser kiểm ảnh người dùng

Bằng chứng lượt 2026-10-23 15:41 GMT+7 được giữ lại khi người dùng xóa báo cáo nghiệm thu riêng: đăng nhập qua UI, người dùng tự hoàn thành CAPTCHA; upload ảnh JPG chỉ định, history tăng từ 0 lên 1, detail tải ảnh blob 416 × 738 thành công. Model trả Ngô/Chay la 98.9%; đây không phải đánh giá accuracy.

Prediction `8e606a86-a277-4dc0-9358-21de937f39ac`, owner `fd099da7-0949-41a4-aa95-1c6391cb94b0`; key `users/fd099da7-0949-41a4-aa95-1c6391cb94b0/predictions/8e606a86-a277-4dc0-9358-21de937f39ac/7b3f267b-8284-45c8-94ed-b9eedc23ba1d.jpg` khớp DB và Dashboard bucket `agrivision-images-dev` private. Signed GET lúc 08:42:51Z trả 200, image/jpeg, 60,481 bytes; SHA-256 khớp nguồn `94f5417007c2d0b361f0eddaff9607556582e0b4ae71ed49a874952efc3fcce4`. Journal user rỗng; giữ ảnh trong tài khoản, expiry 2026-11-22T08:41:57.891418Z.

Artifacts local ignored: `.cache/qa-verification/agri129/nho_r2_verification.json`, `nho_history.png`, `nho_r2_object.png`. File ảnh nguồn local đã được người dùng xóa sau lượt kiểm; không chạy lại browser/upload trong lượt cập nhật tài liệu này.

## Đồng bộ tài liệu sau khi xóa file — 2026-10-23

Bỏ liên kết tới báo cáo nghiệm thu và nghiên cứu mail đã xóa; rút gọn README báo cáo/tasklog, giữ kết quả và giới hạn chính, không khôi phục file. Lượt này chỉ kiểm liên kết local và diff; không chạy lại app test/build hoặc cloud.


## Chia commit theo yêu cầu — 2026-10-23

Chia thành 6 nhóm conventional commit AGRI-129: storage/upload, logout, dependency, CI, luật agent và tài liệu. Kiểm staged diff/whitespace từng nhóm; credential R2 cấu hình không có trong nhóm storage. Không push hoặc chạy lại suite ở lượt commit; kết quả test/coverage phía trên là các lượt đã ghi ngày giờ.
