"""Resolve the reviewed v1.3 dHash collision and synchronize metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import (
    MANIFEST_FIELDS,
    read_csv,
    write_csv,
)
from ai.tasks.agri_21.scripts.split_dataset_by_group import (
    LEAKAGE_FIELDS,
    SPLIT_RATIOS,
    SUMMARY_FIELDS,
)


CONFLICT_GROUP_ID = "grp_dhash_4fa1c91dad7ceea6"
EXPECTED_ROWS = {
    "Lua/Dom_nau/Lua_DomNau_00116.jpg": (
        "Lua___Dom_nau",
        "0f54e0d3fc26b58390871521ff6b0d0e89fa5f8498decdc6a632d05237944a73",
    ),
    "Lua/Dom_nau/Lua_DomNau_00117.jpg": (
        "Lua___Dom_nau",
        "285f704923c957926140c3df03b477b0c1759bdd143ce4415c105caed72aef02",
    ),
    "Lua/Khoe_manh/Lua_KhoeManh_00439.jpg": (
        "Lua___Khoe_manh",
        "5653a42c6249f66aebf736ad07786da50311b9b6a7e44f72826c5574abeb9bb9",
    ),
    "Lua/Khoe_manh/Lua_KhoeManh_01049.jpg": (
        "Lua___Khoe_manh",
        "62486e6e870c9bd268553aaf5f646fc6f35150b4a14e695d4f21766434893a7f",
    ),
}
RESOLUTION_FIELDS = [
    "image_path",
    "compound_label",
    "sha256",
    "phash",
    "old_group_id",
    "new_group_id",
    "split",
    "decision",
    "rationale",
]


def calculate_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cross_split_count(rows: list[dict[str, str]], field: str) -> int:
    splits_by_value: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        splits_by_value[row[field]].add(row["split"])
    return sum(len(splits) > 1 for splits in splits_by_value.values())


def cross_label_group_count(rows: list[dict[str, str]]) -> int:
    labels_by_group: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        labels_by_group[row["group_id"]].add(row["compound_label"])
    return sum(len(labels) > 1 for labels in labels_by_group.values())


def validate_source(
    dataset_dir: Path,
) -> tuple[list[dict[str, str]], dict[str, object]]:
    manifest_path = dataset_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    rows = read_csv(manifest_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("dataset_version") != "v1.3":
        raise ValueError("Dataset không phải v1.3")
    if metadata.get("stage") != "v1_3_extended_complete":
        raise ValueError("Dataset không ở trạng thái v1_3_extended_complete")

    conflict_rows = [row for row in rows if row["group_id"] == CONFLICT_GROUP_ID]
    observed = {
        row["image_path"]: (row["compound_label"], row["sha256"])
        for row in conflict_rows
    }
    if observed != EXPECTED_ROWS:
        raise ValueError("Nội dung cross-label group không khớp review đã duyệt")
    if cross_label_group_count(rows) != 1:
        raise ValueError("Manifest phải có đúng một cross-label group trước xử lý")

    for row in conflict_rows:
        image_path = dataset_dir / "images" / Path(row["image_path"])
        if calculate_sha256(image_path) != row["sha256"]:
            raise ValueError(f"Checksum ảnh không khớp: {image_path}")

    split_rows = []
    for split in SPLIT_RATIOS:
        current_rows = read_csv(dataset_dir / "manifests" / f"{split}.csv")
        if any(row["split"] != split for row in current_rows):
            raise ValueError(f"Manifest {split}.csv chứa split sai")
        split_rows.extend(current_rows)
    if {row["image_path"]: row for row in split_rows} != {
        row["image_path"]: row for row in rows
    }:
        raise ValueError("Ba manifest split không khớp dataset_manifest.csv")
    return rows, metadata


def build_outputs(
    dataset_dir: Path,
    rows: list[dict[str, str]],
    metadata: dict[str, object],
) -> tuple[
    list[dict[str, str]],
    dict[str, object],
    list[dict[str, object]],
    list[dict[str, object]],
    dict[str, object],
]:
    resolved_rows = [dict(row) for row in rows]
    resolution_rows: list[dict[str, object]] = []
    for row in resolved_rows:
        if row["group_id"] != CONFLICT_GROUP_ID:
            continue
        new_group_id = f"sha256:{row['sha256']}"
        resolution_rows.append(
            {
                "image_path": row["image_path"],
                "compound_label": row["compound_label"],
                "sha256": row["sha256"],
                "phash": row["phash"],
                "old_group_id": row["group_id"],
                "new_group_id": new_group_id,
                "split": row["split"],
                "decision": "split_false_dhash_collision_to_singleton",
                "rationale": (
                    "Visual review and grayscale similarity reject near-duplicate; "
                    "preserve image and split membership."
                ),
            }
        )
        row["group_id"] = new_group_id

    if cross_label_group_count(resolved_rows):
        raise ValueError("Vẫn còn cross-label group sau xử lý")
    leakage = {
        field: cross_split_count(resolved_rows, field)
        for field in ("image_path", "group_id", "sha256")
    }
    if any(leakage.values()):
        raise ValueError(f"Phát hiện leakage sau xử lý: {leakage}")

    group_sizes = Counter(row["group_id"] for row in resolved_rows)
    split_image_counts = Counter(row["split"] for row in resolved_rows)
    split_group_counts = {
        split: len(
            {row["group_id"] for row in resolved_rows if row["split"] == split}
        )
        for split in SPLIT_RATIOS
    }
    class_count = len({row["compound_label"] for row in resolved_rows})
    plant_count = len({row["plant"] for row in resolved_rows})
    finalized_at = datetime.now(timezone.utc).isoformat()
    source_dir = dataset_dir.parent / "v1.2"
    source_manifest = source_dir / "manifests" / "dataset_manifest.csv"

    synchronized_metadata = dict(metadata)
    synchronized_metadata.update(
        {
            "stage": "v1_3_cross_label_resolved",
            "source_dataset_dir": str(source_dir),
            "source_manifest": str(source_manifest),
            "source_valid_files": 75025,
            "source_manifest_sha256": calculate_sha256(source_manifest),
            "copied_files": len(resolved_rows),
            "classes": class_count,
            "group_count": len(group_sizes),
            "multi_member_group_count": sum(size > 1 for size in group_sizes.values()),
            "multi_member_file_count": sum(
                size for size in group_sizes.values() if size > 1
            ),
            "largest_group_size": max(group_sizes.values()),
            "cross_label_group_count": 0,
            "split_image_counts": dict(split_image_counts),
            "split_group_counts": split_group_counts,
            "split_leakage_group_count": 0,
            "active_image_count": len(resolved_rows),
            "resize_operation_counts": {
                "resize_only": 71860,
                "resize_and_pad": 5772,
                "copy_same_size": 4441,
            },
            "total_files": len(resolved_rows),
            "total_plants": plant_count,
            "total_classes": class_count,
            "leakage_group_count": 0,
            "v1_3_cross_label_resolution": {
                "resolved_at_utc": finalized_at,
                "old_group_id": CONFLICT_GROUP_ID,
                "decision": "split_false_dhash_collision_to_singletons",
                "files_reviewed": len(resolution_rows),
                "files_quarantined": 0,
                "images_removed": 0,
            },
            "v1_3_exact_audit": {
                "audited_at_utc": finalized_at,
                "manifest_rows": len(resolved_rows),
                "cross_label_group_count": 0,
                "path_cross_split_count": leakage["image_path"],
                "group_id_cross_split_count": leakage["group_id"],
                "sha256_cross_split_count": leakage["sha256"],
                "all_classes_in_all_splits": all(
                    {row["split"] for row in resolved_rows if row["compound_label"] == label}
                    == set(SPLIT_RATIOS)
                    for label in {row["compound_label"] for row in resolved_rows}
                ),
            },
            "dod_status": "pending_near_duplicate_audit",
            "dod_completed_at_utc": None,
        }
    )

    total_rows = len(resolved_rows)
    summary_rows = [
        {
            "split": split,
            "target_ratio": f"{target_ratio:.2f}",
            "image_count": split_image_counts[split],
            "actual_ratio": f"{split_image_counts[split] / total_rows:.6f}",
            "group_count": split_group_counts[split],
            "class_count": len(
                {
                    row["compound_label"]
                    for row in resolved_rows
                    if row["split"] == split
                }
            ),
        }
        for split, target_ratio in SPLIT_RATIOS.items()
    ]
    audit = synchronized_metadata["v1_3_exact_audit"]
    return resolved_rows, synchronized_metadata, resolution_rows, summary_rows, audit


def apply_outputs(
    dataset_dir: Path,
    rows: list[dict[str, str]],
    metadata: dict[str, object],
    resolution_rows: list[dict[str, object]],
    summary_rows: list[dict[str, object]],
    audit: dict[str, object],
) -> None:
    reports_dir = dataset_dir / "reports"
    backup_dir = reports_dir / "step_v1_3_backup_before_cross_label_resolution"
    resolution_path = reports_dir / "cross_label_group_resolution.csv"
    audit_path = reports_dir / "v1_3_final_audit.json"
    if backup_dir.exists() or resolution_path.exists() or audit_path.exists():
        raise FileExistsError("Artifact finalization v1.3 đã tồn tại; không áp dụng lại")

    mutable_paths = [
        dataset_dir / "manifests" / "dataset_manifest.csv",
        *(dataset_dir / "manifests" / f"{split}.csv" for split in SPLIT_RATIOS),
        dataset_dir / "metadata" / "dataset_version.json",
        reports_dir / "split_summary.csv",
        reports_dir / "split_leakage_check.csv",
    ]
    backup_dir.mkdir(parents=True)
    for path in mutable_paths:
        shutil.copy2(path, backup_dir / path.name)

    write_csv(dataset_dir / "manifests" / "dataset_manifest.csv", MANIFEST_FIELDS, rows)
    for split in SPLIT_RATIOS:
        write_csv(
            dataset_dir / "manifests" / f"{split}.csv",
            MANIFEST_FIELDS,
            [row for row in rows if row["split"] == split],
        )
    write_csv(reports_dir / "split_summary.csv", SUMMARY_FIELDS, summary_rows)
    write_csv(reports_dir / "split_leakage_check.csv", LEAKAGE_FIELDS, [])
    write_csv(resolution_path, RESOLUTION_FIELDS, resolution_rows)
    audit_path.write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (dataset_dir / "metadata" / "dataset_version.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def finalize(dataset_dir: Path, apply: bool) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    rows, metadata = validate_source(dataset_dir)
    outputs = build_outputs(dataset_dir, rows, metadata)
    resolved_rows, synchronized_metadata, resolution_rows, summary_rows, audit = outputs
    result = {
        "mode": "apply" if apply else "dry_run",
        "images": len(resolved_rows),
        "groups": synchronized_metadata["group_count"],
        "classes": synchronized_metadata["classes"],
        "cross_label_groups": 0,
        "split_image_counts": synchronized_metadata["split_image_counts"],
        "split_group_counts": synchronized_metadata["split_group_counts"],
        "leakage_group_count": 0,
    }
    if apply:
        apply_outputs(dataset_dir, *outputs)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(json.dumps(finalize(args.dataset_dir, args.apply), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
