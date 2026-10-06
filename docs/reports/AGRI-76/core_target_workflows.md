# AGRI-76 — Quy trình mục tiêu cho chức năng cốt lõi

Theo xác nhận của người dùng ngày 2026-10-06: bổ sung **Activity, Sequence và State Diagram**, chỉ chức năng cốt lõi và mô tả **quy trình mục tiêu**. Phạm vi được chọn là đăng nhập và nhánh người đã đăng nhập phân loại một ảnh/xem kết quả, xem lịch sử/chi tiết/xóa của chính mình. Đây là nhánh con của quy trình mục tiêu; QD-01 vẫn cho khách dự đoán không lưu lịch sử, QD-02/QD-03 vẫn áp dụng cho lượt nhiều ảnh. Hai nhánh đó chưa được vẽ trong bộ cốt lõi này. Các sơ đồ này là thiết kế đề xuất, không thay thế mô hình hiện trạng hoặc bằng chứng nghiệm thu.

Nguồn yêu cầu: [FR/NFR mục tiêu](../../system_requirements.md). Đối chiếu hiện trạng: [System Analysis](system_analysis.md), [Use Case Specification](use_case_specifications.md), [traceability](traceability.md), [ERD hiện tại](diagrams/erd_current.puml). Bản mục tiêu tạo 06/10 và cập nhật delta 07/10; source hiện tại sau AGRI-70, không thay đổi code/database trong lần sửa sơ đồ.

## Sơ đồ và mapping

| Quy trình | Activity editable / SVG | Sequence editable / SVG | Mapping mục tiêu / dữ liệu |
|---|---|---|---|
| Đăng nhập | [Source](diagrams/target_activity_authentication.puml) · [SVG](diagrams/target_activity_authentication.svg) | [Source](diagrams/target_sequence_authentication.puml) · [SVG](diagrams/target_sequence_authentication.svg) | UC-02; FR-02; BFD mục tiêu 1.1 / DFD mục tiêu P1; users, JWT/browser session |
| Phân loại một ảnh và xem kết quả | [Source](diagrams/target_activity_prediction.puml) · [SVG](diagrams/target_activity_prediction.svg) | [Source](diagrams/target_sequence_prediction.puml) · [SVG](diagrams/target_sequence_prediction.svg) | UC-05/UC-06; FR-02/04/05/06, NFR-01/02/05; BFD mục tiêu 2.1–2.3 / DFD mục tiêu P2; catalog/mapping, predictions/details, ảnh cloud |
| Lịch sử / chi tiết / xóa của mình | [Source](diagrams/target_activity_history.puml) · [SVG](diagrams/target_activity_history.svg) | [Source](diagrams/target_sequence_history.puml) · [SVG](diagrams/target_sequence_history.svg) | UC-06/UC-07; FR-07, NFR-01; BFD mục tiêu 3.1–3.2 / DFD mục tiêu P3 (đọc); xóa owner có source UC-07/F3.3/P4 hiện trạng; predictions/details/ảnh |

