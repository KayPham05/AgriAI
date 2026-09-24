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

Dataset không được lưu trong Git. Bản dùng để huấn luyện hiện tại là `v1.3`
và sẽ được phát hành qua Google Drive. Liên kết tải sẽ được bổ sung sau khi
hoàn tất upload và xác minh checksum.

Sau khi tải về, giữ nguyên cấu trúc:

```text
v1.3/
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
$env:AGRIVISION_DATASET_DIR = "<thu_muc_dataset_v1.3>"
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

Hai baseline loài cây và bệnh dùng chung ConvNeXt-Tiny cùng split v1.3:

- `plant`: 10 lớp từ cột `plant`.
- `disease`: 45 nhãn phân biệt hoa/thường từ cột `condition`, có weighted loss.

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
`ai/outputs/<task>/`.

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
.\.venv\Scripts\python.exe -m unittest discover -s ai/tests -p "test_*.py"
```
