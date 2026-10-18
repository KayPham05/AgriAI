"""Validation-selected correction for one legacy class-weighted checkpoint."""

from typing import Any

import torch


# Frozen using v1.4 validation macro-F1; never apply to newly trained checkpoints.
_PRIOR_STRENGTH = {
    'd21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9': 0.5,
}


def inference_state_dict(
    checkpoint: dict[str, Any], checkpoint_sha256: str
) -> dict[str, torch.Tensor]:
    state = checkpoint['model_state_dict']
    strength = _PRIOR_STRENGTH.get(checkpoint_sha256)
    if strength is None:
        return state
    key = 'backbone.classifier.2.1.bias'
    bias = state[key]
    weights = torch.as_tensor(checkpoint['class_weights'], dtype=bias.dtype, device=bias.device)
    corrected = dict(state)
    corrected[key] = bias - strength * weights.log()
    return corrected
