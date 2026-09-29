"""Finalize reviewed pepper groups and fixed splits for dataset v1.4."""

from __future__ import annotations

import json
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import read_csv, write_csv
from ai.tasks.agri_21.scripts.split_dataset_by_group import split_dataset_by_group


def prepare_pepper(dataset_dir: Path) -> dict[str, object]:
    manifest_path = dataset_dir / "manifests" / "dataset_manifest.csv"
    review_path = dataset_dir / "reports" / "near_duplicate_hamming_similarity_review.csv"
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    merge_path = dataset_dir / "reports" / "v1_4_pepper_group_merges.csv"
    if merge_path.exists():
        raise FileExistsError(merge_path)

    rows = read_csv(manifest_path)
    review = read_csv(review_path)
    parent = {row["group_id"]: row["group_id"] for row in rows}

    def root(group_id: str) -> str:
        while parent[group_id] != group_id:
            group_id = parent[group_id]
        return group_id

    merges = []
    for pair in review:
        if pair["similarity_decision"] != "high_confidence_near_duplicate":
            continue
        if pair["relationship"] != "same_label":
            raise ValueError("Near-duplicate xuyên nhãn cần review thủ công")
        left = root(pair["left_group_id"])
        right = root(pair["right_group_id"])
        if left != right:
            keep, merge = sorted((left, right))
            parent[merge] = keep
        merges.append(pair)

    labels_by_group = {}
    for row in rows:
        row["group_id"] = root(row["group_id"])
        labels_by_group.setdefault(row["group_id"], set()).add(row["compound_label"])
    if any(len(labels) != 1 for labels in labels_by_group.values()):
        raise ValueError("Group sau khi gộp chứa nhiều nhãn")

    write_csv(manifest_path, list(rows[0]), rows)
    write_csv(merge_path, list(review[0]) if review else [], merges)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["stage"] = "hamming_near_duplicate_review_complete"
    metadata["v1_4_high_confidence_pairs_merged"] = len(merges)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return split_dataset_by_group(dataset_dir)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path)
    print(prepare_pepper(parser.parse_args().dataset_dir))
