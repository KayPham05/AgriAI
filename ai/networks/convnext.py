import torch
import torch.nn as nn
from torchvision.models import convnext_tiny, ConvNeXt_Tiny_Weights
from configs import config

class ConvNeXtLeafClassifier(nn.Module):
    """
    Mô hình ConvNeXt-Tiny tùy biến cho bài toán nhận diện cây trồng và bệnh lá.
    Sử dụng ImageNet-1K Pretrained Weights để trích xuất đặc trưng tối ưu.
    """
    def __init__(self, num_classes: int, pretrained: bool = True, dropout_rate: float = config.DROPOUT_RATE):
        super(ConvNeXtLeafClassifier, self).__init__()
        self.num_classes = num_classes

        # Khởi tạo backbone ConvNeXt-Tiny
        if pretrained:
            weights = ConvNeXt_Tiny_Weights.DEFAULT
            self.backbone = convnext_tiny(weights=weights)
        else:
            self.backbone = convnext_tiny(weights=None)

        # Trích xuất số lượng feature ở tầng phân loại cuối (chuẩn ConvNeXt-Tiny là 768)
        in_features = self.backbone.classifier[2].in_features

        # Thay thế tầng Linear cuối bằng Classifier mới phù hợp số lớp đầu ra
        self.backbone.classifier[2] = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(in_features=in_features, out_features=num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def freeze_backbone(self):
        """Đóng băng các tầng trích xuất đặc trưng, chỉ train phần Classifier head."""
        for param in self.backbone.features.parameters():
            param.requires_grad = False

    def unfreeze_all(self):
        """Mở khóa toàn bộ tham số để fine-tune toàn mô hình."""
        for param in self.parameters():
            param.requires_grad = True


def build_model(num_classes: int, pretrained: bool = True, device: torch.device = config.DEVICE) -> ConvNeXtLeafClassifier:
    """Hàm tiện ích khởi tạo mô hình và chuyển lên thiết bị (CUDA/CPU)."""
    model = ConvNeXtLeafClassifier(num_classes=num_classes, pretrained=pretrained)
    model.to(device)
    return model
