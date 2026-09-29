# Kết nối model với backend

AI service chạy độc lập bằng FastAPI. Backend gửi một ảnh lá cây qua HTTP nội
bộ và nhận kết quả phân loại loài cây, bệnh cùng độ tin cậy. Service dùng lại
`CombinedPlantDiseasePredictor` trong `ai/predict.py` và nạp hai checkpoint
một lần khi khởi động.

## Chuẩn bị

Từ thư mục gốc của repository, cài môi trường theo
`docs/notes/model_inference_guide.md`. Đặt hai checkpoint tại:

```text
ai/checkpoints/plant/best_convnext_tiny.pth
ai/checkpoints/disease/best_convnext_tiny.pth
```

Nếu checkpoint ở nơi khác, đặt biến môi trường trước khi chạy service:

```powershell
$env:AGRIVISION_PLANT_CHECKPOINT = "D:\models\plant\best_convnext_tiny.pth"
$env:AGRIVISION_DISEASE_CHECKPOINT = "D:\models\disease\best_convnext_tiny.pth"
```

Có thể đặt `AGRIVISION_MODEL_VERSION` khi hai checkpoint đã có phiên bản model
được xác nhận, ví dụ `convnext-tiny-v1.0`. Nếu chưa đặt, trường `modelVersion`
trong phản hồi là `null`; service không tự suy đoán phiên bản.

## Chạy service

Chạy từ thư mục gốc của repository:

```powershell
.\ai\.venv\Scripts\python.exe -m uvicorn ai.service.app:app --host 127.0.0.1 --port 8001 --workers 1
```

`--workers 1` giữ một bản model trong bộ nhớ. Service chỉ lắng nghe trên máy
hiện tại; nếu backend ở máy khác, cần cấu hình mạng nội bộ và lớp xác thực phù
hợp trước khi mở địa chỉ lắng nghe.

Kiểm tra trạng thái:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health/live
Invoke-RestMethod http://127.0.0.1:8001/health/ready
```

`/health/live` cho biết tiến trình còn chạy. `/health/ready` chỉ trả HTTP 200
khi cả hai checkpoint đã nạp thành công; nếu không, trả HTTP 503.

## Gửi ảnh dự đoán

Backend gọi `POST /v1/predictions` với `multipart/form-data`:

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `image` | file | Có | Ảnh JPEG hoặc PNG, tối đa 10 MB và 20 triệu pixel |
| `topK` | số nguyên | Không | Số kết quả đầu, từ 1 đến 5; mặc định 3 |

Ví dụ từ PowerShell:

```powershell
curl.exe -X POST "http://127.0.0.1:8001/v1/predictions" `
  -F "image=@D:\duong-dan\la-cay.jpg" `
  -F "topK=3"
```

Phản hồi thành công có dạng:

```json
{
  "predictionId": "<request-uuid>",
  "modelVersion": null,
  "plant": { "label": "Ca_chua", "confidence": 91.74 },
  "disease": { "label": "Chay_la_som", "confidence": 73.79 },
  "topPlantPredictions": [
    { "label": "Ca_chua", "confidence": 91.74 }
  ],
  "topDiseasePredictions": [
    { "label": "Chay_la_som", "confidence": 73.79 }
  ],
  "processingTimeMs": 182.0
}
```

Các giá trị trên chỉ minh họa cấu trúc phản hồi, không phải kết quả đo của
model. `predictionId` định danh request để đối chiếu phía backend; service
không lưu ảnh hay kết quả dự đoán. Độ tin cậy là phần trăm từ 0 đến 100.

## Xử lý lỗi

Lỗi do service trả về có dạng:

```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Image is invalid or too large"
  }
}
```

| HTTP | `code` | Ý nghĩa |
|---|---|---|
| 400 | `INVALID_IMAGE` | Nội dung ảnh không hợp lệ hoặc vượt giới hạn pixel |
| 413 | `IMAGE_TOO_LARGE` | Ảnh vượt 10 MB |
| 415 | `UNSUPPORTED_IMAGE` | Kiểu upload không phải JPEG/PNG |
| 422 | `VALIDATION_ERROR` | Thiếu trường hoặc `topK` ngoài khoảng 1 đến 5 |
| 500 | `INFERENCE_FAILED` | Lỗi khi chạy model |
| 503 | `MODEL_UNAVAILABLE` | Checkpoint chưa nạp thành công |

Backend nên đặt timeout cho request, ghi log `predictionId` cùng status HTTP,
và chuyển mã lỗi sang thông báo phù hợp cho frontend. Khi service trả 503,
kiểm tra log của tiến trình và đường dẫn hai checkpoint.
