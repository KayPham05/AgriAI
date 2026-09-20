import csv
import shutil
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.audit_dataset import audit_dataset
from ai.tasks.agri_21.scripts.build_exact_dedup_dataset import build_exact_dedup_dataset


class BuildExactDedupDatasetTest(unittest.TestCase):
    def test_copies_canonical_and_quarantines_label_conflicts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            dataset_dir = root / "dataset"
            healthy_dir = dataset_dir / "Plant" / "Healthy"
            disease_a_dir = dataset_dir / "Plant" / "DiseaseA"
            disease_b_dir = dataset_dir / "Plant" / "DiseaseB"
            healthy_dir.mkdir(parents=True)
            disease_a_dir.mkdir(parents=True)
            disease_b_dir.mkdir(parents=True)

            canonical = healthy_dir / "a.jpg"
            Image.new("RGB", (256, 256), "red").save(canonical)
            shutil.copy2(canonical, healthy_dir / "b.jpg")
            Image.new("RGB", (256, 256), "blue").save(healthy_dir / "c.jpg")

            conflict = disease_a_dir / "a.jpg"
            Image.new("RGB", (256, 256), "green").save(conflict)
            shutil.copy2(conflict, disease_b_dir / "a.jpg")

            audit_dir = root / "audit"
            audit_dataset(dataset_dir, audit_dir, workers=1, progress_interval=0)
            output_dir = root / "v1.1"
            summary = build_exact_dedup_dataset(
                dataset_dir,
                audit_dir / "manifests" / "dataset_manifest.csv",
                output_dir,
                progress_interval=0,
            )

            self.assertEqual(summary["source_valid_files"], 5)
            self.assertEqual(summary["copied_files"], 2)
            self.assertEqual(summary["exact_duplicate_files_skipped"], 1)
            self.assertEqual(summary["label_conflict_files_quarantined"], 2)
            self.assertEqual(summary["label_conflict_hashes"], 1)
            self.assertTrue(
                (output_dir / "images" / "Plant" / "Healthy" / "a.jpg").is_file()
            )
            self.assertTrue(
                (output_dir / "images" / "Plant" / "Healthy" / "c.jpg").is_file()
            )

            with (output_dir / "reports" / "exact_dedup_mapping.csv").open(
                encoding="utf-8-sig", newline=""
            ) as mapping_file:
                actions = Counter(row["action"] for row in csv.DictReader(mapping_file))

            self.assertEqual(actions["copied_canonical"], 2)
            self.assertEqual(actions["skipped_exact_duplicate"], 1)
            self.assertEqual(actions["quarantined_label_conflict"], 2)


if __name__ == "__main__":
    unittest.main()
