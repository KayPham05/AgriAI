from typing import Any, Dict, List
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)

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
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1),
        "precision_macro": float(precision),
        "recall_macro": float(recall)
    }

def get_detailed_report(
    y_true: List[int],
    y_pred: List[int],
    target_names: List[str],
) -> str:
    """Tạo bảng báo cáo chi tiết Precision, Recall, F1 theo từng lớp."""
    return classification_report(
        y_true,
        y_pred,
        labels=list(range(len(target_names))),
        target_names=target_names,
        zero_division=0,
        digits=4
    )


def get_detailed_report_dict(
    y_true: List[int],
    y_pred: List[int],
    target_names: List[str],
) -> Dict[str, Any]:
    """Return per-class metrics in a JSON-serializable structure."""

    return classification_report(
        y_true,
        y_pred,
        labels=list(range(len(target_names))),
        target_names=target_names,
        zero_division=0,
        output_dict=True,
    )

def get_confusion_matrix(
    y_true: List[int],
    y_pred: List[int],
    num_classes: int | None = None,
) -> np.ndarray:
    """Tính ma trận nhầm lẫn."""
    labels = (
        list(range(num_classes))
        if num_classes is not None
        else sorted(set(y_true) | set(y_pred))
    )
    return confusion_matrix(y_true, y_pred, labels=labels)


def get_top_confusions(
    matrix: np.ndarray,
    class_names: List[str],
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """List the largest off-diagonal confusion counts."""

    if matrix.shape != (len(class_names), len(class_names)):
        raise ValueError("Kích thước confusion matrix không khớp danh sách lớp")
    rows = [
        {
            "actual": class_names[actual_index],
            "predicted": class_names[predicted_index],
            "count": int(matrix[actual_index, predicted_index]),
        }
        for actual_index in range(len(class_names))
        for predicted_index in range(len(class_names))
        if actual_index != predicted_index and matrix[actual_index, predicted_index] > 0
    ]
    return sorted(rows, key=lambda row: row["count"], reverse=True)[:limit]
