import io
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from ai.configs.plant_disease_mapping import get_plant_to_diseases
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


class ThreePlantPredictor(FakePredictor):
    def predict_image(self, image_path, top_k=3):
        result = super().predict_image(image_path, top_k)
        groups = []
        for plant, confidence in (("Ca_chua", 80.0), ("Ot", 15.0), ("Ca_phe", 5.0)):
            diseases = [
                {"disease": label, "confidence": score}
                for label, score in zip(
                    sorted(get_plant_to_diseases("v1.4")[plant])[:3],
                    (60.0, 30.0, 10.0),
                )
            ]
            groups.append({"plant": plant, "confidence": confidence, "diseases": diseases})
        result.update(
            plant=groups[0]["plant"],
            plant_confidence=groups[0]["confidence"],
            disease=groups[0]["diseases"][0]["disease"],
            disease_confidence=groups[0]["diseases"][0]["confidence"],
            top_plant_predictions=[
                {"plant": group["plant"], "confidence": group["confidence"]}
                for group in groups
            ],
            top_disease_predictions=groups[0]["diseases"],
            plant_disease_predictions=groups,
        )
        return result


class InferenceServiceTests(unittest.TestCase):
    def test_both_apis_include_three_plants_with_three_diseases_each(self):
        with TestClient(create_app(lambda **_kwargs: ThreePlantPredictor())) as client:
            backend_response = client.post(
                "/predict", files={"file": ("leaf.jpg", make_image(), "image/jpeg")}
            )
            model_response = client.post(
                "/v1/predictions",
                files={"image": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(backend_response.status_code, 200)
        self.assertEqual(model_response.status_code, 200)
        backend = backend_response.json()
        groups = backend["plant_predictions"]
        self.assertEqual([group["plant"] for group in groups], ["Ca_chua", "Ot", "Ca_phe"])
        self.assertEqual([len(group["diseases"]) for group in groups], [3, 3, 3])
        self.assertEqual(backend["top_k"], groups[0]["diseases"])
        self.assertEqual(backend["class_name"], groups[0]["diseases"][0]["class_name"])
        model_groups = model_response.json()["topPlantPredictions"]
        self.assertEqual([len(group["diseases"]) for group in model_groups], [3, 3, 3])
        self.assertEqual([group["label"] for group in model_groups], ["Ca_chua", "Ot", "Ca_phe"])

    def test_backend_contract_uses_compound_label_and_unit_confidence(self):
        labels = sorted(
            f"{plant}___{disease}"
            for plant, diseases in get_plant_to_diseases("v1.4").items()
            for disease in diseases
        )
        expected_label = "Ca_chua___Chay_la_som"
        self.assertEqual(len(labels), 59)

        with TestClient(create_app(lambda **_kwargs: FakePredictor())) as client:
            self.assertEqual(client.get("/health").status_code, 200)
            response = client.post(
                "/predict",
                files={"file": ("leaf.jpg", make_image(), "application/octet-stream")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "class_index": labels.index(expected_label),
                "class_name": expected_label,
                "confidence": 0.7379,
                "top_k": [
                    {
                        "class_index": labels.index(expected_label),
                        "class_name": expected_label,
                        "confidence": 0.7379,
                    }
                ],
                "plant_predictions": [
                    {
                        "plant": "Ca_chua",
                        "confidence": 0.9174,
                        "diseases": [
                            {
                                "class_index": labels.index(expected_label),
                                "class_name": expected_label,
                                "confidence": 0.7379,
                            }
                        ],
                    }
                ],
            },
        )

    def test_backend_health_and_predict_require_loaded_model(self):
        def load_model(**_kwargs):
            raise FileNotFoundError("private checkpoint path")

        with TestClient(create_app(load_model)) as client:
            self.assertEqual(client.get("/health").status_code, 503)
            response = client.post(
                "/predict",
                files={"file": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "MODEL_UNAVAILABLE")

    def test_backend_contract_rejects_unknown_compound_label(self):
        class UnknownDiseasePredictor(FakePredictor):
            def predict_image(self, image_path, top_k=3):
                result = super().predict_image(image_path, top_k)
                result["top_disease_predictions"] = [
                    {"disease": "Unknown", "confidence": 99.0}
                ]
                return result

        with TestClient(create_app(lambda **_kwargs: UnknownDiseasePredictor())) as client:
            response = client.post(
                "/predict",
                files={"file": ("leaf.jpg", make_image(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "INFERENCE_FAILED")

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
                files={"image": ("leaf.jpg", b"x" * (15 * 1024 * 1024 + 1), "image/jpeg")},
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
