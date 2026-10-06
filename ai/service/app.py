"""Internal HTTP API for ConvNeXt-Tiny inference."""

import asyncio
import io
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from time import perf_counter
from typing import Callable
from uuid import uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from ai.configs import config
from ai.configs.plant_disease_mapping import get_plant_to_diseases
from ai.predict import (
    DISEASE_CHECKPOINT_PATH,
    PLANT_CHECKPOINT_PATH,
    CombinedPlantDiseasePredictor,
)
from ai.service.schemas import BackendPredictionResponse, PredictionResponse

LOGGER = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


def validate_image(data: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG"}:
                return False
            if image.width * image.height > MAX_IMAGE_PIXELS:
                return False
            image.load()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return False
    return True


def plant_disease_groups(result: dict) -> list[dict]:
    return result.get("plant_disease_predictions") or [
        {
            "plant": result["plant"],
            "confidence": result["plant_confidence"],
            "diseases": result["top_disease_predictions"],
        }
    ]


def create_app(
    model_factory: Callable[..., CombinedPlantDiseasePredictor] = CombinedPlantDiseasePredictor,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.model = None
        app.state.inference_lock = asyncio.Lock()
        try:
            app.state.model = await run_in_threadpool(
                model_factory,
                plant_checkpoint_path=os.getenv(
                    "AGRIVISION_PLANT_CHECKPOINT", str(PLANT_CHECKPOINT_PATH)
                ),
                disease_checkpoint_path=os.getenv(
                    "AGRIVISION_DISEASE_CHECKPOINT", str(DISEASE_CHECKPOINT_PATH)
                ),
            )
        except Exception:
            LOGGER.exception("Could not load inference checkpoints")
        yield
        app.state.model = None

    app = FastAPI(title="AgriVision AI Inference", lifespan=lifespan)

    async def run_prediction(
        image: UploadFile, top_k: int, *, allow_untyped_image: bool = False
    ) -> tuple[dict, float] | JSONResponse:
        if app.state.model is None:
            return error_response(503, "MODEL_UNAVAILABLE", "Model is not ready")
        allowed_types = {"image/jpeg", "image/png"}
        if allow_untyped_image:
            allowed_types.update({"application/octet-stream", None})
        if image.content_type not in allowed_types:
            return error_response(415, "UNSUPPORTED_IMAGE", "Use a JPEG or PNG image")

        data = await image.read(MAX_IMAGE_BYTES + 1)
        await image.close()
        if len(data) > MAX_IMAGE_BYTES:
            return error_response(413, "IMAGE_TOO_LARGE", "Image exceeds 15 MB")
        if not validate_image(data):
            return error_response(400, "INVALID_IMAGE", "Image is invalid or too large")

        with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as temporary:
            temporary.write(data)
            image_path = Path(temporary.name)

        try:
            started = perf_counter()
            async with app.state.inference_lock:
                result = await run_in_threadpool(
                    app.state.model.predict_image, image_path, top_k=top_k
                )
            return result, round((perf_counter() - started) * 1000, 2)
        except Exception:
            LOGGER.exception("Inference failed")
            return error_response(500, "INFERENCE_FAILED", "Prediction failed")
        finally:
            image_path.unlink(missing_ok=True)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _error: RequestValidationError):
        return error_response(422, "VALIDATION_ERROR", "Invalid request fields")

    @app.get("/health/live")
    def live() -> dict[str, str]:
        return {"status": "alive"}

    @app.get("/health/ready")
    def ready():
        if app.state.model is None:
            return error_response(503, "MODEL_UNAVAILABLE", "Model is not ready")
        return {"status": "ready"}

    @app.get("/health")
    def backend_health():
        if app.state.model is None:
            return error_response(503, "MODEL_UNAVAILABLE", "Model is not ready")
        return {"status": "Healthy"}

    @app.post("/predict", response_model=BackendPredictionResponse)
    async def backend_predict(file: UploadFile = File(...)):
        prediction = await run_prediction(file, top_k=3, allow_untyped_image=True)
        if isinstance(prediction, JSONResponse):
            return prediction

        result, _ = prediction
        dataset_version = getattr(
            getattr(app.state.model, "disease_predictor", None),
            "dataset_version",
            config.DATASET_VERSION,
        )
        labels = sorted(
            f"{plant}___{disease}"
            for plant, diseases in get_plant_to_diseases(dataset_version).items()
            for disease in diseases
        )
        class_to_idx = {label: index for index, label in enumerate(labels)}
        def backend_disease(plant: str, disease: dict) -> dict:
            label = f'{plant}___{disease["disease"]}'
            return {
                "class_index": class_to_idx[label],
                "class_name": label,
                "confidence": round(disease["confidence"] / 100, 6),
            }

        try:
            groups = [
                {
                    "plant": group["plant"],
                    "confidence": round(group["confidence"] / 100, 6),
                    "diseases": [
                        backend_disease(group["plant"], disease)
                        for disease in group["diseases"]
                    ],
                }
                for group in plant_disease_groups(result)
            ]
        except KeyError:
            LOGGER.exception("Model returned a label outside the dataset mapping")
            return error_response(500, "INFERENCE_FAILED", "Prediction failed")
        if not groups or not groups[0]["diseases"]:
            return error_response(500, "INFERENCE_FAILED", "Prediction failed")
        top_k = groups[0]["diseases"]
        return BackendPredictionResponse(
            **top_k[0], top_k=top_k, plant_predictions=groups
        )

    @app.post("/v1/predictions", response_model=PredictionResponse)
    async def predict(
        image: UploadFile = File(...),
        top_k: int = Form(3, alias="topK", ge=1, le=5),
    ):
        prediction = await run_prediction(image, top_k)
        if isinstance(prediction, JSONResponse):
            return prediction
        result, elapsed_ms = prediction
        return PredictionResponse(
            predictionId=str(uuid4()),
            modelVersion=os.getenv("AGRIVISION_MODEL_VERSION"),
            plant={"label": result["plant"], "confidence": result["plant_confidence"]},
            disease={"label": result["disease"], "confidence": result["disease_confidence"]},
            topPlantPredictions=[
                {
                    "label": group["plant"],
                    "confidence": group["confidence"],
                    "diseases": [
                        {"label": disease["disease"], "confidence": disease["confidence"]}
                        for disease in group["diseases"]
                    ],
                }
                for group in plant_disease_groups(result)
            ],
            topDiseasePredictions=[
                {"label": item["disease"], "confidence": item["confidence"]}
                for item in result["top_disease_predictions"]
            ],
            processingTimeMs=elapsed_ms,
        )

    return app


app = create_app()
