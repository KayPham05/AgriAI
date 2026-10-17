<div align="center">
  <h1>AgriVision AI</h1>
  <p><strong>Hệ thống Nhận diện Bệnh Lá Cây & Quản lý Nông nghiệp Thông minh</strong></p>
  <p>Ứng dụng trí tuệ nhân tạo (ConvNeXt-Tiny) giúp chẩn đoán dịch hại cây trồng nhanh chóng, chính xác và khuyến nghị giải pháp điều trị an toàn.</p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&amp;logo=nextdotjs" alt="Next.js">
    <img src="https://img.shields.io/badge/ASP.NET_Core-9.0-512BD4?style=flat-square&amp;logo=dotnet" alt="ASP.NET Core 9">
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&amp;logo=postgresql" alt="PostgreSQL 16">
    <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&amp;logo=fastapi&amp;logoColor=white" alt="FastAPI">
    <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&amp;logo=pytorch&amp;logoColor=white" alt="PyTorch">
  </p>

  <p>
    <a href="#tổng-quan">Tổng quan</a> ·
    <a href="#tính-năng-chính">Tính năng</a> ·
    <a href="#kiến-trúc-hệ-thống">Kiến trúc</a> ·
    <a href="#khởi-động-nhanh-với-docker">Khởi động nhanh</a> ·
    <a href="#cấu-trúc-dự-án">Cấu trúc</a> ·
    <a href="#tài-liệu-chi-tiết">Tài liệu</a>
  </p>
</div>

---

## Tổng quan

**AgriVision AI** là giải pháp công nghệ hỗ trợ nhà nông và kỹ sư nông nghiệp nhận diện sớm bệnh trên lá cây thông qua hình ảnh. Hệ thống kết hợp mô hình thị giác máy tính hiện đại với nền tảng ứng dụng web trực quan, cho phép quản lý lịch sử chẩn đoán theo từng thửa ruộng/khu vực canh tác và tra cứu giải pháp xử lý, thuốc bảo vệ thực vật chính xác.

- **Dữ liệu huấn luyện:** Chuẩn bộ dữ liệu `v1.4` (88.000 ảnh lá cây chất lượng cao).
- **Mô hình AI:** ConvNeXt-Tiny phân loại đồng thời **10 loại cây** và **59 lớp cây + tình trạng bệnh**.

---

## Tính năng chính

- **Chẩn đoán dịch hại tự động:** Nhận diện loại cây và bệnh lý qua ảnh chụp lá cây (hỗ trợ nhiều góc chụp), cung cấp độ tin cậy và xếp hạng top-K khả năng cao nhất.
- **Hồ sơ nông nghiệp (Agricultural Profiles):** Cho phép người dùng tùy chọn gom nhóm lịch sử chẩn đoán theo từng mảnh vườn, khu vực canh tác.
- **Khuyến nghị thuốc BVTV an toàn:** Đưa ra danh mục thuốc đặc trị kèm hướng dẫn liều lượng theo đúng từng bệnh của từng loại cây đã được kiểm duyệt.
- **Bảo mật & Snapshot lịch sử:** Lưu trữ snapshot kết quả dưới dạng JSONB bất biến (bảo toàn lịch sử khi danh mục thay đổi) và tự động dọn dẹp ảnh gốc hết hạn sau 30 ngày (TTL).

---

## Kiến trúc hệ thống

```text
[ Người dùng / Trình duyệt ]
            │
            ▼
   Next.js Frontend (Port 3000)
            │
            ▼  (REST API / JWT)
 ASP.NET Core Web API 9.0 (Port 5080)
      ├── PostgreSQL 16 (Dữ liệu ứng dụng & EF Core Migrations)
      └── FastAPI AI Service (Port 8000) ──> ConvNeXt-Tiny (PyTorch)
```

