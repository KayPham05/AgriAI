"""Train ConvNeXt-Tiny for plant, disease, or compound classification."""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

from ai.configs import config
from ai.configs.classification_tasks import (
    ClassificationTaskConfig,
    get_task_config,
    task_names,
)
from ai.data.dataset import compute_class_weights, create_dataloaders
from ai.networks.convnext import build_model
from ai.utils.metrics import compute_metrics
from ai.utils.training import set_finetuning_phase, warmup_cosine_factor

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def set_seed(seed: int = config.TRAINING_SEED) -> None:
    """Fix random seeds for reproducible initialization and batch ordering."""

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def build_optimizer(
    model: nn.Module,
    backbone_lr: float,
    head_lr: float,
    weight_decay: float,
) -> torch.optim.AdamW:
    """Build AdamW with a lower LR for pretrained features than the head."""

    return torch.optim.AdamW(
        [
            {"params": model.backbone.features.parameters(), "lr": backbone_lr},
            {"params": model.backbone.classifier.parameters(), "lr": head_lr},
        ],
        weight_decay=weight_decay,
    )


def advance_scheduler_for_next_epoch(
    scheduler: Any,
    *,
    completed_epoch: int,
    total_epochs: int,
) -> None:
    """Advance the LR schedule only when another epoch will run."""

    if completed_epoch < total_epochs:
        scheduler.step()


def build_criterion(
    task: ClassificationTaskConfig,
    training_records: list[dict[str, Any]],
    num_classes: int,
    device: torch.device,
) -> tuple[nn.CrossEntropyLoss, list[float] | None]:
    """Create task-appropriate cross-entropy loss."""

    class_weights = None
    weight_tensor = None
    if task.use_class_weights:
        class_weights = compute_class_weights(training_records, num_classes)
        weight_tensor = torch.tensor(
            class_weights,
            dtype=torch.float32,
            device=device,
        )
    criterion = nn.CrossEntropyLoss(
        weight=weight_tensor,
        label_smoothing=config.LABEL_SMOOTHING,
    )
    return criterion, class_weights


def train_one_epoch(
    model: nn.Module,
    dataloader: Any,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    scaler: torch.amp.GradScaler,
    device: torch.device,
    accumulation_steps: int = config.GRADIENT_ACCUMULATION_STEPS,
) -> tuple[float, float]:
    model.train()
    running_loss = 0.0
    all_preds: list[int] = []
    all_targets: list[int] = []

    optimizer.zero_grad()
    progress = tqdm(dataloader, desc="Train", leave=False, dynamic_ncols=True)
    for step, (images, targets) in enumerate(progress):
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        with torch.amp.autocast("cuda", enabled=config.USE_AMP):
            outputs = model(images)
            full_loss = criterion(outputs, targets)
            loss = full_loss / accumulation_steps

        scaler.scale(loss).backward()
        should_step = (step + 1) % accumulation_steps == 0 or (
            step + 1 == len(dataloader)
        )
        if should_step:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()

        running_loss += full_loss.item() * images.size(0)
        all_preds.extend(torch.argmax(outputs, dim=1).detach().cpu().tolist())
        all_targets.extend(targets.cpu().tolist())
        current_accuracy = float(np.mean(np.equal(all_preds, all_targets)))
        progress.set_postfix(
            loss=f"{full_loss.item():.4f}",
            acc=f"{current_accuracy:.3f}",
        )

    epoch_loss = running_loss / len(dataloader.dataset)
    epoch_accuracy = float(np.mean(np.equal(all_preds, all_targets)))
    return epoch_loss, epoch_accuracy


@torch.no_grad()
def evaluate_validation(
    model: nn.Module,
    dataloader: Any,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[dict[str, float], list[int], list[int]]:
    model.eval()
    running_loss = 0.0
    all_preds: list[int] = []
    all_targets: list[int] = []

    progress = tqdm(dataloader, desc="Val", leave=False, dynamic_ncols=True)
    for images, targets in progress:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=config.USE_AMP):
            outputs = model(images)
            loss = criterion(outputs, targets)
        running_loss += loss.item() * images.size(0)
        all_preds.extend(torch.argmax(outputs, dim=1).cpu().tolist())
        all_targets.extend(targets.cpu().tolist())

    metrics = compute_metrics(all_targets, all_preds)
    metrics["loss"] = running_loss / len(dataloader.dataset)
    return metrics, all_targets, all_preds


