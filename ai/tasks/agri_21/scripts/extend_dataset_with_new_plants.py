from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from ai.data.image_preprocessing import TARGET_SIZE, resize_with_padding
from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, append_quality_flag, make_group_id
from ai.tasks.agri_21.scripts.audit_dataset import calculate_difference_hash, calculate_sha256, discover_images, inspect_image
from ai.tasks.agri_21.scripts.build_resized_dataset import JPEG_QUALITY, _process_image, _safe_image_path
from ai.tasks.agri_21.scripts.split_dataset_by_group import (
    CLASS_DISTRIBUTION_FIELDS,
    GROUP_ASSIGNMENT_FIELDS,
    LEAKAGE_FIELDS,
    SPLIT_RATIOS,
    SUMMARY_FIELDS,
    DEFAULT_SEED,
    assign_class_groups,
)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def audit_new_source(new_source_dir: Path, workers: int = 8) -> list[dict[str, object]]:
    image_paths = discover_images(new_source_dir)
    if not image_paths:
        raise ValueError(f"Không tìm thấy ảnh hợp lệ trong: {new_source_dir}")

    records: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(inspect_image, path, new_source_dir) for path in image_paths]
        for future in futures:
            records.append(future.result())

    valid_records = [record for record in records if record["status"] == "valid"]
    if not valid_records:
        raise ValueError("Tất cả ảnh trong nguồn mới đều bị từ chối/hỏng.")
    return valid_records


