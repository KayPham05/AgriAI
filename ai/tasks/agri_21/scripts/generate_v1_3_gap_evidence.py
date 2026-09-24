"""Generate reproducible SVG evidence for the dataset v1.3 gap report."""

from __future__ import annotations

import argparse
import base64
import csv
import html
import json
from collections import Counter, defaultdict
from pathlib import Path


def read_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def svg_text(value: object) -> str:
    return html.escape(str(value))


def find_cross_label_groups(
    rows: list[dict[str, str]],
) -> list[tuple[str, list[dict[str, str]]]]:
    rows_by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_group[row["group_id"]].append(row)
    return [
        (group_id, group_rows)
        for group_id, group_rows in sorted(rows_by_group.items())
        if len({row["compound_label"] for row in group_rows}) > 1
    ]


def image_data_uri(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def render_cross_label_evidence(
    dataset_dir: Path,
    conflict: tuple[str, list[dict[str, str]]],
    output_path: Path,
) -> None:
    group_id, rows = conflict
    card_width = 650
    card_height = 370
    width = 1440
    height = 250 + ((len(rows) + 1) // 2) * card_height
    cards: list[str] = []
    for index, row in enumerate(rows):
        column = index % 2
        line = index // 2
        x = 50 + column * (card_width + 40)
        y = 190 + line * card_height
        image_path = dataset_dir / "images" / Path(row["image_path"])
        cards.append(
            f"""
            <g transform="translate({x} {y})">
              <rect width="{card_width}" height="330" rx="18" fill="#ffffff" stroke="#d6dce5" stroke-width="2"/>
              <rect x="24" y="24" width="260" height="260" rx="10" fill="#eef1f5"/>
              <image x="24" y="24" width="260" height="260" preserveAspectRatio="xMidYMid meet"
                     href="{image_data_uri(image_path)}"/>
              <text x="310" y="68" class="label">{svg_text(row['compound_label'])}</text>
              <text x="310" y="112" class="meta">Split: {svg_text(row['split'])}</text>
              <text x="310" y="154" class="meta">SHA-256:</text>
              <text x="310" y="186" class="mono">{svg_text(row['sha256'][:24])}...</text>
              <text x="24" y="312" class="path">{svg_text(row['image_path'])}</text>
            </g>"""
        )
    output_path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
        <rect width="100%" height="100%" fill="#f5f7fa"/>
        <style>
          .title {{ font: 700 34px Arial, sans-serif; fill: #172033; }}
          .subtitle {{ font: 22px Arial, sans-serif; fill: #9b1c1c; }}
          .label {{ font: 700 20px Arial, sans-serif; fill: #172033; }}
          .meta {{ font: 18px Arial, sans-serif; fill: #49556a; }}
          .mono {{ font: 16px Consolas, monospace; fill: #49556a; }}
          .path {{ font: 15px Consolas, monospace; fill: #364152; }}
        </style>
        <text x="50" y="62" class="title">Bằng chứng: một group_id chứa hai nhãn</text>
        <text x="50" y="108" class="subtitle">{svg_text(group_id)} · {len(rows)} ảnh · {len({row['compound_label'] for row in rows})} nhãn · cùng split train</text>
        <text x="50" y="148" class="meta">Nguồn: v1.3/manifests/dataset_manifest.csv và các file ảnh thật trong v1.3/images/</text>
        {''.join(cards)}
        </svg>""",
        encoding="utf-8",
    )


def render_metadata_evidence(
    dataset_dir: Path,
    rows: list[dict[str, str]],
    metadata: dict[str, object],
    output_path: Path,
) -> None:
    split_group_counts = {
        split: len({row["group_id"] for row in rows if row["split"] == split})
        for split in ("train", "val", "test")
    }
    expected_source_dir = dataset_dir.parent / "v1.2"
    mismatches = [
        ("active_image_count", metadata.get("active_image_count"), len(rows)),
        ("classes", metadata.get("classes"), len({row["compound_label"] for row in rows})),
        ("group_count", metadata.get("group_count"), len({row["group_id"] for row in rows})),
        ("split_group_counts", metadata.get("split_group_counts"), split_group_counts),
        ("source_dataset_dir", metadata.get("source_dataset_dir"), str(expected_source_dir)),
        (
            "source_manifest",
            metadata.get("source_manifest"),
            str(expected_source_dir / "manifests" / "dataset_manifest.csv"),
        ),
    ]
    row_height = 92
    width = 1600
    height = 230 + len(mismatches) * row_height
    table_rows: list[str] = []
    for index, (field, stored, actual) in enumerate(mismatches):
        y = 210 + index * row_height
        fill = "#ffffff" if index % 2 == 0 else "#f7f8fa"
        table_rows.append(
            f"""
            <rect x="40" y="{y}" width="1520" height="{row_height}" fill="{fill}"/>
            <text x="64" y="{y + 37}" class="field">{svg_text(field)}</text>
            <text x="430" y="{y + 37}" class="bad">{svg_text(json.dumps(stored, ensure_ascii=False))}</text>
            <text x="1010" y="{y + 37}" class="good">{svg_text(json.dumps(actual, ensure_ascii=False))}</text>"""
        )
    output_path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
        <rect width="100%" height="100%" fill="#f1f4f8"/>
        <style>
          .title {{ font: 700 34px Arial, sans-serif; fill: #172033; }}
          .subtitle {{ font: 20px Arial, sans-serif; fill: #49556a; }}
          .head {{ font: 700 20px Arial, sans-serif; fill: #ffffff; }}
          .field {{ font: 700 18px Consolas, monospace; fill: #172033; }}
          .bad {{ font: 17px Consolas, monospace; fill: #a01818; }}
          .good {{ font: 17px Consolas, monospace; fill: #17633a; }}
        </style>
        <text x="40" y="58" class="title">Bằng chứng: metadata v1.3 không khớp manifest</text>
        <text x="40" y="98" class="subtitle">Đỏ: giá trị đang lưu trong dataset_version.json · Xanh: tính lại từ manifest hoặc nguồn v1.2 đã khai báo</text>
        <rect x="40" y="132" width="1520" height="78" rx="12" fill="#25324a"/>
        <text x="64" y="180" class="head">Trường</text>
        <text x="430" y="180" class="head">Đang lưu</text>
        <text x="1010" y="180" class="head">Giá trị đúng / kỳ vọng</text>
        {''.join(table_rows)}
        </svg>""",
        encoding="utf-8",
    )


def render_finalization_evidence(
    metadata: dict[str, object], output_path: Path
) -> None:
    audit = metadata["v1_3_final_audit"]
    checks = [
        ("Stage", metadata["stage"]),
        ("Ảnh active", metadata["active_image_count"]),
        ("Số lớp", metadata["classes"]),
        ("Số group", metadata["group_count"]),
        ("Cross-label group", audit["cross_label_group_count"]),
        ("Group xuyên split", audit["group_id_cross_split_count"]),
        ("SHA-256 xuyên split", audit["sha256_cross_split_count"]),
        (
            "Near-duplicate xuyên split",
            audit.get("high_confidence_cross_split_pair_count", 0),
        ),
        ("Đủ lớp ở mọi split", audit.get("all_classes_in_all_splits", False)),
    ]
    rows = "".join(
        f"""
        <rect x="60" y="{170 + index * 72}" width="1080" height="64" rx="8" fill="{'#ffffff' if index % 2 == 0 else '#f4f8f5'}"/>
        <text x="90" y="{211 + index * 72}" class="label">{svg_text(label)}</text>
        <text x="750" y="{211 + index * 72}" class="value">{svg_text(value)}</text>"""
        for index, (label, value) in enumerate(checks)
    )
    output_path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="870" viewBox="0 0 1200 870">
        <rect width="100%" height="100%" fill="#eef5f0"/>
        <style>
          .title {{ font: 700 34px Arial, sans-serif; fill: #173b27; }}
          .subtitle {{ font: 20px Arial, sans-serif; fill: #42634e; }}
          .label {{ font: 20px Arial, sans-serif; fill: #27382d; }}
          .value {{ font: 700 20px Consolas, monospace; fill: #16713c; }}
        </style>
        <text x="60" y="64" class="title">Hậu kiểm dataset v1.3 sau xử lý</text>
        <text x="60" y="108" class="subtitle">Nguồn: metadata/dataset_version.json và reports/v1_3_final_audit.json</text>
        {rows}
        </svg>""",
        encoding="utf-8",
    )


def generate(dataset_dir: Path, output_dir: Path) -> tuple[Path, Path, Path]:
    current_manifest_path = dataset_dir / "manifests" / "dataset_manifest.csv"
    current_metadata_path = dataset_dir / "metadata" / "dataset_version.json"
    current_rows = read_manifest(current_manifest_path)
    current_metadata = json.loads(current_metadata_path.read_text(encoding="utf-8"))
    rows = current_rows
    metadata = current_metadata
    conflicts = find_cross_label_groups(rows)
    if not conflicts:
        backup_dir = (
            dataset_dir
            / "reports"
            / "step_v1_3_backup_before_cross_label_resolution"
        )
        rows = read_manifest(backup_dir / "dataset_manifest.csv")
        metadata = json.loads(
            (backup_dir / "dataset_version.json").read_text(encoding="utf-8")
        )
        conflicts = find_cross_label_groups(rows)
    if len(conflicts) != 1:
        raise ValueError(f"Cần đúng một cross-label group, nhận được {len(conflicts)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    conflict_path = output_dir / "cross_label_group_evidence.svg"
    metadata_path_output = output_dir / "metadata_mismatch_evidence.svg"
    finalization_path = output_dir / "finalization_evidence.svg"
    render_cross_label_evidence(dataset_dir, conflicts[0], conflict_path)
    render_metadata_evidence(dataset_dir, rows, metadata, metadata_path_output)
    render_finalization_evidence(current_metadata, finalization_path)
    return conflict_path, metadata_path_output, finalization_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    outputs = generate(args.dataset_dir, args.output_dir)
    if not all(path.is_file() and path.stat().st_size > 0 for path in outputs):
        raise RuntimeError("Không tạo đủ ảnh bằng chứng")
    print("\n".join(str(path) for path in outputs))


if __name__ == "__main__":
    main()
