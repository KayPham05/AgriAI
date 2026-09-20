from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from ai.data.dataset import load_manifest_splits
from ai.data.image_preprocessing import (
    PADDING_COLOR,
    TARGET_SIZE,
    resize_with_padding,
)
from ai.tasks.agri_21.scripts.audit_dataset import (
    MANIFEST_FIELDS,
    calculate_difference_hash,
    calculate_sha256,
)


JPEG_QUALITY = 95
MAPPING_FIELDS = [
    "image_path",
    "operation",
    "source_width",
    "source_height",
    "resized_width",
    "resized_height",
    "pad_left",
    "pad_top",
    "pad_right",
    "pad_bottom",
    "source_sha256",
    "output_sha256",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(
    path: Path,
    fieldnames: list[str],
    rows: list[dict[str, object]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _safe_image_path(images_dir: Path, relative_path_text: str) -> Path:
    relative_path = Path(relative_path_text)
    if not relative_path.parts or relative_path.is_absolute() or ".." in relative_path.parts:
        raise ValueError(f"image_path không an toàn: {relative_path_text}")
    return images_dir / relative_path


def _process_image(
    record: dict[str, str],
    source_images_dir: Path,
    output_images_dir: Path,
) -> tuple[dict[str, object], dict[str, object]]:
    relative_path = record["image_path"]
    source_path = _safe_image_path(source_images_dir, relative_path)
    output_path = _safe_image_path(output_images_dir, relative_path)
    source_sha256 = calculate_sha256(source_path)
    if source_sha256 != record["sha256"]:
        raise ValueError(f"Checksum nguồn không khớp manifest: {relative_path}")

    with Image.open(source_path) as source_image:
        source_image.load()
        source_width, source_height = source_image.size
        if (source_width, source_height) != (
            int(record["width"]),
            int(record["height"]),
        ):
            raise ValueError(f"Kích thước nguồn không khớp manifest: {relative_path}")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        if (source_width, source_height) == (TARGET_SIZE, TARGET_SIZE):
            shutil.copyfile(source_path, output_path)
            operation = "copy_same_size"
            resized_size = (TARGET_SIZE, TARGET_SIZE)
            padding = (0, 0, 0, 0)
        else:
            output_image, resized_size, padding = resize_with_padding(source_image)
            temporary_path = output_path.with_name(f"{output_path.name}.tmp")
            output_image.save(
                temporary_path,
                format="JPEG",
                quality=JPEG_QUALITY,
                subsampling=0,
            )
            os.replace(temporary_path, output_path)
            operation = "resize_and_pad" if any(padding) else "resize_only"

    output_sha256 = calculate_sha256(output_path)
    with Image.open(output_path) as output_image:
        output_image.load()
        if output_image.size != (TARGET_SIZE, TARGET_SIZE):
            raise ValueError(f"Ảnh đầu ra không phải 224x224: {relative_path}")
        output_format = output_image.format or ""
        output_phash = calculate_difference_hash(output_image)

    output_record: dict[str, object] = dict(record)
    output_record.update(
        {
            "image_format": output_format,
            "width": TARGET_SIZE,
            "height": TARGET_SIZE,
            "file_size": output_path.stat().st_size,
            "sha256": output_sha256,
            "phash": output_phash,
        }
    )
    mapping_record: dict[str, object] = {
        "image_path": relative_path,
        "operation": operation,
        "source_width": source_width,
        "source_height": source_height,
        "resized_width": resized_size[0],
        "resized_height": resized_size[1],
        "pad_left": padding[0],
        "pad_top": padding[1],
        "pad_right": padding[2],
        "pad_bottom": padding[3],
        "source_sha256": source_sha256,
        "output_sha256": output_sha256,
    }
    return output_record, mapping_record


def validate_source(source_dir: Path, output_dir: Path) -> list[dict[str, str]]:
    source_dir = source_dir.resolve()
    output_dir = output_dir.resolve()
    if source_dir == output_dir:
        raise ValueError("Thư mục nguồn và đầu ra phải khác nhau")
    if not source_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy dataset nguồn: {source_dir}")
    if not output_dir.is_dir():
        raise FileNotFoundError(f"Hãy tạo trước thư mục đầu ra: {output_dir}")
    if any(output_dir.iterdir()):
        raise ValueError(f"Thư mục đầu ra phải trống: {output_dir}")

    records = read_csv(source_dir / "manifests" / "dataset_manifest.csv")
    if not records or any(record["status"] != "valid" for record in records):
        raise ValueError("Manifest nguồn phải chứa toàn bộ ảnh active có status='valid'")
    if len({record["image_path"].casefold() for record in records}) != len(records):
        raise ValueError("Manifest nguồn có image_path trùng")

    split_records, _, _ = load_manifest_splits(source_dir)
    split_paths = {
        record["image_path"].casefold()
        for rows in split_records.values()
        for record in rows
    }
    master_paths = {record["image_path"].casefold() for record in records}
    if split_paths != master_paths:
        raise ValueError("Ba manifest split không khớp dataset_manifest.csv")
    return records


def build_resized_dataset(
    source_dir: Path,
    output_dir: Path,
    workers: int = 8,
    progress_interval: int = 1000,
) -> dict[str, object]:
    source_dir = source_dir.resolve()
    output_dir = output_dir.resolve()
    records = validate_source(source_dir, output_dir)
    staging_dir = output_dir.parent / f".{output_dir.name}.staging"
    if staging_dir.exists():
        raise FileExistsError(f"Staging đã tồn tại: {staging_dir}")

    source_manifest_path = source_dir / "manifests" / "dataset_manifest.csv"
    source_manifest_sha256 = calculate_sha256(source_manifest_path)
    staging_images_dir = staging_dir / "images"
    staging_images_dir.mkdir(parents=True)
    results: list[tuple[dict[str, object], dict[str, object]] | None] = [
        None
    ] * len(records)

    try:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(
                    _process_image,
                    record,
                    source_dir / "images",
                    staging_images_dir,
                ): index
                for index, record in enumerate(records)
            }
            completed = 0
            for future in as_completed(futures):
                results[futures[future]] = future.result()
                completed += 1
                if progress_interval and completed % progress_interval == 0:
                    print(f"Đã xử lý {completed}/{len(records)} ảnh", flush=True)

        completed_results = [result for result in results if result is not None]
        if len(completed_results) != len(records):
            raise RuntimeError("Không nhận đủ kết quả xử lý ảnh")
        output_records = [result[0] for result in completed_results]
        mapping_records = [result[1] for result in completed_results]

        manifests_dir = staging_dir / "manifests"
        write_csv(
            manifests_dir / "dataset_manifest.csv",
            MANIFEST_FIELDS,
            output_records,
        )
        for split in ("train", "val", "test"):
            write_csv(
                manifests_dir / f"{split}.csv",
                MANIFEST_FIELDS,
                [record for record in output_records if record["split"] == split],
            )
        write_csv(
            staging_dir / "reports" / "resize_mapping.csv",
            MAPPING_FIELDS,
            mapping_records,
        )

        operation_counts = Counter(
            str(record["operation"]) for record in mapping_records
        )
        source_metadata = json.loads(
            (source_dir / "metadata" / "dataset_version.json").read_text(
                encoding="utf-8"
            )
        )
        metadata = {
            **source_metadata,
            "dataset_version": "v1.2",
            "source_dataset_version": "v1.1",
            "root_source_dataset_version": source_metadata.get(
                "source_dataset_version"
            ),
            "source_dataset_dir": str(source_dir),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "stage": "resized_224_letterbox_complete",
            "preprocessing": {
                "method": "resize_longest_side_then_center_pad",
                "target_size": [TARGET_SIZE, TARGET_SIZE],
                "resampling": "LANCZOS",
                "padding_color_rgb": list(PADDING_COLOR),
                "output_format_for_resized_images": "JPEG",
                "jpeg_quality": JPEG_QUALITY,
                "jpeg_subsampling": 0,
            },
            "active_image_count": len(output_records),
            "resize_operation_counts": dict(operation_counts),
            "source_manifest_sha256": source_manifest_sha256,
            "group_ids_preserved": True,
            "split_membership_preserved": True,
        }
        metadata_dir = staging_dir / "metadata"
        metadata_dir.mkdir(parents=True)
        (metadata_dir / "dataset_version.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        if calculate_sha256(source_manifest_path) != source_manifest_sha256:
            raise RuntimeError("Manifest v1.1 đã thay đổi trong lúc xử lý")
        if any(output_dir.iterdir()):
            raise RuntimeError("Thư mục đầu ra không còn trống trước khi hoàn tất")
        for child in staging_dir.iterdir():
            child.replace(output_dir / child.name)
        staging_dir.rmdir()
    except Exception:
        print(f"Build chưa hoàn tất; dữ liệu tạm được giữ tại: {staging_dir}")
        raise

    return {
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "image_count": len(records),
        "operation_counts": dict(operation_counts),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tạo dataset 224x224 giữ tỷ lệ và pad, không sửa dataset nguồn."
    )
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--progress-interval", type=int, default=1000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        records = validate_source(args.source_dir, args.output_dir)
        print(
            json.dumps(
                {
                    "status": "dry_run_ok",
                    "source_dir": str(args.source_dir.resolve()),
                    "output_dir": str(args.output_dir.resolve()),
                    "image_count": len(records),
                    "target_size": [TARGET_SIZE, TARGET_SIZE],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    result = build_resized_dataset(
        args.source_dir,
        args.output_dir,
        workers=args.workers,
        progress_interval=args.progress_interval,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
