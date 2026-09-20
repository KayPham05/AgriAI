import csv
import shutil
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.audit_dataset import audit_dataset


class AuditDatasetTest(unittest.TestCase):
    def test_reports_corrupt_exact_and_perceptual_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            dataset_dir = root / "dataset"
            class_dir = dataset_dir / "Tomato" / "Healthy"
            class_dir.mkdir(parents=True)

            original_path = class_dir / "original.jpg"
            Image.new("RGB", (256, 256), "red").save(original_path, quality=85)
            shutil.copyfile(original_path, class_dir / "exact_copy.jpg")
            Image.new("RGB", (256, 256), "red").save(
                class_dir / "reencoded.jpg", quality=95
            )
            (class_dir / "corrupt.jpg").write_bytes(b"not-an-image")

            output_dir = root / "output"
            summary = audit_dataset(
                dataset_dir,
                output_dir,
                dataset_version="vtest",
                workers=1,
                progress_interval=0,
            )

            self.assertEqual(summary["total_files"], 4)
            self.assertEqual(summary["valid_files"], 3)
            self.assertEqual(summary["rejected_files"], 1)
            self.assertEqual(summary["exact_duplicate_files"], 1)
            self.assertEqual(summary["perceptual_match_files"], 1)

            with (output_dir / "reports" / "duplicate_report.csv").open(
                encoding="utf-8-sig", newline=""
            ) as report_file:
                match_types = {row["match_type"] for row in csv.DictReader(report_file)}

            self.assertEqual(
                match_types, {"exact_sha256", "perceptual_hash_match"}
            )


if __name__ == "__main__":
    unittest.main()
