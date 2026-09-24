import unittest

from ai.configs.classification_tasks import get_task_config


class ClassificationTaskConfigTests(unittest.TestCase):
    def test_plant_and_disease_tasks_have_expected_labels(self) -> None:
        plant = get_task_config("plant")
        disease = get_task_config("disease")

        self.assertEqual(plant.target_field, "plant")
        self.assertEqual(plant.expected_num_classes, 10)
        self.assertFalse(plant.use_class_weights)
        self.assertEqual(disease.target_field, "condition")
        self.assertEqual(disease.expected_num_classes, 45)
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


if __name__ == "__main__":
    unittest.main()
