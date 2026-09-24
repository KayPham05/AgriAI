# Hướng dẫn train AgriVision AI trên Google Colab

Notebook đã chuẩn bị:

```text
notebooks/01_train_classification_colab.ipynb
```

Notebook chạy một task tại một thời điểm, dùng dataset trên ổ tạm Colab để tăng
tốc đọc ảnh và lưu checkpoint/báo cáo trực tiếp vào Google Drive.

## 1. Chuẩn bị project trên Google Drive

Upload nguyên thư mục `AgriVisionAI_Colab` vào `My Drive` và giữ cấu trúc:

```text
MyDrive/
└── AgriVisionAI_Colab/
    ├── AgriAI/
    │   ├── ai/
    │   ├── docs/
    │   ├── notebooks/
    │   │   └── 01_train_classification_colab.ipynb
    │   ├── README.md
    │   └── ...
    └── AgriVisionAI_Data/
        └── v1.3.zip
```

Bản đóng gói được tạo tại `colab_upload/AgriVisionAI_Colab`. Nó không chứa:

```text
.venv/
.git/
__pycache__/
ai/checkpoints/
ai/outputs/
runs/
```

Các thư mục checkpoint/output/runs sẽ được pipeline tạo lại trên Drive. Không
upload môi trường `.venv` của Windows vì Colab dùng Linux và cài dependency
riêng.

## 2. Nén dataset đúng cấu trúc

File `v1.3.zip` phải có cấu trúc bên trong:

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

Trong PowerShell trên máy local, có thể tạo ZIP bằng:

```powershell
Compress-Archive `
  -Path "D:\AgriVisionAI_Data\v1.3" `
  -DestinationPath "D:\AgriVisionAI_Data\v1.3.zip" `
  -CompressionLevel Fastest
```

Trong bundle, file ZIP nằm tại:

```text
AgriVisionAI_Colab/AgriVisionAI_Data/v1.3.zip
```

Không upload hàng chục nghìn ảnh rời lên Drive. Một file ZIP tải lên và chép
vào Colab ổn định hơn, đồng thời việc train từ `/content` nhanh hơn đọc ảnh trực
tiếp qua Drive mount.

## 3. Mở notebook

Trong Google Drive:

1. mở `AgriAI/notebooks/01_train_classification_colab.ipynb`;
2. chọn **Open with > Google Colaboratory**;
3. chọn **Runtime > Change runtime type**;
4. đặt hardware accelerator thành **GPU**;
5. chạy từng cell từ trên xuống.

Notebook sẽ kiểm tra:

- project và dataset ZIP tồn tại;
- `nvidia-smi` và CUDA hoạt động;
- dataset giải nén đúng cấu trúc;
- đủ 10 lớp plant và 45 lớp disease;
- train/validation/test manifest không có lỗi theo validation hiện tại.

Nếu một kiểm tra thất bại, notebook dừng trước khi bắt đầu train để không tốn
compute units.

## 4. Train model plant

Giữ cấu hình tại bước 5 của notebook:

```python
TASK = "plant"
EPOCHS = 10
BATCH_SIZE = 8
FREEZE_EPOCHS = 3
WARMUP_EPOCHS = 3
```

Chạy tiếp các bước Train, Evaluate và kiểm tra artifact. Kết quả được lưu tại:

```text
MyDrive/AgriVisionAI_Colab/AgriAI/ai/checkpoints/plant/
MyDrive/AgriVisionAI_Colab/AgriAI/ai/outputs/plant/
MyDrive/AgriVisionAI_Colab/AgriAI/runs/plant/
```

## 5. Train model disease

Sau khi plant đã evaluate xong, đổi duy nhất:

```python
TASK = "disease"
```

Sau đó chạy lại các cell từ bước 6 đến bước 8. Kết quả được lưu tại:

```text
MyDrive/AgriVisionAI_Colab/AgriAI/ai/checkpoints/disease/
MyDrive/AgriVisionAI_Colab/AgriAI/ai/outputs/disease/
MyDrive/AgriVisionAI_Colab/AgriAI/runs/disease/
```

Không cần giải nén dataset hoặc cài dependency lại nếu vẫn ở cùng runtime.

## 6. Artifact cần kiểm tra

Mỗi task hoàn tất phải có tối thiểu:

```text
ai/checkpoints/<task>/
├── best_convnext_tiny.pth
├── last_convnext_tiny.pth
└── class_to_idx.json

ai/outputs/<task>/
├── training_history.json
├── training_summary.json
├── training_history.png
├── test_metrics.json
├── classification_report.txt
├── test_confusion_matrix.png
├── top_confusions.csv
└── misclassified_samples.csv
```

`best_convnext_tiny.pth` là model được chọn theo validation macro-F1.
`test_metrics.json` là kết quả chính thức trên test split.

## 7. Sử dụng compute units hợp lý

- Train `plant` và `disease` thành hai lượt riêng.
- Kiểm tra loại GPU bằng `nvidia-smi` trước khi train.
- Tắt runtime GPU khi chỉ đọc báo cáo hoặc chỉnh notebook.
- Không chạy lại cell Train nếu một process của cùng task vẫn đang chạy.
- Không chọn cấu hình bằng test metric; dùng validation macro-F1.
- Tải dataset vào `/content`, giữ checkpoint trên Drive.

## 8. Khi runtime bị ngắt

Checkpoint của các epoch đã hoàn thành vẫn nằm trên Google Drive. Tuy nhiên,
pipeline hiện chưa có chức năng resume đầy đủ, nên chạy lại lệnh train sẽ bắt
đầu từ epoch 1 và ghi vào cùng thư mục task.

Nếu đã có `best_convnext_tiny.pth` và chỉ cần tạo báo cáo test, bỏ qua cell
Train rồi chạy cell Evaluate. Nếu runtime bị ngắt giữa một epoch, phần tiến độ
của epoch đó không được lưu.

## 9. Các lỗi thường gặp

### Không tìm thấy project

Notebook yêu cầu:

```text
/content/drive/MyDrive/AgriVisionAI_Colab/AgriAI/ai/train.py
```

Nếu đặt project ở vị trí khác, sửa `PROJECT_DIR` trong cell đầu.

### Dataset ZIP sai cấu trúc

Sau giải nén phải tồn tại:

```text
/content/AgriVisionAI_Data/v1.3/images/
/content/AgriVisionAI_Data/v1.3/manifests/train.csv
```

Nếu ZIP chứa thêm một tầng thư mục, hãy nén lại từ thư mục cha của `v1.3`.

### PyTorch không nhận CUDA

Chọn lại **Runtime > Change runtime type > GPU**, sau đó restart runtime và
chạy notebook từ đầu.

### Hết bộ nhớ GPU

Giảm trong bước 5:

```python
BATCH_SIZE = 4
```

Giữ gradient accumulation mặc định để model vẫn tích lũy gradient qua nhiều
mini-batch.
