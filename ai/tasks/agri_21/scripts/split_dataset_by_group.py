from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, read_csv, write_csv


SPLIT_RATIOS = {"train": 0.70, "val": 0.10, "test": 0.20}
SPLIT_PRIORITY = {"train": 2, "test": 1, "val": 0}
DEFAULT_SEED = 20260919

GROUP_ASSIGNMENT_FIELDS = [
    "group_id",
    "compound_label",
    "group_size",
    "split",
]

CLASS_DISTRIBUTION_FIELDS = [
    "plant",
    "condition",
    "compound_label",
    "total_images",
    "total_groups",
    "train_images",
    "val_images",
    "test_images",
    "train_groups",
    "val_groups",
    "test_groups",
    "train_ratio",
    "val_ratio",
    "test_ratio",
]

SUMMARY_FIELDS = [
    "split",
    "target_ratio",
    "image_count",
    "actual_ratio",
    "group_count",
    "class_count",
]

LEAKAGE_FIELDS = ["group_id", "splits"]


def stable_group_order(group_id: str, seed: int) -> str:
    return hashlib.sha256(f"{seed}:{group_id}".encode("utf-8")).hexdigest()


def assign_class_groups(
    groups: list[tuple[str, int]],
    total_images: int,
    seed: int,
) -> dict[str, str]:
    targets = {
        split: total_images * ratio for split, ratio in SPLIT_RATIOS.items()
    }
    counts = {split: 0 for split in SPLIT_RATIOS}
    assignments: dict[str, str] = {}

    ordered_groups = sorted(
        groups,
        key=lambda item: (-item[1], stable_group_order(item[0], seed)),
    )
    for group_id, group_size in ordered_groups:
        split = max(
            SPLIT_RATIOS,
            key=lambda name: (
                (targets[name] - counts[name]) / targets[name],
                SPLIT_PRIORITY[name],
            ),
        )
        assignments[group_id] = split
        counts[split] += group_size

    while True:
        current_error = sum(
            ((counts[name] - targets[name]) / targets[name]) ** 2
            for name in SPLIT_RATIOS
        )
        best_move: tuple[float, str, str, int, str, str] | None = None
        for group_id, group_size in ordered_groups:
            source = assignments[group_id]
            for destination in SPLIT_RATIOS:
                if destination == source:
                    continue
                candidate_counts = dict(counts)
                candidate_counts[source] -= group_size
                candidate_counts[destination] += group_size
                candidate_error = sum(
                    (
                        (candidate_counts[name] - targets[name])
                        / targets[name]
                    )
                    ** 2
                    for name in SPLIT_RATIOS
                )
                improvement = current_error - candidate_error
                move = (
                    improvement,
                    stable_group_order(group_id, seed),
                    group_id,
                    group_size,
                    source,
                    destination,
                )
                if improvement > 1e-12 and (
                    best_move is None or move > best_move
                ):
                    best_move = move
        if best_move is None:
            break
        _, _, group_id, group_size, source, destination = best_move
        assignments[group_id] = destination
        counts[source] -= group_size
        counts[destination] += group_size
    return assignments


