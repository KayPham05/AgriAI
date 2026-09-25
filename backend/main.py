from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="LeafAI Backend API",
    description="Backend for Plant Disease Diagnosis App",
    version="1.0.0"
)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development only. Update this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheckResponse(BaseModel):
    status: str
    message: str

class PredictionResponse(BaseModel):
    crop: str
    disease: str
    confidence: float

@app.get("/", response_model=HealthCheckResponse)
def read_root():
    return {"status": "ok", "message": "LeafAI Backend is running!"}

@app.get("/api/health", response_model=HealthCheckResponse)
def health_check():
    return {"status": "ok", "message": "API is healthy"}

MAX_IMAGE_BYTES = 15 * 1024 * 1024

@app.post("/api/predictions", response_model=PredictionResponse)
async def create_demo_prediction(image: UploadFile = File(...)):
    """Demo contract for the frontend. No model inference is performed."""
    if image.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ ảnh JPG hoặc PNG.")

    data = await image.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Tệp ảnh trống.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá giới hạn 15 MB.")
    matches_type = (
        image.content_type == "image/jpeg" and data.startswith(b"\xff\xd8\xff")
    ) or (
        image.content_type == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n")
    )
    if not matches_type:
        raise HTTPException(status_code=415, detail="Nội dung tệp không phải ảnh JPG hoặc PNG hợp lệ.")

    return PredictionResponse(crop="Tomato", disease="Early Blight", confidence=0.94)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
