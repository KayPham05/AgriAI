from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import (
    MANIFEST_FIELDS,
    append_quality_flag,
    read_csv,
    write_csv,
)
from ai.tasks.agri_21.scripts.split_dataset_by_group import (
    DEFAULT_SEED,
    split_dataset_by_group,
)


MERGE_MAPPING_FIELDS = [
    "old_group_id",
    "new_group_id",
    "compound_label",
    "old_group_size",
    "new_group_size",
]


def make_post_resize_group_id(group_ids: list[str]) -> str:
    key = "|".join(sorted(group_ids))
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return f"grp_post_resize_{digest}"


def plan_group_merges(
    rows: list[dict[str, str]],
    review_rows: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[dict[str, object]], dict[str, int]]:
    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_group[row["group_id"]].append(row)

    parent: dict[str, str] = {}

    def find(group_id: str) -> str:
        parent.setdefault(group_id, group_id)
        if parent[group_id] != group_id:
            parent[group_id] = find(parent[group_id])
        return parent[group_id]

    def union(left_group_id: str, right_group_id: str) -> None:
        left_root = find(left_group_id)
        right_root = find(right_group_id)
        if left_root != right_root:
            parent[right_root] = left_root

    for review in review_rows:
        if review["decision"] != "high_confidence_near_duplicate":
            continue
        if review["relationship"] != "same_label":
            raise ValueError("Không tự động gộp cặp near-duplicate khác nhãn")
        union(review["left_group_id"], review["right_group_id"])

    components: dict[str, list[str]] = defaultdict(list)
    for group_id in parent:
        components[find(group_id)].append(group_id)

    new_group_id_by_old: dict[str, str] = {}
    for component_group_ids in components.values():
        labels = {
            row["compound_label"]
            for group_id in component_group_ids
            for row in rows_by_group[group_id]
        }
        if len(labels) != 1:
            raise ValueError("Component hậu-resize chứa nhiều nhãn")
        new_group_id = make_post_resize_group_id(component_group_ids)
        for group_id in component_group_ids:
            new_group_id_by_old[group_id] = new_group_id

    updated_rows = [dict(row) for row in rows]
    for row in updated_rows:
        old_group_id = row["group_id"]
        if old_group_id in new_group_id_by_old:
            row["group_id"] = new_group_id_by_old[old_group_id]
            row["quality_flags"] = append_quality_flag(
                row["quality_flags"], "post_resize_hamming_reviewed"
            )
        row["split"] = ""

    new_sizes = Counter(row["group_id"] for row in updated_rows)
    mapping_rows: list[dict[str, object]] = []
    for old_group_id, new_group_id in sorted(new_group_id_by_old.items()):
        old_rows = rows_by_group[old_group_id]
        mapping_rows.append(
            {
                "old_group_id": old_group_id,
                "new_group_id": new_group_id,
                "compound_label": old_rows[0]["compound_label"],
                "old_group_size": len(old_rows),
                "new_group_size": new_sizes[new_group_id],
            }
        )

    stats = {
        "groups_before": len(rows_by_group),
        "groups_after": len(new_sizes),
        "groups_merged": len(new_group_id_by_old),
        "merge_components": len(components),
    }
    return updated_rows, mapping_rows, stats


