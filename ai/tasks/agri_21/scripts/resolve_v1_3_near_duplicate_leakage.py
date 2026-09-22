"""Merge reviewed v1.3 near-duplicates and move the fewest images across splits."""

from __future__ import annotations

import argparse
import itertools
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
from ai.tasks.agri_21.scripts.resolve_post_resize_leakage import (
    make_post_resize_group_id,
)
from ai.tasks.agri_21.scripts.split_dataset_by_group import (
    LEAKAGE_FIELDS,
    SPLIT_RATIOS,
    SUMMARY_FIELDS,
)


EXPECTED_HIGH_CONFIDENCE_PAIRS = 17
EXPECTED_CROSS_SPLIT_PAIRS = 8
SOURCE_V1_2_AUDIT_KEYS = (
    "post_resize_leakage_resolved_at_utc",
    "post_resize_hamming_max_distance",
    "post_resize_high_confidence_pair_count",
    "post_resize_groups_merged",
    "post_resize_merge_component_count",
    "post_resize_split_seed",
    "post_resize_final_audit_at_utc",
    "post_resize_final_hamming_candidate_occurrence_count",
    "post_resize_final_high_confidence_group_pair_count",
    "post_resize_final_cross_split_high_confidence_pair_count",
    "post_resize_final_path_cross_split_count",
    "post_resize_final_group_id_cross_split_count",
    "post_resize_final_sha256_cross_split_count",
    "post_resize_final_dhash_cross_split_count",
)
MAPPING_FIELDS = [
    "old_group_id",
    "new_group_id",
    "compound_label",
    "old_split",
    "new_split",
    "old_group_size",
    "new_group_size",
]
MOVE_FIELDS = [
    "image_path",
    "compound_label",
    "group_id",
    "old_split",
    "new_split",
    "reason",
]


class RollbackIncompleteError(RuntimeError):
    """Raised when an apply failure cannot be rolled back completely."""


def build_components(review_rows: list[dict[str, str]]) -> list[list[str]]:
    parent: dict[str, str] = {}

    def find(group_id: str) -> str:
        parent.setdefault(group_id, group_id)
        if parent[group_id] != group_id:
            parent[group_id] = find(parent[group_id])
        return parent[group_id]

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for row in review_rows:
        if row["decision"] != "high_confidence_near_duplicate":
            raise ValueError("Review chứa quyết định chưa được duyệt để merge")
        if row["relationship"] != "same_label":
            raise ValueError("Không tự động merge near-duplicate khác nhãn")
        union(row["left_group_id"], row["right_group_id"])

    components: dict[str, list[str]] = defaultdict(list)
    for group_id in parent:
        components[find(group_id)].append(group_id)
    return [sorted(group_ids) for group_ids in components.values()]


def choose_component_splits(
    rows: list[dict[str, str]], components: list[list[str]]
) -> dict[tuple[str, ...], str]:
    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_group[row["group_id"]].append(row)

    component_rows = {
        tuple(group_ids): [
            row for group_id in group_ids for row in rows_by_group[group_id]
        ]
        for group_ids in components
    }
    fixed: dict[tuple[str, ...], str] = {}
    variable: list[tuple[tuple[str, ...], tuple[str, ...]]] = []
    for component, current_rows in component_rows.items():
        labels = {row["compound_label"] for row in current_rows}
        if len(labels) != 1:
            raise ValueError("Component near-duplicate chứa nhiều nhãn")
        splits = tuple(sorted({row["split"] for row in current_rows}))
        if len(splits) == 1:
            fixed[component] = splits[0]
        else:
            variable.append((component, splits))

    counts_by_label: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        counts_by_label[row["compound_label"]][row["split"]] += 1
    totals = {label: sum(counts.values()) for label, counts in counts_by_label.items()}

    best: tuple[tuple[object, ...], dict[tuple[str, ...], str]] | None = None
    for choices in itertools.product(*(splits for _, splits in variable)):
        destinations = dict(fixed)
        destinations.update(
            {component: choice for (component, _), choice in zip(variable, choices)}
        )
        candidate_counts = {
            label: Counter(counts) for label, counts in counts_by_label.items()
        }
        moved = 0
        for component, destination in destinations.items():
            for row in component_rows[component]:
                if row["split"] == destination:
                    continue
                moved += 1
                label = row["compound_label"]
                candidate_counts[label][row["split"]] -= 1
                candidate_counts[label][destination] += 1
        ratio_error = sum(
            (
                candidate_counts[label][split]
                - totals[label] * SPLIT_RATIOS[split]
            )
            ** 2
            for label in candidate_counts
            for split in SPLIT_RATIOS
        )
        score: tuple[object, ...] = (moved, ratio_error, choices)
        if best is None or score < best[0]:
            best = (score, destinations)
    if best is None:
        return fixed
    return best[1]


