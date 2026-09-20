from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

MANIFEST_FIELDS = [
    "image_path",
    "plant",
    "condition",
    "compound_label",
    "extension",
    "image_format",
    "width",
    "height",
    "file_size",
    "sha256",
    "phash",
    "quality_flags",
    "status",
    "rejection_reason",
    "group_id",
    "split",
]
ASSIGNMENT_FIELDS = [
    "image_path",
    "compound_label",
    "sha256",
    "dhash",
    "group_id",
    "group_size",
    "grouping_rule",
]

GROUP_SUMMARY_FIELDS = [
    "group_id",
    "group_size",
    "compound_labels",
    "dhash",
    "grouping_rule",
]

CROSS_LABEL_REVIEW_FIELDS = [
    "dhash",
    "decision",
    "compound_labels",
    "file_count",
    "rationale",
]

V1_1_CROSS_LABEL_DECISIONS = {
    "3b9a9133e7cbcfe2": {
        "decision": "merge_across_labels",
        "rationale": "Kiểm tra trực quan xác nhận hai ảnh Ớt là crop/resize của cùng ảnh gốc.",
    },
    "5b1b1d6c333ef1bb": {
        "decision": "merge_across_labels",
        "rationale": "Kiểm tra trực quan xác nhận hai file hiển thị cùng ảnh gốc.",
    },
    "96979116b6cc2656": {
        "decision": "merge_across_labels",
        "rationale": "Kiểm tra trực quan xác nhận hai file hiển thị cùng ảnh gốc.",
    },
    "f5cf3bf3c68f8dda": {
        "decision": "keep_labels_separate",
        "rationale": "dHash va chạm giữa hai nhãn Cam nhưng ảnh mẫu không phải cùng ảnh gốc.",
    },
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as input_file:
        return list(csv.DictReader(input_file))


def write_csv(
    path: Path,
    fieldnames: list[str],
    rows: list[dict[str, object]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def make_group_id(key: str) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return f"grp_dhash_{digest}"


def append_quality_flag(current: str, flag: str) -> str:
    flags = [value for value in current.split(";") if value]
    if flag not in flags:
        flags.append(flag)
    return ";".join(flags)


def assign_group_ids(
    output_dir: Path,
    cross_label_decisions: dict[str, dict[str, str]],
) -> dict[str, int]:
    output_dir = output_dir.resolve()
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    reports_dir = output_dir / "reports"
    assignments_path = reports_dir / "group_id_assignments.csv"
    summary_path = reports_dir / "group_summary.csv"
    review_path = reports_dir / "near_duplicate_label_review.csv"
    backup_dir = reports_dir / "step2_backup_before_grouping"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("stage") != "exact_dedup_and_label_conflict_review":
        raise ValueError(
            "Output không ở trạng thái exact_dedup_and_label_conflict_review"
        )
    if backup_dir.exists() or assignments_path.exists():
        raise FileExistsError("Bước gán group_id đã có artifact; không áp dụng lại")

    rows: list[dict[str, object]] = read_csv(manifest_path)
    if not rows:
        raise ValueError("Manifest không có dữ liệu")
    if any(not str(row["phash"]) for row in rows):
        raise ValueError("Manifest có dòng thiếu dHash trong cột phash")

    rows_by_dhash: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        rows_by_dhash[str(row["phash"])].append(row)

    cross_label_hashes = {
        dhash
        for dhash, group in rows_by_dhash.items()
        if len({str(row["compound_label"]) for row in group}) > 1
    }
    if set(cross_label_decisions) != cross_label_hashes:
        raise ValueError(
            "Decision phải bao phủ đúng toàn bộ dHash xuất hiện ở nhiều nhãn"
        )

    grouping_rule_by_path: dict[str, str] = {}
    review_rows: list[dict[str, object]] = []

    for dhash, dhash_rows in sorted(rows_by_dhash.items()):
        labels = sorted({str(row["compound_label"]) for row in dhash_rows})
        if len(labels) == 1:
            partitions = [(labels[0], dhash_rows)]
            cross_label_decision = ""
        else:
            decision = cross_label_decisions[dhash]
            cross_label_decision = decision["decision"]
            if cross_label_decision == "merge_across_labels":
                partitions = [("*", dhash_rows)]
            elif cross_label_decision == "keep_labels_separate":
                partitions = [
                    (
                        label,
                        [
                            row
                            for row in dhash_rows
                            if str(row["compound_label"]) == label
                        ],
                    )
                    for label in labels
                ]
            else:
                raise ValueError(
                    f"Decision không hợp lệ cho dHash {dhash}: "
                    f"{cross_label_decision}"
                )
            review_rows.append(
                {
                    "dhash": dhash,
                    "decision": cross_label_decision,
                    "compound_labels": ";".join(labels),
                    "file_count": len(dhash_rows),
                    "rationale": decision["rationale"],
                }
            )

        for partition_label, partition_rows in partitions:
            if len(partition_rows) == 1:
                row = partition_rows[0]
                row["group_id"] = f"sha256:{row['sha256']}"
                rule = "singleton_sha256"
            else:
                group_key = f"dhash:{dhash}|label:{partition_label}"
                group_id = make_group_id(group_key)
                rule = (
                    "reviewed_dhash_cross_label"
                    if cross_label_decision == "merge_across_labels"
                    else "exact_dhash_same_label"
                )
                for row in partition_rows:
                    row["group_id"] = group_id
                    if rule == "reviewed_dhash_cross_label":
                        row["quality_flags"] = append_quality_flag(
                            str(row["quality_flags"]),
                            "near_duplicate_label_conflict_reviewed",
                        )
            for row in partition_rows:
                grouping_rule_by_path[str(row["image_path"])] = rule

    rows.sort(key=lambda row: str(row["image_path"]))
    groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        groups[str(row["group_id"])].append(row)

    assignment_rows: list[dict[str, object]] = []
    for row in rows:
        group = groups[str(row["group_id"])]
        assignment_rows.append(
            {
                "image_path": row["image_path"],
                "compound_label": row["compound_label"],
                "sha256": row["sha256"],
                "dhash": row["phash"],
                "group_id": row["group_id"],
                "group_size": len(group),
                "grouping_rule": grouping_rule_by_path[str(row["image_path"])],
            }
        )

    group_summary_rows: list[dict[str, object]] = []
    for group_id, group in sorted(groups.items()):
        rules = {grouping_rule_by_path[str(row["image_path"])] for row in group}
        if len(rules) != 1:
            raise ValueError(f"Nhóm có nhiều grouping_rule: {group_id}")
        group_summary_rows.append(
            {
                "group_id": group_id,
                "group_size": len(group),
                "compound_labels": ";".join(
                    sorted({str(row["compound_label"]) for row in group})
                ),
                "dhash": group[0]["phash"],
                "grouping_rule": next(iter(rules)),
            }
        )

    backup_dir.mkdir(parents=True)
    shutil.copy2(manifest_path, backup_dir / manifest_path.name)
    shutil.copy2(metadata_path, backup_dir / metadata_path.name)

    write_csv(manifest_path, MANIFEST_FIELDS, rows)
    write_csv(assignments_path, ASSIGNMENT_FIELDS, assignment_rows)
    write_csv(summary_path, GROUP_SUMMARY_FIELDS, group_summary_rows)
    write_csv(review_path, CROSS_LABEL_REVIEW_FIELDS, review_rows)

    multi_member_groups = sum(
        1 for group in groups.values() if len(group) > 1
    )
    multi_member_files = sum(
        len(group) for group in groups.values() if len(group) > 1
    )
    cross_label_groups = sum(
        1
        for group in groups.values()
        if len({str(row["compound_label"]) for row in group}) > 1
    )
    metadata.update(
        {
            "stage": "group_ids_assigned",
            "group_ids_assigned_at_utc": datetime.now(timezone.utc).isoformat(),
            "grouping_method": "exact_64bit_dhash_with_reviewed_cross_label_overrides",
            "group_count": len(groups),
            "multi_member_group_count": multi_member_groups,
            "multi_member_file_count": multi_member_files,
            "largest_group_size": max(len(group) for group in groups.values()),
            "cross_label_group_count": cross_label_groups,
            "near_duplicate_label_review_count": len(review_rows),
        }
    )
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return {
        "files": len(rows),
        "groups": len(groups),
        "multi_member_groups": multi_member_groups,
        "multi_member_files": multi_member_files,
        "largest_group_size": max(len(group) for group in groups.values()),
        "cross_label_groups": cross_label_groups,
        "cross_label_reviews": len(review_rows),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gán group_id theo dHash và quyết định review xuyên nhãn."
    )
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    summary = assign_group_ids(
        output_dir=args.dataset_dir,
        cross_label_decisions=V1_1_CROSS_LABEL_DECISIONS,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
