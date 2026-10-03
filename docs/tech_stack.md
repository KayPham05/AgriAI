# Tech stack AgriVision AI

Tài liệu này phân biệt công nghệ đã có trong mã nguồn với thành phần dự kiến. Phiên bản ghi theo cấu hình repository ngày 2026-10-01; đây không phải danh sách dịch vụ đã triển khai lên staging.

## Đang dùng

| Phần | Công nghệ | Vai trò / trạng thái |
|---|---|---|
| Web | Next.js 16.3.6, React 19.2.0, TypeScript, Tailwind CSS 4, pnpm 10.34.5 | Giao diện và proxy API; cấu hình trong `frontend/package.json`. |
| Backend | ASP.NET Core Web API trên .NET 9, Entity Framework Core 9, Npgsql | API nghiệp vụ, truy cập PostgreSQL; cấu hình trong `backend/src/` và `backend/Dockerfile`. |
| Cơ sở dữ liệu | PostgreSQL 16 | Lưu dữ liệu ứng dụng; dùng trực tiếp `postgres:16-alpine` trong Compose. |
| AI ngoại tuyến | Python, PyTorch, torchvision, timm; kiến trúc ConvNeXt-Tiny | Mã huấn luyện, đánh giá và CLI inference trong `ai/`; cấu hình dataset v1.4, 59 lớp. Báo cáo AGRI-21 ghi kết quả nội bộ, chưa xác nhận inference qua web. |
| Container | Docker Compose | Compose gốc chạy PostgreSQL, backend và frontend; có thể chỉ khởi động service `postgres` từ root. |
| Kiểm thử và CI | xUnit/Testcontainers, Vitest, unittest/coverage.py, GitHub Actions | Kiểm tra backend, frontend, Python và Compose smoke. Coverage có ngưỡng tạm thời riêng cho từng phần. |

## Dự kiến hoặc chưa vận hành

| Phần | Công nghệ | Trạng thái |
|---|---|---|
| AI service | FastAPI phục vụ mô hình ConvNeXt-Tiny | Chưa có service inference thật trong Compose gốc. `docker-compose.ci.yml` chỉ thêm AI health mock; health pass không xác nhận chất lượng dự đoán. |
| Staging | Dự kiến Docker Compose trên VPS | Chưa cấu hình CD hoặc Compose staging vì chưa dùng đến; bổ sung khi có nhu cầu triển khai. |

Nguồn cấu hình chính: [`frontend/package.json`](../frontend/package.json), [`backend/Directory.Build.props`](../backend/Directory.Build.props), [`backend/Dockerfile`](../backend/Dockerfile), [`ai/requirements.txt`](../ai/requirements.txt), [`docker-compose.yml`](../docker-compose.yml), [CI workflow](../.github/workflows/ci.yml).
