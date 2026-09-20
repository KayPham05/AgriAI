import json
import sys
from pathlib import Path
import torch
from tqdm import tqdm

from ai.configs import config
from ai.data.dataset import create_dataloaders
from ai.networks.convnext import build_model
from ai.utils.metrics import compute_metrics, get_detailed_report, get_confusion_matrix
from ai.utils.visualizer import plot_confusion_matrix

def evaluate():
    print("=" * 65)
    print("🔬 ĐÁNH GIÁ MÔ HÌNH TRÊN TẬP KIỂM THỬ (TEST SET) 🔬")
    print("=" * 65)

    if not config.BEST_MODEL_PATH.exists():
        print(f"[!] Không tìm thấy file checkpoint tốt nhất tại: {config.BEST_MODEL_PATH.resolve()}")
        print("[!] Vui lòng chạy huấn luyện bằng lệnh 'python -m ai.train' trước.")
        sys.exit(1)

    print(f"[*] Đang tải checkpoint: {config.BEST_MODEL_PATH.name}...")
    checkpoint = torch.load(config.BEST_MODEL_PATH, map_location=config.DEVICE)
    num_classes = checkpoint.get("num_classes")
    idx_to_info = checkpoint.get("idx_to_info")

    # Tải dữ liệu test
    _, _, test_loader, _, _ = create_dataloaders()
    print(f"[*] Tổng số mẫu kiểm thử: {len(test_loader.dataset)}")

    # Xây dựng và nạp weights cho model
    model = build_model(num_classes=num_classes, pretrained=False, device=config.DEVICE)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_preds = []
    all_targets = []

    print("[*] Đang dự đoán trên tập kiểm thử...")
    with torch.no_grad():
        for images, targets in tqdm(test_loader, desc="Testing", dynamic_ncols=True):
            images = images.to(config.DEVICE)
            with torch.amp.autocast("cuda", enabled=config.USE_AMP):
                outputs = model(images)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.numpy())

    # Tính toán chỉ số
    metrics = compute_metrics(all_targets, all_preds)
    print("\n" + "=" * 40)
    print(f"🎯 KẾT QUẢ TỔNG QUAN:")
    print(f"  - Accuracy        : {metrics['accuracy'] * 100:.2f}%")
    print(f"  - F1-Score (Macro): {metrics['f1_macro'] * 100:.2f}%")
    print(f"  - Precision       : {metrics['precision_macro'] * 100:.2f}%")
    print(f"  - Recall          : {metrics['recall_macro'] * 100:.2f}%")
    print("=" * 40)

    # Lấy danh sách tên lớp
    target_names = [idx_to_info[str(i)]["compound_label"] if str(i) in idx_to_info else idx_to_info[i]["compound_label"] for i in range(num_classes)]

    # Báo cáo chi tiết từng lớp
    print("\n📋 BÁO CÁO PHÂN LOẠI CHI TIẾT THEO TỪNG LOẠI CÂY & BỆNH:")
    report_str = get_detailed_report(all_targets, all_preds, target_names=target_names)
    print(report_str)

    # Lưu báo cáo vào file text
    report_file = config.OUTPUT_DIR / "classification_report.txt"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(report_str)
    print(f"[*] Đã lưu báo cáo chi tiết tại: {report_file.resolve()}")

    # Vẽ ma trận nhầm lẫn
    cm = get_confusion_matrix(all_targets, all_preds)
    cm_path = config.OUTPUT_DIR / "test_confusion_matrix.png"
    plot_confusion_matrix(cm, class_names=target_names, save_path=cm_path)
    print("=" * 65)

if __name__ == "__main__":
    evaluate()
