from __future__ import annotations

import argparse
import itertools
import json
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.assign_group_ids import read_csv, write_csv
from ai.tasks.agri_21.scripts.score_near_duplicate_hamming_candidates import (
    grayscale_correlation,
    normalized_mae,
)


MIN_CORRELATION = 0.9999
MAX_NORMALIZED_MAE = 0.005
REVIEW_FIELDS = [
    "phash",
    "left_split",
    "right_split",
    "left_group_id",
    "right_group_id",
    "left_compound_label",
    "right_compound_label",
    "left_image_path",
    "right_image_path",
    "grayscale_correlation",
    "normalized_mae",
    "relationship",
    "decision",
]


def cross_split_values(
    rows: list[dict[str, str]], field: str
) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        if row[field]:
            grouped[row[field]].append(row)
    return {
        value: value_rows
        for value, value_rows in grouped.items()
        if len({row["split"] for row in value_rows}) > 1
    }


def relationship(left_label: str, right_label: str) -> str:
    if left_label == right_label:
        return "same_label"
    left_plant = left_label.split("___", maxsplit=1)[0]
    right_plant = right_label.split("___", maxsplit=1)[0]
    if left_plant == right_plant:
        return "cross_label_same_plant"
    return "cross_plant"


def check_post_resize_leakage(dataset_dir: Path) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    images_dir = dataset_dir / "images"
    reports_dir = dataset_dir / "reports"
    rows = read_csv(dataset_dir / "manifests" / "dataset_manifest.csv")
    metadata = json.loads(
        (dataset_dir / "metadata" / "dataset_version.json").read_text(
            encoding="utf-8"
        )
    )

    path_cross_split = cross_split_values(rows, "image_path")
    group_cross_split = cross_split_values(rows, "group_id")
    sha_cross_split = cross_split_values(rows, "sha256")
    phash_cross_split = cross_split_values(rows, "phash")

    @lru_cache(maxsize=None)
    def load_grayscale(image_path: str) -> Image.Image:
        with Image.open(images_dir / image_path) as image:
            return image.convert("L").resize((64, 64), Image.Resampling.LANCZOS)

    review_rows: list[dict[str, object]] = []
    candidate_pair_count = 0
    for phash, hash_rows in sorted(phash_cross_split.items()):
        representative_by_group: dict[str, dict[str, str]] = {}
        for row in hash_rows:
            representative_by_group.setdefault(row["group_id"], row)

        for left, right in itertools.combinations(
            representative_by_group.values(), 2
        ):
            if left["split"] == right["split"]:
                continue
            candidate_pair_count += 1
            left_image = load_grayscale(left["image_path"])
            right_image = load_grayscale(right["image_path"])
            mae = normalized_mae(left_image, right_image)
            correlation = (
                grayscale_correlation(left_image, right_image)
                if mae <= MAX_NORMALIZED_MAE
                else None
            )
            is_high_confidence = (
                correlation is not None and correlation >= MIN_CORRELATION
            )
            if not is_high_confidence:
                continue

            relation = relationship(
                left["compound_label"], right["compound_label"]
            )
            review_rows.append(
                {
                    "phash": phash,
                    "left_split": left["split"],
                    "right_split": right["split"],
                    "left_group_id": left["group_id"],
                    "right_group_id": right["group_id"],
                    "left_compound_label": left["compound_label"],
                    "right_compound_label": right["compound_label"],
                    "left_image_path": left["image_path"],
                    "right_image_path": right["image_path"],
                    "grayscale_correlation": f"{correlation:.6f}",
                    "normalized_mae": f"{mae:.6f}",
                    "relationship": relation,
                    "decision": "high_confidence_near_duplicate",
                }
            )

    review_path = reports_dir / "post_resize_cross_split_dhash_review.csv"
    summary_path = reports_dir / "post_resize_leakage_summary.json"
    write_csv(review_path, REVIEW_FIELDS, review_rows)
    relationship_counts = Counter(
        str(row["relationship"]) for row in review_rows
    )
    summary: dict[str, object] = {
        "dataset_version": metadata["dataset_version"],
        "image_count": len(rows),
        "path_cross_split_count": len(path_cross_split),
        "group_id_cross_split_count": len(group_cross_split),
        "sha256_cross_split_count": len(sha_cross_split),
        "phash_cross_split_count": len(phash_cross_split),
        "phash_cross_split_group_pair_count": candidate_pair_count,
        "high_confidence_cross_split_pair_count": len(review_rows),
        "high_confidence_relationship_counts": dict(relationship_counts),
        "min_grayscale_correlation": MIN_CORRELATION,
        "max_normalized_mae": MAX_NORMALIZED_MAE,
        "leakage_passed": not (
            path_cross_split
            or group_cross_split
            or sha_cross_split
            or review_rows
        ),
        "review_report": str(review_path),
    }
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Kiểm tra leakage sau khi resize và chia split."
    )
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    result = check_post_resize_leakage(args.dataset_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
