"""Verify v1.4 images and leakage evidence before releasing the dataset."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from ai.data.dataset import load_manifest_splits
from ai.tasks.agri_21.scripts.assign_group_ids import read_csv, write_csv
from ai.tasks.agri_21.scripts.build_v1_4_dataset import sha256


def finalize(dataset_dir: Path) -> dict[str, object]:
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata["stage"] != "pepper_replaced_pending_final_leakage_audit":
        raise ValueError("Dataset không ở trạng thái chờ hậu kiểm")
    leakage = json.loads(
        (dataset_dir / "reports" / "post_resize_leakage_summary.json").read_text(
            encoding="utf-8"
        )
    )
    hamming = json.loads(
        (dataset_dir / "reports" / "post_resize_hamming_0_to_5_summary.json").read_text(
            encoding="utf-8"
        )
    )
    if not leakage["leakage_passed"] or hamming["high_confidence_group_pair_count"]:
        raise ValueError("Hậu kiểm còn near-duplicate hoặc leakage chưa xử lý")

    records_by_split, mapping, _ = load_manifest_splits(dataset_dir)
    rows = read_csv(dataset_dir / "manifests" / "dataset_manifest.csv")
    if len(rows) != 88000 or len(mapping) != 59:
        raise ValueError("Count hoặc số lớp v1.4 không khớp")
    split_counts = {split: len(records) for split, records in records_by_split.items()}
    if split_counts != metadata["split_image_counts"]:
        raise ValueError("Split counts không khớp metadata")

    def verify_image(row: dict[str, str]) -> str | None:
        path = dataset_dir / "images" / row["image_path"]
        return str(path) if sha256(path) != row["sha256"] else None

    with ThreadPoolExecutor(max_workers=8) as executor:
        for start in range(0, len(rows), 1000):
            for bad_path in executor.map(verify_image, rows[start : start + 1000]):
                if bad_path is not None:
                    raise ValueError(f"Checksum ảnh không khớp: {bad_path}")
            print(f"Đã xác minh {min(start + 1000, len(rows)):,}/{len(rows):,} ảnh", flush=True)

    class_counts: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        class_counts[row["compound_label"]][row["split"]] += 1
    distribution = [
        {
            "compound_label": label,
            "total": sum(counts.values()),
            "train": counts["train"],
            "val": counts["val"],
            "test": counts["test"],
        }
        for label, counts in sorted(class_counts.items())
    ]
    write_csv(
        dataset_dir / "reports" / "class_distribution_v1_4.csv",
        ["compound_label", "total", "train", "val", "test"],
        distribution,
    )
    metadata["stage"] = "v1_4_complete"
    metadata["sha256_verified_images"] = len(rows)
    metadata["leakage_passed"] = True
    metadata["post_resize_high_confidence_group_pairs"] = 0
    metadata["manifest_sha256"] = sha256(
        dataset_dir / "manifests" / "dataset_manifest.csv"
    )
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path)
    print(finalize(parser.parse_args().dataset_dir))
