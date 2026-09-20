from __future__ import annotations

import argparse
import itertools
import json
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.assign_group_ids import read_csv, write_csv
from ai.tasks.agri_21.scripts.audit_near_duplicates_by_hamming import (
    BKTree,
    hamming_distance,
    parse_dhash,
)
from ai.tasks.agri_21.scripts.score_near_duplicate_hamming_candidates import (
    grayscale_correlation,
    normalized_mae,
)


MIN_CORRELATION = 0.9999
MAX_NORMALIZED_MAE = 0.005
MAX_HAMMING_DISTANCE = 5
REVIEW_FIELDS = [
    "hamming_distance",
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
    "currently_cross_split",
    "decision",
]


def relationship(left_label: str, right_label: str) -> str:
    if left_label == right_label:
        return "same_label"
    left_plant = left_label.split("___", maxsplit=1)[0]
    right_plant = right_label.split("___", maxsplit=1)[0]
    if left_plant == right_plant:
        return "cross_label_same_plant"
    return "cross_plant"


def audit_post_resize_near_duplicates(dataset_dir: Path) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    images_dir = dataset_dir / "images"
    reports_dir = dataset_dir / "reports"
    rows = read_csv(dataset_dir / "manifests" / "dataset_manifest.csv")

    rows_by_hash: dict[int, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_hash[parse_dhash(row["phash"])].append(row)

    representatives_by_hash: dict[int, dict[str, dict[str, str]]] = {}
    for hash_value, hash_rows in rows_by_hash.items():
        representatives: dict[str, dict[str, str]] = {}
        for row in hash_rows:
            representatives.setdefault(row["group_id"], row)
        representatives_by_hash[hash_value] = representatives

    @lru_cache(maxsize=None)
    def load_grayscale(image_path: str) -> Image.Image:
        with Image.open(images_dir / image_path) as image:
            return image.convert("L").resize((64, 64), Image.Resampling.LANCZOS)

    best_high_confidence_by_group_pair: dict[
        tuple[str, str], dict[str, object]
    ] = {}
    candidate_occurrence_count = 0

    def score_candidate(
        left: dict[str, str],
        right: dict[str, str],
        distance: int,
    ) -> None:
        nonlocal candidate_occurrence_count
        if left["group_id"] == right["group_id"]:
            return
        candidate_occurrence_count += 1
        left_image = load_grayscale(left["image_path"])
        right_image = load_grayscale(right["image_path"])
        mae = normalized_mae(left_image, right_image)
        if mae > MAX_NORMALIZED_MAE:
            return
        correlation = grayscale_correlation(left_image, right_image)
        if correlation < MIN_CORRELATION:
            return

        group_pair = tuple(sorted((left["group_id"], right["group_id"])))
        current = best_high_confidence_by_group_pair.get(group_pair)
        if current is not None and float(current["normalized_mae"]) <= mae:
            return
        relation = relationship(
            left["compound_label"], right["compound_label"]
        )
        best_high_confidence_by_group_pair[group_pair] = {
            "hamming_distance": distance,
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
            "currently_cross_split": str(left["split"] != right["split"]).lower(),
            "decision": "high_confidence_near_duplicate",
        }

    tree = BKTree()
    for right_hash in sorted(representatives_by_hash):
        right_groups = representatives_by_hash[right_hash]
        for left, right in itertools.combinations(right_groups.values(), 2):
            score_candidate(left, right, 0)

        for left_hash, distance in tree.find(
            right_hash, MAX_HAMMING_DISTANCE
        ):
            for left in representatives_by_hash[left_hash].values():
                for right in right_groups.values():
                    score_candidate(left, right, distance)
        tree.add(right_hash)

    review_rows = sorted(
        best_high_confidence_by_group_pair.values(),
        key=lambda row: (
            int(row["hamming_distance"]),
            str(row["left_group_id"]),
            str(row["right_group_id"]),
        ),
    )
    review_path = reports_dir / "post_resize_hamming_0_to_5_review.csv"
    summary_path = reports_dir / "post_resize_hamming_0_to_5_summary.json"
    write_csv(review_path, REVIEW_FIELDS, review_rows)

    parent: dict[str, str] = {}

    def find(group_id: str) -> str:
        parent.setdefault(group_id, group_id)
        if parent[group_id] != group_id:
            parent[group_id] = find(parent[group_id])
        return parent[group_id]

    for row in review_rows:
        left_root = find(str(row["left_group_id"]))
        right_root = find(str(row["right_group_id"]))
        if left_root != right_root:
            parent[right_root] = left_root
    component_count = len({find(group_id) for group_id in parent})
    relationship_counts = Counter(
        str(row["relationship"]) for row in review_rows
    )
    summary: dict[str, object] = {
        "dataset_version": "v1.2",
        "image_count": len(rows),
        "group_count_before_merge": len({row["group_id"] for row in rows}),
        "unique_dhash_count": len(rows_by_hash),
        "max_hamming_distance": MAX_HAMMING_DISTANCE,
        "candidate_occurrence_count": candidate_occurrence_count,
        "high_confidence_group_pair_count": len(review_rows),
        "high_confidence_relationship_counts": dict(relationship_counts),
        "currently_cross_split_high_confidence_pair_count": sum(
            row["currently_cross_split"] == "true" for row in review_rows
        ),
        "groups_in_merge_components": len(parent),
        "merge_component_count": component_count,
        "min_grayscale_correlation": MIN_CORRELATION,
        "max_normalized_mae": MAX_NORMALIZED_MAE,
        "review_report": str(review_path),
    }
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit near-duplicate Hamming 0-5 sau resize."
    )
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    result = audit_post_resize_near_duplicates(args.dataset_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
