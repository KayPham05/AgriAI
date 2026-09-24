# AgriVision AI

Hệ thống nhận diện bệnh lá cây sử dụng ConvNeXt-Tiny.

## Cấu trúc

```text
ai/data/                        DataLoader và preprocessing dùng chung
ai/tasks/agri_21/scripts/       Công cụ tạo và audit dataset v1.0–v1.3
ai/tasks/agri_21/tests/         Kiểm thử pipeline dữ liệu AGRI-21
ai/                             Huấn luyện, đánh giá và suy luận
.agents/rules/       Quy tắc dành cho agent
docs/                Nhật ký task và tài liệu dự án
experiments/         Kết quả được tổ chức theo EXP-XXX
```

## Dataset

Dataset không được lưu trong Git. Bản dùng để huấn luyện hiện tại là `v1.3`
và sẽ được phát hành qua Google Drive. Liên kết tải sẽ được bổ sung sau khi
hoàn tất upload và xác minh checksum.

`v1.3` gồm 82.073 ảnh JPEG 224×224, 10 loại cây và 58 lớp. Dataset kế thừa
75.025 ảnh đã xử lý theo pipeline v1.2, sau đó bổ sung Lúa/Xoài và chạy lại
group-aware split, exact leakage, near-duplicate Hamming 0–5 và augmentation QA.

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
$env:AGRIVISION_DATASET_DIR = "<dataset_root>\v1.3"
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
.\.venv\Scripts\python.exe -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"
```