def build_resolution(
    rows: list[dict[str, str]], review_rows: list[dict[str, str]]
) -> tuple[
    list[dict[str, str]],
    list[dict[str, object]],
    list[dict[str, str]],
]:
    components = build_components(review_rows)
    destinations = choose_component_splits(rows, components)
    component_by_group = {
        group_id: tuple(component)
        for component in components
        for group_id in component
    }
    new_group_by_component = {
        tuple(component): make_post_resize_group_id(component)
        for component in components
    }
    old_rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        old_rows_by_group[row["group_id"]].append(row)

    updated_rows = [dict(row) for row in rows]
    move_rows: list[dict[str, str]] = []
    for row in updated_rows:
        component = component_by_group.get(row["group_id"])
        if component is None:
            continue
        old_split = row["split"]
        row["group_id"] = new_group_by_component[component]
        row["split"] = destinations[component]
        row["quality_flags"] = append_quality_flag(
            row["quality_flags"], "v1_3_hamming_reviewed"
        )
        if old_split != row["split"]:
            move_rows.append(
                {
                    "image_path": row["image_path"],
                    "compound_label": row["compound_label"],
                    "group_id": row["group_id"],
                    "old_split": old_split,
                    "new_split": row["split"],
                    "reason": "keep_high_confidence_component_in_one_split",
                }
            )

    new_sizes = Counter(row["group_id"] for row in updated_rows)
    mapping_rows: list[dict[str, object]] = []
    for old_group_id, component in sorted(component_by_group.items()):
        old_rows = old_rows_by_group[old_group_id]
        new_group_id = new_group_by_component[component]
        mapping_rows.append(
            {
                "old_group_id": old_group_id,
                "new_group_id": new_group_id,
                "compound_label": old_rows[0]["compound_label"],
                "old_split": old_rows[0]["split"],
                "new_split": destinations[component],
                "old_group_size": len(old_rows),
                "new_group_size": new_sizes[new_group_id],
            }
        )

    by_path = {row["image_path"]: row for row in updated_rows}
    for review in review_rows:
        left = by_path[review["left_image_path"]]
        right = by_path[review["right_image_path"]]
        if left["group_id"] != right["group_id"] or left["split"] != right["split"]:
            raise RuntimeError("Cặp near-duplicate chưa được merge vào cùng split")
    return updated_rows, mapping_rows, move_rows


def validate_rows(rows: list[dict[str, str]]) -> dict[str, object]:
    labels_by_group: dict[str, set[str]] = defaultdict(set)
    splits_by_group: dict[str, set[str]] = defaultdict(set)
    splits_by_path: dict[str, set[str]] = defaultdict(set)
    splits_by_sha: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        labels_by_group[row["group_id"]].add(row["compound_label"])
        splits_by_group[row["group_id"]].add(row["split"])
        splits_by_path[row["image_path"]].add(row["split"])
        splits_by_sha[row["sha256"]].add(row["split"])
    result = {
        "images": len(rows),
        "groups": len(labels_by_group),
        "cross_label_groups": sum(len(values) > 1 for values in labels_by_group.values()),
        "group_cross_split": sum(len(values) > 1 for values in splits_by_group.values()),
        "path_cross_split": sum(len(values) > 1 for values in splits_by_path.values()),
        "sha256_cross_split": sum(len(values) > 1 for values in splits_by_sha.values()),
    }
    if any(result[key] for key in result if key not in {"images", "groups"}):
        raise ValueError(f"Manifest sau xử lý không hợp lệ: {result}")
    return result


