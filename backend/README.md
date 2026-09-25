# LeafAI Backend Demo

FastAPI service for the frontend upload demo. It does not run an AI model.

## Run

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: `http://127.0.0.1:8000/docs`.

## Prediction contract

`POST /api/predictions` accepts `multipart/form-data` with one JPG or PNG file in the `image` field, up to 15 MB. A successful response has HTTP 200:

```json
{ "crop": "Tomato", "disease": "Early Blight", "confidence": 0.94 }
```

This is a fixed **mock response** for every valid image. It must not be interpreted as a diagnosis. The backend rejects unsupported file types and invalid image signatures with HTTP 415, empty files with HTTP 400, and files over 15 MB with HTTP 413. The API does not store uploaded images.

The frontend development server proxies `/api` requests to this service. `GET /api/health` is available for health checks.

## Smoke test

```powershell
cd backend
python tests/smoke_demo_api.py
```

The script starts a temporary server and checks a successful upload, unsupported type, invalid image content, empty file, and oversized file.
