"""Permute a finished English-label v1.4 checkpoint to Vietnamese labels."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import torch

from ai.tasks.agri_21.scripts.relocate_v1_4_vietnamese_labels import PEPPER_LABELS, sha256


WEIGHT_KEY = "backbone.classifier.2.1.weight"
BIAS_KEY = "backbone.classifier.2.1.bias"


def translated_label(label: str) -> str:
    if not label.startswith("Ot___"):
        return label
    return f"Ot___{PEPPER_LABELS[label.split('___', maxsplit=1)[1]]}"


def convert_checkpoint(source: Path, dataset_dir: Path, output: Path) -> dict[str, object]:
    source = source.resolve(strict=True)
    dataset_dir = dataset_dir.resolve(strict=True)
    output = output.resolve()
    if output.exists():
        raise FileExistsError(output)

    checkpoint = torch.load(source, map_location="cpu", weights_only=False)
    if checkpoint["task"] != "compound" or checkpoint["target_field"] != "compound_label":
        raise ValueError("Checkpoint không thuộc task compound")
    old_mapping = checkpoint["class_to_idx"]
    if len(old_mapping) != 59:
        raise ValueError("Checkpoint không có đúng 59 lớp")
    translated = {translated_label(label): index for label, index in old_mapping.items()}
    if len(translated) != 59:
        raise ValueError("Nhãn sau khi dịch bị trùng")

    manifest_path = dataset_dir / "manifests" / "dataset_manifest.csv"
    with manifest_path.open(encoding="utf-8-sig", newline="") as handle:
        dataset_labels = {row["compound_label"] for row in csv.DictReader(handle)}
    if dataset_labels != set(translated):
        raise ValueError("Nhãn checkpoint sau khi dịch không khớp dataset")

    ordered_labels = sorted(dataset_labels)
    old_indices = [translated[label] for label in ordered_labels]
    state = checkpoint["model_state_dict"]
    for key in (WEIGHT_KEY, BIAS_KEY):
        if key not in state or state[key].shape[0] != 59:
            raise ValueError(f"Classifier không khớp: {key}")
        state[key] = state[key][old_indices].clone()
    if checkpoint.get("class_weights") is not None:
        checkpoint["class_weights"] = [
            checkpoint["class_weights"][index] for index in old_indices
        ]
    checkpoint["class_to_idx"] = {
        label: index for index, label in enumerate(ordered_labels)
    }
    checkpoint["idx_to_info"] = {
        index: {
            "label": label,
            "target_field": "compound_label",
            "plant": label.split("___", maxsplit=1)[0],
            "disease": label.split("___", maxsplit=1)[1],
            "compound_label": label,
        }
        for index, label in enumerate(ordered_labels)
    }
    checkpoint["source_checkpoint_sha256_before_label_rename"] = sha256(source)
    checkpoint["dataset_manifest_sha256"] = sha256(manifest_path)
    checkpoint["label_rename_mapping"] = PEPPER_LABELS
    checkpoint.pop("optimizer_state_dict", None)  # Inference artifact; not resumable.
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, output)
    return {
        "source": str(source),
        "output": str(output),
        "classes": len(ordered_labels),
        "manifest_sha256": checkpoint["dataset_manifest_sha256"],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(
            convert_checkpoint(args.source, args.dataset_dir, args.output),
            ensure_ascii=False,
            indent=2,
        )
    )
