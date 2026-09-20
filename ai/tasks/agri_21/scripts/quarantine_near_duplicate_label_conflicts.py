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
    read_csv,
    write_csv,
)


QUARANTINE_FIELDS = [
    "image_path",
    "quarantine_path",
    "compound_label",
    "sha256",
    "dhash",
    "group_id",
    "decision",
    "rationale",
]

V1_1_CONFLICT_GROUP_IDS = {
    "grp_dhash_8b27f87a8dbdc115",
    "grp_dhash_cee252c82c557a94",
    "grp_dhash_1e7f9c636543ee60",
}


def calculate_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as input_file:
        for chunk in iter(lambda: input_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def quarantine_near_duplicate_label_conflicts(
    output_dir: Path,
    expected_group_ids: set[str],
) -> dict[str, int]:
    output_dir = output_dir.resolve()
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    reports_dir = output_dir / "reports"
    assignments_path = reports_dir / "group_id_assignments.csv"
    group_summary_path = reports_dir / "group_summary.csv"
    distribution_path = reports_dir / "class_distribution.csv"
    quarantine_report_path = reports_dir / "near_duplicate_label_quarantine.csv"
    backup_dir = reports_dir / "step3_backup_before_near_duplicate_quarantine"
    quarantine_root = output_dir / "quarantine" / "near_duplicate_label_conflicts"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("stage") != "group_ids_assigned":
        raise ValueError("Output không ở trạng thái group_ids_assigned")
    if backup_dir.exists() or quarantine_report_path.exists():
        raise FileExistsError("Bước cách ly đã có artifact; không áp dụng lại")

    manifest_rows = read_csv(manifest_path)
    conflict_rows = [
        row
        for row in manifest_rows
        if "near_duplicate_label_conflict_reviewed"
        in row["quality_flags"].split(";")
    ]
    conflict_group_ids = {row["group_id"] for row in conflict_rows}
    if conflict_group_ids != expected_group_ids:
        raise ValueError("Các group_id xung đột không khớp danh sách dự kiến")

    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in conflict_rows:
        rows_by_group[row["group_id"]].append(row)
    for group_id, rows in rows_by_group.items():
        if len(rows) != 2 or len({row["compound_label"] for row in rows}) != 2:
            raise ValueError(f"Nhóm không phải một cặp xung đột: {group_id}")

    file_moves: list[tuple[Path, Path, str]] = []
    for row in conflict_rows:
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

    conflict_paths = {row["image_path"] for row in conflict_rows}
    active_manifest_rows = [
        row for row in manifest_rows if row["image_path"] not in conflict_paths
    ]
    assignment_rows = [
        row
        for row in read_csv(assignments_path)
        if row["image_path"] not in conflict_paths
    ]
    group_summary_rows = [
        row
        for row in read_csv(group_summary_path)
        if row["group_id"] not in conflict_group_ids
    ]

    quarantine_counts = Counter(row["compound_label"] for row in conflict_rows)
    distribution_rows = read_csv(distribution_path)
    distribution_fields = list(distribution_rows[0])
    quarantine_field = "near_duplicate_label_conflict_files_quarantined"
    if quarantine_field not in distribution_fields:
        distribution_fields.append(quarantine_field)
    for row in distribution_rows:
        quarantined = quarantine_counts[row["compound_label"]]
        row["copied_files"] = str(int(row["copied_files"]) - quarantined)
        row[quarantine_field] = str(quarantined)

    quarantine_rows = []
    for row in sorted(conflict_rows, key=lambda item: item["image_path"]):
        quarantine_rows.append(
            {
                "image_path": row["image_path"],
                "quarantine_path": str(
                    Path("quarantine")
                    / "near_duplicate_label_conflicts"
                    / row["image_path"]
                ).replace("\\", "/"),
                "compound_label": row["compound_label"],
                "sha256": row["sha256"],
                "dhash": row["phash"],
                "group_id": row["group_id"],
                "decision": "quarantine_both_labels",
                "rationale": (
                    "Cùng ảnh gốc xuất hiện ở Vang_la và Xoan_la; "
                    "triệu chứng chồng lấn, không ép chọn nhãn."
                ),
            }
        )

    write_csv(manifest_path, MANIFEST_FIELDS, active_manifest_rows)
    write_csv(assignments_path, ASSIGNMENT_FIELDS, assignment_rows)
    write_csv(group_summary_path, GROUP_SUMMARY_FIELDS, group_summary_rows)
    write_csv(distribution_path, distribution_fields, distribution_rows)
    write_csv(quarantine_report_path, QUARANTINE_FIELDS, quarantine_rows)

    multi_member_group_count = sum(
        int(row["group_size"]) > 1 for row in group_summary_rows
    )
    multi_member_file_count = sum(
        int(row["group_size"])
        for row in group_summary_rows
        if int(row["group_size"]) > 1
    )
    metadata.update(
        {
            "stage": "group_ids_assigned_and_near_duplicate_conflicts_quarantined",
            "near_duplicate_conflicts_quarantined_at_utc": datetime.now(
                timezone.utc
            ).isoformat(),
            "copied_files": len(active_manifest_rows),
            "group_count": len(group_summary_rows),
            "multi_member_group_count": multi_member_group_count,
            "multi_member_file_count": multi_member_file_count,
            "cross_label_group_count": 0,
            "near_duplicate_label_conflict_groups_quarantined": len(
                conflict_group_ids
            ),
            "near_duplicate_label_conflict_files_quarantined": len(
                conflict_rows
            ),
        }
    )
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return {
        "active_files": len(active_manifest_rows),
        "quarantined_groups": len(conflict_group_ids),
        "quarantined_files": len(conflict_rows),
        "groups": len(group_summary_rows),
        "cross_label_groups": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cách ly các group near-duplicate có xung đột nhãn."
    )
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    result = quarantine_near_duplicate_label_conflicts(
        args.dataset_dir,
        V1_1_CONFLICT_GROUP_IDS,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
