import json
import tempfile
import unittest
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, read_csv, write_csv
from ai.tasks.agri_21.scripts.split_dataset_by_group import split_dataset_by_group


class SplitDatasetByGroupTest(unittest.TestCase):
    def test_split_is_group_aware_complete_and_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
            metadata_path = output_dir / "metadata" / "dataset_version.json"
            manifest_path.parent.mkdir(parents=True)
            metadata_path.parent.mkdir(parents=True)

            rows = []
            for label in ("Plant___A", "Plant___B"):
                for group_index in range(10):
                    group_size = 2 if group_index < 3 else 1
                    for member_index in range(group_size):
                        rows.append(
                            self.make_row(
                                label,
                                f"{label}-{group_index}",
                                member_index,
                            )
                        )
            write_csv(manifest_path, MANIFEST_FIELDS, rows)
            metadata_path.write_text(
                json.dumps(
                    {
                        "stage": "hamming_near_duplicate_review_complete"
                    }
                ),
                encoding="utf-8",
            )

            result = split_dataset_by_group(output_dir, seed=7)

            manifest_rows = read_csv(manifest_path)
            splits_by_group: dict[str, set[str]] = {}
            for row in manifest_rows:
                splits_by_group.setdefault(row["group_id"], set()).add(row["split"])
            self.assertTrue(all(len(splits) == 1 for splits in splits_by_group.values()))
            self.assertEqual(set(row["split"] for row in manifest_rows), {"train", "val", "test"})
            self.assertEqual(sum(result["image_counts"].values()), len(rows))
            self.assertEqual(result["leakage_groups"], 0)
            self.assertEqual(len(read_csv(output_dir / "manifests/train.csv")), result["image_counts"]["train"])
            self.assertEqual(len(read_csv(output_dir / "reports/split_leakage_check.csv")), 0)
            self.assertTrue(
                (
                    output_dir
                    / "reports/step5_backup_before_split/dataset_manifest.csv"
                ).is_file()
            )

    @staticmethod
    def make_row(
        compound_label: str,
        group_id: str,
        member_index: int,
    ) -> dict[str, object]:
        plant, condition = compound_label.split("___", maxsplit=1)
        image_path = f"{plant}/{condition}/{group_id}-{member_index}.jpg"
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
            "sha256": f"sha-{group_id}-{member_index}",
            "phash": f"hash-{group_id}",
            "quality_flags": "",
            "status": "valid",
            "rejection_reason": "",
            "group_id": group_id,
            "split": "",
        }


if __name__ == "__main__":
    unittest.main()
