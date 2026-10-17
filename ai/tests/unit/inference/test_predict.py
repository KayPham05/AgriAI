import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import torch
from PIL import Image

from ai.configs.plant_disease_mapping import get_plant_to_diseases
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


class _GroupedDiseasePredictor:
    dataset_version = "v1.4"

    def __init__(self) -> None:
        self.allowed_groups = []

    def predict_image(self, _image_path, top_k=3, allowed_labels=None):
        self.allowed_groups.append(allowed_labels)
        diseases = sorted(allowed_labels)[:top_k]
        predictions = [
            {"plant": "", "disease": label, "confidence": 60.0 - rank * 10}
            for rank, label in enumerate(diseases)
        ]
        return {
            "disease": predictions[0]["disease"],
            "confidence": predictions[0]["confidence"],
            "top_predictions": predictions,
        }


class PredictionTests(unittest.TestCase):
    def test_top_three_plants_each_have_three_filtered_diseases(self) -> None:
        plant_predictions = [
            {"plant": plant, "confidence": confidence}
            for plant, confidence in (
                ("Ca_chua", 80.0), ("Ot", 15.0), ("Ca_phe", 5.0)
            )
        ]
        predictor = CombinedPlantDiseasePredictor.__new__(
            CombinedPlantDiseasePredictor
        )
        predictor.plant_predictor = _StaticPredictor(
            {
                "image_path": "D:/1.jpg",
                "plant": "Ca_chua",
                "confidence": 80.0,
                "top_predictions": plant_predictions,
            }
        )
        predictor.disease_predictor = _GroupedDiseasePredictor()

        result = predictor.predict_image(Path("D:/1.jpg"), top_k=3)

        groups = result["plant_disease_predictions"]
        self.assertEqual([group["plant"] for group in groups], ["Ca_chua", "Ot", "Ca_phe"])
        self.assertEqual([len(group["diseases"]) for group in groups], [3, 3, 3])
        self.assertEqual([group["confidence"] for group in groups], [80.0, 15.0, 5.0])
        self.assertEqual(result["top_disease_predictions"], groups[0]["diseases"])
        for group, allowed in zip(groups, predictor.disease_predictor.allowed_groups):
            self.assertEqual(allowed, get_plant_to_diseases("v1.4")[group["plant"]])
            self.assertTrue({item["disease"] for item in group["diseases"]} <= allowed)

    def test_checkpoint_dataset_version_is_available_for_combined_inference(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            checkpoint_path = Path(temporary_directory) / "model.pth"
            checkpoint_path.touch()
            checkpoint = {
                "dataset_version": "v1.4",
                "num_classes": 44,
                "idx_to_info": {0: {"label": "Khoe_manh"}},
                "model_state_dict": {},
            }
            with patch("ai.predict.torch.load", return_value=checkpoint), patch(
                "ai.predict.build_model"
            ), patch("ai.predict.get_inference_transforms"):
                predictor = LeafDiseasePredictor(checkpoint_path)

        self.assertEqual(predictor.dataset_version, "v1.4")

    def test_v1_4_pepper_labels_do_not_change_v1_3_mapping(self) -> None:
        old_labels = get_plant_to_diseases("v1.3")["Ot"]
        new_labels = get_plant_to_diseases("v1.4")["Ot"]

        self.assertIn("Ruoi_trang", old_labels)
        self.assertNotIn("Ruoi_trang", new_labels)
        self.assertEqual(
            new_labels,
            {
                "Dom_la_cercospora",
                "Dom_vi_khuan",
                "Khoe_manh",
                "Phan_trang",
                "Thieu_dinh_duong",
                "Virus_xoan_la",
            },
        )
        self.assertEqual(
            len({
                label
                for labels in get_plant_to_diseases("v1.4").values()
                for label in labels
            }),
            44,
        )
        self.assertEqual(
            sum(len(labels) for labels in get_plant_to_diseases("v1.4").values()),
            59,
        )

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

    def test_v1_4_checkpoint_uses_v1_4_pepper_labels(self) -> None:
        predictor = CombinedPlantDiseasePredictor.__new__(
            CombinedPlantDiseasePredictor
        )
        predictor.plant_predictor = _StaticPredictor(
            {
                "image_path": "D:/1.jpg",
                "plant": "Ot",
                "confidence": 90.0,
                "top_predictions": [],
            }
        )
        predictor.disease_predictor = _StaticPredictor(
            {"disease": "Phan_trang", "confidence": 80.0, "top_predictions": []}
        )
        predictor.disease_predictor.dataset_version = "v1.4"

        predictor.predict_image(Path("D:/1.jpg"))

        self.assertEqual(
            predictor.disease_predictor.allowed_labels,
            get_plant_to_diseases("v1.4")["Ot"],
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