def _create_summary_writer(log_dir: Path):
    try:
        from torch.utils.tensorboard import SummaryWriter
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "Thiếu TensorBoard; cài dependency trong ai/requirements.txt"
        ) from error
    return SummaryWriter(log_dir=str(log_dir))


def _save_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def run_training(args: argparse.Namespace) -> Path:
    task = get_task_config(args.task)
    epochs = args.epochs or config.EPOCHS
    batch_size = args.batch_size or config.BATCH_SIZE
    freeze_epochs = min(args.freeze_epochs, epochs)
    warmup_epochs = min(args.warmup_epochs, epochs)

    for directory in (task.checkpoint_dir, task.output_dir, task.tensorboard_dir):
        directory.mkdir(parents=True, exist_ok=True)

    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    tensorboard_log_dir = task.tensorboard_dir / run_id

    print("=" * 72)
    print(f"ConvNeXt-Tiny baseline | task={task.name} | target={task.target_field}")
    print(f"Thiết bị: {config.DEVICE}")
    print(
        f"Batch hiệu dụng: {batch_size * config.GRADIENT_ACCUMULATION_STEPS} "
        f"(batch={batch_size}, accumulation={config.GRADIENT_ACCUMULATION_STEPS})"
    )
    print("=" * 72)
    set_seed(config.TRAINING_SEED)

    train_loader, val_loader, test_loader, num_classes, idx_to_info = (
        create_dataloaders(
            batch_size=batch_size,
            num_workers=args.num_workers,
            target_field=task.target_field,
            label_map_path=task.label_map_path,
        )
    )
    if num_classes != task.expected_num_classes:
        raise ValueError(
            f"Task {task.name} cần {task.expected_num_classes} lớp, "
            f"manifest cung cấp {num_classes} lớp"
        )
    print(
        f"Lớp={num_classes} | train={len(train_loader.dataset)} | "
        f"val={len(val_loader.dataset)} | test={len(test_loader.dataset)}"
    )

    model = build_model(
        num_classes=num_classes,
        pretrained=not args.no_pretrained,
        device=config.DEVICE,
    )
    set_finetuning_phase(model, epoch=1, freeze_epochs=freeze_epochs)
    criterion, class_weights = build_criterion(
        task,
        train_loader.dataset.records,
        num_classes,
        config.DEVICE,
    )
    optimizer = build_optimizer(
        model,
        backbone_lr=args.backbone_lr,
        head_lr=args.head_lr,
        weight_decay=args.weight_decay,
    )
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lr_lambda=lambda index: warmup_cosine_factor(
            index,
            total_epochs=epochs,
            warmup_epochs=warmup_epochs,
            min_factor=config.MIN_LR_FACTOR,
        ),
    )
    scaler = torch.amp.GradScaler("cuda", enabled=config.USE_AMP)

    class_to_idx = {info["label"]: index for index, info in idx_to_info.items()}
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "val_f1": [],
        "val_balanced_accuracy": [],
    }
    best_val_f1 = -1.0
    patience_counter = 0
    start_time = time.time()
    writer = _create_summary_writer(tensorboard_log_dir)

    try:
        for epoch in range(1, epochs + 1):
            epoch_start = time.time()
            phase = set_finetuning_phase(model, epoch, freeze_epochs)
            train_loss, train_accuracy = train_one_epoch(
                model,
                train_loader,
                criterion,
                optimizer,
                scaler,
                config.DEVICE,
            )
            val_metrics, _, _ = evaluate_validation(
                model,
                val_loader,
                criterion,
                config.DEVICE,
            )

            history["train_loss"].append(train_loss)
            history["train_acc"].append(train_accuracy)
            history["val_loss"].append(val_metrics["loss"])
            history["val_acc"].append(val_metrics["accuracy"])
            history["val_f1"].append(val_metrics["f1_macro"])
            history["val_balanced_accuracy"].append(
                val_metrics["balanced_accuracy"]
            )

            backbone_lr = optimizer.param_groups[0]["lr"]
            head_lr = optimizer.param_groups[1]["lr"]
            writer.add_scalar("loss/train", train_loss, epoch)
            writer.add_scalar("loss/validation", val_metrics["loss"], epoch)
            writer.add_scalar("accuracy/train", train_accuracy, epoch)
            writer.add_scalar("accuracy/validation", val_metrics["accuracy"], epoch)
            writer.add_scalar("f1_macro/validation", val_metrics["f1_macro"], epoch)
            writer.add_scalar(
                "balanced_accuracy/validation",
                val_metrics["balanced_accuracy"],
                epoch,
            )
            writer.add_scalar("learning_rate/backbone", backbone_lr, epoch)
            writer.add_scalar("learning_rate/head", head_lr, epoch)

            checkpoint = {
                "epoch": epoch,
                "task": task.name,
                "target_field": task.target_field,
                "dataset_version": config.DATASET_VERSION,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "num_classes": num_classes,
                "class_to_idx": class_to_idx,
                "idx_to_info": idx_to_info,
                "class_weights": class_weights,
                "val_metrics": val_metrics,
                "training_phase": phase,
                "tensorboard_log_dir": str(tensorboard_log_dir.resolve()),
            }
            torch.save(checkpoint, task.last_checkpoint_path)

            improved = val_metrics["f1_macro"] > best_val_f1
            if improved:
                best_val_f1 = val_metrics["f1_macro"]
                patience_counter = 0
                torch.save(checkpoint, task.best_checkpoint_path)
            else:
                patience_counter += 1

            duration = time.time() - epoch_start
            print(
                f"Epoch {epoch:02d}/{epochs:02d} | {phase} | {duration:.1f}s | "
                f"lr={backbone_lr:.2e}/{head_lr:.2e} | "
                f"train loss={train_loss:.4f} acc={train_accuracy:.4f} | "
                f"val loss={val_metrics['loss']:.4f} "
                f"acc={val_metrics['accuracy']:.4f} "
                f"f1={val_metrics['f1_macro']:.4f}"
            )
            advance_scheduler_for_next_epoch(
                scheduler,
                completed_epoch=epoch,
                total_epochs=epochs,
            )
            if patience_counter >= config.EARLY_STOPPING_PATIENCE:
                print(
                    f"Dừng sớm sau {patience_counter} epoch không cải thiện val F1."
                )
                break
    finally:
        writer.close()

    elapsed_minutes = (time.time() - start_time) / 60
    _save_json(task.output_dir / "training_history.json", history)
    _save_json(
        task.output_dir / "training_summary.json",
        {
            "task": task.name,
            "target_field": task.target_field,
            "dataset_version": config.DATASET_VERSION,
            "num_classes": num_classes,
            "best_val_f1": best_val_f1,
            "epochs_completed": len(history["train_loss"]),
            "elapsed_minutes": elapsed_minutes,
            "best_checkpoint": str(task.best_checkpoint_path.resolve()),
            "tensorboard_log_dir": str(tensorboard_log_dir.resolve()),
        },
    )

    from ai.utils.visualizer import plot_training_history

    plot_training_history(
        history,
        save_path=task.output_dir / "training_history.png",
    )
    print(f"Hoàn tất {task.name}; best val F1={best_val_f1:.4f}")
    return task.best_checkpoint_path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fine-tune ConvNeXt-Tiny theo từng bài toán phân loại",
    )
    parser.add_argument("--task", choices=task_names(), default="compound")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--num-workers", type=int, default=config.NUM_WORKERS)
    parser.add_argument("--freeze-epochs", type=int, default=config.FREEZE_EPOCHS)
    parser.add_argument("--warmup-epochs", type=int, default=config.WARMUP_EPOCHS)
    parser.add_argument("--head-lr", type=float, default=config.HEAD_LEARNING_RATE)
    parser.add_argument(
        "--backbone-lr",
        type=float,
        default=config.BACKBONE_LEARNING_RATE,
    )
    parser.add_argument("--weight-decay", type=float, default=config.WEIGHT_DECAY)
    parser.add_argument(
        "--no-pretrained",
        action="store_true",
        help="Không tải ImageNet weights; chỉ dùng cho smoke test",
    )
    return parser.parse_args(argv)


def main() -> None:
    try:
        run_training(parse_args())
    except Exception as error:
        print(f"Lỗi huấn luyện: {error}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
