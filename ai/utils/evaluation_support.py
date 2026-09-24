"""Helpers for interpreting per-class evaluation support."""

from __future__ import annotations

from collections import Counter


MIN_RELIABLE_TEST_SAMPLES = 20


def find_low_support_classes(
    targets: list[int],
    idx_to_info: dict[int, dict[str, str]],
    minimum_samples: int = MIN_RELIABLE_TEST_SAMPLES,
) -> list[tuple[str, int]]:
    """List classes whose test support is too small for stable per-class metrics."""

    support = Counter(targets)
    return [
        (
            idx_to_info[index].get("label")
            or idx_to_info[index]["compound_label"],
            support[index],
        )
        for index in sorted(idx_to_info)
        if support[index] < minimum_samples
    ]
