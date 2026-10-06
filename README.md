<div align="center">
  <h1>AgriVision AI</h1>
  <p><strong>Nhận diện bệnh lá cây với ConvNeXt-Tiny</strong></p>
  <p>Tải ảnh lá cây, xem kết quả phân loại và quản lý lịch sử dự đoán.</p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-111111?style=flat-square&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/ASP.NET_Core-9-512BD4?style=flat-square&amp;logo=dotnet&amp;logoColor=white" alt="ASP.NET Core 9">
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&amp;logo=postgresql&amp;logoColor=white" alt="PostgreSQL 16">
    <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&amp;logo=pytorch&amp;logoColor=white" alt="PyTorch">
  </p>
  <p>
    <a href="#overview">Tổng quan</a> ·
    <a href="#quick-start">Chạy nhanh</a> ·
    <a href="#dataset">Dataset</a> ·
    <a href="#ai-module">Module AI</a> ·
    <a href="#testing">Kiểm thử</a> ·
    <a href="#documentation">Tài liệu</a>
  </p>
</div>

---

<a name="overview"></a>

## Tổng quan

AgriVision AI là dự án môn học về phân loại bệnh lá cây. Giao diện Next.js kết nối
ASP.NET Core Web API để xử lý tài khoản, danh mục và lịch sử; PostgreSQL lưu dữ
liệu ứng dụng. FastAPI là lớp phục vụ mô hình ConvNeXt-Tiny.

```text
Next.js → ASP.NET Core Web API → PostgreSQL
                             → FastAPI → ConvNeXt-Tiny
```

| Thành phần | Vai trò | Hiện trạng |
|---|---|---|
| Web | Tải ảnh, hiển thị kết quả, xem lịch sử | Đã có màn hình và luồng gọi API |
| Backend | Xác thực, danh mục, dự đoán và lịch sử | Đã có API và kiểm tra quyền sở hữu lịch sử |
| PostgreSQL | Lưu dữ liệu và quản lý phiên bản schema | Đã tích hợp với backend; migration chạy riêng |
| AI | Huấn luyện, đánh giá và phân loại ảnh lá cây | Có pipeline và báo cáo checkpoint; chưa nghiệm thu suy luận thật xuyên suốt web–API–AI |

> **Trạng thái tích hợp:** kiểm thử, health check và AI mock không xác nhận chất lượng
> mô hình hay luồng suy luận thật. Xem [lộ trình](docs/development_roadmap.md) và
> [báo cáo mô hình](docs/reports/AGRI-21/README.md) để theo dõi phần còn lại.

<a name="quick-start"></a>

## Chạy nhanh

Cần Docker với Compose. Chạy các lệnh PowerShell từ thư mục gốc repository.
Compose mặc định khởi động web, API và PostgreSQL; AI service chạy riêng tại
`AI_SERVICE_URL`.

### 1. Chuẩn bị cấu hình

Nếu chưa có `.env`, tạo từ [.env.example](.env.example):

```powershell
Copy-Item .env.example .env
```

Điền `POSTGRES_PASSWORD`, `JWT_SECRET` (ít nhất 32 byte UTF-8) và `AI_SERVICE_URL`.
`CLOUDINARY_*` là tùy chọn; khi bỏ trống, API lưu ảnh vào volume local.

### 2. Tạo schema và khởi động

Với database đã có dữ liệu, [sao lưu và review migration](.agents/commands/database.md)
trước khi áp dụng. Chỉ chuyển sang lệnh tiếp theo khi lệnh trước thành công.

```powershell
docker compose config --quiet
docker compose build backend frontend
docker compose up -d --wait --wait-timeout 120 postgres
docker compose run --rm --no-deps backend --migrate
docker compose up -d --wait --wait-timeout 120 backend frontend
docker compose ps
Invoke-RestMethod http://localhost:5080/api/health
```

Migration chạy riêng và ghi lịch sử trong `__EFMigrationsHistory`. Backend dừng
khởi động nếu còn migration chưa áp dụng. Compose chạy API ở `Production`, nên
không seed tài khoản hay danh mục demo.

