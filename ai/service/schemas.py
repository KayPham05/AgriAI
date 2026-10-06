from pydantic import BaseModel, Field


class LabelScore(BaseModel):
    label: str
    confidence: float


class PlantPredictionScore(LabelScore):
    diseases: list[LabelScore] = Field(default_factory=list)


class PredictionResponse(BaseModel):
    prediction_id: str = Field(alias="predictionId")
    model_version: str | None = Field(alias="modelVersion")
    plant: LabelScore
    disease: LabelScore
    top_plant_predictions: list[PlantPredictionScore] = Field(alias="topPlantPredictions")
    top_disease_predictions: list[LabelScore] = Field(alias="topDiseasePredictions")
    processing_time_ms: float = Field(alias="processingTimeMs")


class BackendPredictionItem(BaseModel):
    class_index: int
    class_name: str
    confidence: float


class BackendPlantPrediction(BaseModel):
    plant: str
    confidence: float
    diseases: list[BackendPredictionItem]


class BackendPredictionResponse(BackendPredictionItem):
    top_k: list[BackendPredictionItem]
    plant_predictions: list[BackendPlantPrediction] = Field(default_factory=list)
