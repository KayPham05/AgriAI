# Hướng dẫn cài đặt và chạy dự đoán

Tài liệu này hướng dẫn chạy thử mô hình ConvNeXt-Tiny trên Windows bằng
PowerShell. Tất cả lệnh bên dưới bắt đầu từ thư mục gốc của repository
`AgriAI`.

## 1. Yêu cầu

- Windows 64-bit.
- Python đã được cài đặt và có thể gọi bằng lệnh `python`.
- Ảnh lá cây cần dự đoán ở định dạng phổ biến như `.jpg`, `.jpeg` hoặc `.png`.
- Hai checkpoint tốt nhất đã được đặt đúng vị trí:

```text
ai/checkpoints/plant/best_convnext_tiny.pth
ai/checkpoints/disease/best_convnext_tiny.pth
```

Checkpoint không được lưu trong Git. Hãy nhận hai file này từ người phụ trách
mô hình và tự tạo các thư mục trên nếu chưa có.

## 2. Cài đặt môi trường lần đầu

Mở PowerShell tại thư mục gốc của repository, sau đó chạy:

```powershell
Set-Location .\ai
.\setup_env.bat
Set-Location ..
```

`setup_env.bat` sẽ:

1. Tạo môi trường ảo tại `ai\.venv`.
2. Cài PyTorch với CUDA 12.4 và các thư viện trong `ai\requirements.txt`.
3. Chạy `ai\test_gpu.py` để kiểm tra PyTorch và GPU.

> Phải chạy `setup_env.bat` từ thư mục `ai` vì script đang sử dụng đường dẫn
> tương đối tới `requirements.txt` và `test_gpu.py`.

Nếu máy không cho phép chạy script kích hoạt của PowerShell, không cần thay
đổi Execution Policy. Có thể gọi trực tiếp Python trong môi trường ảo theo các
lệnh ở phần tiếp theo.

## 3. Kích hoạt môi trường

Sau khi cài đặt xong, từ thư mục gốc của repository, chạy file kích hoạt nằm
trong thư mục `Scripts`:

```powershell
.\ai\.venv\Scripts\Activate.ps1
```

Khi kích hoạt thành công, đầu dòng lệnh thường xuất hiện `(.venv)`. Lúc này có
thể dùng lệnh `python` trực tiếp. Để thoát khỏi môi trường ảo, chạy:

```powershell
deactivate
```

Nếu máy không cho phép chạy `Activate.ps1`, bỏ qua bước kích hoạt và gọi trực
tiếp `.\ai\.venv\Scripts\python.exe` như các ví dụ bên dưới.

## 4. Kiểm tra chương trình dự đoán

Từ thư mục gốc của repository, chạy:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict --help
```

Nếu chương trình hiển thị danh sách tham số như `--image`,
`--plant-checkpoint`, `--disease-checkpoint` và `--topk` thì môi trường đã sẵn
sàng.

## 5. Dự đoán một ảnh

Thay `D:\duong-dan\la-cay.jpg` bằng đường dẫn thật tới ảnh cần kiểm tra:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict `
  --image "D:\duong-dan\la-cay.jpg" `
  --topk 3
```

Lệnh mặc định sẽ:

1. Dùng checkpoint `plant` để nhận diện loài cây.
2. Dùng checkpoint `disease` để nhận diện bệnh phù hợp với loài cây vừa tìm
   được.
3. In loài cây, bệnh, độ tin cậy và ba dự đoán có xác suất cao nhất.

Có thể viết lệnh trên một dòng:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict --image "D:\duong-dan\la-cay.jpg" --topk 3
```

## 6. Dùng checkpoint ở vị trí khác

Nếu hai checkpoint không nằm ở vị trí mặc định, truyền đường dẫn trực tiếp:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict `
  --image "D:\duong-dan\la-cay.jpg" `
  --plant-checkpoint "D:\models\plant\best_convnext_tiny.pth" `
  --disease-checkpoint "D:\models\disease\best_convnext_tiny.pth" `
  --topk 3
```

Để kiểm tra một checkpoint đơn lẻ theo luồng tương thích cũ:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict `
  --image "D:\duong-dan\la-cay.jpg" `
  --checkpoint "D:\models\best_convnext_tiny.pth" `
  --topk 3
```

## 7. Các lần chạy sau

Không cần chạy lại `setup_env.bat` nếu thư mục `ai\.venv` vẫn còn. Chỉ cần mở
PowerShell tại thư mục gốc và chạy lại lệnh dự đoán:

```powershell
.\ai\.venv\Scripts\python.exe -m ai.predict --image "D:\duong-dan\la-cay.jpg" --topk 3
```

## 8. Lỗi thường gặp

### Không tìm thấy checkpoint

Kiểm tra hai file mặc định có tồn tại:

```powershell
Test-Path .\ai\checkpoints\plant\best_convnext_tiny.pth
Test-Path .\ai\checkpoints\disease\best_convnext_tiny.pth
```

Cả hai lệnh phải trả về `True`. Nếu dùng vị trí khác, truyền
`--plant-checkpoint` và `--disease-checkpoint` như phần 6.

### Không tìm thấy ảnh

Dùng đường dẫn tuyệt đối, đặt đường dẫn trong dấu nháy kép và kiểm tra bằng:

```powershell
Test-Path "D:\duong-dan\la-cay.jpg"
```

### Không nhận GPU

Chạy lại kiểm tra phần cứng:

```powershell
.\ai\.venv\Scripts\python.exe .\ai\test_gpu.py
```

Nếu CUDA không khả dụng, `ai.predict` vẫn tự động dùng CPU, nhưng thời gian dự
đoán sẽ lâu hơn.

### Lỗi thiếu thư viện

Cài lại dependencies bằng đúng Python của môi trường ảo:

```powershell
.\ai\.venv\Scripts\python.exe -m pip install -r .\ai\requirements.txt
```
