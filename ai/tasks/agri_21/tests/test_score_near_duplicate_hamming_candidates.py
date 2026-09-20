import csv
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.audit_near_duplicates_by_hamming import CANDIDATE_FIELDS
from ai.tasks.agri_21.scripts.assign_group_ids import write_csv
from ai.tasks.agri_21.scripts.score_near_duplicate_hamming_candidates import (
    score_near_duplicate_hamming_candidates,
)


class ScoreNearDuplicateHammingCandidatesTest(unittest.TestCase):
    def test_keeps_high_confidence_and_cross_label_review_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            output_dir = Path(temporary_dir) / "v1.1"
            images_dir = output_dir / "images"
            reports_dir = output_dir / "reports"
            images_dir.mkdir(parents=True)
            reports_dir.mkdir(parents=True)

            Image.new("L", (64, 64), 100).save(images_dir / "same-a.png")
            Image.new("L", (64, 64), 100).save(images_dir / "same-b.png")
            Image.new("L", (64, 64), 0).save(images_dir / "different-a.png")
            Image.new("L", (64, 64), 255).save(images_dir / "different-b.png")
            write_csv(
                reports_dir / "near_duplicate_hamming_candidates.csv",
                CANDIDATE_FIELDS,
                [
                    self.make_candidate(
                        "same_label", "same-a.png", "same-b.png"
                    ),
                    self.make_candidate(
                        "cross_label_same_plant",
                        "different-a.png",
                        "different-b.png",
                    ),
                ],
            )

            result = score_near_duplicate_hamming_candidates(output_dir)

            self.assertEqual(result["high_confidence_group_pairs"], 1)
            self.assertEqual(result["review_rows_written"], 2)
            with (
                reports_dir / "near_duplicate_hamming_similarity_review.csv"
            ).open(encoding="utf-8-sig", newline="") as report_file:
                rows = list(csv.DictReader(report_file))
            self.assertEqual(
                [row["similarity_decision"] for row in rows],
                ["high_confidence_near_duplicate", "insufficient_similarity"],
            )

    @staticmethod
    def make_candidate(
        relationship: str,
        left_path: str,
        right_path: str,
    ) -> dict[str, object]:
        return {
            "hamming_distance": 1,
            "review_priority": 1,
            "relationship": relationship,
            "left_group_id": f"group-{left_path}",
            "right_group_id": f"group-{right_path}",
            "left_compound_label": "Plant___A",
            "right_compound_label": (
                "Plant___A" if relationship == "same_label" else "Plant___B"
            ),
            "left_group_size": 1,
            "right_group_size": 1,
            "left_dhash": "0000000000000000",
            "right_dhash": "0000000000000001",
            "left_sample_path": left_path,
            "right_sample_path": right_path,
        }


if __name__ == "__main__":
    unittest.main()