def resolve_post_resize_leakage(
    dataset_dir: Path,
    seed: int = DEFAULT_SEED,
    dry_run: bool = False,
) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    manifest_dir = dataset_dir / "manifests"
    reports_dir = dataset_dir / "reports"
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    review_path = reports_dir / "post_resize_hamming_0_to_5_review.csv"
    backup_dir = reports_dir / "step6_backup_before_post_resize_regroup"
    staging_dir = dataset_dir.parent / f".{dataset_dir.name}_post_resize_resplit"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("stage") != "resized_224_letterbox_complete":
        raise ValueError("Dataset không ở trạng thái resized_224_letterbox_complete")
    if backup_dir.exists():
        raise FileExistsError(f"Backup hậu-resize đã tồn tại: {backup_dir}")
    if staging_dir.exists():
        raise FileExistsError(f"Staging hậu-resize đã tồn tại: {staging_dir}")

    rows = read_csv(manifest_dir / "dataset_manifest.csv")
    review_rows = read_csv(review_path)
    updated_rows, mapping_rows, stats = plan_group_merges(rows, review_rows)
    result: dict[str, object] = {
        **stats,
        "high_confidence_pairs": len(review_rows),
        "seed": seed,
    }
    if dry_run:
        return {**result, "status": "dry_run_ok"}

    staging_manifest_dir = staging_dir / "manifests"
    staging_metadata_dir = staging_dir / "metadata"
    staging_reports_dir = staging_dir / "reports"
    staging_manifest_dir.mkdir(parents=True)
    staging_metadata_dir.mkdir()
    staging_reports_dir.mkdir()
    try:
        write_csv(
            staging_manifest_dir / "dataset_manifest.csv",
            MANIFEST_FIELDS,
            updated_rows,
        )
        staging_metadata = {
            **metadata,
            "stage": "hamming_near_duplicate_review_complete",
        }
        (staging_metadata_dir / "dataset_version.json").write_text(
            json.dumps(staging_metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        split_result = split_dataset_by_group(staging_dir, seed=seed)
        split_rows = read_csv(staging_manifest_dir / "dataset_manifest.csv")
        split_by_path = {row["image_path"]: row for row in split_rows}
        for review in review_rows:
            left = split_by_path[review["left_image_path"]]
            right = split_by_path[review["right_image_path"]]
            if left["group_id"] != right["group_id"]:
                raise RuntimeError("Cặp high-confidence chưa được gộp cùng group_id")
            if left["split"] != right["split"]:
                raise RuntimeError("Cặp high-confidence vẫn bị chia khác split")

        final_metadata_path = staging_metadata_dir / "dataset_version.json"
        final_metadata = json.loads(final_metadata_path.read_text(encoding="utf-8"))
        final_metadata.update(
            {
                "stage": "post_resize_group_aware_split_complete",
                "post_resize_leakage_resolved_at_utc": datetime.now(
                    timezone.utc
                ).isoformat(),
                "post_resize_hamming_max_distance": 5,
                "post_resize_high_confidence_pair_count": len(review_rows),
                "post_resize_groups_merged": stats["groups_merged"],
                "post_resize_merge_component_count": stats["merge_components"],
                "group_count": stats["groups_after"],
                "post_resize_split_seed": seed,
                "group_ids_preserved": False,
                "split_membership_preserved": False,
            }
        )
        final_metadata_path.write_text(
            json.dumps(final_metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        write_csv(
            staging_reports_dir / "post_resize_group_merge_mapping.csv",
            MERGE_MAPPING_FIELDS,
            mapping_rows,
        )

        backup_dir.mkdir(parents=True)
        for path in [
            manifest_dir / "dataset_manifest.csv",
            manifest_dir / "train.csv",
            manifest_dir / "val.csv",
            manifest_dir / "test.csv",
            metadata_path,
        ]:
            shutil.copy2(path, backup_dir / path.name)

        replacements = [
            *[
                (
                    staging_manifest_dir / filename,
                    manifest_dir / filename,
                )
                for filename in (
                    "dataset_manifest.csv",
                    "train.csv",
                    "val.csv",
                    "test.csv",
                )
            ],
            (final_metadata_path, metadata_path),
            *[
                (
                    staging_reports_dir / filename,
                    reports_dir / filename,
                )
                for filename in (
                    "group_split_assignments.csv",
                    "split_class_distribution.csv",
                    "split_summary.csv",
                    "split_leakage_check.csv",
                    "post_resize_group_merge_mapping.csv",
                )
            ],
        ]
        for source, destination in replacements:
            temporary = destination.with_name(f"{destination.name}.tmp")
            shutil.copy2(source, temporary)
            os.replace(temporary, destination)
    except Exception:
        print(f"Chưa áp dụng thay đổi; staging được giữ tại: {staging_dir}")
        raise
    else:
        resolved_staging = staging_dir.resolve()
        if (
            resolved_staging.parent != dataset_dir.parent.resolve()
            or resolved_staging.name != f".{dataset_dir.name}_post_resize_resplit"
        ):
            raise RuntimeError("Không xóa staging vì đường dẫn không đúng phạm vi")
        shutil.rmtree(resolved_staging)

    return {
        **result,
        "status": "applied",
        "split_result": split_result,
        "backup_dir": str(backup_dir),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gộp near-duplicate hậu-resize và chia lại theo group_id."
    )
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    result = resolve_post_resize_leakage(
        args.dataset_dir,
        seed=args.seed,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
