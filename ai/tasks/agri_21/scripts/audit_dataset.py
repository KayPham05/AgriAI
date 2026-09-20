from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from functools import partial
from pathlib import Path

from PIL import Image


VALID_EXTENSIONS = {".bmp", ".jpeg", ".jpg", ".png", ".webp"}
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


def calculate_sha256(image_path: Path) -> str:
    digest = hashlib.sha256()
    with image_path.open("rb") as image_file:
        for chunk in iter(lambda: image_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def calculate_difference_hash(image: Image.Image) -> str:
    grayscale = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = grayscale.tobytes()
    hash_value = 0

    for row in range(8):
        row_start = row * 9
        for column in range(8):
            hash_value = (hash_value << 1) | int(
                pixels[row_start + column] > pixels[row_start + column + 1]
            )

    return f"{hash_value:016x}"


def discover_images(dataset_dir: Path) -> list[Path]:
    image_paths: list[Path] = []

    for plant_dir in sorted(path for path in dataset_dir.iterdir() if path.is_dir()):
        for condition_dir in sorted(path for path in plant_dir.iterdir() if path.is_dir()):
            image_paths.extend(
                sorted(
                    path
                    for path in condition_dir.iterdir()
                    if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
                )
            )

    return image_paths


def inspect_image(image_path: Path, dataset_dir: Path) -> dict[str, object]:
    relative_path = image_path.relative_to(dataset_dir)
    plant, condition = relative_path.parts[:2]
    record: dict[str, object] = {
        "image_path": relative_path.as_posix(),
        "plant": plant,
        "condition": condition,
        "compound_label": f"{plant}___{condition}",
        "extension": image_path.suffix.lower(),
        "image_format": "",
        "width": "",
        "height": "",
        "file_size": "",
        "sha256": "",
        "phash": "",
        "quality_flags": "",
        "status": "rejected",
        "rejection_reason": "",
        "group_id": "",
        "split": "",
    }

    try:
        record["file_size"] = image_path.stat().st_size
        record["sha256"] = calculate_sha256(image_path)
        with Image.open(image_path) as image:
            image.load()
            width, height = image.size
            quality_flags = []
            if width < 224 or height < 224:
                quality_flags.append("below_224")
            if min(width, height) > 0 and max(width, height) / min(width, height) > 4:
                quality_flags.append("extreme_aspect_ratio")

            record.update(
                {
                    "image_format": image.format or "",
                    "width": width,
                    "height": height,
                    "phash": calculate_difference_hash(image),
                    "quality_flags": ";".join(quality_flags),
                    "status": "valid",
                }
            )
    except Exception as error:  # Continue the audit and record the exact bad file.
        record["rejection_reason"] = f"{type(error).__name__}: {error}"

    return record


def find_duplicates(
    records: list[dict[str, object]],
) -> tuple[list[dict[str, str]], set[str], set[str]]:
    duplicate_rows: list[dict[str, str]] = []
    exact_duplicate_paths: set[str] = set()
    perceptual_duplicate_paths: set[str] = set()
    first_by_sha256: dict[str, dict[str, object]] = {}

    valid_records = [record for record in records if record["status"] == "valid"]
    for record in valid_records:
        sha256 = str(record["sha256"])
        canonical = first_by_sha256.setdefault(sha256, record)
        if canonical is record:
            continue
        duplicate_path = str(record["image_path"])
        exact_duplicate_paths.add(duplicate_path)
        duplicate_rows.append(
            {
                "match_type": "exact_sha256",
                "canonical_path": str(canonical["image_path"]),
                "duplicate_path": duplicate_path,
                "hash_value": sha256,
            }
        )

    first_by_phash: dict[str, dict[str, object]] = {}
    for record in valid_records:
        image_path = str(record["image_path"])
        if image_path in exact_duplicate_paths:
            continue
        phash = str(record["phash"])
        canonical = first_by_phash.setdefault(phash, record)
        if canonical is record or canonical["sha256"] == record["sha256"]:
            continue
        perceptual_duplicate_paths.add(image_path)
        duplicate_rows.append(
            {
                "match_type": "perceptual_hash_match",
                "canonical_path": str(canonical["image_path"]),
                "duplicate_path": image_path,
                "hash_value": phash,
            }
        )

    return duplicate_rows, exact_duplicate_paths, perceptual_duplicate_paths


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_class_distribution(
    records: list[dict[str, object]],
    exact_duplicate_paths: set[str],
    perceptual_duplicate_paths: set[str],
) -> list[dict[str, object]]:
    class_counts: dict[tuple[str, str, str], Counter[str]] = defaultdict(Counter)

    for record in records:
        key = (
            str(record["plant"]),
            str(record["condition"]),
            str(record["compound_label"]),
        )
        counts = class_counts[key]
        counts["total_files"] += 1
        counts[f"{record['status']}_files"] += 1
        if "below_224" in str(record["quality_flags"]):
            counts["below_224_files"] += 1
        image_path = str(record["image_path"])
        if image_path in exact_duplicate_paths:
            counts["exact_duplicate_files"] += 1
        if image_path in perceptual_duplicate_paths:
            counts["perceptual_match_files"] += 1

    rows: list[dict[str, object]] = []
    for (plant, condition, compound_label), counts in sorted(class_counts.items()):
        rows.append(
            {
                "plant": plant,
                "condition": condition,
                "compound_label": compound_label,
                "total_files": counts["total_files"],
                "valid_files": counts["valid_files"],
                "rejected_files": counts["rejected_files"],
                "below_224_files": counts["below_224_files"],
                "exact_duplicate_files": counts["exact_duplicate_files"],
                "perceptual_match_files": counts["perceptual_match_files"],
            }
        )
    return rows


def audit_dataset(
    dataset_dir: Path,
    output_dir: Path,
    dataset_version: str = "v1.0",
    workers: int | None = None,
    progress_interval: int = 1_000,
) -> dict[str, int]:
    dataset_dir = dataset_dir.resolve()
    output_dir = output_dir.resolve()
    if not dataset_dir.is_dir():
        raise FileNotFoundError(f"Không tìm thấy dataset: {dataset_dir}")

    image_paths = discover_images(dataset_dir)
    if not image_paths:
        raise ValueError(f"Không tìm thấy ảnh hợp lệ trong: {dataset_dir}")

    worker_count = workers or min(8, os.cpu_count() or 1)
    if worker_count < 1:
        raise ValueError("workers phải lớn hơn hoặc bằng 1")

    records: list[dict[str, object]] = []
    inspect = partial(inspect_image, dataset_dir=dataset_dir)
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        for index, record in enumerate(executor.map(inspect, image_paths), start=1):
            records.append(record)
            if progress_interval and index % progress_interval == 0:
                print(f"Đã kiểm tra {index:,}/{len(image_paths):,} ảnh", flush=True)

    duplicate_rows, exact_paths, perceptual_paths = find_duplicates(records)
    corrupt_rows = [record for record in records if record["status"] == "rejected"]
    distribution_rows = build_class_distribution(records, exact_paths, perceptual_paths)

    write_csv(output_dir / "manifests" / "dataset_manifest.csv", MANIFEST_FIELDS, records)
    write_csv(
        output_dir / "reports" / "class_distribution.csv",
        [
            "plant",
            "condition",
            "compound_label",
            "total_files",
            "valid_files",
            "rejected_files",
            "below_224_files",
            "exact_duplicate_files",
            "perceptual_match_files",
        ],
        distribution_rows,
    )
    write_csv(
        output_dir / "reports" / "duplicate_report.csv",
        ["match_type", "canonical_path", "duplicate_path", "hash_value"],
        duplicate_rows,
    )
    write_csv(
        output_dir / "reports" / "corrupt_images.csv",
        MANIFEST_FIELDS,
        corrupt_rows,
    )

    summary = {
        "total_files": len(records),
        "valid_files": len(records) - len(corrupt_rows),
        "rejected_files": len(corrupt_rows),
        "classes": len(distribution_rows),
        "below_224_files": sum(
            "below_224" in str(record["quality_flags"]) for record in records
        ),
        "exact_duplicate_files": len(exact_paths),
        "perceptual_match_files": len(perceptual_paths),
    }
    metadata_dir = output_dir / "metadata"
    metadata_dir.mkdir(parents=True, exist_ok=True)
    with (metadata_dir / "dataset_version.json").open("w", encoding="utf-8") as output_file:
        json.dump(
            {
                "dataset_version": dataset_version,
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "image_copy_status": "not_copied_audit_only",
                **summary,
            },
            output_file,
            ensure_ascii=False,
            indent=2,
        )

    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit dataset ảnh theo cấu trúc <cây>/<tình_trạng>/<ảnh>."
    )
    parser.add_argument("dataset_dir", type=Path, help="Thư mục dataset nguồn")
    parser.add_argument("output_dir", type=Path, help="Thư mục output ngoài repository")
    parser.add_argument("--dataset-version", default="v1.0")
    parser.add_argument("--workers", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = audit_dataset(
        dataset_dir=args.dataset_dir,
        output_dir=args.output_dir,
        dataset_version=args.dataset_version,
        workers=args.workers,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
