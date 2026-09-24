import unittest

from ai.utils.label_mapping import (
    ensure_matching_label_mappings,
    normalize_checkpoint_label_mapping,
)


class CheckpointLabelMappingTests(unittest.TestCase):
    def test_normalizes_json_string_indices(self) -> None:
        mapping = {
            "0": {
                "plant": "Lua",
                "disease": "Khoe_manh",
                "compound_label": "Lua___Khoe_manh",
            },
            "1": {
                "plant": "Xoai",
                "disease": "bo_cat_la",
                "compound_label": "Xoai___bo_cat_la",
            },
        }

        normalized = normalize_checkpoint_label_mapping(mapping, num_classes=2)

        self.assertEqual(set(normalized), {0, 1})
        self.assertEqual(normalized[1]["plant"], "Xoai")

    def test_rejects_missing_class_index(self) -> None:
        mapping = {
            0: {
                "plant": "Lua",
                "disease": "Khoe_manh",
                "compound_label": "Lua___Khoe_manh",
            }
        }

        with self.assertRaisesRegex(ValueError, "không khớp num_classes"):
            normalize_checkpoint_label_mapping(mapping, num_classes=2)

    def test_rejects_checkpoint_without_mapping(self) -> None:
        with self.assertRaisesRegex(ValueError, "thiếu idx_to_info"):
            normalize_checkpoint_label_mapping(None, num_classes=58)

    def test_rejects_evaluation_with_different_dataset_mapping(self) -> None:
        checkpoint_mapping = {
            0: {
                "plant": "Lua",
                "disease": "Khoe_manh",
                "compound_label": "Lua___Khoe_manh",
            }
        }
        dataset_mapping = {
            0: {
                "plant": "Xoai",
                "disease": "Khoe_manh",
                "compound_label": "Xoai___Khoe_manh",
            }
        }

        with self.assertRaisesRegex(ValueError, "không khớp dataset"):
            ensure_matching_label_mappings(checkpoint_mapping, dataset_mapping)


if __name__ == "__main__":
    unittest.main()
