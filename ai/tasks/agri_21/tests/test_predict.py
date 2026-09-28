import tempfile
import unittest
from pathlib import Path

import torch
from PIL import Image

from ai.predict import CombinedPlantDiseasePredictor, LeafDiseasePredictor


class _FixedLogitModel:
    def __call__(self, _tensor: torch.Tensor) -> torch.Tensor:
        return torch.tensor([[3.0, 1.0]])


class _StaticPredictor:
    def __init__(self, result: dict) -> None:
        self.result = result
        self.allowed_labels = None

    def predict_image(
        self,
        _image_path: Path,
        top_k: int = 3,
        allowed_labels: set[str] | None = None,
    ) -> dict:
        self.allowed_labels = allowed_labels
        return self.result


class PredictionTests(unittest.TestCase):
    def test_disease_prediction_excludes_labels_from_other_plants(self) -> None:
        predictor = LeafDiseasePredictor.__new__(LeafDiseasePredictor)
        predictor.num_classes = 2
        predictor.idx_to_info = {
            0: {
                "label": "Dom_la",
                "target_field": "condition",
                "plant": "",
                "disease": "Dom_la",
            },
            1: {
                "label": "Chay_la_som",
                "target_field": "condition",
                "plant": "",
                "disease": "Chay_la_som",
            },
        }
        predictor.model = _FixedLogitModel()
        predictor.transform = lambda _image: torch.zeros(3, 224, 224)

        with tempfile.TemporaryDirectory() as temporary_directory:
            image_path = Path(temporary_directory) / "leaf.jpg"
            Image.new("RGB", (32, 32)).save(image_path)

            result = predictor.predict_image(
                image_path,
                top_k=2,
                allowed_labels={"Chay_la_som"},
            )

        self.assertEqual(result["disease"], "Chay_la_som")
        self.assertEqual(len(result["top_predictions"]), 1)

    def test_combines_plant_and_disease_predictions_for_one_image(self) -> None:
        plant_predictions = [
            {"plant": "Ca_chua", "disease": "", "confidence": 91.74}
        ]
        disease_predictions = [
            {"plant": "", "disease": "Chay_la_som", "confidence": 73.79}
        ]
        predictor = CombinedPlantDiseasePredictor.__new__(
            CombinedPlantDiseasePredictor
        )
        predictor.plant_predictor = _StaticPredictor(
            {
                "image_path": "D:/1.jpg",
                "plant": "Ca_chua",
                "disease": "",
                "confidence": 91.74,
                "top_predictions": plant_predictions,
            }
        )
        predictor.disease_predictor = _StaticPredictor(
            {
                "image_path": "D:/1.jpg",
                "plant": "",
                "disease": "Chay_la_som",
                "confidence": 73.79,
                "top_predictions": disease_predictions,
            }
        )

        result = predictor.predict_image(Path("D:/1.jpg"), top_k=1)

        self.assertEqual(result["plant"], "Ca_chua")
        self.assertEqual(result["plant_confidence"], 91.74)
        self.assertEqual(result["disease"], "Chay_la_som")
        self.assertEqual(result["disease_confidence"], 73.79)
        self.assertEqual(result["top_plant_predictions"], plant_predictions)
        self.assertEqual(result["top_disease_predictions"], disease_predictions)
        self.assertEqual(
            predictor.disease_predictor.allowed_labels,
            {
                "Chay_la_som",
                "Dom_la_Septoria",
                "Dom_muc_tieu",
                "Dom_vi_khuan",
                "Khoe_manh",
                "Moc_la",
                "Moc_suong",
                "Nhen_do",
                "Virus_kham_la",
                "Virus_xoan_vang_la",
            },
        )

    def test_plant_checkpoint_mapping_does_not_require_compound_label(self) -> None:
        predictor = LeafDiseasePredictor.__new__(LeafDiseasePredictor)
        predictor.num_classes = 2
        predictor.idx_to_info = {
            0: {
                "label": "Ca_chua",
                "target_field": "plant",
                "plant": "Ca_chua",
                "disease": "",
            },
            1: {
                "label": "Ca_phe",
                "target_field": "plant",
                "plant": "Ca_phe",
                "disease": "",
            },
        }
        predictor.model = _FixedLogitModel()
        predictor.transform = lambda _image: torch.zeros(3, 224, 224)

        with tempfile.TemporaryDirectory() as temporary_directory:
            image_path = Path(temporary_directory) / "leaf.jpg"
            Image.new("RGB", (32, 32)).save(image_path)

            result = predictor.predict_image(image_path, top_k=1)

        self.assertEqual(result["plant"], "Ca_chua")
        self.assertEqual(
            result["top_predictions"][0]["compound_label"],
            "Ca_chua",
        )


if __name__ == "__main__":
    unittest.main()
