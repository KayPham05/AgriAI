from pathlib import Path
from typing import Dict, List
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from configs import config

def plot_training_history(history: Dict[str, List[float]], save_path: Path = config.OUTPUT_DIR / "training_history.png"):
    """
    Vẽ biểu đồ quá trình huấn luyện:
    - Train Loss vs Val Loss
    - Train Accuracy vs Val Accuracy
    - Val F1 Score
    """
    epochs = range(1, len(history["train_loss"]) + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Đồ thị Loss
    ax1.plot(epochs, history["train_loss"], "b-o", label="Train Loss")
    ax1.plot(epochs, history["val_loss"], "r-o", label="Val Loss")
    ax1.set_title("Hàm mất mát (Loss) qua các Epoch")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.grid(True, linestyle="--", alpha=0.6)
    ax1.legend()

    # Đồ thị Accuracy & F1
    ax2.plot(epochs, history["train_acc"], "b-o", label="Train Accuracy")
    ax2.plot(epochs, history["val_acc"], "g-o", label="Val Accuracy")
    if "val_f1" in history:
        ax2.plot(epochs, history["val_f1"], "m--s", label="Val F1 Macro")
    ax2.set_title("Độ chính xác (Accuracy) & F1 Score qua các Epoch")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Score")
    ax2.grid(True, linestyle="--", alpha=0.6)
    ax2.legend()

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[*] Đã lưu biểu đồ huấn luyện tại: {save_path.resolve()}")


def plot_confusion_matrix(cm: np.ndarray, class_names: List[str], save_path: Path = config.OUTPUT_DIR / "confusion_matrix.png"):
    """
    Vẽ heatmap ma trận nhầm lẫn (Confusion Matrix).
    Tự động điều chỉnh kích thước ảnh theo số lượng lớp.
    """
    n_classes = len(class_names)
    fig_dim = max(8, n_classes * 0.45)
    plt.figure(figsize=(fig_dim, fig_dim))

    sns.heatmap(
        cm,
        annot=True if n_classes <= 25 else False,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names
    )
    plt.title("Ma trận nhầm lẫn (Confusion Matrix)", fontsize=14, pad=12)
    plt.xlabel("Nhãn dự đoán (Predicted)", fontsize=11)
    plt.ylabel("Nhãn thực tế (Ground Truth)", fontsize=11)
    plt.xticks(rotation=45, ha="right", fontsize=9)
    plt.yticks(rotation=0, fontsize=9)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[*] Đã lưu ma trận nhầm lẫn tại: {save_path.resolve()}")
