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
from ai.tasks.agri_21.scripts.build_exact_dedup_dataset import MAPPING_FIELDS


REVIEW_FIELDS = [
    "sha256",
    "decision",
    "chosen_label",
    "confidence",
    "source_labels",
    "source_file_count",
    "canonical_path",
    "rationale",
]

V1_1_REVIEW_DECISIONS = [
    {
        "sha256": "216ee24be41c531d0216031910ce43a1b7af5ba5b0d7604c8022c37d59dcdf06",
        "decision": "keep_quarantined",
        "chosen_label": "",
        "confidence": "low",
        "rationale": "Ảnh 100x100 đồng thời có vàng lá và xoăn lá; không đủ bằng chứng chọn một nhãn.",
    },
    {
        "sha256": "54b484a26d5e3b9cf577173345241e3c92785be3cf6e9a3362e0345b93d8b628",
        "decision": "keep_quarantined",
        "chosen_label": "",
        "confidence": "low",
        "rationale": "Triệu chứng khảm vàng và biến dạng lá chồng lấn giữa hai lớp.",
    },
    {
        "sha256": "9120578a76fd8539da220def6e0609ebb2435decc7a9c34b949e46e86e794c8d",
        "decision": "resolved",
        "chosen_label": "Ngo___Dom_la_xam",
        "confidence": "high",
        "rationale": "Nhiều vết chữ nhật hẹp, mép song song và bị giới hạn bởi gân lá, phù hợp gray leaf spot.",
    },
    {
        "sha256": "b3b7e136f8205019195358ceb43b432a3bc633692b1d403abf27276b2fa47873",
        "decision": "resolved",
        "chosen_label": "Ot___Xoan_la",
        "confidence": "high",
        "rationale": "Đọt và lá non biến dạng, cuộn rõ; không phù hợp lớp khỏe.",
    },
    {
        "sha256": "b7ce7f4462ca5914b05c76e44f9f535ab3a1e5f798ad1e3a3c023c44b7890e67",
        "decision": "keep_quarantined",
        "chosen_label": "",
        "confidence": "low",
        "rationale": "Ảnh có cả vàng loang và xoăn/biến dạng; nhãn đơn không thể chốt chắc chắn.",
    },
    {
        "sha256": "d68d901f85f22a6621444ec14e0f5ec01e88331a6b721dfc14b456b7090865b9",
        "decision": "resolved",
        "chosen_label": "Ot___Xoan_la",
        "confidence": "medium",
        "rationale": "Lá nhăn và cuộn rõ nhưng không quan sát thấy ruồi trắng trong ảnh.",
    },
    {
        "sha256": "ee3838e2249e671b7b4510b0d3831f30882e2bcbf20c9c8c42ee8f4e1b95fcce",
        "decision": "resolved",
        "chosen_label": "Ngo___Chay_la",
        "confidence": "high",
        "rationale": "Một vết lớn hình thoi/xì gà với hai đầu thuôn, phù hợp northern leaf blight.",
    },
    {
        "sha256": "f0404c3f8b673325e0fc5dbf064cb235b8599f1de33578d32eddf94efb175001",
        "decision": "keep_quarantined",
        "chosen_label": "",
        "confidence": "low",
        "rationale": "Ảnh 100x100 đồng thời có vàng lá và xoăn lá; không đủ chi tiết để chọn nhãn.",
    },
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as input_file:
        return list(csv.DictReader(input_file))


def apply_label_conflict_review(
    dataset_dir: Path,
    output_dir: Path,
    decisions: list[dict[str, str]],
) -> dict[str, int]:
    dataset_dir = dataset_dir.resolve()
    output_dir = output_dir.resolve()
    metadata_path = output_dir / "metadata" / "dataset_version.json"
    manifest_path = output_dir / "manifests" / "dataset_manifest.csv"
    mapping_path = output_dir / "reports" / "exact_dedup_mapping.csv"
    conflicts_path = output_dir / "reports" / "label_conflicts.csv"
    distribution_path = output_dir / "reports" / "class_distribution.csv"
    review_path = output_dir / "reports" / "label_conflict_review.csv"
    backup_dir = output_dir / "reports" / "step1_backup_before_label_review"

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("stage") != "exact_dedup_only":
        raise ValueError("Output không ở trạng thái exact_dedup_only")
    if backup_dir.exists() or review_path.exists():
        raise FileExistsError("Bước review đã có artifact; không áp dụng lại")

    conflict_rows = read_csv(conflicts_path)
    conflicts_by_sha: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in conflict_rows:
        conflicts_by_sha[row["sha256"]].append(row)

    decisions_by_sha = {decision["sha256"]: decision for decision in decisions}
    if set(decisions_by_sha) != set(conflicts_by_sha):
        raise ValueError("Decision phải bao phủ đúng toàn bộ SHA xung đột")

    source_manifest = Path(str(metadata["source_manifest"]))
    source_records = read_csv(source_manifest)
    source_by_path = {row["image_path"]: row for row in source_records}
    manifest_rows: list[dict[str, object]] = read_csv(manifest_path)
    mapping_rows: list[dict[str, object]] = read_csv(mapping_path)
    mapping_by_sha: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in mapping_rows:
        mapping_by_sha[str(row["sha256"])].append(row)

    review_rows: list[dict[str, object]] = []
    files_to_copy: list[tuple[Path, Path, str]] = []
    resolved_hashes = 0
    quarantined_hashes = 0

    for sha256, group in sorted(conflicts_by_sha.items()):
        decision = decisions_by_sha[sha256]
        source_labels = sorted({row["compound_label"] for row in group})
        chosen_label = decision["chosen_label"]
        canonical_path = ""

        if decision["decision"] == "resolved":
            if chosen_label not in source_labels:
                raise ValueError(f"Nhãn chọn không thuộc nhóm {sha256}: {chosen_label}")
            chosen_rows = sorted(
                (row for row in group if row["compound_label"] == chosen_label),
                key=lambda row: row["source_path"],
            )
            canonical_path = chosen_rows[0]["source_path"]
            source_record = source_by_path[canonical_path]
            cleaned_record: dict[str, object] = dict(source_record)
            cleaned_record["group_id"] = f"sha256:{sha256}"
            cleaned_record["split"] = ""
            manifest_rows.append(cleaned_record)

            source_path = dataset_dir / Path(canonical_path)
            destination_path = output_dir / "images" / Path(canonical_path)
            if calculate_sha256(source_path) != sha256:
                raise ValueError(f"Checksum nguồn không khớp: {source_path}")
            files_to_copy.append((source_path, destination_path, sha256))

            for row in mapping_by_sha[sha256]:
                row["canonical_path"] = canonical_path
                if row["source_path"] == canonical_path:
                    row["action"] = "copied_canonical_after_label_review"
                    row["reason"] = "chosen_by_visual_label_review"
                elif row["compound_label"] == chosen_label:
                    row["action"] = "skipped_exact_duplicate_after_label_review"
                    row["reason"] = "same_sha256_as_reviewed_canonical"
                else:
                    row["action"] = "excluded_after_label_review"
                    row["reason"] = "conflicting_label_rejected_by_review"
            resolved_hashes += 1
        elif decision["decision"] == "keep_quarantined":
            if chosen_label:
                raise ValueError(f"Nhóm cách ly không được có chosen_label: {sha256}")
            quarantined_hashes += 1
        else:
            raise ValueError(f"Decision không hợp lệ: {decision['decision']}")

        review_rows.append(
            {
                "sha256": sha256,
                "decision": decision["decision"],
                "chosen_label": chosen_label,
                "confidence": decision["confidence"],
                "source_labels": ";".join(source_labels),
                "source_file_count": len(group),
                "canonical_path": canonical_path,
                "rationale": decision["rationale"],
            }
        )

    backup_dir.mkdir(parents=True)
    for path in (manifest_path, mapping_path, distribution_path, metadata_path):
        shutil.copy2(path, backup_dir / path.name)

    for source_path, destination_path, sha256 in files_to_copy:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination_path)
        if calculate_sha256(destination_path) != sha256:
            raise ValueError(f"Checksum output không khớp: {destination_path}")

    manifest_rows.sort(key=lambda row: str(row["image_path"]))
    write_csv(manifest_path, MANIFEST_FIELDS, manifest_rows)
    write_csv(mapping_path, MAPPING_FIELDS, mapping_rows)
    write_csv(review_path, REVIEW_FIELDS, review_rows)

    class_counts: dict[str, Counter[str]] = defaultdict(Counter)
    for row in mapping_rows:
        counts = class_counts[str(row["compound_label"])]
        counts["source_files"] += 1
        action = str(row["action"])
        if action.startswith("copied_canonical"):
            counts["copied_files"] += 1
        if action.startswith("skipped_exact_duplicate"):
            counts["exact_duplicate_files_skipped"] += 1
        if action in {
            "copied_canonical_after_label_review",
            "skipped_exact_duplicate_after_label_review",
            "excluded_after_label_review",
        }:
            counts["label_conflict_files_resolved"] += 1
        if action == "quarantined_label_conflict":
            counts["label_conflict_files_unresolved"] += 1

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
                "label_conflict_files_resolved": counts[
                    "label_conflict_files_resolved"
                ],
                "label_conflict_files_unresolved": counts[
                    "label_conflict_files_unresolved"
                ],
            }
        )
    distribution_fields = [
        "plant",
        "condition",
        "compound_label",
        "source_files",
        "copied_files",
        "exact_duplicate_files_skipped",
        "label_conflict_files_resolved",
        "label_conflict_files_unresolved",
    ]
    write_csv(distribution_path, distribution_fields, distribution_rows)

    action_counts = Counter(str(row["action"]) for row in mapping_rows)
    resolved_files = sum(
        int(row["source_file_count"])
        for row in review_rows
        if row["decision"] == "resolved"
    )
    quarantined_files = sum(
        int(row["source_file_count"])
        for row in review_rows
        if row["decision"] == "keep_quarantined"
    )
    metadata.update(
        {
            "stage": "exact_dedup_and_label_conflict_review",
            "label_reviewed_at_utc": datetime.now(timezone.utc).isoformat(),
            "copied_files": len(manifest_rows),
            "exact_duplicate_files_skipped": sum(
                count
                for action, count in action_counts.items()
                if action.startswith("skipped_exact_duplicate")
            ),
            "label_conflict_hashes_resolved": resolved_hashes,
            "label_conflict_files_resolved": resolved_files,
            "label_conflict_hashes_quarantined": quarantined_hashes,
            "label_conflict_files_quarantined": quarantined_files,
        }
    )
    metadata.pop("label_conflict_hashes", None)
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return {
        "copied_files": len(manifest_rows),
        "resolved_hashes": resolved_hashes,
        "resolved_files": resolved_files,
        "quarantined_hashes": quarantined_hashes,
        "quarantined_files": quarantined_files,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Áp dụng quyết định review xung đột nhãn vào dataset v1.1."
    )
    parser.add_argument("source_dataset_dir", type=Path)
    parser.add_argument("output_dataset_dir", type=Path)
    args = parser.parse_args()
    summary = apply_label_conflict_review(
        dataset_dir=args.source_dataset_dir,
        output_dir=args.output_dataset_dir,
        decisions=V1_1_REVIEW_DECISIONS,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
