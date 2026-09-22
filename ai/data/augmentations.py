from torchvision import transforms
from torchvision.transforms import InterpolationMode

from ai.configs import config
from ai.data.image_preprocessing import PADDING_COLOR, ResizeWithPadding

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_train_transforms(image_size=config.IMAGE_SIZE):
    """
    Data Augmentation cho tập huấn luyện (Train set).
    Tăng cường độ bền vững của mô hình với góc chụp, ánh sáng và góc xoay của lá cây.
    """
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(
            degrees=30,
            interpolation=InterpolationMode.BILINEAR,
            fill=PADDING_COLOR,
        ),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=IMAGENET_MEAN,
            std=IMAGENET_STD
        )
    ])

def get_val_transforms(image_size=config.IMAGE_SIZE):
    """
    Tiền xử lý cho tập Validation và Test (chỉ Resize và Normalize).
    """
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=IMAGENET_MEAN,
            std=IMAGENET_STD
        )
    ])

def get_inference_transforms(image_size=config.IMAGE_SIZE):
    """
    Giữ tỷ lệ và đệm ảnh inference giống preprocessing của dataset hiện hành.
    """
    return transforms.Compose([
        ResizeWithPadding(target_size=image_size, fill=PADDING_COLOR),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=IMAGENET_MEAN,
            std=IMAGENET_STD
        )
    ])
