# LeafAI Frontend Demo

React + Vite frontend for the leaf upload and Backend Demo prediction flow. The API returns a mock result; no AI model is connected.

The home page banner cycles through all 13 plants in the project. Visitors can select a plant from the banner strip or use the previous/next buttons; automatic transitions stop when the banner is out of view and are disabled when the device requests reduced motion.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+), Python 3.9+.

Open two terminals from the project root:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`, then choose **Chẩn đoán**. Vite proxies `/api` to `http://127.0.0.1:8000`, so no API URL is needed for local development. To target a different backend, set `VITE_API_BASE_URL` in `frontend/.env.local` to its origin (for example `http://localhost:8000`) and restart Vite. That backend must allow the frontend origin through CORS.

## Demo flow

1. Select or drag in a JPG/PNG image, at most 15 MB. Invalid or unreadable files show an inline error.
2. Check the preview and file details. Replace or remove the image if needed.
3. Press **Phân tích**. The page shows upload progress, then an analyzing state while waiting for the API.
4. On success, the crop, disease and confidence come from the JSON response. On network or API errors, the page shows the error and a retry action.

The request is `POST /api/predictions`, `multipart/form-data`, with the file in the `image` field. The response contract is:

```json
{ "crop": "Tomato", "disease": "Early Blight", "confidence": 0.94 }
```

The demo backend deliberately returns this same response for every valid image. The UI labels it as a mock result and does not hard-code the prediction. Replacing the backend response changes the result shown on the page without changing the UI.

## Checks

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

From `backend`, run `python tests/smoke_demo_api.py` for a successful multipart request and invalid file cases. For a UI check, test one valid image, one non-image file, a file above 15 MB, and a request with the backend stopped. Confirm the preview, loading, result and error states. No browser automation is configured in this repository.
