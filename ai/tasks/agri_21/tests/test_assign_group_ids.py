import csv
import json
import tempfile
import unittest
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import (
    MANIFEST_FIELDS,
    assign_group_ids,
    write_csv,
)


class AssignGroupIdsTest(unittest.TestCase):
    def test_assigns_groups_and_applies_cross_label_reviews(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
            metadata_path = output_dir / "metadata" / "dataset_version.json"
            manifest_path.parent.mkdir(parents=True)
            metadata_path.parent.mkdir(parents=True)

            rows = [
                self.make_row("a1.jpg", "Plant___A", "sha-a1", "same-a"),
                self.make_row("a2.jpg", "Plant___A", "sha-a2", "same-a"),
                self.make_row("b1.jpg", "Plant___B", "sha-b1", "single"),
                self.make_row("a3.jpg", "Plant___A", "sha-a3", "merge"),
                self.make_row("b2.jpg", "Plant___B", "sha-b2", "merge"),
                self.make_row("a4.jpg", "Plant___A", "sha-a4", "separate"),
                self.make_row("a5.jpg", "Plant___A", "sha-a5", "separate"),
                self.make_row("b3.jpg", "Plant___B", "sha-b3", "separate"),
            ]
            write_csv(manifest_path, MANIFEST_FIELDS, rows)
            metadata_path.write_text(
                json.dumps(
                    {"stage": "exact_dedup_and_label_conflict_review"}
                ),
                encoding="utf-8",
            )

            summary = assign_group_ids(
                output_dir,
                {
                    "merge": {
                        "decision": "merge_across_labels",
                        "rationale": "test merge",
                    },
                    "separate": {
                        "decision": "keep_labels_separate",
                        "rationale": "test separate",
                    },
                },
            )

            assigned = self.read_by_path(manifest_path)
            self.assertEqual(assigned["a1.jpg"]["group_id"], assigned["a2.jpg"]["group_id"])
            self.assertEqual(assigned["a3.jpg"]["group_id"], assigned["b2.jpg"]["group_id"])
            self.assertEqual(assigned["a4.jpg"]["group_id"], assigned["a5.jpg"]["group_id"])
            self.assertNotEqual(assigned["a4.jpg"]["group_id"], assigned["b3.jpg"]["group_id"])
            self.assertEqual(assigned["b1.jpg"]["group_id"], "sha256:sha-b1")
            self.assertIn(
                "near_duplicate_label_conflict_reviewed",
                assigned["a3.jpg"]["quality_flags"],
            )
            self.assertEqual(summary["files"], 8)
            self.assertEqual(summary["cross_label_groups"], 1)
            self.assertTrue(
                (output_dir / "reports" / "group_id_assignments.csv").is_file()
            )
            self.assertTrue(
                (
                    output_dir
                    / "reports"
                    / "step2_backup_before_grouping"
                    / "dataset_manifest.csv"
                ).is_file()
            )
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["stage"], "group_ids_assigned")

    @staticmethod
    def make_row(
        image_path: str,
        compound_label: str,
        sha256: str,
        dhash: str,
    ) -> dict[str, object]:
        plant, condition = compound_label.split("___", maxsplit=1)
        return {
            "image_path": image_path,
            "plant": plant,
            "condition": condition,
            "compound_label": compound_label,
            "extension": ".jpg",
            "image_format": "JPEG",
            "width": 256,
            "height": 256,
            "file_size": 1,
            "sha256": sha256,
            "phash": dhash,
            "quality_flags": "",
            "status": "valid",
            "rejection_reason": "",
            "group_id": f"sha256:{sha256}",
            "split": "",
        }

    @staticmethod
    def read_by_path(path: Path) -> dict[str, dict[str, str]]:
        with path.open(encoding="utf-8-sig", newline="") as input_file:
            return {
                row["image_path"]: row for row in csv.DictReader(input_file)
            }


if __name__ == "__main__":
    unittest.main()
