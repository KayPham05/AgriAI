# AgriVision AI

Hệ thống nhận diện bệnh lá cây sử dụng ConvNeXt-Tiny.

## Tài liệu cần đọc

| Cần biết | Tài liệu |
|---|---|
| Công nghệ đang dùng và phần dự kiến | [Tech stack](docs/tech_stack.md) |
| Phạm vi và tiêu chí chấp nhận | [Yêu cầu hệ thống](docs/system_requirements.md) |
| Luồng và dữ liệu | [Sơ đồ thiết kế](docs/system_design_diagrams.md) |
| Thứ tự công việc còn lại | [Lộ trình phát triển](docs/development_roadmap.md) |
| Dataset, nhãn và bằng chứng mô hình | [Báo cáo AGRI-21](docs/reports/AGRI-21/README.md) |
| Kiểm thử, Docker và kế hoạch triển khai | [Kế hoạch CI/CD](docs/plans/ci_cd_plan.md) |

Đọc đúng tài liệu theo việc cần làm; [mục lục tài liệu](docs/README.md) chứa báo cáo và ghi chú chi tiết. Chỉ triển khai phần đã có yêu cầu; sơ đồ và kế hoạch mô tả mục tiêu, không xác nhận tính năng đã hoàn thành.

## Cấu trúc

```text
ai/data/                        DataLoader và preprocessing dùng chung
ai/tasks/agri_21/scripts/       Công cụ tạo và audit dataset đến v1.4
ai/tasks/agri_21/tests/         Kiểm thử pipeline dữ liệu AGRI-21
ai/                             Huấn luyện, đánh giá và suy luận
.agents/rules/       Quy tắc dành cho agent
docs/                Nhật ký task và tài liệu dự án
experiments/         Kết quả được tổ chức theo EXP-XXX
```

## Dataset

Dataset không được lưu trong Git. Cấu hình AI hiện dùng `v1.4`: 88.000 ảnh JPEG
224×224, 10 loại cây và 59 lớp cây+tình trạng. Ba split cố định gồm 61.599
train, 8.802 validation và 17.599 test. Bản `v1.3` là mốc đối chiếu; xem
[bằng chứng và hợp đồng nhãn v1.4](docs/reports/AGRI-21/README.md) trước khi
dùng dataset hoặc checkpoint.

Sau khi tải về, giữ nguyên cấu trúc:

```text
v1.4/
├── images/
├── manifests/
│   ├── train.csv
│   ├── val.csv
│   └── test.csv
├── metadata/
└── reports/
```

Khai báo thư mục dataset cho phiên làm việc hiện tại bằng biến môi trường:

```powershell
$env:AGRIVISION_DATASET_DIR = "<dataset_root>\v1.4"
```

Pipeline đọc trực tiếp `train.csv`, `val.csv` và `test.csv` trong thư mục
`manifests/`. Script training không chia lại dữ liệu; seed chỉ điều khiển quá
trình huấn luyện và thứ tự batch.

## Chạy module AI

```powershell
.\ai\setup_env.bat
.\.venv\Scripts\python.exe -m ai.train
.\.venv\Scripts\python.exe -m ai.evaluate
.\.venv\Scripts\python.exe -m ai.predict --help
```

Các task dùng chung ConvNeXt-Tiny và split v1.4:

- `plant`: 10 lớp từ cột `plant`.
- `disease`: 44 nhãn từ cột `condition`, có weighted loss.
- `compound`: 59 lớp cây+tình trạng từ cột `compound_label`; là task mặc định.

```powershell
.\.venv\Scripts\python.exe -m ai.train --task plant
.\.venv\Scripts\python.exe -m ai.evaluate --task plant
.\.venv\Scripts\python.exe -m ai.train --task disease
.\.venv\Scripts\python.exe -m ai.evaluate --task disease
.\.venv\Scripts\python.exe -m ai.train --task compound
.\.venv\Scripts\python.exe -m ai.evaluate --task compound
```

Theo dõi từng task bằng TensorBoard:

```powershell
.\.venv\Scripts\tensorboard.exe --logdir runs
```

Checkpoint và báo cáo nằm dưới `ai/checkpoints/v1.4/` và `ai/outputs/v1.4/`;
`plant`/`disease` có thư mục con theo task. Artifact nằm ngoài Git.

Script cũ sau chỉ chạy tuần tự hai baseline `plant` và `disease`:

```powershell
.\ai\run_classification_baselines.bat
```

## Google Colab

Notebook Colab chạy từng baseline và lưu artifact trên Google Drive:

```text
notebooks/01_train_classification_colab.ipynb
```

Xem hướng dẫn chuẩn bị project, dataset ZIP và GPU tại
`docs/notes/google_colab_training_guide.md`.

