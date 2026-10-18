import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import torch
from torch import nn

from ai.predict import LeafDiseasePredictor

SOURCE_SHA = 'd21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9'


class SmallClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = nn.Module()
        self.backbone.classifier = nn.Sequential(nn.Identity(), nn.Identity(), nn.Sequential(nn.Identity(), nn.Linear(2, 2)))

    def forward(self, x):
        return self.backbone.classifier(x)


class CheckpointCorrectionTests(unittest.TestCase):
    def load(self, digest, bias):
        model = SmallClassifier()
        with torch.no_grad():
            model.backbone.classifier[2][1].weight.zero_()
            model.backbone.classifier[2][1].bias.copy_(torch.tensor(bias))
        state = {k: v.clone() for k, v in model.state_dict().items()}
        checkpoint = {'task': 'disease', 'num_classes': 2, 'class_weights': [50., .125],
                      'idx_to_info': {0: {'label': 'disease'}, 1: {'label': 'healthy'}}, 'model_state_dict': state}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'checkpoint.pth'
            path.write_bytes(b'fixture')
            with patch('ai.predict.torch.load', return_value=checkpoint), patch('ai.predict.build_model', return_value=model), patch('hashlib.sha256', return_value=Mock(hexdigest=lambda: digest)):
                predictor = LeafDiseasePredictor(path)
        return predictor, state

    def test_known_checkpoint_corrects_weight_induced_false_disease(self):
        predictor, state = self.load(SOURCE_SHA, [2., 1.])
        self.assertEqual(predictor.model(torch.zeros(1, 2)).argmax(1).item(), 1)
        torch.testing.assert_close(state['backbone.classifier.2.1.bias'], torch.tensor([2., 1.]))

    def test_unknown_checkpoint_is_not_adjusted(self):
        predictor, _ = self.load('unknown', [2., 1.])
        self.assertEqual(predictor.model(torch.zeros(1, 2)).argmax(1).item(), 0)

    def test_strong_real_disease_prediction_is_preserved(self):
        predictor, _ = self.load(SOURCE_SHA, [8., 0.])
        self.assertEqual(predictor.model(torch.zeros(1, 2)).argmax(1).item(), 0)
