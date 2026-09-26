# AgriVision AI — Backend & Frontend Integration Handbook for AI Agents

> **Mục đích:** Tài liệu này được biên soạn dành riêng cho các **AI Coding Agents** hoặc **Lập trình viên Frontend/Backend** thế hệ tiếp theo. Hướng dẫn này cung cấp toàn bộ bối cảnh hệ thống, kiến trúc backend, luồng gọi API, mẫu dữ liệu (data contracts), xử lý lỗi và quy trình từng bước để kết nối mượt mà giữa **Frontend (React / Vue / Mobile)** và **Backend (ASP.NET Core .NET 9)**.

---

## 1. 🌍 Bối Cảnh Hệ Thống (System Overview)

Dự án **AgriVision AI** là hệ thống chẩn đoán bệnh cây trồng dựa trên ảnh chụp lá cây. Luồng dữ liệu hoạt động như sau:

```text
[Frontend (React/Vue/Mobile)]
       │
       ▼ (HTTP REST API / Bearer JWT)
[Backend (.NET 9 Web API - Clean Architecture)]
       ├── (SQL Queries & Migrations) ──► [PostgreSQL 16 Database (Docker)]
       ├── (Image Storage) ─────────────► [Cloudinary Cloud API]
       └── (AI Leaf Disease Inference) ──► [AI Service (FastAPI ConvNeXt-Tiny)]
```

---

## 2. 🗄️ Cấu Trúc Thư Mục Backend & Thông Số Kết Nối

### 2.1 Cấu Trúc Thư Mục `backend/`
- **Solution File:** `backend/AgriVision.sln`
- **Thư mục dự án:**
  - `backend/src/AgriVision.Domain`: Chứa Entities (`User`, `Plant`, `Disease`, `PlantDisease`, `PredictionHistory`, `PredictionDetail`).
  - `backend/src/AgriVision.Application`: Chứa Interfaces & DTOs (`RegisterRequest`, `LoginRequest`, `PredictRequest`, `PredictionResultDto`).
  - `backend/src/AgriVision.Infrastructure`: Cài đặt Database EF Core, Npgsql provider, JWT Generator, Cloudinary Storage client.
  - `backend/src/AgriVision.API`: Rest Controllers (`AuthController`, `PredictionsController`, `PlantsController`, `DiseasesController`, `HealthController`).
  - `backend/docker-compose.yml`: Khởi chạy container **PostgreSQL 16 Alpine** (`agrivision_postgres`).

### 2.2 Thông Số Khởi Chạy Local Backend
- **Container PostgreSQL:** Port `5432` | User: `agrivision_user` | Pass: `agrivision_pass` | DB: `agrivision_db`
- **HTTP Base URL:** `http://localhost:5034`
- **HTTPS Base URL:** `https://localhost:7026`
- **Swagger UI Interactive Documentation:** `http://localhost:5034/swagger` (tự động redirect từ `/`)

---

## 3. 🔑 Tài Khoản Mặc Định & Dữ Liệu Khởi Tạo (Seeded Data)

Hệ thống đã tự động chạy Database Seeding khi ứng dụng khởi chạy lần đầu:

| Role | Email | Password Mặc Định | Ghi Chú |
|---|---|---|---|
| **Admin** | `admin@agrivision.ai` | `AdminPassword123!` | Toàn quyền quản lý Danh mục cây (`Plants`) & Bệnh (`Diseases`) |
| **User** | `user@agrivision.ai` | `UserPassword123!` | Người dùng nông dân / khách hàng sử dụng app |

---

## 4. 📡 Chi Tiết Các REST API Endpoints & Data Contracts

Tất cả các API Endpoints đều trả về JSON format chuẩn `camelCase`.

### 4.1 Module Authentication (`/api/auth`)

