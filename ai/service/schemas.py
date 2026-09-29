from pydantic import BaseModel, Field


class LabelScore(BaseModel):
    label: str
    confidence: float


class PredictionResponse(BaseModel):
    prediction_id: str = Field(alias="predictionId")
    model_version: str | None = Field(alias="modelVersion")
    plant: LabelScore
    disease: LabelScore
    top_plant_predictions: list[LabelScore] = Field(alias="topPlantPredictions")
    top_disease_predictions: list[LabelScore] = Field(alias="topDiseasePredictions")
    processing_time_ms: float = Field(alias="processingTimeMs")
