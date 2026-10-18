import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ai.tasks.agri_21.scripts.resolve_v1_3_near_duplicate_leakage import (
    RollbackIncompleteError,
    build_components,
    build_resolution,
    namespace_source_v1_2_audit,
    replace_files_transactionally,
)


class ResolveV13NearDuplicateLeakageTests(unittest.TestCase):
    def test_build_resolution_merges_same_label_pair_into_one_split(self) -> None:
        rows = [
            self._row("left.jpg", "group-left", "train"),
            self._row("right.jpg", "group-right", "val"),
        ]
        review_rows = [
            {
                "left_group_id": "group-left",
                "right_group_id": "group-right",
                "left_image_path": "left.jpg",
                "right_image_path": "right.jpg",
                "relationship": "same_label",
                "decision": "high_confidence_near_duplicate",
            }
        ]

        updated, mapping, moves = build_resolution(rows, review_rows)

        self.assertEqual(len({row["group_id"] for row in updated}), 1)
        self.assertEqual(len({row["split"] for row in updated}), 1)
        self.assertEqual(len(mapping), 2)
        self.assertEqual(len(moves), 1)

    def test_rejects_cross_label_review(self) -> None:
        review_rows = [
            {
                "left_group_id": "left",
                "right_group_id": "right",
                "relationship": "cross_label",
                "decision": "high_confidence_near_duplicate",
            }
        ]

        with self.assertRaisesRegex(ValueError, "khác nhãn"):
            build_components(review_rows)

    def test_transaction_rolls_back_replaced_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            destinations = [root / "first.txt", root / "second.txt"]
            sources = [root / "first.new", root / "second.new"]
            backups = [root / "first.backup", root / "second.backup"]
            for destination, source, backup in zip(destinations, sources, backups):
                destination.write_text("old", encoding="utf-8")
                source.write_text("new", encoding="utf-8")
                backup.write_text("old", encoding="utf-8")

            from ai.tasks.agri_21.scripts import (
                resolve_v1_3_near_duplicate_leakage as resolver,
            )

            real_replace = resolver.os.replace
            call_count = 0

            def fail_second_replace(source: Path, destination: Path) -> None:
                nonlocal call_count
                call_count += 1
                if call_count == 2:
                    raise OSError("simulated replace failure")
                real_replace(source, destination)

            with patch.object(
                resolver.os,
                "replace",
                side_effect=fail_second_replace,
            ):
                with self.assertRaisesRegex(OSError, "simulated replace failure"):
                    replace_files_transactionally(
                        list(zip(sources, destinations)),
                        dict(zip(destinations, backups)),
                    )

            self.assertEqual(
                [path.read_text(encoding="utf-8") for path in destinations],
                ["old", "old"],
            )

    def test_reports_incomplete_rollback_separately(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = root / "first.txt"
            second = root / "second.txt"
            first.write_text("old", encoding="utf-8")
            second.write_text("old", encoding="utf-8")
            first_new = root / "first.new"
            second_new = root / "second.new"
            first_new.write_text("new", encoding="utf-8")
            second_new.write_text("new", encoding="utf-8")
            first_backup = root / "first.backup"
            second_backup = root / "second.backup"
            first_backup.write_text("old", encoding="utf-8")
            second_backup.write_text("old", encoding="utf-8")

            from ai.tasks.agri_21.scripts import (
                resolve_v1_3_near_duplicate_leakage as resolver,
            )

            real_replace = resolver.os.replace
            call_count = 0

            def fail_apply_and_rollback(source: Path, destination: Path) -> None:
                nonlocal call_count
                call_count += 1
                if call_count in {2, 3}:
                    raise OSError("simulated failure")
                real_replace(source, destination)

            with patch.object(
                resolver.os,
                "replace",
                side_effect=fail_apply_and_rollback,
            ):
                with self.assertRaises(RollbackIncompleteError):
                    replace_files_transactionally(
                        [(first_new, first), (second_new, second)],
                        {first: first_backup, second: second_backup},
                    )

    def test_namespaces_inherited_v1_2_metrics(self) -> None:
        metadata = {
            "dataset_version": "v1.3",
            "post_resize_final_dhash_cross_split_count": 555,
        }

        namespace_source_v1_2_audit(metadata)

        self.assertNotIn("post_resize_final_dhash_cross_split_count", metadata)
        self.assertEqual(
            metadata["source_v1_2_pipeline_audit"][
                "post_resize_final_dhash_cross_split_count"
            ],
            555,
        )

    @staticmethod
    def _row(image_path: str, group_id: str, split: str) -> dict[str, str]:
        return {
            "image_path": image_path,
            "plant": "Xoai",
            "condition": "bo_cat_la",
            "compound_label": "Xoai___bo_cat_la",
            "sha256": image_path,
            "group_id": group_id,
            "split": split,
            "quality_flags": "",
        }


if __name__ == "__main__":
    unittest.main()