def extend_dataset(
    new_source_dir: Path,
    v12_dir: Path,
    output_dir: Path,
    seed: int = DEFAULT_SEED,
    workers: int = 8,
) -> dict[str, object]:
    new_source_dir = new_source_dir.resolve()
    v12_dir = v12_dir.resolve()
    output_dir = output_dir.resolve()

    if not new_source_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy thư mục nguồn mới: {new_source_dir}")
    if not v12_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy dataset v1.2: {v12_dir}")
    if output_dir.exists():
        raise FileExistsError(f"Thư mục đầu ra đã tồn tại: {output_dir}")

    # 1. Read existing v1.2 manifest & metadata
    v12_manifest_path = v12_dir / "manifests" / "dataset_manifest.csv"
    v12_metadata_path = v12_dir / "metadata" / "dataset_version.json"
    if not v12_manifest_path.is_file():
        raise FileNotFoundError(f"Thiếu manifest v1.2: {v12_manifest_path}")

    v12_records = read_csv(v12_manifest_path)
    existing_sha256s = {r["sha256"] for r in v12_records}
    existing_group_ids = {r["group_id"] for r in v12_records}

    # 2. Audit new source
    new_records = audit_new_source(new_source_dir, workers=workers)

    # 3. Exact Dedup: Filter out duplicates in batch & duplicates matching v1.2
    unique_new_records: list[dict[str, object]] = []
    seen_batch_sha256s: set[str] = set()
    skipped_sha256_in_batch = 0
    skipped_sha256_in_v12 = 0

    for record in new_records:
        sha = str(record["sha256"])
        if sha in existing_sha256s:
            skipped_sha256_in_v12 += 1
            continue
        if sha in seen_batch_sha256s:
            skipped_sha256_in_batch += 1
            continue
        seen_batch_sha256s.add(sha)
        unique_new_records.append(record)

    if not unique_new_records:
        raise ValueError("Không có ảnh mới nào hợp lệ sau khi loại trùng SHA-256.")

    # 4. Group ID assignment for new images
    rows_by_dhash: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in unique_new_records:
        rows_by_dhash[str(record["phash"])].append(record)

    for dhash, group_rows in rows_by_dhash.items():
        if len(group_rows) == 1:
            row = group_rows[0]
            row["group_id"] = f"sha256:{row['sha256']}"
        else:
            group_key = f"dhash:{dhash}|new_batch"
            gid = make_group_id(group_key)
            # Ensure no collision with v1.2 group_ids
            if gid in existing_group_ids:
                gid = f"{gid}_ext"
            for row in group_rows:
                row["group_id"] = gid

    # 5. Split assignment for new images
    rows_by_group: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in unique_new_records:
        rows_by_group[str(row["group_id"])].append(row)

    groups_by_class: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for gid, group_rows in rows_by_group.items():
        label = str(group_rows[0]["compound_label"])
        groups_by_class[label].append((gid, len(group_rows)))

    split_by_group: dict[str, str] = {}
    for compound_label, groups in sorted(groups_by_class.items()):
        total_images = sum(size for _, size in groups)
        class_assignments = assign_class_groups(groups, total_images, seed)
        split_by_group.update(class_assignments)

    for row in unique_new_records:
        row["split"] = split_by_group[str(row["group_id"])]

    # 6. Build v1.3 dataset directory structure
    images_dir = output_dir / "images"
    manifests_dir = output_dir / "manifests"
    metadata_dir = output_dir / "metadata"
    reports_dir = output_dir / "reports"

    images_dir.mkdir(parents=True)
    manifests_dir.mkdir(parents=True)
    metadata_dir.mkdir(parents=True)
    reports_dir.mkdir(parents=True)

    # Copy existing v1.2 images or copy from v1.2
    v12_images_dir = v12_dir / "images"
    print(f"Copying {len(v12_records)} images from v1.2...", flush=True)
    for record in v12_records:
        rel_path = Path(record["image_path"])
        src_path = v12_images_dir / rel_path
        dst_path = images_dir / rel_path
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src_path, dst_path)

    # Process and resize new images
    print(f"Processing and resizing {len(unique_new_records)} new images...", flush=True)

    processed_new_records: list[dict[str, object]] = []
    mapping_records: list[dict[str, object]] = []

    for record in unique_new_records:
        rel_path = Path(str(record["image_path"]))
        src_path = new_source_dir / rel_path
        dst_path = images_dir / rel_path
        dst_path.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(src_path) as src_img:
            src_img.load()
            src_w, src_h = src_img.size
            if (src_w, src_h) == (TARGET_SIZE, TARGET_SIZE):
                shutil.copyfile(src_path, dst_path)
                op = "copy_same_size"
                resized_size = (TARGET_SIZE, TARGET_SIZE)
                padding = (0, 0, 0, 0)
            else:
                out_img, resized_size, padding = resize_with_padding(src_img)
                out_img.save(dst_path, format="JPEG", quality=JPEG_QUALITY, subsampling=0)
                op = "resize_and_pad" if any(padding) else "resize_only"

        out_sha = calculate_sha256(dst_path)
        with Image.open(dst_path) as out_img:
            out_img.load()
            out_fmt = out_img.format or "JPEG"
            out_phash = calculate_difference_hash(out_img)

        out_record = dict(record)
        out_record.update(
            {
                "image_format": out_fmt,
                "width": TARGET_SIZE,
                "height": TARGET_SIZE,
                "file_size": dst_path.stat().st_size,
                "sha256": out_sha,
                "phash": out_phash,
            }
        )
        processed_new_records.append(out_record)
        mapping_records.append(
            {
                "image_path": str(record["image_path"]),
                "operation": op,
                "source_width": src_w,
                "source_height": src_h,
                "resized_width": resized_size[0],
                "resized_height": resized_size[1],
                "pad_left": padding[0],
                "pad_top": padding[1],
                "pad_right": padding[2],
                "pad_bottom": padding[3],
                "source_sha256": record["sha256"],
                "output_sha256": out_sha,
            }
        )

    # 7. Merge all records
    merged_records: list[dict[str, object]] = []
    merged_records.extend(v12_records)
    merged_records.extend(processed_new_records)
    merged_records.sort(key=lambda r: str(r["image_path"]))

    # Write manifests
    write_csv(manifests_dir / "dataset_manifest.csv", MANIFEST_FIELDS, merged_records)
    for split in ("train", "val", "test"):
        split_records = [r for r in merged_records if r["split"] == split]
        write_csv(manifests_dir / f"{split}.csv", MANIFEST_FIELDS, split_records)

    write_csv(reports_dir / "extension_resize_mapping.csv", list(mapping_records[0].keys()), mapping_records)

    # Write class distribution & summary reports
    all_classes = sorted({str(r["compound_label"]) for r in merged_records})
    all_plants = sorted({str(r["plant"]) for r in merged_records})

    split_counts = Counter(str(r["split"]) for r in merged_records)
    summary_rows = []
    for split, target_ratio in SPLIT_RATIOS.items():
        s_records = [r for r in merged_records if r["split"] == split]
        s_gids = {r["group_id"] for r in s_records}
        s_labels = {r["compound_label"] for r in s_records}
        summary_rows.append(
            {
                "split": split,
                "target_ratio": f"{target_ratio:.2f}",
                "image_count": len(s_records),
                "actual_ratio": f"{len(s_records) / len(merged_records):.6f}",
                "group_count": len(s_gids),
                "class_count": len(s_labels),
            }
        )
    write_csv(reports_dir / "split_summary.csv", SUMMARY_FIELDS, summary_rows)

    # Check leakage
    group_splits: dict[str, set[str]] = defaultdict(set)
    for r in merged_records:
        group_splits[str(r["group_id"])].add(str(r["split"]))

    leakage_rows = [
        {"group_id": gid, "splits": ";".join(sorted(splits))}
        for gid, splits in group_splits.items()
        if len(splits) > 1
    ]
    write_csv(reports_dir / "split_leakage_check.csv", LEAKAGE_FIELDS, leakage_rows)

    # Metadata
    v12_meta = json.loads((v12_dir / "metadata" / "dataset_version.json").read_text(encoding="utf-8"))
    metadata = {
        **v12_meta,
        "dataset_version": "v1.3",
        "source_dataset_version": "v1.2",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "stage": "v1_3_extended_complete",
        "total_files": len(merged_records),
        "total_plants": len(all_plants),
        "total_classes": len(all_classes),
        "v12_files_count": len(v12_records),
        "new_files_added": len(processed_new_records),
        "skipped_duplicate_sha256_v12": skipped_sha256_in_v12,
        "skipped_duplicate_sha256_batch": skipped_sha256_in_batch,
        "split_image_counts": dict(split_counts),
        "leakage_group_count": len(leakage_rows),
    }
    (metadata_dir / "dataset_version.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return {
        "status": "success",
        "dataset_version": "v1.3",
        "total_images": len(merged_records),
        "v12_images": len(v12_records),
        "new_images_added": len(processed_new_records),
        "total_classes": len(all_classes),
        "total_plants": len(all_plants),
        "leakage_groups": len(leakage_rows),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bổ sung các cây mới (Lúa, Xoài) vào dataset v1.2 và xuất v1.3.")
    parser.add_argument("--new-source", type=Path, required=True, help="Thư mục nguồn chứa cây mới (Lúa, Xoài)")
    parser.add_argument("--current-v12", type=Path, required=True, help="Thư mục dataset v1.2 hiện tại")
    parser.add_argument("--output", type=Path, required=True, help="Thư mục xuất dataset v1.3 mới")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--workers", type=int, default=8)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    res = extend_dataset(
        new_source_dir=args.new_source,
        v12_dir=args.current_v12,
        output_dir=args.output,
        seed=args.seed,
        workers=args.workers,
    )
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
