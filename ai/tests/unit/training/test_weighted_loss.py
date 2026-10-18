import unittest

import torch
import torch.nn.functional as F

from ai.configs.classification_tasks import get_task_config
from ai.train import build_criterion


class WeightedLossTests(unittest.TestCase):
    def make_criterion(self):
        records = [{'label_idx': 0}] + [{'label_idx': 1}] * 410
        return build_criterion(get_task_config('disease'), records, 2, torch.device('cpu'))[0]

    def test_healthy_example_does_not_push_logits_toward_rare_disease(self):
        logits = torch.zeros(1, 2, requires_grad=True)
        self.make_criterion()(logits, torch.tensor([1])).backward()
        self.assertGreater(logits.grad[0, 0].item(), 0)
        self.assertLess(logits.grad[0, 1].item(), 0)

    def test_weights_scale_examples_not_other_smoothed_class_targets(self):
        criterion = self.make_criterion()
        logits = torch.tensor([[2., -1.], [-2., 3.]])
        target = torch.tensor([0, 1])
        losses = F.cross_entropy(logits, target, label_smoothing=0.1, reduction='none')
        weights = criterion.weight[target]
        expected = (losses * weights).sum() / weights.sum()
        torch.testing.assert_close(criterion(logits, target), expected)

    def test_zero_smoothing_retains_weighted_cross_entropy(self):
        criterion = self.make_criterion()
        criterion.label_smoothing = 0
        logits = torch.tensor([[2., -1.], [-2., 3.]])
        target = torch.tensor([0, 1])
        torch.testing.assert_close(criterion(logits, target), F.cross_entropy(logits, target, weight=criterion.weight))

    def test_plant_unweighted_loss_is_unchanged(self):
        criterion, weights = build_criterion(get_task_config('plant'), [{'label_idx': 0}], 2, torch.device('cpu'))
        self.assertIsNone(weights)
        logits = torch.tensor([[2., -1.]])
        torch.testing.assert_close(criterion(logits, torch.tensor([0])), F.cross_entropy(logits, torch.tensor([0]), label_smoothing=0.1))
