"""Replace v1.3 pepper images with the reviewed v1.4 pepper batch."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, read_csv, write_csv


SPLITS = ("train", "val", "test")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_dataset(old_dir: Path, pepper_dir: Path, output_dir: Path) -> dict[str, object]:
    old_dir = old_dir.resolve()
    pepper_dir = pepper_dir.resolve()
    output_dir = output_dir.resolve()
    if output_dir.exists():
        raise FileExistsError(output_dir)

    old_rows = read_csv(old_dir / "manifests" / "dataset_manifest.csv")
    pepper_rows = read_csv(pepper_dir / "manifests" / "dataset_manifest.csv")
    old_kept = [row for row in old_rows if row["plant"] != "Ot"]
    if len(old_rows) - len(old_kept) != 469:
        raise ValueError("Số ảnh Ớt cũ khác manifest v1.3 đã audit")
    if len(pepper_rows) != 6396 or {row["plant"] for row in pepper_rows} != {"Ot"}:
        raise ValueError("Batch Ớt mới khác kết quả đã audit")

    rows = sorted(old_kept + pepper_rows, key=lambda row: row["image_path"])
    if any(row["status"] != "valid" or row["split"] not in SPLITS for row in rows):
        raise ValueError("Manifest có status hoặc split chưa hợp lệ")
    if len({row["image_path"].casefold() for row in rows}) != len(rows):
        raise ValueError("Manifest có đường dẫn trùng")
    if {row["sha256"] for row in old_kept} & {
        row["sha256"] for row in pepper_rows
    }:
        raise ValueError("Ảnh Ớt mới trùng SHA-256 với cây khác")
    group_splits: dict[str, str] = {}
    for row in rows:
        previous = group_splits.setdefault(row["group_id"], row["split"])
        if previous != row["split"]:
            raise ValueError(f"Group xuyên split: {row['group_id']}")
    labels = {row["compound_label"] for row in rows}
    if len(labels) != 59:
        raise ValueError(f"Cần 59 lớp, có {len(labels)}")
    for split in SPLITS:
        if {row["compound_label"] for row in rows if row["split"] == split} != labels:
            raise ValueError(f"Split {split} thiếu lớp")

    # Materialize independent files so later edits to source stages cannot change v1.4.
    for row in rows:
        source_root = pepper_dir if row["plant"] == "Ot" else old_dir
        relative = Path(row["image_path"])
        source = source_root / "images" / relative
        target = output_dir / "images" / relative
        if not source.is_file():
            raise FileNotFoundError(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

    for split in SPLITS:
        write_csv(
            output_dir / "manifests" / f"{split}.csv",
            MANIFEST_FIELDS,
            [row for row in rows if row["split"] == split],
        )
    master_path = output_dir / "manifests" / "dataset_manifest.csv"
    write_csv(master_path, MANIFEST_FIELDS, rows)
    counts = Counter(row["split"] for row in rows)
    metadata = {
        "dataset_version": "v1.4",
        "stage": "pepper_replaced_pending_final_leakage_audit",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_dataset": str(old_dir),
        "pepper_dataset": str(pepper_dir),
        "old_pepper_removed": 469,
        "new_pepper_added": len(pepper_rows),
        "images": len(rows),
        "classes": len(labels),
        "plants": len({row["plant"] for row in rows}),
        "split_image_counts": dict(counts),
        "manifest_sha256": sha256(master_path),
    }
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata


def normalize_pepper_extensions(dataset_dir: Path) -> dict[str, int]:
    """Rename resized pepper JPEG bytes to .jpg and refresh the manifests."""
    master_path = dataset_dir / "manifests" / "dataset_manifest.csv"
    metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    mapping_path = dataset_dir / "reports" / "pepper_jpeg_path_mapping.csv"
    if mapping_path.exists():
        raise FileExistsError(mapping_path)
    rows = read_csv(master_path)
    mapping = []
    for row in rows:
        if row["plant"] != "Ot":
            continue
        previous = row["image_path"]
        current = (Path("Ot") / row["condition"] / f"{row['sha256']}.jpg").as_posix()
        source = dataset_dir / "images" / previous
        target = dataset_dir / "images" / current
        if target.exists():
            raise FileExistsError(target)
        source.rename(target)
        row["image_path"] = current
        row["extension"] = ".jpg"
        mapping.append({"source_path": previous, "image_path": current})

    rows.sort(key=lambda row: row["image_path"])
    write_csv(master_path, MANIFEST_FIELDS, rows)
    for split in SPLITS:
        write_csv(
            dataset_dir / "manifests" / f"{split}.csv",
            MANIFEST_FIELDS,
            [row for row in rows if row["split"] == split],
        )
    write_csv(mapping_path, ["source_path", "image_path"], mapping)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["manifest_sha256"] = sha256(master_path)
    metadata["pepper_jpeg_paths_normalized"] = len(mapping)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"normalized_paths": len(mapping)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("old_dir", type=Path)
    parser.add_argument("pepper_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    print(build_dataset(args.old_dir, args.pepper_dir, args.output_dir))
    print(normalize_pepper_extensions(args.output_dir))
