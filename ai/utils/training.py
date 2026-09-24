"""Reusable helpers for staged ConvNeXt fine-tuning."""

from __future__ import annotations

import math
from typing import Any


def set_finetuning_phase(model: Any, epoch: int, freeze_epochs: int) -> str:
    """Freeze the backbone for initial epochs, then fine-tune all parameters."""

    if epoch <= freeze_epochs:
        model.freeze_backbone()
        return "linear_probe"
    model.unfreeze_all()
    return "fine_tune"


def warmup_cosine_factor(
    epoch_index: int,
    total_epochs: int,
    warmup_epochs: int,
    min_factor: float = 0.01,
) -> float:
    """Return an LR multiplier for linear warmup followed by cosine decay."""

    if total_epochs <= 0:
        raise ValueError("total_epochs phải lớn hơn 0")
    if not 0 <= epoch_index < total_epochs:
        raise ValueError("epoch_index nằm ngoài khoảng huấn luyện")
    if not 0 <= warmup_epochs <= total_epochs:
        raise ValueError("warmup_epochs không hợp lệ")
    if not 0.0 <= min_factor <= 1.0:
        raise ValueError("min_factor phải nằm trong [0, 1]")

    if warmup_epochs and epoch_index < warmup_epochs:
        return (epoch_index + 1) / warmup_epochs

    decay_steps = total_epochs - warmup_epochs
    if decay_steps <= 1:
        return min_factor
    progress = (epoch_index - warmup_epochs) / (decay_steps - 1)
    cosine = 0.5 * (1.0 + math.cos(math.pi * progress))
    return min_factor + (1.0 - min_factor) * cosine