### 3. Truy cập ứng dụng

| Dịch vụ | Địa chỉ mặc định | Ghi chú |
|---|---|---|
| Web | <http://localhost:3000> | Next.js chuyển `/api/` sang backend |
| API health | <http://localhost:5080/api/health> | Kiểm tra kết nối DB |
| AI dependency health | <http://localhost:5080/api/health/deps> | Trả 503 khi AI không truy cập được |
| PostgreSQL | `127.0.0.1:5432` | Chỉ mở cổng trên loopback của host |

Đổi cổng qua `FRONTEND_HOST_PORT`, `API_HOST_PORT`, `POSTGRES_HOST_PORT` trong
`.env`. Để dừng stack và giữ dữ liệu:

```powershell
docker compose down
```

Xem [hướng dẫn Docker](docs/notes/docker_run_guide.md) để xử lý lỗi cấu hình,
volume có sẵn và smoke test với AI health mock.

<a name="documentation"></a>

## Tài liệu

| Cần biết | Tài liệu |
|---|---|
| Công nghệ đang dùng và phần dự kiến | [Tech stack](docs/tech_stack.md) |
| Phạm vi và tiêu chí chấp nhận | [Yêu cầu hệ thống](docs/system_requirements.md) |
| Luồng và dữ liệu | [Sơ đồ thiết kế](docs/system_design_diagrams.md) |
| Thứ tự công việc còn lại | [Lộ trình phát triển](docs/development_roadmap.md) |
| Dataset, nhãn và bằng chứng mô hình | [Báo cáo AGRI-21](docs/reports/AGRI-21/README.md) |
| Kiểm thử, Docker và kế hoạch triển khai | [Kế hoạch CI/CD](docs/plans/ci_cd_plan.md) |
| Phân tích và thiết kế AGRI-76 | [Bộ tài liệu AGRI-76](docs/reports/AGRI-76/README.md) |
| Schema và migration backend | [Entities](docs/notes/database_entities.md) · [Migration](docs/notes/database_migrations.md) |
| Phương án triển khai demo lên VPS | [Kế hoạch VPS](docs/vps_deployment.md) |
| Lệnh phát triển và kiểm tra local | [Commands](.agents/commands/README.md) |

Đọc đúng tài liệu theo việc cần làm; [mục lục tài liệu](docs/README.md) chứa báo cáo và ghi chú chi tiết. Chỉ triển khai phần đã có yêu cầu; sơ đồ và kế hoạch mô tả mục tiêu, không xác nhận tính năng đã hoàn thành.

## Cấu trúc dự án

```text
AgriAI/
├── frontend/                 Next.js, giao diện và tests
├── backend/                  ASP.NET Core API, migrations và tests
├── ai/                       Huấn luyện, đánh giá và suy luận
│   ├── data/                 DataLoader và preprocessing dùng chung
│   └── tasks/agri_21/        Công cụ và tests pipeline dataset
├── notebooks/                Notebook huấn luyện trên Colab
├── database/                 SQL và tài liệu baseline ERD
├── experiments/              Thí nghiệm được tổ chức theo EXP-XXX
├── docs/                     Tài liệu, bằng chứng và task logs
├── .agents/                  Quy tắc, skills và lệnh cho agent
└── docker-compose.yml        Web, API và PostgreSQL
```

Schema ứng dụng lấy từ EF Core migrations trong `backend/`; SQL trong `database/`
là baseline ERD trước đó. Dataset, checkpoint, output, cache và secrets nằm ngoài Git.

<a name="dataset"></a>

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

Mặc định code đọc `D:\AgriVisionAI_Data\v1.4`. Khi đặt dataset ở nơi khác,
khai báo cả phiên bản và đường dẫn trong phiên làm việc hiện tại:

```powershell
$env:AGRIVISION_DATASET_DIR = "<dataset_root>\v1.4"
```