| Thành phần | Công nghệ | Nhiệm vụ chính |
|---|---|---|
| **Frontend** | Next.js, React, Tailwind CSS | Giao diện tải ảnh, xem chẩn đoán, tra cứu danh mục và quản lý lịch sử. |
| **Backend** | ASP.NET Core 9, C#, EF Core | Quản lý xác thực, tài khoản, hồ sơ nông nghiệp, danh mục thuốc và API. |
| **Database** | PostgreSQL 16 (Alpine) | Lưu trữ quan hệ nghiệp vụ, dữ liệu 59 lớp bệnh và snapshot chẩn đoán. |
| **AI Service** | FastAPI, PyTorch, ConvNeXt-Tiny | Tiếp nhận ảnh lá cây và thực hiện suy luận phân loại bệnh. |

---

## Khởi động nhanh với Docker

Yêu cầu môi trường: Đã cài đặt **Docker** và **Docker Compose**.

### 1. Chuẩn bị file cấu hình & Checkpoint
```powershell
# Tạo file môi trường từ mẫu
Copy-Item .env.example .env
```
> Cấu hình `POSTGRES_PASSWORD` và `JWT_SECRET` trong `.env`.  
> Đặt các file checkpoint mô hình `best_convnext_tiny.pth` vào đúng thư mục `ai/models/checkpoints/plant/` và `ai/models/checkpoints/disease/`.

### 2. Khởi chạy hệ thống
```powershell
# Build các image và chạy migration cơ sở dữ liệu
docker compose build
docker compose up -d --wait postgres
docker compose run --rm --no-deps backend --migrate

# Khởi động toàn bộ các dịch vụ
docker compose up -d --wait
```

### 3. Địa chỉ dịch vụ
- **Giao diện Web:** [http://localhost:3000](http://localhost:3000)
- **Backend API Health:** [http://localhost:5080/api/health](http://localhost:5080/api/health)
- **AI Service Health:** [http://localhost:8000/health](http://localhost:8000/health)

Để dừng toàn bộ dịch vụ (vẫn giữ dữ liệu trong volume):
```powershell
docker compose down
```

---

## Cấu trúc dự án

```text
AgriAI/
├── frontend/          # Mã nguồn giao diện người dùng Next.js
├── backend/           # Mã nguồn ASP.NET Core API (.NET 9)
├── ai/                # Pipeline huấn luyện, suy luận mô hình & FastAPI service
├── database/          # Tài liệu schema và kịch bản SQL dữ liệu hạt giống
├── docs/              # Tài liệu phân tích yêu cầu, thiết kế kiến trúc và báo cáo kỹ thuật
└── docker-compose.yml # Cấu hình triển khai container cho toàn bộ hệ thống
```

---

## Tài liệu chi tiết

| Nội dung | Tài liệu tham khảo |
|---|---|
| **Cơ sở Dữ liệu & Schema chi tiết** | [docs/notes/database_details.md](docs/notes/database_details.md) |
| **Hướng dẫn chạy Docker toàn diện** | [docs/notes/docker_run_guide.md](docs/notes/docker_run_guide.md) |
| **Báo cáo Mô hình AI & Dataset v1.4** | [docs/reports/AGRI-21/README.md](docs/reports/AGRI-21/README.md) |
| **Sơ đồ thiết kế hệ thống (Architecture)** | [docs/system_design_diagrams.md](docs/system_design_diagrams.md) |
| **Yêu cầu hệ thống (System Requirements)** | [docs/system_requirements.md](docs/system_requirements.md) |
| **Lệnh phát triển & Kiểm thử tự động** | [.agents/commands/README.md](.agents/commands/README.md) |

---

## Quy ước đóng góp

- Tham khảo [Quy tắc dự án](.agents/rules/project_rules.md) trước khi tạo nhánh hoặc pull request.
- Quy chuẩn commit tuân theo [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): AGRI-XXX <mô tả>`.
- Mỗi nhánh làm việc tương ứng với một Jira Issue: `AGRI-XXX-<short-description>`.
