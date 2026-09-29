import io
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from ai.service.app import create_app


def make_image() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), color="green").save(buffer, format="JPEG")
    return buffer.getvalue()


class FakePredictor:
    def predict_image(self, image_path, top_k=3):
        return {
            "plant": "Ca_chua",
            "plant_confidence": 91.74,
            "disease": "Chay_la_som",
            "disease_confidence": 73.79,
            "top_plant_predictions": [
                {"plant": "Ca_chua", "disease": "", "confidence": 91.74}
            ],
            "top_disease_predictions": [
                {"plant": "", "disease": "Chay_la_som", "confidence": 73.79}
            ],
        }


class InferenceServiceTests(unittest.TestCase):
    def test_loads_model_once_and_returns_prediction(self):
        load_count = 0

        def load_model(**_kwargs):
            nonlocal load_count
            load_count += 1
            return FakePredictor()

        with TestClient(create_app(load_model)) as client:
            self.assertEqual(client.get("/health/live").status_code, 200)
            self.assertEqual(client.get("/health/ready").status_code, 200)
            response = client.post(
                "/v1/predictions",
                data={"topK": "1"},
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )
            self.assertEqual(load_count, 1)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["plant"], {"label": "Ca_chua", "confidence": 91.74})
        self.assertEqual(body["disease"], {"label": "Chay_la_som", "confidence": 73.79})
        self.assertEqual(body["topPlantPredictions"][0]["label"], "Ca_chua")
        self.assertEqual(body["topDiseasePredictions"][0]["label"], "Chay_la_som")
        self.assertGreaterEqual(body["processingTimeMs"], 0)

    def test_unavailable_model_reports_not_ready(self):
        def load_model(**_kwargs):
            raise FileNotFoundError("private checkpoint path")

        with TestClient(create_app(load_model)) as client:
            self.assertEqual(client.get("/health/live").status_code, 200)
            self.assertEqual(client.get("/health/ready").status_code, 503)
            response = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "MODEL_UNAVAILABLE")
        self.assertNotIn("private checkpoint path", response.text)

    def test_rejects_non_image_and_oversized_upload(self):
        with TestClient(create_app(lambda **_kwargs: FakePredictor())) as client:
            invalid = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", b"not an image", "image/jpeg")},
            )
            oversized = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", b"x" * (10 * 1024 * 1024 + 1), "image/jpeg")},
            )

        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.json()["error"]["code"], "INVALID_IMAGE")
        self.assertEqual(oversized.status_code, 413)
        self.assertEqual(oversized.json()["error"]["code"], "IMAGE_TOO_LARGE")

    def test_removes_temporary_image_after_prediction(self):
        image_path = None
        image_existed_during_prediction = False

        class TrackingPredictor(FakePredictor):
            def predict_image(self, path, top_k=3):
                nonlocal image_path, image_existed_during_prediction
                image_path = Path(path)
                image_existed_during_prediction = image_path.is_file()
                return super().predict_image(path, top_k)

        with TestClient(create_app(lambda **_kwargs: TrackingPredictor())) as client:
            response = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(image_path)
        self.assertTrue(image_existed_during_prediction)
        self.assertFalse(image_path.exists())

    def test_hides_internal_inference_error(self):
        class BrokenPredictor:
            def predict_image(self, _path, top_k=3):
                raise RuntimeError("private model detail")

        with TestClient(create_app(lambda **_kwargs: BrokenPredictor())) as client:
            response = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "INFERENCE_FAILED")
        self.assertNotIn("private model detail", response.text)

    def test_invalid_topk_has_stable_error_shape(self):
        with TestClient(create_app(lambda **_kwargs: FakePredictor())) as client:
            response = client.post(
                "/v1/predictions",
                data={"topK": "0"},
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")


if __name__ == "__main__":
    unittest.main()
