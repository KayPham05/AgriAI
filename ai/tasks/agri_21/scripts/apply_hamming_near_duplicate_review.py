from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import (
    ASSIGNMENT_FIELDS,
    GROUP_SUMMARY_FIELDS,
    MANIFEST_FIELDS,
    append_quality_flag,
    read_csv,
    write_csv,
)
from ai.tasks.agri_21.scripts.quarantine_near_duplicate_label_conflicts import (
    calculate_sha256,
)
from ai.tasks.agri_21.scripts.score_near_duplicate_hamming_candidates import SCORED_FIELDS


DECISION_FIELDS = [*SCORED_FIELDS, "final_decision", "rationale"]
QUARANTINE_FIELDS = [
    "image_path",
    "quarantine_path",
    "compound_label",
    "sha256",
    "dhash",
    "old_group_id",
    "decision",
    "rationale",
]

V1_1_CROSS_LABEL_DECISIONS = {
    tuple(
        sorted(
            (
                "Ngo/Dom_la_xam/Ngo_DomLaXam_00212.jpg",
                "Ngo/Chay_la/Ngo_ChayLa_00070.jpg",
            )
        )
    ): {
        "keep_path": "Ngo/Dom_la_xam/Ngo_DomLaXam_00212.jpg",
        "quarantine_path": "Ngo/Chay_la/Ngo_ChayLa_00070.jpg",
        "keep_label": "Ngo___Dom_la_xam",
        "rationale": (
            "Hai file là cùng ảnh gốc. Ảnh có nhiều vết chữ nhật hẹp, "
            "mép song song theo gân lá, phù hợp nhãn Dom_la_xam hơn Chay_la."
        ),
    }
}


def make_hamming_group_id(group_ids: list[str]) -> str:
    key = "|".join(sorted(group_ids))
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return f"grp_hamming_{digest}"


