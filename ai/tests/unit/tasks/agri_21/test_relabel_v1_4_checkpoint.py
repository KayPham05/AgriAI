import csv
import tempfile
import unittest
from pathlib import Path

import torch

from ai.tasks.agri_21.scripts.relabel_v1_4_checkpoint import (
    BIAS_KEY,
    WEIGHT_KEY,
    convert_checkpoint,
    translated_label,
)


class RelabelV14CheckpointTest(unittest.TestCase):
    def test_output_rows_follow_new_sorted_label_mapping(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            labels = [f"Cay___Benh_{index:02d}" for index in range(53)] + [
                "Ot___Bacterial_Spot",
                "Ot___Cercospora_Leaf_Spot",
                "Ot___Curl_Virus",
                "Ot___Healthy_Leaf",
                "Ot___Nutrition_Deficiency",
                "Ot___Powdery_Mildew",
            ]
            old_labels = sorted(labels)
            old_mapping = {label: index for index, label in enumerate(old_labels)}
            dataset_dir = root / "dataset"
            manifest = dataset_dir / "manifests" / "dataset_manifest.csv"
            manifest.parent.mkdir(parents=True)
            with manifest.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["compound_label"])
                writer.writeheader()
                writer.writerows(
                    {"compound_label": translated_label(label)} for label in old_labels
                )

            source = root / "old.pth"
            output = root / "new.pth"
            torch.save(
                {
                    "task": "compound",
                    "target_field": "compound_label",
                    "class_to_idx": old_mapping,
                    "model_state_dict": {
                        WEIGHT_KEY: torch.arange(59).reshape(59, 1).float(),
                        BIAS_KEY: torch.arange(59).float(),
                    },
                    "class_weights": list(range(59)),
                    "optimizer_state_dict": {"old": True},
                },
                source,
            )
            convert_checkpoint(source, dataset_dir, output)
            converted = torch.load(output, map_location="cpu", weights_only=False)

            self.assertEqual(len(converted["class_to_idx"]), 59)
            for old_label, old_index in old_mapping.items():
                new_index = converted["class_to_idx"][translated_label(old_label)]
                self.assertEqual(converted["model_state_dict"][WEIGHT_KEY][new_index, 0], old_index)
                self.assertEqual(converted["model_state_dict"][BIAS_KEY][new_index], old_index)
                self.assertEqual(converted["class_weights"][new_index], old_index)
            self.assertNotIn("optimizer_state_dict", converted)


if __name__ == "__main__":
    unittest.main()
