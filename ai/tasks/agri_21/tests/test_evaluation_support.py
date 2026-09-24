import unittest

from ai.utils.evaluation_support import find_low_support_classes


class EvaluationSupportTests(unittest.TestCase):
    def test_flags_only_classes_below_minimum_support(self) -> None:
        mapping = {
            0: {
                "plant": "Lua",
                "disease": "Khoe_manh",
                "compound_label": "Lua___Khoe_manh",
            },
            1: {
                "plant": "Xoai",
                "disease": "bo_cat_la",
                "compound_label": "Xoai___bo_cat_la",
            },
        }
        targets = [0] * 20 + [1] * 8

        low_support = find_low_support_classes(targets, mapping, minimum_samples=20)

        self.assertEqual(low_support, [("Xoai___bo_cat_la", 8)])

    def test_supports_task_specific_label_mapping(self) -> None:
        mapping = {
            0: {"label": "Ca_chua", "target_field": "plant"},
            1: {"label": "Lua", "target_field": "plant"},
        }
        targets = [0] * 20 + [1] * 3

        low_support = find_low_support_classes(targets, mapping, minimum_samples=20)

        self.assertEqual(low_support, [("Lua", 3)])


if __name__ == "__main__":
    unittest.main()
