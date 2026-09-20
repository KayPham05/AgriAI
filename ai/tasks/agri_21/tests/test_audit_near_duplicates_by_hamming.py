import csv
import json
import tempfile
import unittest
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, write_csv
from ai.tasks.agri_21.scripts.audit_near_duplicates_by_hamming import (
    audit_near_duplicates_by_hamming,
    hamming_distance,
)


class AuditNearDuplicatesByHammingTest(unittest.TestCase):
    def test_reports_nearby_groups_without_changing_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
            metadata_path = output_dir / "metadata" / "dataset_version.json"
            manifest_path.parent.mkdir(parents=True)
            metadata_path.parent.mkdir(parents=True)

            rows = [
                self.make_row("a.jpg", "Plant___A", "group-a", "0000000000000000"),
                self.make_row("b.jpg", "Plant___A", "group-b", "0000000000000001"),
                self.make_row("c.jpg", "Plant___B", "group-c", "0000000000000003"),
                self.make_row("d.jpg", "Other___A", "group-d", "ffffffffffffffff"),
            ]
            write_csv(manifest_path, MANIFEST_FIELDS, rows)
            metadata_path.write_text(
                json.dumps(
                    {
                        "stage": "group_ids_assigned_and_near_duplicate_conflicts_quarantined"
                    }
                ),
                encoding="utf-8",
            )
            original_manifest = manifest_path.read_bytes()

            result = audit_near_duplicates_by_hamming(output_dir, max_distance=2)

            self.assertEqual(hamming_distance(0, 3), 2)
            self.assertEqual(result["candidate_group_pairs"], 3)
            self.assertEqual(
                result["relationship_counts"],
                {"cross_label_same_plant": 2, "same_label": 1},
            )
            self.assertEqual(manifest_path.read_bytes(), original_manifest)

            candidate_path = (
                output_dir / "reports" / "near_duplicate_hamming_candidates.csv"
            )
            with candidate_path.open(encoding="utf-8-sig", newline="") as report_file:
                candidates = list(csv.DictReader(report_file))
            self.assertEqual(
                sorted(int(row["hamming_distance"]) for row in candidates),
                [1, 1, 2],
            )

    @staticmethod
    def make_row(
        image_path: str,
        compound_label: str,
        group_id: str,
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
            "sha256": f"sha-{group_id}",
            "phash": dhash,
            "quality_flags": "",
            "status": "valid",
            "rejection_reason": "",
            "group_id": group_id,
            "split": "",
        }


if __name__ == "__main__":
    unittest.main()
