# AgriVision AI

Hệ thống nhận diện bệnh lá cây sử dụng ConvNeXt-Tiny.

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

Dataset không được lưu trong Git. Phiên bản mặc định hiện tại là `v1.4`:
88.000 ảnh trong ba manifest (61.599 train, 8.802 val, 17.599 test),
10 loài cây, 44 nhãn bệnh phân biệt hoa/thường và 59 nhãn cây-bệnh.

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
$env:AGRIVISION_DATASET_VERSION = "v1.4"
$env:AGRIVISION_DATASET_DIR = "<dataset_root>\v1.4"
```

Pipeline đọc trực tiếp `train.csv`, `val.csv` và `test.csv` trong thư mục
`manifests/`. Script training không chia lại dữ liệu; seed chỉ điều khiển quá
trình huấn luyện và thứ tự batch.

## Chạy module AI

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

FastAPI có thêm API tương thích HTTP với adapter hiện tại của backend:
`GET /health` xác nhận checkpoint đã nạp và `POST /predict` nhận multipart
`file`. Phản hồi gồm `class_index`, `class_name`, `confidence` (0-1) và
`top_k`. Chỉ số lớp được tính từ 59 nhãn cây-bệnh v1.4 theo cùng thứ tự
`sorted()` của pipeline dữ liệu. Endpoint `/v1/predictions` cũ vẫn dùng được.

Để chạy **chỉ backend AI trên máy**, cần có
`ai/checkpoints/plant/best_convnext_tiny.pth` và
`ai/checkpoints/disease/best_convnext_tiny.pth`. Mở terminal thứ nhất:

```powershell
$env:AGRIVISION_DATASET_VERSION = "v1.4"
.\.venv\Scripts\python.exe -m uvicorn ai.service.app:app --host 127.0.0.1 --port 8000
```

Giữ terminal này mở. Trong terminal thứ hai, tại cùng thư mục root, kiểm tra
model đã nạp rồi gửi ảnh JPG/PNG (thay đường dẫn ảnh của bạn):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
curl.exe -F "file=@D:\duong-dan\anh-la.jpg" http://127.0.0.1:8000/predict
```

`/health` trả `{"status":"Healthy"}` khi hai checkpoint đã sẵn sàng. Lệnh
`curl.exe` trả nhãn cây-bệnh và top-k, không cần khởi động Docker hay backend
.NET. Nếu cổng 8000 đang dùng, đổi `--port` và các URL kiểm tra cùng lúc.

Database backend hiện chỉ seed 11 nhãn mẫu và chưa đồng bộ với 59 nhãn v1.4.
Không dùng kết quả dự đoán qua web làm kết quả thật cho tới khi cập nhật bảng
`PlantDiseases` và bỏ fallback nhãn không khớp trong backend.

Hai baseline loài cây và bệnh dùng chung ConvNeXt-Tiny cùng split v1.4:

- `plant`: 10 lớp từ cột `plant`.
- `disease`: 44 nhãn phân biệt hoa/thường từ cột `condition`, có weighted loss.

Task `compound` sử dụng 59 nhãn từ cột `compound_label`.

```powershell
.\.venv\Scripts\python.exe -m ai.train --task plant
.\.venv\Scripts\python.exe -m ai.evaluate --task plant
.\.venv\Scripts\python.exe -m ai.train --task disease
.\.venv\Scripts\python.exe -m ai.evaluate --task disease
```

Theo dõi hai nhánh bằng TensorBoard:

```powershell
.\.venv\Scripts\tensorboard.exe --logdir runs
```

Checkpoint và báo cáo được tách lần lượt dưới `ai/checkpoints/<task>/` và
`ai/outputs/<task>/`. Không đổi các đường dẫn này vì checkpoint v1.4 hiện có
đang được lưu tại đó; kiểm tra `dataset_version` trong metadata checkpoint
trước khi dùng checkpoint với một phiên bản dataset khác.

Để chạy tuần tự cả hai nhánh và đánh giá checkpoint tốt nhất:

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

`docker-compose.yml` dựng PostgreSQL, ASP.NET Core API và Next.js standalone.
Backend gọi AI service thật tại `AI_SERVICE_URL`; service đó cần được chạy
riêng. PostgreSQL tạo database/user theo `POSTGRES_*`; EF Core migration tạo
schema ứng dụng.

Từ root repository, tạo `.env` từ [.env.example](.env.example), điền
`POSTGRES_PASSWORD`, `JWT_SECRET` và `AI_SERVICE_URL`, rồi chạy:

```powershell
Copy-Item .env.example .env
# Điền cấu hình trong .env và khởi động AI service trước khi tiếp tục.
docker compose config --quiet
docker compose up --build --detach --wait
docker compose ps
Invoke-RestMethod http://localhost:5080/api/health
docker compose down
```

Web ở `http://localhost:3000`; Next.js chuyển `/api/` sang backend. Có thể đổi
cổng host qua `POSTGRES_HOST_PORT`, `API_HOST_PORT`, `FRONTEND_HOST_PORT` trong
`.env`. `docker compose down` giữ volume; không dùng `down -v` nếu cần dữ liệu.
`docker/postgres/init.sql` là mẫu và chỉ chạy khi volume DB trống. Nếu volume
đã có từ lần chạy trước, đổi `POSTGRES_PASSWORD` trong `.env` không đổi mật
khẩu bên trong DB: dùng đúng cấu hình của volume đó hoặc chủ động tạo DB test
mới. API chạy ở `Production` nên không seed tài khoản demo có mật khẩu cố định.

Để kiểm tra startup khi chưa có AI service, dùng override dành riêng cho CI:

```powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml up --build --detach --wait
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml down
```

Override thêm AI **health stub**, chỉ có `/health`, không có `/predict`.
Chọn cổng host còn trống nếu đang chạy stack khác. Muốn chỉ chạy database,
dùng `docker compose up -d postgres` tại root; không cần chạy thêm file Compose
PostgreSQL độc lập trong `backend/`.

Workflow [CI](.github/workflows/ci.yml) chạy độc lập Compose smoke, backend
unit/integration, frontend và toàn bộ Python unit suite trên CPU. Backend gộp
coverage của hai suite. Mục tiêu riêng cho backend, frontend và Python là **80%
branch coverage**; mức sàn CI hiện tại lần lượt là **35%, 25%, 40%** theo artifact
đã đo và sẽ tăng dần khi thêm test. Test pass chưa đủ để CI pass. Job `ci-gate` yêu cầu mọi job thành công;
sau khi xác minh trên GitHub, cấu hình nó làm required check trong branch protection.
TRX, coverage HTML/XML và log Compose được upload kể cả khi gate thất bại.
Xem [cấu hình, lệnh chạy và bằng chứng AGRI-75](docs/reports/AGRI-75/ci_branch_coverage.md).
Đây là CI, chưa có CD hoặc kiểm thử model suy luận thật.
