import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from ai.tasks.agri_21.scripts.apply_hamming_near_duplicate_review import (
    apply_hamming_near_duplicate_review,
)
from ai.tasks.agri_21.scripts.audit_near_duplicates_by_hamming import CANDIDATE_FIELDS
from ai.tasks.agri_21.scripts.assign_group_ids import (
    ASSIGNMENT_FIELDS,
    GROUP_SUMMARY_FIELDS,
    MANIFEST_FIELDS,
    read_csv,
    write_csv,
)
from ai.tasks.agri_21.scripts.score_near_duplicate_hamming_candidates import SCORED_FIELDS


class ApplyHammingNearDuplicateReviewTest(unittest.TestCase):
    def test_merges_same_label_and_quarantines_wrong_label_duplicate(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            reports_dir = output_dir / "reports"
            manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
            metadata_path = output_dir / "metadata" / "dataset_version.json"
            manifest_path.parent.mkdir(parents=True)
            metadata_path.parent.mkdir(parents=True)
            reports_dir.mkdir(parents=True)

            rows = [
                self.make_row(output_dir, "Plant/A/a.jpg", "Plant___A", "group-a", b"a"),
                self.make_row(output_dir, "Plant/A/b.jpg", "Plant___A", "group-b", b"b"),
                self.make_row(output_dir, "Plant/B/c.jpg", "Plant___B", "group-c", b"c"),
                self.make_row(output_dir, "Plant/C/d.jpg", "Plant___C", "group-d", b"d"),
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
                        "group_size": 1,
                        "grouping_rule": "singleton_sha256",
                    }
                    for row in rows
                ],
            )
            write_csv(
                reports_dir / "group_summary.csv",
                GROUP_SUMMARY_FIELDS,
                [
                    {
                        "group_id": row["group_id"],
                        "group_size": 1,
                        "compound_labels": row["compound_label"],
                        "dhash": row["phash"],
                        "grouping_rule": "singleton_sha256",
                    }
                    for row in rows
                ],
            )
            write_csv(
                reports_dir / "class_distribution.csv",
                ["plant", "condition", "compound_label", "copied_files"],
                [
                    {
                        "plant": "Plant",
                        "condition": condition,
                        "compound_label": f"Plant___{condition}",
                        "copied_files": 2 if condition == "A" else 1,
                    }
                    for condition in ("A", "B", "C")
                ],
            )
            similarity_rows = [
                self.make_similarity_row(rows[0], rows[1], "same_label"),
                self.make_similarity_row(
                    rows[2], rows[3], "cross_label_same_plant"
                ),
            ]
            write_csv(
                reports_dir / "near_duplicate_hamming_candidates.csv",
                CANDIDATE_FIELDS,
                [
                    {field: row[field] for field in CANDIDATE_FIELDS}
                    for row in similarity_rows
                ],
            )
            write_csv(
                reports_dir / "near_duplicate_hamming_similarity_review.csv",
                SCORED_FIELDS,
                similarity_rows,
            )
            metadata_path.write_text(
                json.dumps(
                    {
                        "stage": "group_ids_assigned_and_near_duplicate_conflicts_quarantined"
                    }
                ),
                encoding="utf-8",
            )

            result = apply_hamming_near_duplicate_review(
                output_dir,
                {
                    tuple(sorted((rows[2]["image_path"], rows[3]["image_path"]))): {
                        "keep_path": rows[2]["image_path"],
                        "quarantine_path": rows[3]["image_path"],
                        "keep_label": rows[2]["compound_label"],
                        "rationale": "test decision",
                    }
                },
            )

            active_rows = read_csv(manifest_path)
            active_by_path = {row["image_path"]: row for row in active_rows}
            self.assertEqual(
                active_by_path[rows[0]["image_path"]]["group_id"],
                active_by_path[rows[1]["image_path"]]["group_id"],
            )
            self.assertNotIn(rows[3]["image_path"], active_by_path)
            self.assertTrue(
                (
                    output_dir
                    / "quarantine/hamming_near_duplicate_conflicts"
                    / rows[3]["image_path"]
                ).is_file()
            )
            self.assertEqual(result["quarantined_files"], 1)
            self.assertEqual(result["cross_label_groups"], 0)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["stage"], "hamming_near_duplicate_review_complete")
            self.assertTrue(
                (
                    reports_dir
                    / "step4_backup_before_hamming_review/dataset_manifest.csv"
                ).is_file()
            )

    @staticmethod
    def make_row(
        output_dir: Path,
        image_path: str,
        compound_label: str,
        group_id: str,
        content: bytes,
    ) -> dict[str, object]:
        file_path = output_dir / "images" / image_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        plant, condition = compound_label.split("___", maxsplit=1)
        return {
            "image_path": image_path,
            "plant": plant,
            "condition": condition,
            "compound_label": compound_label,
            "extension": ".jpg",
            "image_format": "JPEG",
            "width": 1,
            "height": 1,
            "file_size": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
            "phash": hashlib.sha256(content).hexdigest()[:16],
            "quality_flags": "",
            "status": "valid",
            "rejection_reason": "",
            "group_id": group_id,
            "split": "",
        }

    @staticmethod
    def make_similarity_row(
        left: dict[str, object],
        right: dict[str, object],
        relationship: str,
    ) -> dict[str, object]:
        return {
            "hamming_distance": 1,
            "review_priority": 1,
            "relationship": relationship,
            "left_group_id": left["group_id"],
            "right_group_id": right["group_id"],
            "left_compound_label": left["compound_label"],
            "right_compound_label": right["compound_label"],
            "left_group_size": 1,
            "right_group_size": 1,
            "left_dhash": left["phash"],
            "right_dhash": right["phash"],
            "left_sample_path": left["image_path"],
            "right_sample_path": right["image_path"],
            "grayscale_correlation": "1.000000",
            "normalized_mae": "0.000000",
            "similarity_decision": "high_confidence_near_duplicate",
        }


if __name__ == "__main__":
    unittest.main()
