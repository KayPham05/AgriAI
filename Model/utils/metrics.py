from typing import Dict, List, Tuple
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, confusion_matrix

def compute_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, float]:
    """
    Tính toán các chỉ số đánh giá chính:
    - Accuracy
    - F1 Macro (đặc biệt quan trọng với dữ liệu mất cân bằng giữa các lớp bệnh)
    - Precision Macro
    - Recall Macro
    """
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="macro",
        zero_division=0
    )
    return {
        "accuracy": float(acc),
        "f1_macro": float(f1),
        "precision_macro": float(precision),
        "recall_macro": float(recall)
    }

def get_detailed_report(y_true: List[int], y_pred: List[int], target_names: List[str]) -> str:
    """Tạo bảng báo cáo chi tiết Precision, Recall, F1 theo từng lớp."""
    return classification_report(
        y_true,
        y_pred,
        target_names=target_names,
        zero_division=0,
        digits=4
    )

def get_confusion_matrix(y_true: List[int], y_pred: List[int]) -> np.ndarray:
    """Tính ma trận nhầm lẫn."""
    return confusion_matrix(y_true, y_pred)
