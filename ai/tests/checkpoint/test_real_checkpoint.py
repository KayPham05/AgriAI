"""Explicit artifact-backed tests; no fake models, downloads or accuracy claims."""

import hashlib
import io
import math
import os
import re
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from ai.predict import DISEASE_CHECKPOINT_PATH, PLANT_CHECKPOINT_PATH
from ai.service.app import create_app

ROOT = Path(__file__).resolve().parents[3]
CHECKPOINTS = (
    ("AGRIVISION_PLANT_CHECKPOINT", PLANT_CHECKPOINT_PATH,
     "d071c13d14ef573430b38674647e5ebfce0b5d3f4bd7099d7e815549073178ea"),
    ("AGRIVISION_DISEASE_CHECKPOINT", DISEASE_CHECKPOINT_PATH,
     "d21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9"),
)


class RealCheckpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Verify provenance before deserializing the existing trusted artifacts.
        for variable, default, expected in CHECKPOINTS:
            path = Path(os.getenv(variable, str(default)))
            with path.open("rb") as source:
                actual = hashlib.file_digest(source, "sha256").hexdigest()
            if actual != expected:
                raise AssertionError(f"Unexpected checkpoint SHA-256: {path.name}")
        # The separately maintained DB import is the consumer's class-index contract.
        catalog = (ROOT / "database/import_dataset_v1_4_catalog.sql").read_text(encoding="utf-8")
        cls.labels = {int(index): label for index, label in re.findall(
            r"^\((\d+), '([^']+)', '[^']+', '[^']+'\)[,;]", catalog, re.MULTILINE
        )}
        if len(cls.labels) != 59:
            raise AssertionError("Expected the complete v1.4 catalog")
        cls.image = ROOT / "frontend/src/assets/banner-leaves/rice-leaf-cutout.png"
        cls.app = create_app()
        cls.client = TestClient(cls.app)
        cls.client.__enter__()
        cls.addClassCleanup(cls.client.__exit__, None, None, None)
        if cls.client.get("/health/ready").status_code != 200:
            raise AssertionError("Real checkpoints failed to load")
        cls.model = cls.app.state.model

    def test_loaded_models_match_v1_4_labels_and_use_eval_mode(self):
        plants = {label.split("___")[0] for label in self.labels.values()}
        conditions = {label.split("___")[1] for label in self.labels.values()}
        for predictor, target, expected in (
            (self.model.plant_predictor, "plant", plants),
            (self.model.disease_predictor, "disease", conditions),
        ):
            self.assertEqual(predictor.dataset_version, "v1.4")
            self.assertEqual(predictor.num_classes, len(expected))
            self.assertEqual({info[target] for info in predictor.idx_to_info.values()}, expected)
            self.assertFalse(predictor.model.training)

    def assert_prediction_parity(self, data, suffix, content_type):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / f"leaf{suffix}"
            image.write_bytes(data)
            direct = self.model.predict_image(image, top_k=3)
        response = self.client.post("/predict", files={"file": (image.name, data, content_type)})
        self.assertEqual(response.status_code, 200, response.text)
        backend = response.json()
        self.assertEqual(len(backend["plant_predictions"]), 3)
        for actual, expected in zip(backend["plant_predictions"], direct["plant_disease_predictions"]):
            self.assertEqual(actual["plant"], expected["plant"])
            self.assertAlmostEqual(actual["confidence"], expected["confidence"] / 100, places=6)
            self.assertEqual(len(actual["diseases"]), 3)
            for disease, source in zip(actual["diseases"], expected["diseases"]):
                self.assertEqual(disease["class_name"], f"{expected['plant']}___{source['disease']}")
                self.assertEqual(self.labels[disease["class_index"]], disease["class_name"])
                self.assertTrue(math.isfinite(disease["confidence"]))
                self.assertGreaterEqual(disease["confidence"], 0)
                self.assertLessEqual(disease["confidence"], 1)
                self.assertAlmostEqual(disease["confidence"], source["confidence"] / 100, places=6)
            scores = [item["confidence"] for item in actual["diseases"]]
            self.assertEqual(scores, sorted(scores, reverse=True))
        for key in ("class_name", "class_index", "confidence"):
            self.assertEqual(backend[key], backend["top_k"][0][key])
        self.assertEqual(backend["top_k"], backend["plant_predictions"][0]["diseases"])
        return direct, backend

    def test_png_matches_direct_inference_and_backend_catalog(self):
        self.assert_prediction_parity(self.image.read_bytes(), ".png", "image/png")

    def test_jpeg_matches_direct_inference_and_backend_catalog(self):
        with Image.open(self.image) as source:
            output = io.BytesIO()
            source.convert("RGB").save(output, format="JPEG")
        self.assert_prediction_parity(output.getvalue(), ".jpg", "image/jpeg")

    def test_repeated_http_inference_is_stable(self):
        data = self.image.read_bytes()
        results = [self.client.post("/predict", files={"file": ("leaf.png", data, "image/png")}) for _ in range(2)]
        for response in results:
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(results[0].json(), results[1].json())

    def test_model_api_topk_and_confidence_match_backend_api(self):
        data = self.image.read_bytes()
        backend_response = self.client.post("/predict", files={"file": ("leaf.png", data, "image/png")})
        self.assertEqual(backend_response.status_code, 200, backend_response.text)
        backend = backend_response.json()
        for top_k in (1, 3, 5):
            with self.subTest(top_k=top_k):
                response = self.client.post("/v1/predictions", data={"topK": str(top_k)},
                                            files={"image": ("leaf.png", data, "image/png")})
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(len(result["topPlantPredictions"]), top_k)
                self.assertEqual(result["plant"]["label"], backend["plant_predictions"][0]["plant"])
                self.assertAlmostEqual(result["disease"]["confidence"] / 100, backend["confidence"], places=6)
                self.assertEqual(f"{result['plant']['label']}___{result['disease']['label']}", backend["class_name"])
                for group in result["topPlantPredictions"]:
                    available = sum(label.startswith(group["label"] + "___") for label in self.labels.values())
                    self.assertEqual(len(group["diseases"]), min(top_k, available))
                    for disease in group["diseases"]:
                        self.assertIn(f"{group['label']}___{disease['label']}", self.labels.values())

    def test_invalid_uploads_are_rejected_with_real_model_ready(self):
        for route, field in (("/predict", "file"), ("/v1/predictions", "image")):
            for data, mime, status, code in (
                (b"not an image", "image/jpeg", 400, "INVALID_IMAGE"),
                (b"<svg></svg>", "image/svg+xml", 415, "UNSUPPORTED_IMAGE"),
                (b"x" * (15 * 1024 * 1024 + 1), "image/png", 413, "IMAGE_TOO_LARGE"),
            ):
                with self.subTest(route=route, code=code):
                    response = self.client.post(route, files={field: ("invalid.png", data, mime)})
                    self.assertEqual(response.status_code, status)
                    self.assertEqual(response.json()["error"]["code"], code)
                    self.assertNotIn("Traceback", response.text)
        self.assertEqual(self.client.get("/health/ready").status_code, 200)


if __name__ == "__main__":
    unittest.main()