Chạy toàn bộ kiểm thử dữ liệu từ root repository:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"
```

## Chạy bộ khung web, API và PostgreSQL bằng Docker

Xem [hướng dẫn chạy Docker từng bước](docs/notes/docker_run_guide.md) để chuẩn bị
`.env`, khởi động, kiểm tra health, chạy smoke với mock và xử lý lỗi.

`docker-compose.yml` dựng PostgreSQL, ASP.NET Core API và Next.js standalone.
Backend gọi AI service thật tại `AI_SERVICE_URL`; service đó cần được chạy
riêng. PostgreSQL tạo database/user theo `POSTGRES_*`; EF Core migration tạo
schema ứng dụng.

Từ root repository, tạo `.env` từ [.env.example](.env.example), điền
`POSTGRES_PASSWORD`, `JWT_SECRET` (ít nhất 32 byte UTF-8) và `AI_SERVICE_URL`,
rồi chạy. `CLOUDINARY_*` là tùy chọn; khi bỏ trống API lưu ảnh vào volume local.

```powershell
Copy-Item .env.example .env
# Điền cấu hình trong .env trước khi tiếp tục.
docker compose config --quiet
docker compose up --build --detach --wait
docker compose ps
Invoke-RestMethod http://localhost:5080/api/health
docker compose down
```

Web ở `http://localhost:3000`; Next.js chuyển `/api/` sang backend. Có thể đổi
cổng host qua `POSTGRES_HOST_PORT`, `API_HOST_PORT`, `FRONTEND_HOST_PORT` trong
`.env`. PostgreSQL chỉ mở cổng trên `127.0.0.1` của host. `docker compose down`
giữ volume; không dùng `down -v` nếu cần dữ liệu.
PostgreSQL dùng trực tiếp image `postgres:16-alpine`; image khởi tạo database và
user theo biến môi trường, còn EF Core migration tạo schema ứng dụng. Nếu volume
đã có từ lần chạy trước, đổi `POSTGRES_PASSWORD` trong `.env` không đổi mật
khẩu bên trong DB: dùng đúng cấu hình của volume đó hoặc chủ động tạo DB test
mới. API chạy ở `Production` nên không seed tài khoản demo có mật khẩu cố định.
Khi chạy backend trực tiếp ở `Development`, đặt cả hai biến
`DemoUsers__AdminPassword` và `DemoUsers__UserPassword` để tạo tài khoản demo
trên DB chưa có người dùng. Nếu không đặt, backend không tạo tài khoản demo.
Nếu migration hoặc seed dữ liệu thất bại, API dừng khởi động. Khi chạy backend
ngoài Compose, phải cấp `ConnectionStrings__DefaultConnection` và
`JwtSettings__Secret` qua biến môi trường hoặc user secrets; `appsettings` không
chứa credential.

`/api/health` chỉ kiểm tra DB, nên web/API vẫn khởi động khi chưa có AI.
`/api/health/deps` kiểm tra AI để giám sát; trả 503 khi AI không truy cập được.
API dự đoán trả 503 khi AI lỗi mạng, timeout hoặc HTTP lỗi. Timeout mặc định
15 giây, chỉnh bằng `AI_TIMEOUT_SECONDS`; chưa tự retry upload POST.

Để kiểm tra health AI bằng mock, dùng override dành riêng cho CI:

```powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml up --build --detach --wait
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml down
```

Override thêm AI **health stub**, chỉ có `/health`, không có `/predict`.
Chọn cổng host còn trống nếu đang chạy stack khác. Muốn chỉ chạy database,
dùng `docker compose up -d postgres` tại root.

Workflow [CI](.github/workflows/ci.yml) quét secret bằng Gitleaks và chạy độc lập Compose smoke, backend
unit/integration, frontend và toàn bộ Python unit suite trên CPU. Backend gộp
coverage của hai suite. Mục tiêu riêng cho backend, frontend và Python là **80%
branch coverage**; mức sàn CI hiện tại lần lượt là **35%, 25%, 40%** theo artifact
đã đo và sẽ tăng dần khi thêm test. Test pass chưa đủ để CI pass. Job `ci-gate` yêu cầu mọi job thành công;
sau khi xác minh trên GitHub, cấu hình nó làm required check trong branch protection.
TRX, coverage HTML/XML và log Compose được upload kể cả khi gate thất bại.
Xem [cấu hình, lệnh chạy và bằng chứng AGRI-75](docs/reports/AGRI-75/ci_branch_coverage.md).
Chưa cấu hình CD staging vì chưa có nhu cầu triển khai VPS; xem [kế hoạch CI/CD](docs/plans/ci_cd_plan.md).
Chưa có kiểm thử model suy luận thật.
