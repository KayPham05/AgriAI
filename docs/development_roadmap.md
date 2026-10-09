# Lộ trình phát triển AgriVision AI

> Đối chiếu lại ngày 2026-10-03 trên nền commit `094ec6e`. Đây là thứ tự công việc, không phải cam kết rằng mọi tính năng trong [yêu cầu](system_requirements.md) đã hoàn thành. Xem [tech stack](tech_stack.md) để phân biệt phần đang dùng và dự kiến.

## Phạm vi

MVP tập trung **phân loại bệnh lá** bằng ConvNeXt-Tiny. Web Next.js gọi ASP.NET Core Web API (.NET 9); PostgreSQL lưu dữ liệu nghiệp vụ. FastAPI phục vụ model là thành phần dự kiến. Không mở rộng sang detection, segmentation, severity hoặc hệ thống gợi ý thuốc khi chưa có yêu cầu.

## Hiện trạng cần dựa vào

| Phần | Đã có trong repository | Chưa được xác nhận hoàn chỉnh |
|---|---|---|
| Dữ liệu và AI | Dataset v1.4 có 88.000 ảnh, 59 lớp, ba split cố định; mã train/evaluate/CLI và checkpoint v1.4 có báo cáo đánh giá nội bộ. FastAPI thật đã chạy trong Compose và được kiểm chứng local qua CLI–HTTP–API–web cho tài khoản đăng nhập. | Cần run CI mới và nghiệm thu đầy đủ yêu cầu; smoke local không thay cho đánh giá độ chính xác. Xem [kiểm chứng AGRI-82](reports/AGRI-82/docker_ai_verification.md). |
| Web/API/DB | Next.js, ASP.NET Core 9, PostgreSQL và migration; API có auth, danh mục, dự đoán, lịch sử. | Cần đối chiếu từng luồng với [yêu cầu](system_requirements.md), nhất là quyền, upload, nhãn và chính sách ảnh. Khi AI không sẵn sàng, không ghi kết quả dự đoán giả. |
| CI/Docker | CI kiểm tra Compose, Python, backend, frontend; Compose gốc và CI được cấu hình chạy DB/API/web/AI CPU thật. CI tải checkpoint từ Drive, kiểm checksum và gọi `/predict`. Đã có [CI run 36992608938](https://github.com/KayPham05/AgriAI/actions/runs/36992608938) thành công cho commit `727aa59f5b1ded338df09ba338ca13b45c12a864`, theo bằng chứng run đã lưu. | Không suy rộng kết quả run cũ dùng health mock cho cấu hình hoặc HEAD hiện tại. Cần run mới để xác nhận CI inference thật; chưa nghiệm thu VPS staging hoặc E2E. Xem [kế hoạch CI/CD](plans/ci_cd_plan.md). |

Bằng chứng dataset và checkpoint: [AGRI-21](reports/AGRI-21/README.md). Sơ đồ hiện trạng, thiết kế mục tiêu tách riêng và schema hiện có: [BFD, DFD, ERD](system_design_diagrams.md).

## Thứ tự ưu tiên

1. **Chốt hợp đồng suy luận:** checkpoint v1.4, mapping 59 lớp, preprocessing, schema phản hồi, đơn vị confidence và lỗi AI. Giữ ba manifest cố định; chọn model bằng validation và không dùng test để chọn lại cấu hình.
2. **Đối chiếu API với yêu cầu:** kiểm tra quyền sở hữu từng prediction, xác thực ảnh, giới hạn upload, xử lý ảnh/DB khi AI lỗi và thời hạn lưu ảnh. Chỉ thêm schema hoặc endpoint khi luồng sản phẩm cần.
3. **Triển khai FastAPI tối thiểu:** dùng lại mã inference và checkpoint đã chốt; kiểm tra cùng ảnh qua CLI, AI HTTP, API và web cho cùng nhãn, mapping và kết quả trong sai số số học đã định.
4. **Kiểm chứng trước staging:** chạy test tập trung cho contract, nhánh lỗi và phân quyền; sau đó chạy CI trên GitHub. Chỉ triển khai VPS khi đã cấu hình secret, image pull, backup DB và AI thật. Health mock không phải cổng nghiệm thu model.

Ghi kết quả thực và giới hạn trong report theo Jira task. Không tạo lớp trừu tượng, dịch vụ, migration hoặc pipeline mới chỉ để đáp ứng một sơ đồ dự kiến.