def apply_hamming_near_duplicate_review(
    output_dir: Path,
    cross_label_decisions: dict[tuple[str, str], dict[str, str]],
) -> dict[str, int]:
    output_dir = output_dir.resolve()
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    reports_dir = output_dir / "reports"
    assignments_path = reports_dir / "group_id_assignments.csv"
    group_summary_path = reports_dir / "group_summary.csv"
    distribution_path = reports_dir / "class_distribution.csv"
    similarity_path = reports_dir / "near_duplicate_hamming_similarity_review.csv"
    candidate_path = reports_dir / "near_duplicate_hamming_candidates.csv"
    decision_path = reports_dir / "near_duplicate_hamming_decisions.csv"
    quarantine_report_path = reports_dir / "near_duplicate_hamming_quarantine.csv"
    backup_dir = reports_dir / "step4_backup_before_hamming_review"
    quarantine_root = output_dir / "quarantine" / "hamming_near_duplicate_conflicts"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    expected_stage = "group_ids_assigned_and_near_duplicate_conflicts_quarantined"
    if metadata.get("stage") != expected_stage:
        raise ValueError(f"Output không ở trạng thái {expected_stage}")
    if backup_dir.exists() or decision_path.exists() or quarantine_report_path.exists():
        raise FileExistsError("Artifact review Hamming đã tồn tại; không áp dụng lại")

    manifest_rows = read_csv(manifest_path)
    candidate_rows = read_csv(candidate_path)
    similarity_rows = read_csv(similarity_path)
    if any(row["split"] for row in manifest_rows):
        raise ValueError("Phải áp dụng review Hamming trước khi chia split")

    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in manifest_rows:
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

    high_confidence_rows = [
        row
        for row in similarity_rows
        if row["similarity_decision"] == "high_confidence_near_duplicate"
    ]
    same_label_rows = [
        row for row in high_confidence_rows if row["relationship"] == "same_label"
    ]
    cross_label_rows = [
        row for row in high_confidence_rows if row["relationship"] != "same_label"
    ]
    for row in same_label_rows:
        left_group_id = row["left_group_id"]
        right_group_id = row["right_group_id"]
        labels = {
            item["compound_label"]
            for group_id in (left_group_id, right_group_id)
            for item in rows_by_group[group_id]
        }
        if len(labels) != 1:
            raise ValueError("Chỉ được tự động gộp cặp high-confidence cùng nhãn")
        union(left_group_id, right_group_id)

    merge_components: dict[str, list[str]] = defaultdict(list)
    for group_id in parent:
        merge_components[find(group_id)].append(group_id)
    new_group_id_by_old: dict[str, str] = {}
    for component_group_ids in merge_components.values():
        new_group_id = make_hamming_group_id(component_group_ids)
        for group_id in component_group_ids:
            new_group_id_by_old[group_id] = new_group_id

    decision_by_pair = {
        tuple(sorted(pair)): decision for pair, decision in cross_label_decisions.items()
    }
    observed_cross_label_pairs = {
        tuple(sorted((row["left_sample_path"], row["right_sample_path"])))
        for row in cross_label_rows
    }
    if set(decision_by_pair) != observed_cross_label_pairs:
        raise ValueError(
            "Decision phải bao phủ đúng toàn bộ cặp khác nhãn high-confidence"
        )

    quarantine_group_ids: set[str] = set()
    cross_label_rationale_by_group: dict[str, str] = {}
    for row in cross_label_rows:
        pair = tuple(sorted((row["left_sample_path"], row["right_sample_path"])))
        decision = decision_by_pair[pair]
        row_by_path = {
            row["left_sample_path"]: row["left_group_id"],
            row["right_sample_path"]: row["right_group_id"],
        }
        keep_group_id = row_by_path[decision["keep_path"]]
        quarantine_group_id = row_by_path[decision["quarantine_path"]]
        keep_labels = {
            item["compound_label"] for item in rows_by_group[keep_group_id]
        }
        if keep_labels != {decision["keep_label"]}:
            raise ValueError("Nhãn giữ lại không khớp decision")
        quarantine_group_ids.add(quarantine_group_id)
        cross_label_rationale_by_group[quarantine_group_id] = decision["rationale"]

    quarantine_rows_source = [
        row
        for group_id in quarantine_group_ids
        for row in rows_by_group[group_id]
    ]
    file_moves: list[tuple[Path, Path, str]] = []
    for row in quarantine_rows_source:
        source = output_dir / "images" / row["image_path"]
        destination = quarantine_root / row["image_path"]
        if not source.is_file():
            raise FileNotFoundError(f"Thiếu ảnh cần cách ly: {source}")
        if destination.exists():
            raise FileExistsError(f"Ảnh quarantine đã tồn tại: {destination}")
        if calculate_sha256(source) != row["sha256"]:
            raise ValueError(f"Checksum ảnh không khớp manifest: {source}")
        file_moves.append((source, destination, row["sha256"]))

    backup_dir.mkdir(parents=True)
    for path in (
        manifest_path,
        metadata_path,
        assignments_path,
        group_summary_path,
        distribution_path,
    ):
        shutil.copy2(path, backup_dir / path.name)

    for source, destination, sha256 in file_moves:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        if calculate_sha256(destination) != sha256:
            raise ValueError(f"Checksum quarantine không khớp: {destination}")
    for source, _, _ in file_moves:
        source.unlink()

    quarantine_paths = {row["image_path"] for row in quarantine_rows_source}
    active_rows = [
        row for row in manifest_rows if row["image_path"] not in quarantine_paths
    ]
    old_group_id_by_path = {row["image_path"]: row["group_id"] for row in active_rows}
    for row in active_rows:
        old_group_id = row["group_id"]
        if old_group_id in new_group_id_by_old:
            row["group_id"] = new_group_id_by_old[old_group_id]
            row["quality_flags"] = append_quality_flag(
                row["quality_flags"], "hamming_near_duplicate_reviewed"
            )
    active_rows.sort(key=lambda row: row["image_path"])

    active_groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in active_rows:
        active_groups[row["group_id"]].append(row)
    cross_label_groups = [
        group_id
        for group_id, rows in active_groups.items()
        if len({row["compound_label"] for row in rows}) > 1
    ]
    if cross_label_groups:
        raise ValueError("Review Hamming tạo group_id chứa nhiều nhãn")

    previous_assignments = {
        row["image_path"]: row for row in read_csv(assignments_path)
    }
    assignment_rows = []
    for row in active_rows:
        group = active_groups[row["group_id"]]
        old_group_id = old_group_id_by_path[row["image_path"]]
        assignment_rows.append(
            {
                "image_path": row["image_path"],
                "compound_label": row["compound_label"],
                "sha256": row["sha256"],
                "dhash": row["phash"],
                "group_id": row["group_id"],
                "group_size": len(group),
                "grouping_rule": (
                    "reviewed_hamming_near_duplicate"
                    if old_group_id in new_group_id_by_old
                    else previous_assignments[row["image_path"]]["grouping_rule"]
                ),
            }
        )

    rules_by_group: dict[str, set[str]] = defaultdict(set)
    for row in assignment_rows:
        rules_by_group[str(row["group_id"])].add(str(row["grouping_rule"]))

    group_summary_rows = []
    for group_id, rows in sorted(active_groups.items()):
        rules = rules_by_group[group_id]
        if len(rules) != 1:
            raise ValueError(f"Nhóm có nhiều grouping_rule: {group_id}")
        group_summary_rows.append(
            {
                "group_id": group_id,
                "group_size": len(rows),
                "compound_labels": rows[0]["compound_label"],
                "dhash": ";".join(sorted({row["phash"] for row in rows})),
                "grouping_rule": next(iter(rules)),
            }
        )

    quarantine_counts = Counter(
        row["compound_label"] for row in quarantine_rows_source
    )
    distribution_rows = read_csv(distribution_path)
    distribution_fields = list(distribution_rows[0])
    quarantine_field = "hamming_label_conflict_files_quarantined"
    if quarantine_field not in distribution_fields:
        distribution_fields.append(quarantine_field)
    for row in distribution_rows:
        quarantined = quarantine_counts[row["compound_label"]]
        row["copied_files"] = str(int(row["copied_files"]) - quarantined)
        row[quarantine_field] = str(quarantined)

    decision_rows = []
    for row in similarity_rows:
        if row["similarity_decision"] != "high_confidence_near_duplicate":
            final_decision = "keep_separate_insufficient_similarity"
            rationale = "Không đạt đồng thời ngưỡng correlation và MAE đã hiệu chỉnh."
        elif row["relationship"] == "same_label":
            final_decision = "merge_same_label_groups"
            rationale = "Cùng nhãn và đạt ngưỡng near-duplicate độ tin cậy cao."
        else:
            pair = tuple(
                sorted((row["left_sample_path"], row["right_sample_path"]))
            )
            final_decision = "quarantine_wrong_label_duplicate"
            rationale = decision_by_pair[pair]["rationale"]
        decision_rows.append(
            {**row, "final_decision": final_decision, "rationale": rationale}
        )

    quarantine_report_rows = []
    for row in quarantine_rows_source:
        quarantine_report_rows.append(
            {
                "image_path": row["image_path"],
                "quarantine_path": str(
                    Path("quarantine")
                    / "hamming_near_duplicate_conflicts"
                    / row["image_path"]
                ).replace("\\", "/"),
                "compound_label": row["compound_label"],
                "sha256": row["sha256"],
                "dhash": row["phash"],
                "old_group_id": row["group_id"],
                "decision": "quarantine_wrong_label_duplicate",
                "rationale": cross_label_rationale_by_group[row["group_id"]],
            }
        )

    write_csv(manifest_path, MANIFEST_FIELDS, active_rows)
    write_csv(assignments_path, ASSIGNMENT_FIELDS, assignment_rows)
    write_csv(group_summary_path, GROUP_SUMMARY_FIELDS, group_summary_rows)
    write_csv(distribution_path, distribution_fields, distribution_rows)
    write_csv(decision_path, DECISION_FIELDS, decision_rows)
    write_csv(quarantine_report_path, QUARANTINE_FIELDS, quarantine_report_rows)

    multi_member_groups = [
        rows for rows in active_groups.values() if len(rows) > 1
    ]
    metadata.update(
        {
            "stage": "hamming_near_duplicate_review_complete",
            "grouping_method": (
                "exact_64bit_dhash_plus_reviewed_hamming_1_to_5_"
                "pixel_similarity"
            ),
            "hamming_review_completed_at_utc": datetime.now(
                timezone.utc
            ).isoformat(),
            "copied_files": len(active_rows),
            "group_count": len(active_groups),
            "multi_member_group_count": len(multi_member_groups),
            "multi_member_file_count": sum(map(len, multi_member_groups)),
            "largest_group_size": max(map(len, active_groups.values())),
            "cross_label_group_count": 0,
            "hamming_max_distance": 5,
            "hamming_min_grayscale_correlation": 0.9999,
            "hamming_max_normalized_mae": 0.005,
            "hamming_candidate_pair_count": len(candidate_rows),
            "hamming_similarity_review_row_count": len(similarity_rows),
            "hamming_high_confidence_pair_count": len(high_confidence_rows),
            "hamming_same_label_groups_merged": len(new_group_id_by_old),
            "hamming_same_label_components_created": len(merge_components),
            "hamming_label_conflict_groups_quarantined": len(
                quarantine_group_ids
            ),
            "hamming_label_conflict_files_quarantined": len(
                quarantine_rows_source
            ),
        }
    )
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return {
        "active_files": len(active_rows),
        "groups": len(active_groups),
        "merged_old_groups": len(new_group_id_by_old),
        "merged_components": len(merge_components),
        "quarantined_groups": len(quarantine_group_ids),
        "quarantined_files": len(quarantine_rows_source),
        "cross_label_groups": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Áp dụng kết quả review near-duplicate Hamming vào dataset."
    )
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    result = apply_hamming_near_duplicate_review(
        args.dataset_dir,
        V1_1_CROSS_LABEL_DECISIONS,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