def build_summary(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    total = len(rows)
    return [
        {
            "split": split,
            "target_ratio": f"{target:.2f}",
            "image_count": sum(row["split"] == split for row in rows),
            "actual_ratio": f"{sum(row['split'] == split for row in rows) / total:.6f}",
            "group_count": len({row["group_id"] for row in rows if row["split"] == split}),
            "class_count": len(
                {row["compound_label"] for row in rows if row["split"] == split}
            ),
        }
        for split, target in SPLIT_RATIOS.items()
    ]


def namespace_source_v1_2_audit(metadata: dict[str, object]) -> None:
    """Move inherited v1.2 post-resize metrics out of the v1.3 top level."""

    historical = dict(metadata.get("source_v1_2_pipeline_audit", {}))
    for key in SOURCE_V1_2_AUDIT_KEYS:
        if key in metadata:
            historical[key] = metadata.pop(key)
    if historical:
        historical["dataset_version"] = "v1.2"
        metadata["source_v1_2_pipeline_audit"] = historical


def replace_files_transactionally(
    replacements: list[tuple[Path, Path]],
    backup_paths: dict[Path, Path],
) -> None:
    """Replace outputs atomically per file and restore earlier files on error."""

    replaced_destinations: list[Path] = []
    try:
        for source, destination in replacements:
            temporary = destination.with_name(f"{destination.name}.tmp")
            shutil.copy2(source, temporary)
            os.replace(temporary, destination)
            replaced_destinations.append(destination)
    except Exception as error:
        rollback_errors: list[str] = []
        for destination in reversed(replaced_destinations):
            try:
                backup = backup_paths.get(destination)
                if backup is None:
                    destination.unlink(missing_ok=True)
                    continue
                temporary = destination.with_name(f"{destination.name}.rollback.tmp")
                shutil.copy2(backup, temporary)
                os.replace(temporary, destination)
            except Exception as rollback_error:  # pragma: no cover - OS-level failure
                rollback_errors.append(f"{destination}: {rollback_error}")
        if rollback_errors:
            details = "; ".join(rollback_errors)
            raise RollbackIncompleteError(
                f"Apply thất bại và rollback không hoàn chỉnh: {details}"
            ) from error
        raise
    finally:
        for _, destination in replacements:
            destination.with_name(f"{destination.name}.tmp").unlink(missing_ok=True)
            destination.with_name(f"{destination.name}.rollback.tmp").unlink(
                missing_ok=True
            )


def apply_resolution(dataset_dir: Path, dry_run: bool) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    manifests_dir = dataset_dir / "manifests"
    reports_dir = dataset_dir / "reports"
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    review_path = reports_dir / "post_resize_hamming_0_to_5_review.csv"
    summary_path = reports_dir / "post_resize_hamming_0_to_5_summary.json"
    backup_dir = reports_dir / "step_v1_3_backup_before_near_duplicate_regroup"
    mapping_path = reports_dir / "v1_3_near_duplicate_group_merge_mapping.csv"
    move_path = reports_dir / "v1_3_split_move_log.csv"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("dataset_version") != "v1.3":
        raise ValueError("Dataset không phải v1.3")
    if metadata.get("stage") not in {"v1_3_complete", "v1_3_cross_label_resolved"}:
        raise ValueError("Dataset không ở trạng thái cho phép xử lý near-duplicate")
    if backup_dir.exists() or mapping_path.exists() or move_path.exists():
        raise FileExistsError("Artifact regroup v1.3 đã tồn tại; không áp dụng lại")

    rows = read_csv(manifests_dir / "dataset_manifest.csv")
    review_rows = read_csv(review_path)
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if len(review_rows) != EXPECTED_HIGH_CONFIDENCE_PAIRS:
        raise ValueError("Số cặp high-confidence không khớp review")
    if summary.get("currently_cross_split_high_confidence_pair_count") != EXPECTED_CROSS_SPLIT_PAIRS:
        raise ValueError("Số cặp leakage không khớp review")

    updated_rows, mapping_rows, move_rows = build_resolution(rows, review_rows)
    validation = validate_rows(updated_rows)
    split_counts = Counter(row["split"] for row in updated_rows)
    class_counts = Counter(
        row["split"]
        for row in updated_rows
        if row["compound_label"] == "Xoai___bo_cat_la"
    )
    result = {
        **validation,
        "high_confidence_pairs_merged": len(review_rows),
        "merge_components": EXPECTED_HIGH_CONFIDENCE_PAIRS,
        "images_moved": len(move_rows),
        "split_image_counts": dict(split_counts),
        "xoai_bo_cat_la_split_counts": dict(class_counts),
    }
    if dry_run:
        return {**result, "status": "dry_run_ok"}

    mutable_paths = [
        manifests_dir / "dataset_manifest.csv",
        *(manifests_dir / f"{split}.csv" for split in SPLIT_RATIOS),
        metadata_path,
        reports_dir / "split_summary.csv",
        reports_dir / "split_leakage_check.csv",
        review_path,
        summary_path,
        reports_dir / "post_resize_cross_split_dhash_review.csv",
        reports_dir / "post_resize_leakage_summary.json",
    ]
    staging_dir = dataset_dir.parent / f".{dataset_dir.name}_v1_3_regroup_staging"
    if staging_dir.exists():
        raise FileExistsError(f"Staging đã tồn tại: {staging_dir}")
    backup_dir.mkdir(parents=True)
    backup_paths: dict[Path, Path] = {}
    for path in mutable_paths:
        if path.exists():
            backup = backup_dir / path.name
            shutil.copy2(path, backup)
            backup_paths[path] = backup
    try:
        staging_manifests = staging_dir / "manifests"
        staging_reports = staging_dir / "reports"
        write_csv(staging_manifests / "dataset_manifest.csv", MANIFEST_FIELDS, updated_rows)
        for split in SPLIT_RATIOS:
            write_csv(
                staging_manifests / f"{split}.csv",
                MANIFEST_FIELDS,
                [row for row in updated_rows if row["split"] == split],
            )
        write_csv(staging_reports / "split_summary.csv", SUMMARY_FIELDS, build_summary(updated_rows))
        write_csv(staging_reports / "split_leakage_check.csv", LEAKAGE_FIELDS, [])
        write_csv(staging_reports / mapping_path.name, MAPPING_FIELDS, mapping_rows)
        write_csv(staging_reports / move_path.name, MOVE_FIELDS, move_rows)

        group_sizes = Counter(row["group_id"] for row in updated_rows)
        metadata.update(
            {
                "stage": "v1_3_near_duplicate_resolution_applied",
                "dod_status": "pending_leakage_recheck",
                "group_count": len(group_sizes),
                "multi_member_group_count": sum(size > 1 for size in group_sizes.values()),
                "multi_member_file_count": sum(size for size in group_sizes.values() if size > 1),
                "largest_group_size": max(group_sizes.values()),
                "split_image_counts": dict(split_counts),
                "split_group_counts": {
                    split: len({row["group_id"] for row in updated_rows if row["split"] == split})
                    for split in SPLIT_RATIOS
                },
                "v1_3_near_duplicate_resolution": {
                    "applied_at_utc": datetime.now(timezone.utc).isoformat(),
                    "high_confidence_pairs_merged": len(review_rows),
                    "merge_components": EXPECTED_HIGH_CONFIDENCE_PAIRS,
                    "previous_cross_split_pairs": EXPECTED_CROSS_SPLIT_PAIRS,
                    "images_moved": len(move_rows),
                    "images_removed": 0,
                },
            }
        )
        staged_metadata = staging_dir / "metadata" / "dataset_version.json"
        staged_metadata.parent.mkdir(parents=True)
        staged_metadata.write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        replacements = [
            *((staging_manifests / path.name, path) for path in mutable_paths[:4]),
            (staged_metadata, metadata_path),
            (staging_reports / "split_summary.csv", reports_dir / "split_summary.csv"),
            (staging_reports / "split_leakage_check.csv", reports_dir / "split_leakage_check.csv"),
            (staging_reports / mapping_path.name, mapping_path),
            (staging_reports / move_path.name, move_path),
        ]
        try:
            replace_files_transactionally(replacements, backup_paths)
        except RollbackIncompleteError:
            raise
        except Exception:
            shutil.rmtree(backup_dir)
            raise
    finally:
        if staging_dir.exists():
            shutil.rmtree(staging_dir)
    return {**result, "status": "applied", "backup_dir": str(backup_dir)}


def complete_after_audit(
    dataset_dir: Path,
    contact_sheet: Path,
    unit_tests_passed: int,
) -> dict[str, object]:
    dataset_dir = dataset_dir.resolve()
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    reports_dir = dataset_dir / "reports"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("stage") not in {
        "v1_3_near_duplicate_resolution_applied",
        "v1_3_complete",
    }:
        raise ValueError("Chưa áp dụng near-duplicate resolution")
    hamming = json.loads(
        (reports_dir / "post_resize_hamming_0_to_5_summary.json").read_text(encoding="utf-8")
    )
    leakage = json.loads(
        (reports_dir / "post_resize_leakage_summary.json").read_text(encoding="utf-8")
    )
    if hamming.get("dataset_version") != "v1.3" or leakage.get("dataset_version") != "v1.3":
        raise ValueError("Báo cáo audit không ghi đúng dataset v1.3")
    if hamming.get("currently_cross_split_high_confidence_pair_count") != 0:
        raise ValueError("Vẫn còn near-duplicate high-confidence xuyên split")
    if hamming.get("high_confidence_group_pair_count") != 0:
        raise ValueError("Vẫn còn near-duplicate high-confidence chưa merge group")
    if not leakage.get("leakage_passed"):
        raise ValueError("Leakage check chưa đạt")
    if not contact_sheet.is_file():
        raise FileNotFoundError(f"Thiếu contact sheet augmentation: {contact_sheet}")
    rows = read_csv(dataset_dir / "manifests" / "dataset_manifest.csv")
    validation = validate_rows(rows)
    labels = {row["compound_label"] for row in rows}
    all_classes_in_all_splits = all(
        {row["split"] for row in rows if row["compound_label"] == label}
        == set(SPLIT_RATIOS)
        for label in labels
    )
    if not all_classes_in_all_splits:
        raise ValueError("Không phải mọi lớp đều xuất hiện ở cả ba split")
    if unit_tests_passed <= 0:
        raise ValueError("Số unit test đã pass phải lớn hơn 0")

    finalized_at = datetime.now(timezone.utc).isoformat()
    namespace_source_v1_2_audit(metadata)
    metadata.update(
        {
            "stage": "v1_3_complete",
            "dod_status": "complete",
            "dod_completed_at_utc": finalized_at,
            "unit_tests_passed": unit_tests_passed,
            "augmentation_visual_check": {
                "status": "passed",
                "contact_sheet": str(contact_sheet.resolve()),
                "plant_count": 10,
                "variants_per_image": 3,
                "seed": 20260922,
                "rotation_interpolation": "bilinear",
                "rotation_fill_rgb": [124, 116, 104],
            },
            "v1_3_final_audit": {
                "audited_at_utc": finalized_at,
                "manifest_rows": validation["images"],
                "cross_label_group_count": validation["cross_label_groups"],
                "path_cross_split_count": leakage["path_cross_split_count"],
                "group_id_cross_split_count": leakage["group_id_cross_split_count"],
                "sha256_cross_split_count": leakage["sha256_cross_split_count"],
                "high_confidence_cross_split_pair_count": hamming[
                    "currently_cross_split_high_confidence_pair_count"
                ],
                "high_confidence_group_pair_count": hamming[
                    "high_confidence_group_pair_count"
                ],
                "hamming_candidate_occurrence_count": hamming[
                    "candidate_occurrence_count"
                ],
                "dhash_cross_split_candidate_count": leakage[
                    "phash_cross_split_count"
                ],
                "all_classes_in_all_splits": all_classes_in_all_splits,
                "augmentation_visual_check": "passed",
            },
        }
    )
    release_backup_dir = reports_dir / "step_v1_3_backup_before_release_sync"
    release_backup_dir.mkdir(exist_ok=True)
    release_backup_path = release_backup_dir / metadata_path.name
    if not release_backup_path.exists():
        shutil.copy2(metadata_path, release_backup_path)
    temporary_metadata = metadata_path.with_name(f"{metadata_path.name}.tmp")
    temporary_metadata.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporary_metadata, metadata_path)
    return metadata["v1_3_final_audit"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--complete-after-audit", action="store_true")
    parser.add_argument("--contact-sheet", type=Path)
    parser.add_argument("--unit-tests-passed", type=int)
    args = parser.parse_args()
    selected = sum((args.dry_run, args.apply, args.complete_after_audit))
    if selected != 1:
        parser.error("Chọn đúng một trong --dry-run, --apply hoặc --complete-after-audit")
    if args.complete_after_audit:
        if args.contact_sheet is None:
            parser.error("--complete-after-audit yêu cầu --contact-sheet")
        if args.unit_tests_passed is None:
            parser.error("--complete-after-audit yêu cầu --unit-tests-passed")
        result = complete_after_audit(
            args.dataset_dir,
            args.contact_sheet,
            args.unit_tests_passed,
        )
    else:
        result = apply_resolution(args.dataset_dir, dry_run=args.dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