Pipeline đọc trực tiếp `train.csv`, `val.csv` và `test.csv` trong thư mục
`manifests/`. Script training không chia lại dữ liệu; seed chỉ điều khiển quá
trình huấn luyện và thứ tự batch.

<a name="ai-module"></a>

## Module AI

<details>
<summary><strong>Thiết lập môi trường, huấn luyện, đánh giá và Colab</strong></summary>

### Môi trường và CLI

Chạy các lệnh PowerShell từ thư mục gốc repository. Tạo môi trường trong chính
repo này (script `ai/setup_env.bat` dùng thư mục làm việc hiện tại, nên không
gọi trực tiếp từ root):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
.\.venv\Scripts\python.exe -m pip install -r ai\requirements.txt
```

Các lệnh train, evaluate và dự đoán CLI chạy riêng khi cần:

```powershell
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

### Google Colab

Notebook Colab chạy từng baseline và lưu artifact trên Google Drive:

```text
notebooks/01_train_classification_colab.ipynb
```

Xem hướng dẫn chuẩn bị project, dataset ZIP và GPU tại
[hướng dẫn Google Colab](docs/notes/google_colab_training_guide.md).

Chạy toàn bộ kiểm thử dữ liệu từ root repository:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"
```

</details>

## Docker nâng cao

<details>
<summary><strong>Cấu hình backend, volume và smoke test với AI mock</strong></summary>

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
docker compose config --quiet
docker compose build backend frontend
docker compose up -d --wait --wait-timeout 120 postgres
docker compose run --rm --no-deps backend --migrate
docker compose up -d --wait --wait-timeout 120 backend frontend
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
Migration và seed Development chạy trong lệnh `--migrate`; nếu thất bại, lệnh trả
mã lỗi và cần xử lý trước khi khởi động API. Khi chạy backend
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

</details>

<a name="testing"></a>

## Kiểm thử

Chạy kiểm thử bằng lệnh riêng sau khi chuẩn bị môi trường tương ứng.

| Phần | Phạm vi | Hướng dẫn |
|---|---|---|
| Backend | Unit, integration với PostgreSQL, đọc/ghi API–DB | [Backend tests](.agents/commands/backend.md) |
| Frontend | Unit và integration giao diện | [Frontend tests](.agents/commands/frontend.md) |
| Python / AI | Kiểm thử code và pipeline dữ liệu | [AI tests](.agents/commands/ai.md) |
| Docker | Khởi động và kiểm tra health các service | [Docker checks](.agents/commands/docker.md) |

Integration backend cần Docker. Kiểm tra đọc/ghi trên backend image thật có bước
dọn dữ liệu thử nghiệm; xem [hướng dẫn database](.agents/commands/database.md).

Workflow [CI](.github/workflows/ci.yml) quét secret bằng Gitleaks và chạy độc lập Compose smoke, backend
unit/integration, frontend và toàn bộ Python unit suite trên CPU. Backend gộp
coverage của hai suite. Mục tiêu riêng cho backend, frontend và Python là **80%
branch coverage**; mức sàn CI hiện tại lần lượt là **50%, 25%, 40%** theo artifact
đã đo và sẽ tăng dần khi thêm test. Test pass chưa đủ để CI pass. Job `ci-gate` yêu cầu mọi job thành công;
sau khi xác minh trên GitHub, cấu hình nó làm required check trong branch protection.
TRX, coverage HTML/XML và log Compose được upload kể cả khi gate thất bại.
Xem [cấu hình, lệnh chạy và bằng chứng AGRI-75](docs/reports/AGRI-75/ci_branch_coverage.md).
Chưa cấu hình CD staging vì chưa có nhu cầu triển khai VPS; xem [kế hoạch CI/CD](docs/plans/ci_cd_plan.md).
Chưa có kiểm thử model suy luận thật.

## Đóng góp

Đọc [quy tắc dự án](.agents/rules/project_rules.md) trước khi tạo nhánh hoặc PR.
Dùng Jira key thật, commit theo Conventional Commits, bổ sung task log và bằng
chứng kiểm thử phù hợp. PR cần người review của phần tương ứng.
