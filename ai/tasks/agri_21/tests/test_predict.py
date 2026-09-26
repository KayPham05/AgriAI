import tempfile
import unittest
from pathlib import Path

import torch
from PIL import Image

from ai.predict import LeafDiseasePredictor


class _FixedLogitModel:
    def __call__(self, _tensor: torch.Tensor) -> torch.Tensor:
        return torch.tensor([[3.0, 1.0]])


class PredictionTests(unittest.TestCase):
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
