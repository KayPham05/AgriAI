import csv
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from ai.data.dataset import (
    compute_class_weights,
    create_dataloaders,
    load_manifest_splits,
)


FIELDNAMES = [
    "image_path",
    "plant",
    "condition",
    "compound_label",
    "status",
    "group_id",
    "split",
]


class ManifestDatasetTests(unittest.TestCase):
    def _make_dataset(self, root: Path) -> None:
        (root / "images").mkdir(parents=True)
        (root / "manifests").mkdir()
        labels = (("Cay_a", "Benh_a"), ("Cay_b", "Khoe_manh"))
        for split in ("train", "val", "test"):
            rows = []
            for index, (plant, condition) in enumerate(labels):
                relative_path = Path(plant) / condition / f"{split}_{index}.jpg"
                image_path = root / "images" / relative_path
                image_path.parent.mkdir(parents=True, exist_ok=True)
                Image.new("RGB", (8, 8), (index * 100, 20, 30)).save(image_path)
                rows.append(
                    {
                        "image_path": relative_path.as_posix(),
                        "plant": plant,
                        "condition": condition,
                        "compound_label": f"{plant}___{condition}",
                        "status": "valid",
                        "group_id": f"{split}-group-{index}",
                        "split": split,
                    }
                )
            self._write_manifest(root, split, rows)

    @staticmethod
    def _write_manifest(root: Path, split: str, rows: list[dict[str, str]]) -> None:
        with (root / "manifests" / f"{split}.csv").open(
            "w", encoding="utf-8", newline=""
        ) as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
            writer.writerows(rows)

    @staticmethod
    def _read_manifest(root: Path, split: str) -> list[dict[str, str]]:
        with (root / "manifests" / f"{split}.csv").open(
            "r", encoding="utf-8", newline=""
        ) as handle:
            return list(csv.DictReader(handle))

    def test_loads_exact_manifest_membership_and_stable_labels(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)

            records, class_to_idx, idx_to_info = load_manifest_splits(root)

            self.assertEqual(
                {split: len(rows) for split, rows in records.items()},
                {"train": 2, "val": 2, "test": 2},
            )
            self.assertEqual(
                class_to_idx,
                {"Cay_a___Benh_a": 0, "Cay_b___Khoe_manh": 1},
            )
            self.assertEqual(idx_to_info[0]["plant"], "Cay_a")
            self.assertEqual(
                {row["image_path"] for row in records["test"]},
                {"Cay_a/Benh_a/test_0.jpg", "Cay_b/Khoe_manh/test_1.jpg"},
            )

    def test_loads_plant_and_disease_targets_from_same_manifests(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)

            plant_records, plant_to_idx, _ = load_manifest_splits(
                root,
                target_field="plant",
            )
            disease_records, disease_to_idx, _ = load_manifest_splits(
                root,
                target_field="condition",
            )

            self.assertEqual(plant_to_idx, {"Cay_a": 0, "Cay_b": 1})
            self.assertEqual(disease_to_idx, {"Benh_a": 0, "Khoe_manh": 1})
            self.assertEqual(plant_records["train"][1]["label_idx"], 1)
            self.assertEqual(disease_records["train"][1]["label_idx"], 1)

    def test_rejects_group_leakage_between_manifests(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)
            rows = self._read_manifest(root, "val")
            rows[0]["group_id"] = "train-group-0"
            self._write_manifest(root, "val", rows)

            with self.assertRaisesRegex(ValueError, "Rò rỉ group_id"):
                load_manifest_splits(root)

    def test_allows_multi_label_group_within_one_split(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)
            rows = self._read_manifest(root, "train")
            rows[1]["group_id"] = rows[0]["group_id"]
            self._write_manifest(root, "train", rows)

            records, _, _ = load_manifest_splits(root)

            self.assertEqual(len(records["train"]), 2)

    def test_rejects_row_with_wrong_split(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)
            rows = self._read_manifest(root, "test")
            rows[0]["split"] = "train"
            self._write_manifest(root, "test", rows)

            with self.assertRaisesRegex(ValueError, "phải là 'test'"):
                load_manifest_splits(root)

    def test_dataloaders_keep_manifest_membership(self) -> None:
        class FakeDataLoader:
            def __init__(self, dataset, **options):
                self.dataset = dataset
                self.options = options

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._make_dataset(root)
            fake_config = types.SimpleNamespace(
                DATASET_DIR=root,
                LABEL_MAP_PATH=root / "class_to_idx.json",
                BATCH_SIZE=2,
                NUM_WORKERS=0,
                PIN_MEMORY=False,
            )
            fake_modules = {
                "torch": types.ModuleType("torch"),
                "torch.utils": types.ModuleType("torch.utils"),
                "torch.utils.data": types.ModuleType("torch.utils.data"),
                "ai.configs": types.ModuleType("ai.configs"),
                "ai.data.augmentations": types.ModuleType(
                    "ai.data.augmentations"
                ),
            }
            fake_modules["torch.utils.data"].DataLoader = FakeDataLoader
            fake_modules["ai.configs"].config = fake_config
            fake_modules[
                "ai.data.augmentations"
            ].get_train_transforms = lambda: None
            fake_modules["ai.data.augmentations"].get_val_transforms = lambda: None

            with patch.dict(sys.modules, fake_modules):
                train, val, test, num_classes, _ = create_dataloaders()

            self.assertEqual(
                [len(train.dataset), len(val.dataset), len(test.dataset)],
                [2, 2, 2],
            )
            self.assertTrue(train.options["shuffle"])
            self.assertFalse(val.options["shuffle"])
            self.assertFalse(test.options["shuffle"])
            self.assertEqual(num_classes, 2)
            with fake_config.LABEL_MAP_PATH.open("r", encoding="utf-8") as handle:
                self.assertEqual(len(json.load(handle)["class_to_idx"]), 2)

    def test_class_weights_are_computed_from_training_records(self) -> None:
        records = [
            {"label_idx": 0},
            {"label_idx": 0},
            {"label_idx": 0},
            {"label_idx": 1},
        ]

        weights = compute_class_weights(records, num_classes=2)

        self.assertEqual(weights, [2 / 3, 2.0])


if __name__ == "__main__":
    unittest.main()
