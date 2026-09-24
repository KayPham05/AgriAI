import unittest

import torch
import torch.nn as nn

from ai.train import build_optimizer
from ai.utils.training import set_finetuning_phase, warmup_cosine_factor


class _FakeModel:
    def __init__(self) -> None:
        self.phase = ""

    def freeze_backbone(self) -> None:
        self.phase = "linear_probe"

    def unfreeze_all(self) -> None:
        self.phase = "fine_tune"


class TrainingScheduleTests(unittest.TestCase):
    def test_freezes_then_unfreezes_backbone(self) -> None:
        model = _FakeModel()

        self.assertEqual(set_finetuning_phase(model, epoch=1, freeze_epochs=3), "linear_probe")
        self.assertEqual(model.phase, "linear_probe")
        self.assertEqual(set_finetuning_phase(model, epoch=4, freeze_epochs=3), "fine_tune")
        self.assertEqual(model.phase, "fine_tune")

    def test_warmup_cosine_reaches_peak_then_decays(self) -> None:
        factors = [
            warmup_cosine_factor(index, total_epochs=10, warmup_epochs=3)
            for index in range(10)
        ]

        self.assertAlmostEqual(factors[0], 1 / 3)
        self.assertEqual(factors[2], 1.0)
        self.assertLess(factors[4], factors[3])
        self.assertAlmostEqual(factors[-1], 0.01)

    def test_optimizer_uses_discriminative_learning_rates(self) -> None:
        class FakeConvNeXt(nn.Module):
            def __init__(self) -> None:
                super().__init__()
                self.backbone = nn.Module()
                self.backbone.features = nn.Sequential(nn.Linear(2, 2))
                self.backbone.classifier = nn.Sequential(nn.Linear(2, 2))

        optimizer = build_optimizer(
            FakeConvNeXt(),
            backbone_lr=3e-5,
            head_lr=3e-4,
            weight_decay=0.05,
        )

        self.assertEqual(len(optimizer.param_groups), 2)
        self.assertEqual(optimizer.param_groups[0]["lr"], 3e-5)
        self.assertEqual(optimizer.param_groups[1]["lr"], 3e-4)
        self.assertTrue(all(group["weight_decay"] == 0.05 for group in optimizer.param_groups))


if __name__ == "__main__":
    unittest.main()
