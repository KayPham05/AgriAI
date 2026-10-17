import unittest

import numpy as np

from ai.utils.metrics import compute_metrics, get_top_confusions


class RuntimeMetricsTests(unittest.TestCase):
    def test_compute_metrics_reports_balanced_accuracy(self) -> None:
        metrics = compute_metrics(
            y_true=[0, 0, 0, 1],
            y_pred=[0, 0, 0, 0],
        )

        self.assertEqual(metrics["accuracy"], 0.75)
        self.assertEqual(metrics["balanced_accuracy"], 0.5)

    def test_top_confusions_excludes_diagonal_and_sorts_by_count(self) -> None:
        matrix = np.array(
            [
                [8, 3, 1],
                [2, 7, 0],
                [0, 4, 6],
            ]
        )

        rows = get_top_confusions(matrix, ["A", "B", "C"], limit=3)

        self.assertEqual(
            rows,
            [
                {"actual": "C", "predicted": "B", "count": 4},
                {"actual": "A", "predicted": "B", "count": 3},
                {"actual": "B", "predicted": "A", "count": 2},
            ],
        )


if __name__ == "__main__":
    unittest.main()
