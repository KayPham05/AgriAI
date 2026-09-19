import os
import sys
import time
import random
import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

from configs import config
from data.dataset import create_dataloaders
from networks.convnext import build_model
from utils.metrics import compute_metrics
from utils.visualizer import plot_training_history

def set_seed(seed: int = config.RANDOM_SEED):
    """Cố định seed để đảm bảo tính tái lập kết quả."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def train_one_epoch(model, dataloader, criterion, optimizer, scaler, device, accumulation_steps=config.GRADIENT_ACCUMULATION_STEPS):
    model.train()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    optimizer.zero_grad()
    pbar = tqdm(dataloader, desc="Train", leave=False, dynamic_ncols=True)

    for i, (images, targets) in enumerate(pbar):
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        # Mixed Precision Forward Pass (Tối ưu cho GTX 1650)
        with torch.amp.autocast("cuda", enabled=config.USE_AMP):
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss = loss / accumulation_steps

        # Backward với GradScaler
        scaler.scale(loss).backward()

        if (i + 1) % accumulation_steps == 0 or (i + 1) == len(dataloader):
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()

        running_loss += loss.item() * accumulation_steps * images.size(0)
        preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.cpu().numpy())

        current_acc = np.mean(np.array(all_preds) == np.array(all_targets))
        pbar.set_postfix({"loss": f"{loss.item() * accumulation_steps:.4f}", "acc": f"{current_acc:.3f}"})

    epoch_loss = running_loss / len(dataloader.dataset)
    epoch_acc = np.mean(np.array(all_preds) == np.array(all_targets))
    return epoch_loss, epoch_acc


@torch.no_grad()
def evaluate_validation(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    pbar = tqdm(dataloader, desc="Val", leave=False, dynamic_ncols=True)
    for images, targets in pbar:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        with torch.amp.autocast("cuda", enabled=config.USE_AMP):
            outputs = model(images)
            loss = criterion(outputs, targets)

        running_loss += loss.item() * images.size(0)
        preds = torch.argmax(outputs, dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.cpu().numpy())

    val_loss = running_loss / len(dataloader.dataset)
    metrics = compute_metrics(all_targets, all_preds)
    metrics["loss"] = val_loss
    return metrics, all_targets, all_preds


def main():
    print("=" * 65)
    print("🌿 KHỞI ĐỘNG TIẾN TRÌNH HUẤN LUYỆN ConvNeXt-Tiny (AgriVisionAI) 🌿")
    print(f"[*] Thiết bị: {config.DEVICE}")
    if torch.cuda.is_available():
        print(f"[*] GPU: {torch.cuda.get_device_name(0)}")
        print(f"[*] VRAM hiện có: {torch.cuda.get_device_properties(0).total_memory / (1024**2):.0f} MiB")
        print(f"[*] Chế độ AMP (Mixed Precision): BẬT (Tiết kiệm ~40% VRAM)")
    print(f"[*] Batch size hiệu dụng: {config.BATCH_SIZE * config.GRADIENT_ACCUMULATION_STEPS} (Batch={config.BATCH_SIZE}, Accum={config.GRADIENT_ACCUMULATION_STEPS})")
    print("=" * 65)

    set_seed(config.RANDOM_SEED)

    # 1. Quét dữ liệu và nạp DataLoader
    try:
        train_loader, val_loader, test_loader, num_classes, idx_to_info = create_dataloaders()
    except Exception as e:
        print(f"\n[!] Lỗi chuẩn bị dữ liệu: {e}")
        print("[!] Hãy chắc chắn bạn đã đặt ảnh theo cấu trúc: ai/Image/<Ten_Cay>/<Ten_Benh>/*.jpg")
        sys.exit(1)

    print(f"[*] Số lượng lớp phân loại phát hiện được: {num_classes}")
    print(f"[*] Số mẫu Train: {len(train_loader.dataset)} | Val: {len(val_loader.dataset)} | Test: {len(test_loader.dataset)}")

    # 2. Xây dựng mô hình
    print("\n[*] Đang khởi tạo mô hình ConvNeXt-Tiny (Pretrained ImageNet-1K)...")
    model = build_model(num_classes=num_classes, pretrained=True, device=config.DEVICE)

    criterion = nn.CrossEntropyLoss(label_smoothing=config.LABEL_SMOOTHING)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=config.EPOCHS,
        eta_min=1e-6
    )
    scaler = torch.amp.GradScaler("cuda", enabled=config.USE_AMP)

    # Lịch sử huấn luyện
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "val_f1": []
    }

    best_val_f1 = -1.0
    patience_counter = 0

    print(f"\n[*] Bắt đầu huấn luyện {config.EPOCHS} epochs...")
    start_time = time.time()

    for epoch in range(1, config.EPOCHS + 1):
        epoch_start = time.time()

        # Huấn luyện 1 epoch
        train_loss, train_acc = train_one_epoch(
            model=model,
            dataloader=train_loader,
            criterion=criterion,
            optimizer=optimizer,
            scaler=scaler,
            device=config.DEVICE
        )

        # Đánh giá trên tập Validation
        val_metrics, _, _ = evaluate_validation(
            model=model,
            dataloader=val_loader,
            criterion=criterion,
            device=config.DEVICE
        )

        val_loss = val_metrics["loss"]
        val_acc = val_metrics["accuracy"]
        val_f1 = val_metrics["f1_macro"]

        scheduler.step()
        current_lr = optimizer.param_groups[0]["lr"]
        epoch_time = time.time() - epoch_start

        # Lưu lịch sử
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)
        history["val_f1"].append(val_f1)

        print(
            f"Epoch [{epoch:02d}/{config.EPOCHS:02d}] ({epoch_time:.1f}s) - LR: {current_lr:.6f} | "
            f"Train Loss: {train_loss:.4f} - Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} - Acc: {val_acc:.4f} - F1: {val_f1:.4f}"
        )

        # Lưu checkpoint tốt nhất
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            patience_counter = 0
            checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_f1": val_f1,
                "val_acc": val_acc,
                "val_loss": val_loss,
                "num_classes": num_classes,
                "idx_to_info": idx_to_info
            }
            torch.save(checkpoint, config.BEST_MODEL_PATH)
            print(f"  --> ⭐ [LƯU MÔ HÌNH TỐT NHẤT] Val F1 đạt kỷ lục mới: {val_f1:.4f} tại: {config.BEST_MODEL_PATH.name}")
        else:
            patience_counter += 1
            if patience_counter >= config.EARLY_STOPPING_PATIENCE:
                print(f"\n[!] Dừng sớm (Early Stopping) sau {patience_counter} epochs không cải thiện.")
                break

        # Lưu checkpoint mới nhất
        torch.save({
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "num_classes": num_classes,
            "idx_to_info": idx_to_info
        }, config.LAST_MODEL_PATH)

    total_time = time.time() - start_time
    print("=" * 65)
    print(f"🎉 Huấn luyện hoàn tất trong: {total_time / 60:.2f} phút.")
    print(f"🏆 Kỷ lục Val F1-Score cao nhất: {best_val_f1:.4f}")

    # Vẽ biểu đồ kết quả
    plot_training_history(history)

    print("\n[*] Bạn có thể chạy lệnh: 'python evaluate.py' để đánh giá chi tiết trên tập Test!")
    print("=" * 65)


if __name__ == "__main__":
    main()