[State xử lý một ảnh: source](diagrams/target_state_prediction.puml) · [SVG](diagrams/target_state_prediction.svg) · [gallery](diagrams/index.html#target_state_prediction).

## Giải thích Activity và Sequence

- **Đăng nhập:** tài khoản đã tồn tại; đọc users, kiểm BCrypt, cấp JWT và mở ứng dụng; thông tin sai trả 401. Đây là luồng mục tiêu dựa trên API đang có, không thêm OTP/reset password/refresh token.
- **Prediction:** Trong nhánh tài khoản được vẽ, JWT/validation đi trước AI; AI/mapping hợp lệ rồi mới lưu ảnh. FastAPI preprocess theo checkpoint và gọi ConvNeXt-Tiny; API chỉ lưu khi AI response và mapping hợp lệ. Ghi predictions/details/images/snapshot trong transaction, trả 201 sau commit rồi web hiển thị kết quả. Activity có các nhánh lỗi validation/storage/AI/DB; Sequence có request/response qua User, Web, Backend, Cloud, AI, Model và DB. Lỗi storage/DB được ghi chú và truy vết tới Activity để tránh một Sequence quá lớn.
- **History:** list theo UserId, detail kiểm JWT/owner và chỉ trả dữ liệu được phép. Xóa có xác nhận của user, server kiểm lại quyền; chỉ báo thành công sau thao tác storage/DB thành công. Activity thể hiện nhánh lỗi; Sequence giữ luồng chính và ghi chú điều kiện dừng khi lỗi. GET detail hiện 401 auth hoặc 404 missing/sai owner; DELETE sai owner 401, bool storage false 400 và giữ history. Lỗi DB sau xóa storage vẫn có rủi ro ảnh đã mất.

## State đề xuất và ranh giới với DB

State mô tả **một lần xử lý ảnh**: Chờ ảnh → Kiểm ảnh/phiên nhánh tài khoản → Suy luận/kiểm mapping → Lưu ảnh → Lưu DB/snapshot → Hoàn tất, hoặc Thất bại. Transition có event/guard; Hoàn tất chỉ khi DB commit thành công. AI/mapping xảy ra trước upload; bước DB lỗi sau upload yêu cầu cleanup ảnh; yêu cầu cleanup không bảo đảm storage đã xóa thành công.

Đây là trạng thái logic đề xuất cho workflow, không phải enum hoặc cột đã triển khai. `PredictionStatus` hiện tại chỉ là state UI; entity/table Prediction chưa có status. Không thêm cột/bảng lifecycle vào ERD hoặc SQL để khớp sơ đồ này. Request thử lại là một lần xử lý mới; chưa tự thiết kế queue/job hoặc lưu record thất bại.

## Những bước còn Planned / cần chốt

| Nội dung | Hiện trạng và mục tiêu |
|---|---|
| Xác thực prediction/detail | POST hiện công khai và mục tiêu cho khách dự đoán. Nhánh tự lưu lịch sử trong sơ đồ cần phiên hợp lệ; đọc lịch sử/detail của tài khoản cần JWT/owner. Không bắt khách đăng nhập để dự đoán lượt hiện tại. |
| Validation ảnh | UI hiện 15 MiB; API kiểm rỗng/đuôi. Mục tiêu server kiểm kích thước/định dạng/nội dung trước upload; FR-04/QD-02 yêu cầu tổng dung lượng cả lượt dưới 30 MB, không phải giới hạn riêng từng ảnh; số byte/số ảnh tối đa cần chốt theo AC nguồn |
| FastAPI / AI contract | Có HTTP client, chưa có bridge inference thật được nghiệm thu; preprocessing, mapping, confidence/schema HTTP phải thống nhất với checkpoint |
| Mapping và failure | Source hiện kiểm chính xác index/name top-1 và top-k; không fallback hoặc ghi thành công khi mapping sai |
| Cleanup ảnh / xóa owner | AI lỗi chưa upload; persistence lỗi cố cleanup, giữ lỗi gốc. DELETE storage false/exception giữ history; distributed transaction chưa có |

Không vẽ CRUD Admin, sửa hồ sơ, đăng ký/reset password, batch ảnh, scheduler 30 ngày, model version, detection/severity hoặc công cụ vận hành trong bộ cốt lõi này. Những yêu cầu liên quan vẫn giữ trong đặc tả; sơ đồ mô tả mỗi ảnh và không chốt kết quả chung cho nhiều ảnh.

## Định dạng và kiểm tra

Dùng UML Activity với swimlane, Sequence với participant/alt/opt, State với event/guard; PlantUML editable, SVG và gallery HTML offline. Giữ theme mặc định đã chọn và preset `fit` theo nội dung; ưu tiên notation UML và các thành phần thực tế hơn giới hạn editorial của skill. Chia auth/prediction/history thành sơ đồ riêng để dễ đọc. Bộ mục tiêu nhận diện bằng prefix `target_` và nhãn MỤC TIÊU/PLANNED; bộ hiện trạng giữ nguyên hành vi source, mã UC được đồng bộ sau khi gộp còn 10 Use Case.
