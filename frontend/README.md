# LeafAI Frontend

Next.js App Router frontend for the LeafAI plant-disease classification experience. Styling uses Tailwind CSS 4 and dependencies are managed with pnpm.

The home page banner cycles through all 13 plants in the project. Visitors can select a plant from the banner strip or use the previous/next buttons; automatic transitions stop when the banner is out of view and are disabled when the device requests reduced motion.

## Run locally

Requirements: Node.js 20.9+, pnpm 10, and .NET 9 SDK.

Open two terminals from the project root:

```powershell
cd backend
dotnet restore AgriVision.sln
dotnet run --project src/AgriVision.API/AgriVision.API.csproj --launch-profile http
```

```powershell
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Next.js rewrites `/api/*` to the ASP.NET API at `http://127.0.0.1:5034`, so no API URL is needed for local development. Set `API_PROXY_TARGET` to change the server-side proxy destination, or `NEXT_PUBLIC_API_BASE_URL` to call a public API origin directly. Restart Next.js after changing environment variables.

## Commands

```powershell
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Demo flow

1. Select or drag in a JPG/PNG image, at most 15 MB. Invalid or unreadable files show an inline error.
2. Check the preview and file details. Replace or remove the image if needed.
3. Press **Phân tích**. The page shows upload progress, then an analyzing state while waiting for the API.
4. On success, the crop, disease and confidence come from the JSON response. On network or API errors, the page shows the error and a retry action.

The request is `POST /api/predictions`, `multipart/form-data`, with the file in the `file` field. The response follows the backend `PredictionResultDto` contract:

```json
{
  "id": "prediction-guid",
  "imagePath": "https://...",
  "predictedPlantDisease": {
    "className": "Tomato___Early_blight",
    "plant": { "name": "Tomato", "vietnameseName": "Cà chua" },
    "disease": { "name": "Early Blight", "vietnameseName": "Bệnh đốm vòng" }
  },
  "confidence": 0.94,
  "predictionDetails": [],
  "createdAt": "2026-09-27T00:00:00Z"
}
```

Authenticated requests include the JWT bearer token, allowing predictions to appear in `GET /api/predictions` history and to be removed through `DELETE /api/predictions/{id}`.

## Checks

```powershell
cd frontend
pnpm lint
pnpm build
```

From the repository root, run `dotnet test backend/AgriVision.sln` for backend coverage. For a UI check, test registration, login, one valid image, one non-image file, a file above 15 MB, and a request with the backend stopped. Confirm the authentication, preview, loading, result, and error states.
