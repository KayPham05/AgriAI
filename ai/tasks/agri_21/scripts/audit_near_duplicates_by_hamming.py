from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import read_csv, write_csv


CANDIDATE_FIELDS = [
    "hamming_distance",
    "review_priority",
    "relationship",
    "left_group_id",
    "right_group_id",
    "left_compound_label",
    "right_compound_label",
    "left_group_size",
    "right_group_size",
    "left_dhash",
    "right_dhash",
    "left_sample_path",
    "right_sample_path",
]

SUMMARY_FIELDS = ["hamming_distance", "relationship", "candidate_group_pairs"]

RELATIONSHIP_PRIORITY = {
    "cross_label_same_plant": 1,
    "same_label": 2,
    "cross_plant": 3,
}


def hamming_distance(left: int, right: int) -> int:
    return (left ^ right).bit_count()


class BKTree:
    def __init__(self) -> None:
        self.root: int | None = None
        self.children: dict[int, dict[int, int]] = {}

    def add(self, value: int) -> None:
        if self.root is None:
            self.root = value
            self.children[value] = {}
            return

        node = self.root
        while True:
            distance = hamming_distance(value, node)
            child = self.children[node].get(distance)
            if child is None:
                self.children[node][distance] = value
                self.children[value] = {}
                return
            node = child

    def find(self, value: int, max_distance: int) -> list[tuple[int, int]]:
        if self.root is None:
            return []

        matches: list[tuple[int, int]] = []
        pending = [self.root]
        while pending:
            node = pending.pop()
            distance = hamming_distance(value, node)
            if distance <= max_distance:
                matches.append((node, distance))
            minimum = distance - max_distance
            maximum = distance + max_distance
            pending.extend(
                child
                for edge, child in self.children[node].items()
                if minimum <= edge <= maximum
            )
        return matches


def parse_dhash(value: str) -> int:
    if len(value) != 16:
        raise ValueError(f"dHash phải gồm đúng 16 ký tự hex: {value!r}")
    try:
        return int(value, 16)
    except ValueError as error:
        raise ValueError(f"dHash không hợp lệ: {value!r}") from error


def build_group_records(
    manifest_rows: list[dict[str, str]],
) -> dict[int, list[dict[str, object]]]:
    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in manifest_rows:
        rows_by_group[row["group_id"]].append(row)

    groups_by_dhash: dict[int, list[dict[str, object]]] = defaultdict(list)
    for group_id, rows in rows_by_group.items():
        labels = {row["compound_label"] for row in rows}
        dhashes = {row["phash"] for row in rows}
        if len(labels) != 1 or len(dhashes) != 1:
            raise ValueError(f"group_id không đồng nhất nhãn hoặc dHash: {group_id}")
        dhash = next(iter(dhashes))
        groups_by_dhash[parse_dhash(dhash)].append(
            {
                "group_id": group_id,
                "compound_label": next(iter(labels)),
                "group_size": len(rows),
                "dhash": dhash,
                "sample_path": min(row["image_path"] for row in rows),
            }
        )
    return groups_by_dhash


def classify_relationship(left_label: str, right_label: str) -> str:
    if left_label == right_label:
        return "same_label"
    left_plant = left_label.split("___", maxsplit=1)[0]
    right_plant = right_label.split("___", maxsplit=1)[0]
    if left_plant == right_plant:
        return "cross_label_same_plant"
    return "cross_plant"


def find_candidate_rows(
    groups_by_dhash: dict[int, list[dict[str, object]]],
    max_distance: int,
) -> list[dict[str, object]]:
    tree = BKTree()
    candidate_rows: list[dict[str, object]] = []

    for right_hash in sorted(groups_by_dhash):
        for left_hash, distance in tree.find(right_hash, max_distance):
            for left_group in groups_by_dhash[left_hash]:
                for right_group in groups_by_dhash[right_hash]:
                    left_label = str(left_group["compound_label"])
                    right_label = str(right_group["compound_label"])
                    relationship = classify_relationship(left_label, right_label)
                    candidate_rows.append(
                        {
                            "hamming_distance": distance,
                            "review_priority": RELATIONSHIP_PRIORITY[relationship],
                            "relationship": relationship,
                            "left_group_id": left_group["group_id"],
                            "right_group_id": right_group["group_id"],
                            "left_compound_label": left_label,
                            "right_compound_label": right_label,
                            "left_group_size": left_group["group_size"],
                            "right_group_size": right_group["group_size"],
                            "left_dhash": left_group["dhash"],
                            "right_dhash": right_group["dhash"],
                            "left_sample_path": left_group["sample_path"],
                            "right_sample_path": right_group["sample_path"],
                        }
                    )
        tree.add(right_hash)

    return sorted(
        candidate_rows,
        key=lambda row: (
            int(row["review_priority"]),
            int(row["hamming_distance"]),
            str(row["left_group_id"]),
            str(row["right_group_id"]),
        ),
    )


def audit_near_duplicates_by_hamming(
    output_dir: Path,
    max_distance: int = 5,
) -> dict[str, object]:
    if not 1 <= max_distance <= 64:
        raise ValueError("max_distance phải nằm trong khoảng 1..64")

    output_dir = output_dir.resolve()
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    reports_dir = output_dir / "reports"
    candidate_path = reports_dir / "near_duplicate_hamming_candidates.csv"
    summary_path = reports_dir / "near_duplicate_hamming_summary.csv"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    expected_stage = "group_ids_assigned_and_near_duplicate_conflicts_quarantined"
    if metadata.get("stage") != expected_stage:
        raise ValueError(f"Output không ở trạng thái {expected_stage}")
    if candidate_path.exists() or summary_path.exists():
        raise FileExistsError("Artifact audit Hamming đã tồn tại; không ghi đè")

    manifest_rows = read_csv(manifest_path)
    if not manifest_rows or any(not row["group_id"] for row in manifest_rows):
        raise ValueError("Manifest rỗng hoặc có dòng thiếu group_id")
    if any(row["split"] for row in manifest_rows):
        raise ValueError("Phải audit Hamming trước khi chia split")

    groups_by_dhash = build_group_records(manifest_rows)
    candidate_rows = find_candidate_rows(groups_by_dhash, max_distance)
    counts = Counter(
        (int(row["hamming_distance"]), str(row["relationship"]))
        for row in candidate_rows
    )
    summary_rows = [
        {
            "hamming_distance": distance,
            "relationship": relationship,
            "candidate_group_pairs": count,
        }
        for (distance, relationship), count in sorted(counts.items())
    ]

    write_csv(candidate_path, CANDIDATE_FIELDS, candidate_rows)
    write_csv(summary_path, SUMMARY_FIELDS, summary_rows)

    relationship_counts = Counter(
        str(row["relationship"]) for row in candidate_rows
    )
    return {
        "images": len(manifest_rows),
        "groups": len({row["group_id"] for row in manifest_rows}),
        "unique_dhashes": len(groups_by_dhash),
        "max_distance": max_distance,
        "candidate_group_pairs": len(candidate_rows),
        "relationship_counts": dict(sorted(relationship_counts.items())),
        "candidate_report": str(candidate_path),
        "summary_report": str(summary_path),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Tìm group_id có dHash gần nhau trước khi chia split."
    )
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--max-distance", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = audit_near_duplicates_by_hamming(
        output_dir=args.output_dir,
        max_distance=args.max_distance,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
