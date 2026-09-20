import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import (
    ASSIGNMENT_FIELDS,
    GROUP_SUMMARY_FIELDS,
    MANIFEST_FIELDS,
    read_csv,
    write_csv,
)
from ai.tasks.agri_21.scripts.quarantine_near_duplicate_label_conflicts import (
    quarantine_near_duplicate_label_conflicts,
)


class QuarantineNearDuplicateLabelConflictsTest(unittest.TestCase):
    def test_quarantines_both_labels_without_losing_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            reports_dir = output_dir / "reports"
            manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
            metadata_path = output_dir / "metadata" / "dataset_version.json"
            manifest_path.parent.mkdir(parents=True)
            metadata_path.parent.mkdir(parents=True)
            reports_dir.mkdir(parents=True)

            rows = [
                self.make_row(output_dir, "Ot/Vang/a.jpg", "Ot___Vang_la", b"a"),
                self.make_row(output_dir, "Ot/Xoan/b.jpg", "Ot___Xoan_la", b"b"),
                self.make_row(output_dir, "Ot/Khoe/c.jpg", "Ot___Khoe_manh", b"c"),
            ]
            write_csv(manifest_path, MANIFEST_FIELDS, rows)
            write_csv(
                reports_dir / "group_id_assignments.csv",
                ASSIGNMENT_FIELDS,
                [
                    {
                        "image_path": row["image_path"],
                        "compound_label": row["compound_label"],
                        "sha256": row["sha256"],
                        "dhash": row["phash"],
                        "group_id": row["group_id"],
                        "group_size": 2 if row["group_id"] == "group-conflict" else 1,
                        "grouping_rule": "reviewed_dhash_cross_label" if row["group_id"] == "group-conflict" else "singleton_sha256",
                    }
                    for row in rows
                ],
            )
            write_csv(
                reports_dir / "group_summary.csv",
                GROUP_SUMMARY_FIELDS,
                [
                    {
                        "group_id": "group-conflict",
                        "group_size": 2,
                        "compound_labels": "Ot___Vang_la;Ot___Xoan_la",
                        "dhash": "same-dhash",
                        "grouping_rule": "reviewed_dhash_cross_label",
                    },
                    {
                        "group_id": "group-single",
                        "group_size": 1,
                        "compound_labels": "Ot___Khoe_manh",
                        "dhash": "unique",
                        "grouping_rule": "singleton_sha256",
                    },
                ],
            )
            distribution_fields = [
                "plant",
                "condition",
                "compound_label",
                "source_files",
                "copied_files",
            ]
            write_csv(
                reports_dir / "class_distribution.csv",
                distribution_fields,
                [
                    {
                        "plant": "Ot",
                        "condition": condition,
                        "compound_label": label,
                        "source_files": 1,
                        "copied_files": 1,
                    }
                    for condition, label in (
                        ("Vang_la", "Ot___Vang_la"),
                        ("Xoan_la", "Ot___Xoan_la"),
                        ("Khoe_manh", "Ot___Khoe_manh"),
                    )
                ],
            )
            metadata_path.write_text(
                json.dumps({"stage": "group_ids_assigned"}), encoding="utf-8"
            )

            result = quarantine_near_duplicate_label_conflicts(
                output_dir, {"group-conflict"}
            )

            active_rows = read_csv(manifest_path)
            self.assertEqual([row["image_path"] for row in active_rows], ["Ot/Khoe/c.jpg"])
            self.assertEqual(result["quarantined_files"], 2)
            self.assertFalse((output_dir / "images" / "Ot/Vang/a.jpg").exists())
            self.assertTrue(
                (
                    output_dir
                    / "quarantine/near_duplicate_label_conflicts/Ot/Vang/a.jpg"
                ).is_file()
            )
            self.assertEqual(
                len(read_csv(reports_dir / "near_duplicate_label_quarantine.csv")),
                2,
            )
            self.assertTrue(
                (
                    reports_dir
                    / "step3_backup_before_near_duplicate_quarantine"
                    / "dataset_manifest.csv"
                ).is_file()
            )

    @staticmethod
    def make_row(
        output_dir: Path,
        image_path: str,
        compound_label: str,
        content: bytes,
    ) -> dict[str, object]:
        file_path = output_dir / "images" / image_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        sha256 = hashlib.sha256(content).hexdigest()
        plant, condition = compound_label.split("___", maxsplit=1)
        is_conflict = condition in {"Vang_la", "Xoan_la"}
        return {
            "image_path": image_path,
            "plant": plant,
            "condition": condition,
            "compound_label": compound_label,
            "extension": ".jpg",
            "image_format": "JPEG",
            "width": 100,
            "height": 100,
            "file_size": len(content),
            "sha256": sha256,
            "phash": "same-dhash" if is_conflict else "unique",
            "quality_flags": "near_duplicate_label_conflict_reviewed" if is_conflict else "",
            "status": "valid",
            "rejection_reason": "",
            "group_id": "group-conflict" if is_conflict else "group-single",
            "split": "",
        }


if __name__ == "__main__":
    unittest.main()
