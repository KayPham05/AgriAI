"""Class balancing that does not amplify smoothed targets of unrelated classes."""

import torch
from torch import nn
from torch.nn import functional as F


class SampleWeightedCrossEntropy(nn.Module):
    """Apply each example's class weight after label smoothing, then normalize."""

    def __init__(self, weight: torch.Tensor, label_smoothing: float):
        super().__init__()
        self.register_buffer('weight', weight)
        self.label_smoothing = label_smoothing

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        losses = F.cross_entropy(
            logits, targets, label_smoothing=self.label_smoothing, reduction='none'
        )
        weights = self.weight[targets]
        return (losses * weights).sum() / weights.sum()
