"""Copy v1.4 safely and localize the six pepper labels in the copy."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path


PEPPER_LABELS = {
    "Bacterial_Spot": "Dom_vi_khuan",
    "Cercospora_Leaf_Spot": "Dom_la_cercospora",
    "Curl_Virus": "Virus_xoan_la",
    "Healthy_Leaf": "Khoe_manh",
    "Nutrition_Deficiency": "Thieu_dinh_duong",
    "Powdery_Mildew": "Phan_trang",
}
MANIFESTS = ("dataset_manifest.csv", "train.csv", "val.csv", "test.csv")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def relabel_row(row: dict[str, str]) -> dict[str, str]:
    if row["plant"] != "Ot":
        return row
    old_label = row["condition"]
    new_label = PEPPER_LABELS[old_label]
    path = Path(row["image_path"])
    if len(path.parts) != 3 or path.parts[:2] != ("Ot", old_label):
        raise ValueError(f"Đường dẫn Ớt không khớp nhãn: {path}")
    return {
        **row,
        "image_path": (Path("Ot") / new_label / path.name).as_posix(),
        "condition": new_label,
        "compound_label": f"Ot___{new_label}",
    }


def relocate(source: Path, target: Path) -> dict[str, object]:
    source = source.resolve(strict=True)
    target = target.resolve()
    staging = target.with_name(f".{target.name}.staging")
    if target.exists() or staging.exists():
        raise FileExistsError(f"Đích hoặc staging đã tồn tại: {target}, {staging}")
    if source == target or source in target.parents or target in source.parents:
        raise ValueError("Nguồn và đích không được lồng nhau")
    if not target.parent.is_dir():
        raise FileNotFoundError(target.parent)

    source_manifest = source / "manifests" / MANIFESTS[0]
    source_manifest_hash = sha256(source_manifest)
    shutil.copytree(source, staging)
    try:
        pepper_root = staging / "images" / "Ot"
        if {path.name for path in pepper_root.iterdir() if path.is_dir()} != set(
            PEPPER_LABELS
        ):
            raise ValueError("Sáu thư mục Ớt nguồn không khớp hợp đồng nhãn")
        for old_label, new_label in PEPPER_LABELS.items():
            (pepper_root / old_label).rename(pepper_root / new_label)

        split_rows: dict[str, list[dict[str, str]]] = {}
        for name in MANIFESTS:
            path = staging / "manifests" / name
            fields, rows = read_csv(path)
            updated = [relabel_row(row) for row in rows]
            write_csv(path, fields, updated)
            split_rows[name] = updated

        master = split_rows[MANIFESTS[0]]
        if len(master) != 88_000 or len({r["image_path"] for r in master}) != len(master):
            raise ValueError("Count hoặc đường dẫn manifest không hợp lệ")
        for split in ("train", "val", "test"):
            expected = [row for row in master if row["split"] == split]
            if split_rows[f"{split}.csv"] != expected:
                raise ValueError(f"Manifest {split} không khớp bản chính")
        if len({row["compound_label"] for row in master}) != 59:
            raise ValueError("Dataset không còn 59 lớp")

        counts: dict[str, Counter[str]] = {}
        for row in master:
            image = staging / "images" / row["image_path"]
            if sha256(image) != row["sha256"]:
                raise ValueError(f"Ảnh không khớp SHA-256: {image}")
            counts.setdefault(row["compound_label"], Counter())[row["split"]] += 1
        distribution = [
            {
                "compound_label": label,
                "total": sum(counts[label].values()),
                "train": counts[label]["train"],
                "val": counts[label]["val"],
                "test": counts[label]["test"],
            }
            for label in sorted(counts)
        ]
        write_csv(
            staging / "reports" / "class_distribution_v1_4.csv",
            ["compound_label", "total", "train", "val", "test"],
            distribution,
        )
        mapping_path = staging / "reports" / "pepper_jpeg_path_mapping.csv"
        fields, mapping = read_csv(mapping_path)
        for row in mapping:
            path = Path(row["image_path"])
            row["image_path"] = (
                Path("Ot") / PEPPER_LABELS[path.parts[1]] / path.name
            ).as_posix()
        write_csv(mapping_path, fields, mapping)

        metadata_path = staging / "metadata" / "dataset_version.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["source_manifest_sha256_before_label_rename"] = source_manifest_hash
        metadata["label_rename_mapping"] = PEPPER_LABELS
        metadata["condition_classes"] = len({row["condition"] for row in master})
        metadata["manifest_sha256"] = sha256(staging / "manifests" / MANIFESTS[0])
        metadata_path.write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        for name in (
            "post_resize_leakage_summary.json",
            "post_resize_hamming_0_to_5_summary.json",
        ):
            report_path = staging / "reports" / name
            report = json.loads(report_path.read_text(encoding="utf-8"))
            report["review_report"] = str(
                target / "reports" / Path(report["review_report"]).name
            )
            report_path.write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        if sha256(source_manifest) != source_manifest_hash:
            raise RuntimeError("Manifest nguồn đã đổi khi đang copy")
        staging.rename(target)
        return {
            "target": str(target),
            "images_verified": len(master),
            "classes": len(counts),
            "condition_classes": metadata["condition_classes"],
            "manifest_sha256": metadata["manifest_sha256"],
            "source_preserved": str(source),
        }
    except Exception:
        print(f"Bản sao chưa hoàn tất được giữ tại: {staging}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    print(json.dumps(relocate(args.source, args.target), ensure_ascii=False, indent=2))
