"""Validation helpers for checkpoint label mappings."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


REQUIRED_LABEL_FIELDS = {"plant", "disease", "compound_label"}


def normalize_checkpoint_label_mapping(
    raw_mapping: Mapping[Any, Any] | None,
    num_classes: int,
) -> dict[int, dict[str, str]]:
    """Return a complete integer-keyed mapping or reject an unsafe checkpoint."""

    if not isinstance(num_classes, int) or num_classes <= 0:
        raise ValueError(f"num_classes không hợp lệ: {num_classes!r}")
    if not raw_mapping:
        raise ValueError(
            "Checkpoint thiếu idx_to_info; không thể ánh xạ class index an toàn"
        )

    normalized: dict[int, dict[str, str]] = {}
    for raw_index, raw_info in raw_mapping.items():
        try:
            index = int(raw_index)
        except (TypeError, ValueError) as error:
            raise ValueError(f"Class index không hợp lệ: {raw_index!r}") from error
        if not isinstance(raw_info, Mapping):
            raise ValueError(f"Thông tin class {index} không phải object")
        missing_fields = REQUIRED_LABEL_FIELDS - set(raw_info)
        if missing_fields:
            missing = ", ".join(sorted(missing_fields))
            raise ValueError(f"Class {index} thiếu field: {missing}")
        normalized_info = {
            field: str(raw_info[field]) for field in sorted(REQUIRED_LABEL_FIELDS)
        }
        expected_label = (
            f"{normalized_info['plant']}___{normalized_info['disease']}"
        )
        if normalized_info["compound_label"] != expected_label:
            raise ValueError(
                f"compound_label của class {index} không khớp plant/disease"
            )
        normalized[index] = normalized_info

    expected_indices = set(range(num_classes))
    actual_indices = set(normalized)
    if actual_indices != expected_indices:
        missing = sorted(expected_indices - actual_indices)
        extra = sorted(actual_indices - expected_indices)
        raise ValueError(
            "idx_to_info không khớp num_classes; "
            f"thiếu={missing}, thừa={extra}"
        )
    return normalized


def ensure_matching_label_mappings(
    checkpoint_mapping: dict[int, dict[str, str]],
    dataset_mapping: dict[int, dict[str, str]],
) -> None:
    """Reject evaluation when checkpoint and dataset class orders differ."""

    if checkpoint_mapping != dataset_mapping:
        raise ValueError(
            "Mapping lớp trong checkpoint không khớp dataset hiện tại; "
            "không thể đánh giá an toàn"
        )
