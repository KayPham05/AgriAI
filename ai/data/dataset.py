"""Dataset loader backed by the fixed train/val/test CSV manifests."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Callable

from PIL import Image


REQUIRED_COLUMNS = {
    "image_path",
    "plant",
    "condition",
    "compound_label",
    "status",
    "group_id",
    "split",
}
SPLIT_NAMES = ("train", "val", "test")
TARGET_FIELDS = ("compound_label", "plant", "condition")


class PlantLeafDataset:
    """PyTorch-compatible map-style dataset without importing torch eagerly."""

    def __init__(
        self,
        records: list[dict[str, Any]],
        transform: Callable[[Image.Image], Any] | None = None,
    ) -> None:
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[Any, int]:
        record = self.records[index]
        with Image.open(record["resolved_image_path"]) as source:
            image = source.convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, record["label_idx"]


def compute_class_weights(
    records: list[dict[str, Any]],
    num_classes: int,
) -> list[float]:
    """Return balanced inverse-frequency weights from training records only."""

    if num_classes <= 0:
        raise ValueError("num_classes phải lớn hơn 0")

    class_counts = [0] * num_classes
    for record in records:
        label_idx = record["label_idx"]
        if not isinstance(label_idx, int) or not 0 <= label_idx < num_classes:
            raise ValueError(f"label_idx không hợp lệ: {label_idx!r}")
        class_counts[label_idx] += 1

    missing_classes = [index for index, count in enumerate(class_counts) if count == 0]
    if missing_classes:
        raise ValueError(f"Train set thiếu class index: {missing_classes}")

    sample_count = len(records)
    return [
        sample_count / (num_classes * class_count)
        for class_count in class_counts
    ]


def _read_split_manifest(
    manifest_path: Path,
    images_dir: Path,
    expected_split: str,
) -> list[dict[str, Any]]:
    if expected_split not in SPLIT_NAMES:
        raise ValueError(f"Split không hợp lệ: {expected_split}")
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy manifest: {manifest_path}")

    records: list[dict[str, Any]] = []
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise ValueError(f"{manifest_path.name} thiếu cột bắt buộc: {missing}")

        for line_number, row in enumerate(reader, start=2):
            actual_split = row["split"].strip()
            if actual_split != expected_split:
                raise ValueError(
                    f"{manifest_path.name}:{line_number} có split={actual_split!r}, "
                    f"phải là {expected_split!r}"
                )
            if row["status"].strip() != "valid":
                raise ValueError(
                    f"{manifest_path.name}:{line_number} không có status='valid'"
                )

            plant = row["plant"].strip()
            condition = row["condition"].strip()
            compound_label = row["compound_label"].strip()
            group_id = row["group_id"].strip()
            if not plant or not condition or not group_id:
                raise ValueError(
                    f"{manifest_path.name}:{line_number} thiếu plant, condition hoặc group_id"
                )
            if compound_label != f"{plant}___{condition}":
                raise ValueError(
                    f"{manifest_path.name}:{line_number} có compound_label không khớp"
                )

            relative_path = Path(row["image_path"].strip())
            if not relative_path.parts or relative_path.is_absolute() or ".." in relative_path.parts:
                raise ValueError(
                    f"{manifest_path.name}:{line_number} có image_path không an toàn"
                )
            resolved_image_path = (images_dir / relative_path).resolve()
            try:
                resolved_image_path.relative_to(images_dir)
            except ValueError as error:
                raise ValueError(
                    f"{manifest_path.name}:{line_number} trỏ ra ngoài thư mục images"
                ) from error
            if not resolved_image_path.is_file():
                raise FileNotFoundError(
                    f"{manifest_path.name}:{line_number} không tìm thấy ảnh: "
                    f"{resolved_image_path}"
                )

            record = dict(row)
            record["plant"] = plant
            record["condition"] = condition
            record["compound_label"] = compound_label
            record["group_id"] = group_id
            record["split"] = actual_split
            record["resolved_image_path"] = resolved_image_path
            records.append(record)

    if not records:
        raise ValueError(f"Manifest rỗng: {manifest_path}")
    return records


def load_manifest_splits(
    dataset_dir: str | Path,
    target_field: str = "compound_label",
) -> tuple[
    dict[str, list[dict[str, Any]]],
    dict[str, int],
    dict[int, dict[str, str]],
]:
    """Load fixed split membership and map the selected target to class indices."""

    if target_field not in TARGET_FIELDS:
        choices = ", ".join(TARGET_FIELDS)
        raise ValueError(
            f"Target field không hợp lệ: {target_field!r}; chọn một trong: {choices}"
        )

    dataset_root = Path(dataset_dir).resolve()
    images_dir = (dataset_root / "images").resolve()
    manifests_dir = dataset_root / "manifests"
    if not images_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy thư mục ảnh: {images_dir}")

    records_by_split = {
        split: _read_split_manifest(
            manifests_dir / f"{split}.csv",
            images_dir,
            split,
        )
        for split in SPLIT_NAMES
    }

    seen_paths: dict[str, str] = {}
    group_to_split: dict[str, str] = {}
    labels_by_split: dict[str, set[str]] = {}
    for split, records in records_by_split.items():
        labels_by_split[split] = set()
        for record in records:
            path_key = str(record["resolved_image_path"]).casefold()
            previous_split = seen_paths.get(path_key)
            if previous_split is not None:
                raise ValueError(
                    f"Ảnh xuất hiện nhiều lần trong manifest: "
                    f"{record['image_path']} ({previous_split}, {split})"
                )
            seen_paths[path_key] = split

            group_id = record["group_id"]
            previous_group_split = group_to_split.get(group_id)
            if previous_group_split is not None and previous_group_split != split:
                raise ValueError(
                    f"Rò rỉ group_id giữa các split: {group_id} "
                    f"({previous_group_split}, {split})"
                )
            group_to_split[group_id] = split
            labels_by_split[split].add(record[target_field])

    reference_labels = labels_by_split["train"]
    for split in ("val", "test"):
        if labels_by_split[split] != reference_labels:
            missing = sorted(reference_labels - labels_by_split[split])
            extra = sorted(labels_by_split[split] - reference_labels)
            raise ValueError(
                f"Tập lớp của {split}.csv không khớp train.csv; "
                f"thiếu={missing}, thừa={extra}"
            )

    class_to_idx = {
        label: index for index, label in enumerate(sorted(reference_labels))
    }
    idx_to_info: dict[int, dict[str, str]] = {}
    for label, index in class_to_idx.items():
        info = {"label": label, "target_field": target_field}
        if target_field == "compound_label":
            plant, disease = label.split("___", maxsplit=1)
            info.update(
                plant=plant,
                disease=disease,
                compound_label=label,
            )
        elif target_field == "plant":
            info.update(plant=label, disease="")
        else:
            info.update(plant="", disease=label)
        idx_to_info[index] = info

    for records in records_by_split.values():
        for record in records:
            record["label_idx"] = class_to_idx[record[target_field]]

    return records_by_split, class_to_idx, idx_to_info


def create_dataloaders(
    dataset_dir: str | Path | None = None,
    batch_size: int | None = None,
    num_workers: int | None = None,
    target_field: str = "compound_label",
    label_map_path: str | Path | None = None,
):
    """Create loaders from fixed manifests; no split is generated here."""

    from torch.utils.data import DataLoader

    from ai.configs import config
    from ai.data.augmentations import get_train_transforms, get_val_transforms

    dataset_root = Path(dataset_dir or config.DATASET_DIR)
    records_by_split, class_to_idx, idx_to_info = load_manifest_splits(
        dataset_root,
        target_field=target_field,
    )

    label_map = {
        "target_field": target_field,
        "class_to_idx": class_to_idx,
        "idx_to_info": idx_to_info,
    }
    resolved_label_map_path = Path(label_map_path or config.LABEL_MAP_PATH)
    resolved_label_map_path.parent.mkdir(parents=True, exist_ok=True)
    with resolved_label_map_path.open("w", encoding="utf-8") as handle:
        json.dump(label_map, handle, ensure_ascii=False, indent=2)

    batch_size = batch_size or config.BATCH_SIZE
    num_workers = config.NUM_WORKERS if num_workers is None else num_workers
    loader_options = {
        "batch_size": batch_size,
        "num_workers": num_workers,
        "pin_memory": config.PIN_MEMORY,
    }
    train_dataset = PlantLeafDataset(
        records_by_split["train"],
        transform=get_train_transforms(),
    )
    val_dataset = PlantLeafDataset(
        records_by_split["val"],
        transform=get_val_transforms(),
    )
    test_dataset = PlantLeafDataset(
        records_by_split["test"],
        transform=get_val_transforms(),
    )

    train_loader = DataLoader(
        train_dataset,
        shuffle=True,
        drop_last=len(train_dataset) > batch_size,
        **loader_options,
    )
    val_loader = DataLoader(val_dataset, shuffle=False, **loader_options)
    test_loader = DataLoader(test_dataset, shuffle=False, **loader_options)
    return train_loader, val_loader, test_loader, len(class_to_idx), idx_to_info
