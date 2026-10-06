import os
import subprocess
import sys
import unittest

from ai.configs import config
from ai.configs.classification_tasks import get_task_config


class ClassificationTaskConfigTests(unittest.TestCase):
    def test_plant_and_disease_tasks_have_expected_labels(self) -> None:
        self.assertEqual(config.DATASET_VERSION, "v1.4")
        plant = get_task_config("plant")
        disease = get_task_config("disease")

        self.assertEqual(plant.target_field, "plant")
        self.assertEqual(plant.expected_num_classes, 10)
        self.assertFalse(plant.use_class_weights)
        self.assertEqual(disease.target_field, "condition")
        self.assertEqual(disease.expected_num_classes, 44)
        self.assertTrue(disease.use_class_weights)

    def test_tasks_write_to_separate_artifact_directories(self) -> None:
        plant = get_task_config("plant")
        disease = get_task_config("disease")

        self.assertNotEqual(plant.checkpoint_dir, disease.checkpoint_dir)
        self.assertNotEqual(plant.output_dir, disease.output_dir)
        self.assertNotEqual(plant.tensorboard_dir, disease.tensorboard_dir)

    def test_unknown_task_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Task không hợp lệ"):
            get_task_config("unknown")

    def test_v1_4_uses_manifest_class_counts(self) -> None:
        environment = os.environ.copy()
        environment["AGRIVISION_DATASET_VERSION"] = "v1.4"
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "from ai.configs import config; "
                "from ai.configs.classification_tasks import get_task_config; "
                "print(get_task_config('disease').expected_num_classes, "
                "get_task_config('compound').expected_num_classes)",
            ],
            env=environment,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(result.stdout.strip(), "44 59")

    def test_v1_4_legacy_mapping_import_uses_current_version(self) -> None:
        environment = os.environ.copy()
        environment["AGRIVISION_DATASET_VERSION"] = "v1.4"
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "from ai.configs.plant_disease_mapping import PLANT_TO_DISEASES; "
                "print('Phan_trang' in PLANT_TO_DISEASES['Ot'], "
                "'Ruoi_trang' in PLANT_TO_DISEASES['Ot'])",
            ],
            env=environment,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(result.stdout.strip(), "True False")


if __name__ == "__main__":
    unittest.main()
