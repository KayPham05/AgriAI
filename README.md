# AgriVision AI

Hệ thống nhận diện bệnh lá cây sử dụng ConvNeXt-Tiny.

## Cấu trúc

```text
ai/data/             DataLoader và preprocessing dùng khi chạy mô hình
ai/scripts/dataset/  Công cụ audit, làm sạch, chia tập và tạo dataset
ai/tests/data/       Kiểm thử pipeline dữ liệu
ai/                  Huấn luyện, đánh giá và suy luận
.agents/rules/       Quy tắc dành cho agent
docs/                Nhật ký task và tài liệu dự án
experiments/         Kết quả được tổ chức theo EXP-XXX
```

## Dataset

Dataset không được lưu trong Git. Bản dùng để huấn luyện hiện tại là `v1.2`
và sẽ được phát hành qua Google Drive. Liên kết tải sẽ được bổ sung sau khi
hoàn tất upload và xác minh checksum.

Sau khi tải về, giữ nguyên cấu trúc:

```text
v1.2/
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
$env:AGRIVISION_DATASET_DIR = "<thu_muc_dataset_v1.2>"
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

Chạy toàn bộ kiểm thử dữ liệu từ root repository:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s ai/tests -p "test_*.py"
```
