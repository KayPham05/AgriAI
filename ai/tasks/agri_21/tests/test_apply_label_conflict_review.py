import shutil
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.apply_label_conflict_review import apply_label_conflict_review
from ai.tasks.agri_21.scripts.audit_dataset import audit_dataset, calculate_sha256
from ai.tasks.agri_21.scripts.build_exact_dedup_dataset import build_exact_dedup_dataset


class ApplyLabelConflictReviewTest(unittest.TestCase):
    def test_resolves_one_group_and_keeps_one_quarantined(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            dataset_dir = root / "dataset"
            directories = [dataset_dir / "Plant" / name for name in "ABCD"]
            for directory in directories:
                directory.mkdir(parents=True)

            first = directories[0] / "first.jpg"
            Image.new("RGB", (256, 256), "red").save(first)
            shutil.copy2(first, directories[1] / "first.jpg")
            second = directories[2] / "second.jpg"
            Image.new("RGB", (256, 256), "blue").save(second)
            shutil.copy2(second, directories[3] / "second.jpg")

            audit_dir = root / "audit"
            audit_dataset(dataset_dir, audit_dir, workers=1, progress_interval=0)
            output_dir = root / "v1.1"
            build_exact_dedup_dataset(
                dataset_dir,
                audit_dir / "manifests" / "dataset_manifest.csv",
                output_dir,
                progress_interval=0,
            )

            conflicts = {path.name: path for path in [first, second]}
            decisions = []
            for name, path in conflicts.items():
                decisions.append(
                    {
                        "sha256": calculate_sha256(path),
                        "decision": (
                            "resolved"
                            if name == "first.jpg"
                            else "keep_quarantined"
                        ),
                        "chosen_label": "Plant___A" if name == "first.jpg" else "",
                        "confidence": "high" if name == "first.jpg" else "low",
                        "rationale": "test",
                    }
                )

            summary = apply_label_conflict_review(
                dataset_dir, output_dir, decisions
            )

            self.assertEqual(summary["copied_files"], 1)
            self.assertEqual(summary["resolved_hashes"], 1)
            self.assertEqual(summary["quarantined_hashes"], 1)
            self.assertTrue(
                (output_dir / "images" / "Plant" / "A" / "first.jpg").is_file()
            )
            self.assertTrue(
                (output_dir / "reports" / "label_conflict_review.csv").is_file()
            )


if __name__ == "__main__":
    unittest.main()
