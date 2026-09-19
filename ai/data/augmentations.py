from torchvision import transforms
from configs import config

def get_train_transforms(image_size=config.IMAGE_SIZE):
    """
    Data Augmentation cho tập huấn luyện (Train set).
    Tăng cường độ bền vững của mô hình với góc chụp, ánh sáng và góc xoay của lá cây.
    """
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=30),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
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
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

def get_inference_transforms(image_size=config.IMAGE_SIZE):
    """
    Tiền xử lý cho ảnh đơn lẻ khi dự đoán (Inference).
    """
    return get_val_transforms(image_size=image_size)
