from __future__ import annotations

import argparse
import csv
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.audit_dataset import (
    MANIFEST_FIELDS,
    calculate_sha256,
    write_csv,
)


MAPPING_FIELDS = [
    "source_path",
    "canonical_path",
    "compound_label",
    "sha256",
    "action",
    "reason",
]


def read_valid_records(manifest_path: Path) -> list[dict[str, str]]:
    with manifest_path.open(encoding="utf-8-sig", newline="") as manifest_file:
        records = [
            row for row in csv.DictReader(manifest_file) if row["status"] == "valid"
        ]

    if not records:
        raise ValueError(f"Manifest không có ảnh hợp lệ: {manifest_path}")
    return sorted(records, key=lambda row: row["image_path"])


def build_exact_dedup_dataset(
    dataset_dir: Path,
    manifest_path: Path,
    output_dir: Path,
    dataset_version: str = "v1.1",
    progress_interval: int = 1_000,
) -> dict[str, int]:
    dataset_dir = dataset_dir.resolve()
    manifest_path = manifest_path.resolve()
    output_dir = output_dir.resolve()
    staging_dir = output_dir.with_name(f"{output_dir.name}.incomplete")

    if not dataset_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy dataset nguồn: {dataset_dir}")
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy manifest: {manifest_path}")
    if output_dir.exists():
        raise FileExistsError(f"Output đã tồn tại, không ghi đè: {output_dir}")
    if staging_dir.exists():
        raise FileExistsError(f"Staging chưa được xử lý: {staging_dir}")

    records = read_valid_records(manifest_path)
    records_by_sha256: dict[str, list[dict[str, str]]] = defaultdict(list)
    for record in records:
        records_by_sha256[record["sha256"]].append(record)

    staging_dir.mkdir(parents=True)
    cleaned_records: list[dict[str, object]] = []
    mapping_rows: list[dict[str, object]] = []
    class_counts: dict[str, Counter[str]] = defaultdict(Counter)
    copied_files = 0
    duplicate_files_skipped = 0
    conflict_files_quarantined = 0
    conflict_hashes = 0

    for sha256, group in sorted(records_by_sha256.items()):
        labels = {record["compound_label"] for record in group}
        if len(labels) > 1:
            conflict_hashes += 1
            conflict_files_quarantined += len(group)
            for record in group:
                class_counts[record["compound_label"]]["source_files"] += 1
                class_counts[record["compound_label"]]["label_conflict_files"] += 1
                mapping_rows.append(
                    {
                        "source_path": record["image_path"],
                        "canonical_path": "",
                        "compound_label": record["compound_label"],
                        "sha256": sha256,
                        "action": "quarantined_label_conflict",
                        "reason": "same_sha256_multiple_labels",
                    }
                )
            continue

        canonical = group[0]
        source_path = dataset_dir / Path(canonical["image_path"])
        destination_path = staging_dir / "images" / Path(canonical["image_path"])
        if not source_path.is_file():
            raise FileNotFoundError(f"Thiếu ảnh nguồn: {source_path}")

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination_path)
        if calculate_sha256(destination_path) != sha256:
            raise ValueError(f"Checksum không khớp sau khi copy: {destination_path}")

        copied_files += 1
        cleaned_record: dict[str, object] = dict(canonical)
        cleaned_record["group_id"] = f"sha256:{sha256}"
        cleaned_record["split"] = ""
        cleaned_records.append(cleaned_record)

        for index, record in enumerate(group):
            label_counts = class_counts[record["compound_label"]]
            label_counts["source_files"] += 1
            if index == 0:
                label_counts["copied_files"] += 1
                action = "copied_canonical"
                reason = "first_path_for_sha256"
            else:
                label_counts["exact_duplicate_files_skipped"] += 1
                duplicate_files_skipped += 1
                action = "skipped_exact_duplicate"
                reason = "same_sha256_as_canonical"

            mapping_rows.append(
                {
                    "source_path": record["image_path"],
                    "canonical_path": canonical["image_path"],
                    "compound_label": record["compound_label"],
                    "sha256": sha256,
                    "action": action,
                    "reason": reason,
                }
            )

        if progress_interval and copied_files % progress_interval == 0:
            print(f"Đã copy và xác minh {copied_files:,} ảnh", flush=True)

    distribution_rows = []
    for compound_label, counts in sorted(class_counts.items()):
        plant, condition = compound_label.split("___", maxsplit=1)
        distribution_rows.append(
            {
                "plant": plant,
                "condition": condition,
                "compound_label": compound_label,
                "source_files": counts["source_files"],
                "copied_files": counts["copied_files"],
                "exact_duplicate_files_skipped": counts[
                    "exact_duplicate_files_skipped"
                ],
                "label_conflict_files": counts["label_conflict_files"],
            }
        )

    write_csv(
        staging_dir / "manifests" / "dataset_manifest.csv",
        MANIFEST_FIELDS,
        cleaned_records,
    )
    write_csv(
        staging_dir / "reports" / "exact_dedup_mapping.csv",
        MAPPING_FIELDS,
        mapping_rows,
    )
    write_csv(
        staging_dir / "reports" / "class_distribution.csv",
        [
            "plant",
            "condition",
            "compound_label",
            "source_files",
            "copied_files",
            "exact_duplicate_files_skipped",
            "label_conflict_files",
        ],
        distribution_rows,
    )
    write_csv(
        staging_dir / "reports" / "label_conflicts.csv",
        MAPPING_FIELDS,
        [
            row
            for row in mapping_rows
            if row["action"] == "quarantined_label_conflict"
        ],
    )

    summary = {
        "source_valid_files": len(records),
        "copied_files": copied_files,
        "exact_duplicate_files_skipped": duplicate_files_skipped,
        "label_conflict_files_quarantined": conflict_files_quarantined,
        "label_conflict_hashes": conflict_hashes,
        "classes": len(distribution_rows),
    }
    metadata_dir = staging_dir / "metadata"
    metadata_dir.mkdir(parents=True, exist_ok=True)
    with (metadata_dir / "dataset_version.json").open(
        "w", encoding="utf-8"
    ) as metadata_file:
        json.dump(
            {
                "dataset_version": dataset_version,
                "source_dataset_version": "v1.0",
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "stage": "exact_dedup_only",
                "image_copy_status": "copied_and_sha256_verified",
                "source_dataset_dir": str(dataset_dir),
                "source_manifest": str(manifest_path),
                **summary,
            },
            metadata_file,
            ensure_ascii=False,
            indent=2,
        )

    staging_dir.replace(output_dir)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Tạo bản dataset loại trùng SHA-256 mà không sửa dữ liệu nguồn."
    )
    parser.add_argument("dataset_dir", type=Path, help="Thư mục dataset nguồn")
    parser.add_argument("manifest_path", type=Path, help="Manifest audit nguồn")
    parser.add_argument("output_dir", type=Path, help="Output mới, không được tồn tại")
    parser.add_argument("--dataset-version", default="v1.1")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = build_exact_dedup_dataset(
        dataset_dir=args.dataset_dir,
        manifest_path=args.manifest_path,
        output_dir=args.output_dir,
        dataset_version=args.dataset_version,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
