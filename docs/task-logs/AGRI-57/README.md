# LeafAI - Chẩn đoán bệnh cây trồng

Hệ thống AI nông nghiệp hiện đại hỗ trợ chẩn đoán bệnh lá cây. Hiện tại, dự án đang ở giai đoạn Demo với giao diện người dùng hoàn thiện và Backend API mô phỏng kết quả phân tích.

## 📂 Cấu trúc dự án

Dự án được chia thành hai phần chính:
- **`frontend/`**: Ứng dụng React + Vite với giao diện hiện đại, tối ưu cho cả trải nghiệm Web và Mobile.
- **`backend/`**: Dịch vụ API viết bằng FastAPI, cung cấp API nhận hình ảnh và trả về kết quả dự đoán (hiện đang dùng Mock API).

---

## ✨ Những gì dự án đã làm được

### 1. Giao diện người dùng (Frontend)
- **Thiết kế hiện đại & Tương tác cao**: Sử dụng Tailwind CSS kết hợp với hiệu ứng chuyển động (`motion`), tạo ra một giao diện mượt mà và trực quan.
- **Trang chủ & Banner**: Trình chiếu (banner) xoay vòng tự động giới thiệu 13 loại cây được hỗ trợ. Khách truy cập có thể dừng, lướt và xem chi tiết từng loại.
- **Tính năng Chụp/Tải ảnh (Diagnose)**: 
  - Cho phép người dùng kéo thả hoặc tải lên hình ảnh JPG/PNG (giới hạn dung lượng 15MB).
  - Có các trạng thái: xem trước (preview) hình ảnh, hiển thị lỗi file trực tiếp nếu sai định dạng/quá dung lượng.
  - Hiển thị tiến trình tải lên và trạng thái "Đang phân tích" khi chờ API trả kết quả.
- **Quản lý danh mục**: Có trang hiển thị Danh sách Cây trồng và Bệnh lý, cho phép xem chi tiết từng loại.
- **Lưu trữ Lịch sử (History)**: Có chức năng lưu trữ và xem lại các phiên phân tích bệnh trước đó (hiện lưu bằng `localStorage`).
- **Responsive Design**: Hỗ trợ tốt trên thiết bị di động với thanh điều hướng (MobileNavigation) cố định ở cạnh dưới màn hình.
- **Quản lý trạng thái thông báo**: Hệ thống Toast message (thông báo nhỏ góc màn hình) hoạt động trơn tru cho các thao tác thành công/lỗi.

### 2. Dịch vụ Backend (API)
- **FastAPI**: Xây dựng service nhẹ và nhanh chóng.
- **Xác thực dữ liệu**: 
  - Kiểm tra định dạng tệp tải lên (chỉ cho phép JPG/PNG dựa trên MIME type và cả file signature/header).
  - Hạn chế dung lượng tệp không quá 15MB.
- **Prediction Mock API (`POST /api/predictions`)**:
  - Có khả năng nhận tệp (multipart/form-data) từ frontend.
  - Trả về JSON cố định để phục vụ Demo quá trình phân tích AI:
    ```json
    { "crop": "Tomato", "disease": "Early Blight", "confidence": 0.94 }
    ```
- **Hỗ trợ CORS**: Đã cấu hình để giao tiếp mượt mà với môi trường Vite Development.
- **Kiểm thử khói (Smoke Test)**: Đã có sẵn script test (`tests/smoke_demo_api.py`) để xác minh lại các hành vi xác thực file (ảnh quá lớn, ảnh sai định dạng).

---

## 🚀 Hướng dẫn chạy dự án

### Yêu cầu:
- Node.js (20.19+ hoặc 22.12+)
- Python (3.9+)

### 1. Chạy Backend (FastAPI)
Mở terminal tại thư mục gốc của dự án và chạy:
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
*API sẽ chạy tại `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).*

### 2. Chạy Frontend (React + Vite)
Mở một terminal mới tại thư mục gốc và chạy:
```powershell
cd frontend
npm install
npm run dev
```
*Trang web sẽ được mở tại `http://localhost:3000`. Bạn có thể truy cập để trải nghiệm tính năng "Chẩn đoán".*
