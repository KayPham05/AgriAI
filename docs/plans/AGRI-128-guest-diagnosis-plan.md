# AGRI-128 / AGRI-118 — Kế hoạch backend chẩn đoán Guest

- Ngày: 2026-10-19.
- Task thực hiện: AGRI-118 — Guest Plant Disease Diagnosis, thuộc story AGRI-110.
- Hạng mục tích hợp: S3-05 của AGRI-128.
- Nhánh: `AGRI-128-guest-diagnosis`, tách từ `AGRI-128-backend-improvement` tại `0fa664a`.
- Nhánh đích PR: `AGRI-128-backend-improvement`.
- Chuẩn áp dụng: [implementation rules](AGRI-128-implementation-rules.md).

## 1. Phạm vi đã xác nhận

Người dùng yêu cầu chỉ thực hiện backend; giao diện Guest sẽ được giao sau.
Guest được dùng cùng pipeline chẩn đoán và nhận cùng nội dung kết quả như tài
khoản đăng nhập. Điểm khác biệt là không lưu ảnh/lịch sử, không tạo hồ sơ và
không truy cập các API dữ liệu cá nhân yêu cầu xác thực. Không thêm quota riêng
cho Guest trong đợt này. Chính sách giới hạn upload/chống quá tải dùng chung
thuộc phần cần phối hợp với S3-04, không tự đặt ngưỡng nghiệp vụ mới.

Không thay schema, migration, dataset v1.4, mapping nhãn, AI model hoặc frontend.
Schema trong source tại base có 9 entity; tài liệu tổng thể đề cập schema 16
bảng và các API hồ sơ dự kiến. Không coi các phần dự kiến đó là đã hiện hữu.

## 2. Khảo sát source

- `PredictionsController.Predict` cho phép request không đăng nhập và trả 200;
  request của tài khoản hợp lệ trả 201.
- `PredictionService.PredictAsync` dùng chung AI/catalog cho cả hai trường hợp;
  chỉ upload storage và ghi prediction khi có user ID.
- History list/detail/delete có `[Authorize]`; detail kiểm tra owner.
- Unit/integration test Guest đã có nhưng chưa bao phủ đầy đủ hợp đồng response,
  dữ liệu liên quan, lịch sử của tài khoản khác và các nhánh lỗi.
- Cần kiểm chứng request gửi token không hợp lệ có bị xử lý như Guest hay không.
- Frontend còn chặn lối vào Guest và yêu cầu `imagePath` khác rỗng; ghi nhận cho
  đợt frontend sau, không sửa trong phạm vi backend này.

## 3. Thứ tự thực hiện

1. Chạy baseline backend và kiểm tra môi trường PostgreSQL Testcontainers.
2. Viết kiểm thử contract Guest: kết quả đầy đủ, cùng quy tắc nội dung/cảnh báo,
   không upload/delete storage và không ghi predictions/images/details.
3. Kiểm thử ranh giới xác thực: Guest bị từ chối ở API cá nhân, token không hợp
   lệ không được coi là một phiên User hợp lệ; kiểm tra không ảnh hưởng lịch sử
   đã tồn tại của tài khoản khác.
4. Kiểm thử lỗi đầu vào/AI/mapping và vòng đời stream tạm. Nếu phát hiện lỗi,
   ghi nhận test thất bại rồi sửa tối thiểu; giữ các hành vi đã đúng.
5. Chạy đầy đủ unit và integration backend, gộp coverage và đối chiếu mức 60%
   của AGRI-128 (workflow hiện đặt 50%). Không đổi collector, exclude hoặc gate.
6. Ghi report/task log có liên kết AGRI-118, kiểm tra diff, chuẩn bị commit và PR
   về nhánh tích hợp theo yêu cầu đã giao. Không tự merge hoặc tự phê duyệt PR.

## 4. Tiêu chí bàn giao

| Tiêu chí | Bằng chứng cần có |
| --- | --- |
| Guest gửi ảnh không cần tài khoản | HTTP 200 từ endpoint thật với AI test double được ghi rõ. |
| Kết quả đầy đủ như User | Đối chiếu nhãn, confidence, top-k, nội dung và warning trên cùng fixture. |
| Không lưu dữ liệu Guest | DB thật không phát sinh prediction/image/detail; storage không được gọi. |
| Không ảnh hưởng lịch sử tài khoản | Dữ liệu và lịch sử User vẫn nguyên vẹn sau request Guest. |
| Không truy cập dữ liệu cá nhân | History list/detail/delete và auth/me từ Guest bị từ chối. |
| Lỗi không tạo dữ liệu | Ảnh rỗng/sai định dạng, AI lỗi và mapping lỗi không tạo kết quả lưu trữ. |
| Tài liệu trung thực | Lệnh, ngày, kết quả thực, artifact và các phần chưa nghiệm thu được ghi riêng. |

Integration với AI giả không chứng minh chất lượng model hoặc inference thật.
Giao diện Guest, các API hồ sơ chưa có trong base, CI GitHub và reviewer approval
chỉ được đánh dấu hoàn thành khi có bằng chứng tương ứng.