def split_dataset_by_group(
    output_dir: Path,
    seed: int = DEFAULT_SEED,
) -> dict[str, object]:
    output_dir = output_dir.resolve()
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    reports_dir = output_dir / "reports"
    backup_dir = reports_dir / "step5_backup_before_split"
    assignment_path = reports_dir / "group_split_assignments.csv"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    expected_stage = "hamming_near_duplicate_review_complete"
    if metadata.get("stage") != expected_stage:
        raise ValueError(f"Output không ở trạng thái {expected_stage}")
    if backup_dir.exists() or assignment_path.exists():
        raise FileExistsError("Bước chia tập đã có artifact; không áp dụng lại")

    rows = read_csv(manifest_path)
    if not rows or any(not row["group_id"] for row in rows):
        raise ValueError("Manifest rỗng hoặc có dòng thiếu group_id")
    if any(row["split"] for row in rows):
        raise ValueError("Manifest đã có split")

    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_group[row["group_id"]].append(row)

    groups_by_class: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for group_id, group_rows in rows_by_group.items():
        labels = {row["compound_label"] for row in group_rows}
        if len(labels) != 1:
            raise ValueError(f"group_id chứa nhiều nhãn: {group_id}")
        groups_by_class[next(iter(labels))].append((group_id, len(group_rows)))

    split_by_group: dict[str, str] = {}
    for compound_label, groups in sorted(groups_by_class.items()):
        total_images = sum(group_size for _, group_size in groups)
        class_assignments = assign_class_groups(groups, total_images, seed)
        split_by_group.update(class_assignments)

    for row in rows:
        row["split"] = split_by_group[row["group_id"]]
    rows.sort(key=lambda row: row["image_path"])

    split_rows = {
        split: [row for row in rows if row["split"] == split]
        for split in SPLIT_RATIOS
    }
    group_assignment_rows = [
        {
            "group_id": group_id,
            "compound_label": group_rows[0]["compound_label"],
            "group_size": len(group_rows),
            "split": split_by_group[group_id],
        }
        for group_id, group_rows in sorted(rows_by_group.items())
    ]

    class_distribution_rows = []
    for compound_label in sorted(groups_by_class):
        class_rows = [row for row in rows if row["compound_label"] == compound_label]
        total_images = len(class_rows)
        split_image_counts = Counter(row["split"] for row in class_rows)
        split_group_counts = Counter(
            split_by_group[group_id]
            for group_id, _ in groups_by_class[compound_label]
        )
        plant, condition = compound_label.split("___", maxsplit=1)
        class_distribution_rows.append(
            {
                "plant": plant,
                "condition": condition,
                "compound_label": compound_label,
                "total_images": total_images,
                "total_groups": len(groups_by_class[compound_label]),
                "train_images": split_image_counts["train"],
                "val_images": split_image_counts["val"],
                "test_images": split_image_counts["test"],
                "train_groups": split_group_counts["train"],
                "val_groups": split_group_counts["val"],
                "test_groups": split_group_counts["test"],
                "train_ratio": f"{split_image_counts['train'] / total_images:.6f}",
                "val_ratio": f"{split_image_counts['val'] / total_images:.6f}",
                "test_ratio": f"{split_image_counts['test'] / total_images:.6f}",
            }
        )

    total_rows = len(rows)
    summary_rows = []
    for split, target_ratio in SPLIT_RATIOS.items():
        group_ids = {row["group_id"] for row in split_rows[split]}
        labels = {row["compound_label"] for row in split_rows[split]}
        summary_rows.append(
            {
                "split": split,
                "target_ratio": f"{target_ratio:.2f}",
                "image_count": len(split_rows[split]),
                "actual_ratio": f"{len(split_rows[split]) / total_rows:.6f}",
                "group_count": len(group_ids),
                "class_count": len(labels),
            }
        )

    group_splits: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        group_splits[row["group_id"]].add(row["split"])
    leakage_rows = [
        {"group_id": group_id, "splits": ";".join(sorted(splits))}
        for group_id, splits in group_splits.items()
        if len(splits) > 1
    ]
    if leakage_rows:
        raise ValueError("Phát hiện group_id xuất hiện ở nhiều split")

    backup_dir.mkdir(parents=True)
    shutil.copy2(manifest_path, backup_dir / manifest_path.name)
    shutil.copy2(metadata_path, backup_dir / metadata_path.name)

    write_csv(manifest_path, MANIFEST_FIELDS, rows)
    for split, current_rows in split_rows.items():
        write_csv(
            output_dir / "manifests" / f"{split}.csv",
            MANIFEST_FIELDS,
            current_rows,
        )
    write_csv(
        assignment_path,
        GROUP_ASSIGNMENT_FIELDS,
        group_assignment_rows,
    )
    write_csv(
        reports_dir / "split_class_distribution.csv",
        CLASS_DISTRIBUTION_FIELDS,
        class_distribution_rows,
    )
    write_csv(
        reports_dir / "split_summary.csv",
        SUMMARY_FIELDS,
        summary_rows,
    )
    write_csv(
        reports_dir / "split_leakage_check.csv",
        LEAKAGE_FIELDS,
        leakage_rows,
    )

    image_counts = {
        split: len(current_rows) for split, current_rows in split_rows.items()
    }
    group_counts = Counter(split_by_group.values())
    metadata.update(
        {
            "stage": "group_aware_split_complete",
            "split_completed_at_utc": datetime.now(timezone.utc).isoformat(),
            "split_method": "per_class_largest_group_first_relative_deficit",
            "split_seed": seed,
            "split_target_ratios": SPLIT_RATIOS,
            "split_image_counts": image_counts,
            "split_group_counts": dict(group_counts),
            "split_leakage_group_count": 0,
        }
    )
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return {
        "images": total_rows,
        "groups": len(rows_by_group),
        "image_counts": image_counts,
        "group_counts": dict(group_counts),
        "leakage_groups": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Chia train/validation/test theo group_id."
    )
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()
    result = split_dataset_by_group(args.dataset_dir, seed=args.seed)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
