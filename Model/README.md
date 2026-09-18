# 🌿 Module Huấn Luyện ConvNeXt-Tiny - Phân Loại Cây Trồng & Bệnh Lá (AgriVisionAI)

Module được tối ưu hóa đặc biệt cho phần cứng **NVIDIA GTX 1650 (4GB VRAM)** và **16GB RAM**, sử dụng kiến trúc **ConvNeXt-Tiny** với cơ chế Mixed Precision (AMP) và Tích lũy Gradient.

---

## 📁 1. Cấu Trúc Thư Mục Dữ Liệu (`Model/Image`)

Bạn hãy đặt toàn bộ dữ liệu ảnh lá cây vào thư mục `Model/Image/` theo cấu trúc 2 tầng như sau:

```text
Model/Image/
├── <Tên_Cây_1>/
│   ├── <Tên_Bệnh_A>/
│   │   ├── leaf_001.jpg
│   │   └── leaf_002.jpg
│   ├── <Tên_Bệnh_B>/
│   └── <Khỏe_Mạnh_Healthy>/
├── <Tên_Cây_2>/
│   └── ...
└── <Tên_Cây_10>/
```

> **Ghi chú**:
> - Hệ thống hỗ trợ các định dạng: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`.
> - Tên thư mục cây và bệnh nên đặt không dấu hoặc tiếng Anh (ví dụ: `Tomato/Early_blight`, `Lua/Dao_on`, `Ngo/Khoe_manh`...) để tránh lỗi mã hóa ký tự đường dẫn trên Windows.
> - Mỗi lớp nên có tối thiểu từ 15-20 ảnh trở lên để mô hình học hiệu quả và phân chia tập Train/Val/Test hợp lý.

---

## ⚙️ 2. Cài Đặt Môi Trường

### Cách 1: Chạy file tự động (Khuyến nghị trên Windows)
Chỉ cần nhấp đúp vào file `setup_env.bat` trong thư mục `Model/`. File sẽ tự động:
1. Tạo môi trường ảo `.venv`
2. Cài đặt `torch`, `torchvision` với CUDA 12.4
3. Cài đặt các thư viện trong `requirements.txt`
4. Chạy `test_gpu.py` để kiểm tra VRAM GPU GTX 1650

### Cách 2: Cài đặt thủ công bằng dòng lệnh
Mở PowerShell hoặc Command Prompt tại thư mục `Model/`:

```powershell
# 1. Kích hoạt hoặc tạo môi trường ảo (tùy chọn)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Cài đặt PyTorch CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# 3. Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# 4. Kiểm tra GPU
python test_gpu.py
```

---

## 🚀 3. Hướng Dẫn Sử Dụng

### Bước 1: Huấn luyện mô hình (Training)
Sau khi đã đưa ảnh vào `Model/Image/`:

```powershell
python train.py
```
- Quá trình huấn luyện sẽ tự động chia dữ liệu: Train (80%), Val (10%), Test (10%).
- Tự động lưu checkpoint tốt nhất tại: `checkpoints/best_convnext_tiny.pth`.
- Lưu biểu đồ lịch sử huấn luyện tại: `outputs/training_history.png`.

### Bước 2: Đánh giá mô hình (Evaluation)
Sau khi train xong, chạy lệnh sau để kiểm tra hiệu năng trên tập Test độc lập:

```powershell
python evaluate.py
```
- In bảng báo cáo chi tiết Precision, Recall, F1-Score theo từng loại cây và bệnh.
- Xuất biểu đồ Heatmap Ma trận nhầm lẫn tại: `outputs/test_confusion_matrix.png`.

### Bước 3: Nhận diện ảnh mới (Inference)
Để chẩn đoán một bức ảnh lá cây bất kỳ:

```powershell
python predict.py --image "đường_dẫn_đến_ảnh_lá.jpg"
```
Kết quả hiển thị:
- 🌿 Tên loại cây trồng
- 🦠 Tình trạng bệnh (hoặc Khỏe mạnh)
- 🎯 Độ tin cậy (%)
- 🔍 Top 3 khả năng cao nhất

---

## 🛠️ 4. Tùy Chỉnh Siêu Tham Số
Nếu muốn điều chỉnh batch size, learning rate hoặc số epoch, bạn có thể chỉnh sửa trực tiếp trong file:
`Model/configs/config.py`
