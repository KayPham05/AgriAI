"""Evaluate task-specific ConvNeXt-Tiny checkpoints on the fixed test split."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

import torch
from tqdm import tqdm

from ai.configs import config
from ai.configs.classification_tasks import get_task_config, task_names
from ai.data.dataset import create_dataloaders
from ai.networks.convnext import build_model
from ai.utils.metrics import (
    compute_metrics,
    get_confusion_matrix,
    get_detailed_report,
    get_detailed_report_dict,
    get_top_confusions,
)
from ai.utils.visualizer import plot_confusion_matrix

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def _info_for_index(idx_to_info: dict[Any, dict[str, str]], index: int):
    return idx_to_info.get(str(index), idx_to_info.get(index))


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def evaluate_task(task_name: str, checkpoint_path: str | Path | None = None) -> dict[str, float]:
    task = get_task_config(task_name)
    task.output_dir.mkdir(parents=True, exist_ok=True)
    resolved_checkpoint = Path(checkpoint_path or task.best_checkpoint_path)
    if not resolved_checkpoint.is_file():
        raise FileNotFoundError(f"Không tìm thấy checkpoint: {resolved_checkpoint.resolve()}")

    checkpoint = torch.load(resolved_checkpoint, map_location=config.DEVICE)
    checkpoint_task = checkpoint.get("task", "compound")
    if checkpoint_task != task.name:
        raise ValueError(
            f"Checkpoint thuộc task {checkpoint_task!r}, không phải {task.name!r}"
        )
    if checkpoint.get("target_field", task.target_field) != task.target_field:
        raise ValueError("Target field trong checkpoint không khớp cấu hình task")

    _, _, test_loader, dataset_num_classes, dataset_idx_to_info = create_dataloaders(
        target_field=task.target_field,
        label_map_path=task.label_map_path,
    )
    num_classes = checkpoint["num_classes"]
    if dataset_num_classes != num_classes:
        raise ValueError(
            f"Checkpoint có {num_classes} lớp nhưng dataset có "
            f"{dataset_num_classes} lớp"
        )

    idx_to_info = checkpoint.get("idx_to_info") or dataset_idx_to_info
    target_names = [
        _info_for_index(idx_to_info, index)["label"]
        for index in range(num_classes)
    ]
    dataset_target_names = [
        _info_for_index(dataset_idx_to_info, index)["label"]
        for index in range(dataset_num_classes)
    ]
    if target_names != dataset_target_names:
        raise ValueError("Mapping lớp trong checkpoint không khớp dataset")

    model = build_model(
        num_classes=num_classes,
        pretrained=False,
        device=config.DEVICE,
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_predictions: list[int] = []
    all_targets: list[int] = []
    with torch.no_grad():
        for images, targets in tqdm(
            test_loader,
            desc=f"Test {task.name}",
            dynamic_ncols=True,
        ):
            images = images.to(config.DEVICE, non_blocking=True)
            with torch.amp.autocast("cuda", enabled=config.USE_AMP):
                outputs = model(images)
            all_predictions.extend(torch.argmax(outputs, dim=1).cpu().tolist())
            all_targets.extend(targets.tolist())

    metrics = compute_metrics(all_targets, all_predictions)
    report_text = get_detailed_report(
        all_targets,
        all_predictions,
        target_names,
    )
    report_dict = get_detailed_report_dict(
        all_targets,
        all_predictions,
        target_names,
    )
    matrix = get_confusion_matrix(
        all_targets,
        all_predictions,
        num_classes=num_classes,
    )
    top_confusions = get_top_confusions(matrix, target_names)

    (task.output_dir / "classification_report.txt").write_text(
        report_text,
        encoding="utf-8",
    )
    (task.output_dir / "test_metrics.json").write_text(
        json.dumps(
            {
                "task": task.name,
                "target_field": task.target_field,
                "checkpoint": str(resolved_checkpoint.resolve()),
                "sample_count": len(all_targets),
                "metrics": metrics,
                "per_class": report_dict,
                "top_confusions": top_confusions,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    _write_csv(
        task.output_dir / "top_confusions.csv",
        ["actual", "predicted", "count"],
        top_confusions,
    )

    misclassified_rows = []
    for record, target, prediction in zip(
        test_loader.dataset.records,
        all_targets,
        all_predictions,
    ):
        if target == prediction:
            continue
        misclassified_rows.append(
            {
                "image_path": record["image_path"],
                "plant": record["plant"],
                "condition": record["condition"],
                "true_label": target_names[target],
                "predicted_label": target_names[prediction],
                "group_id": record["group_id"],
                "quality_flags": record.get("quality_flags", ""),
            }
        )
    _write_csv(
        task.output_dir / "misclassified_samples.csv",
        [
            "image_path",
            "plant",
            "condition",
            "true_label",
            "predicted_label",
            "group_id",
            "quality_flags",
        ],
        misclassified_rows,
    )
    plot_confusion_matrix(
        matrix,
        class_names=target_names,
        save_path=task.output_dir / "test_confusion_matrix.png",
    )

    print(f"Task: {task.name} | test samples: {len(all_targets)}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"Balanced accuracy: {metrics['balanced_accuracy']:.4f}")
    print(f"Macro F1: {metrics['f1_macro']:.4f}")
    print(report_text)
    return metrics


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Đánh giá baseline ConvNeXt-Tiny theo task",
    )
    parser.add_argument("--task", choices=task_names(), default="compound")
    parser.add_argument("--checkpoint", type=Path, default=None)
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    evaluate_task(args.task, args.checkpoint)


if __name__ == "__main__":
    main()