#### 1. Đăng Ký Tài Khoản (`POST /api/auth/register`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "fullName": "Nguyen Van A",
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Nguyen Van A",
      "email": "user@example.com",
      "role": "User",
      "createdAt": "2026-09-26T10:00:00Z"
    }
  }
  ```

#### 2. Đăng Nhập (`POST /api/auth/login`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):** Trả về Token JWT và thông tin User tương tự API Register.

#### 3. Lấy Thông Tin User Hiện Tại (`GET /api/auth/me`)
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response (200 OK):** Trả về đối tượng `UserDto`.

---

### 4.2 Module Chẩn Đoán AI & Lịch Sử (`/api/predictions`)

#### 1. Upload Ảnh & Dự Đoán Bệnh (`POST /api/predictions`)
- **Headers:** 
  - `Content-Type: multipart/form-data`
  - `Authorization: Bearer <jwt_token>` *(Tùy chọn: Nếu có token thì kết quả sẽ tự động lưu vào lịch sử của User đó)*
- **Form Data Field:** `file` *(Binary image file: JPG, PNG, WEBP)*
- **Response (201 Created):**
  ```json
  {
    "id": "e1f2g3h4-5678-90ab-cd01-234567890abc",
    "imagePath": "https://res.cloudinary.com/dkvqenkjx/image/upload/v1727350000/predictions/leaf123.jpg",
    "imagePublicId": "predictions/leaf123",
    "predictedPlantDisease": {
      "id": "b1c2d3e4-f5a6-7890-1234-567890abcdef",
      "plantId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "plantName": "Tomato",
      "plantVietnameseName": "Cà chua",
      "diseaseId": "c1d2e3f4-a5b6-7890-1234-567890abcdef",
      "diseaseName": "Late Blight",
      "diseaseVietnameseName": "Bệnh mốc sương",
      "description": "Bệnh do nấm Phytophthora infestans gây ra...",
      "treatment": "Cắt tỉa lá bệnh, phun thuốc BVTV chứa Mancozeb hoặc Ridomil Gold...",
      "classIndex": 3
    },
    "confidence": 0.9654,
    "predictionDetails": [
      {
        "classIndex": 3,
        "className": "Tomato___Late_blight",
        "confidence": 0.9654,
        "plantDisease": { ... }
      },
      {
        "classIndex": 2,
        "className": "Tomato___Early_blight",
        "confidence": 0.0241,
        "plantDisease": { ... }
      }
    ],
    "createdAt": "2026-09-26T12:00:00Z"
  }
  ```

#### 2. Lấy Lịch Sử Dự Đoán Có Phân Trang (`GET /api/predictions?pageNumber=1&pageSize=10`)
- **Headers:** `Authorization: Bearer <jwt_token>` (Bắt buộc)
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "e1f2g3h4-5678-90ab-cd01-234567890abc",
        "imagePath": "https://res.cloudinary.com/...",
        "plantName": "Tomato",
        "plantVietnameseName": "Cà chua",
        "diseaseName": "Late Blight",
        "diseaseVietnameseName": "Bệnh mốc sương",
        "confidence": 0.9654,
        "createdAt": "2026-09-26T12:00:00Z"
      }
    ],
    "pageNumber": 1,
    "pageSize": 10,
    "totalCount": 1,
    "totalPages": 1
  }
  ```

#### 3. Lấy Chi Tiết Kết Quả Theo ID (`GET /api/predictions/{id}`)
- **Response (200 OK):** Trả về đối tượng `PredictionResultDto` đầy đủ thông tin bệnh + Top-K chẩn đoán.

---

### 4.3 Module Quản Lý Danh Mục (`/api/plants` & `/api/diseases`)
- `GET /api/plants` - Lấy danh sách cây trồng (`PlantDto`).
- `GET /api/diseases` - Lấy danh sách loại bệnh (`DiseaseDto`).
- `POST`, `PUT`, `DELETE` yêu cầu Header `Authorization: Bearer <admin_token>` (Role = `Admin`).

---

## 5. 🤖 Hướng Dẫn Từng Bước Dành Cho AI Subagents Tạo Frontend

Nếu bạn là một **AI Agent** được giao nhiệm vụ tạo giao diện Frontend (React / Vite / Vue / Next.js / Flutter):

### Bước 1: Khởi tạo HTTP Client / Axios Instance
Cấu hình Interceptor tự động gắn `Authorization` Bearer token từ `localStorage`:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5034/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Bước 2: Xử lý Upload Ảnh Chẩn Đoán (Multipart Form Data)
```javascript
export const predictLeafDisease = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile); // QUAN TRỌNG: Tên key phải là 'file'

  const response = await api.post('/predictions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
```

### Bước 3: Render Giao Diện Kết Quả Dự Đoán
- **Tên cây & Tên bệnh:** Sử dụng `plantVietnameseName` và `diseaseVietnameseName` để hiển thị tiếng Việt thân thiện với người nông dân.
- **Độ tin cậy:** Định dạng phần trăm (`(confidence * 100).toFixed(1) + '%'`).
- **Hình ảnh:** Hiển thị trực tiếp từ URL `imagePath` (Cloudinary CDN).
- **Lời khuyên & Điều trị:** Hiển thị `predictedPlantDisease.treatment` dạng Markdown / Bullet points.
- **Top-K Predictions:** Hiển thị biểu đồ thanh (Progress bar) cho từng item trong `predictionDetails`.

---

## 6. ⚠️ Xử Lý Lỗi Thường Gặp (Troubleshooting & Edge Cases)

1. **Lỗi 401 Unauthorized:**
   - Xảy ra khi Token JWT hết hạn hoặc chưa đăng nhập. Frontend cần catch 401 và tự động chuyển hướng người dùng tới trang `/login`.

2. **Lỗi 400 Bad Request khi Upload Ảnh:**
   - Kiểm tra xem Form Data key có đúng là `file` hay không.
   - Định dạng file gửi đi phải là Image binary (`image/jpeg`, `image/png`, `image/webp`).

3. **Lỗi 500 Internal Server Error:**
   - Đảm bảo Docker Container PostgreSQL đang chạy (`docker compose up -d`).
   - Kiểm tra log backend bằng `dotnet run --project backend/src/AgriVision.API/AgriVision.API.csproj`.
