import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from sklearn.model_selection import train_test_split

from configs import config
from data.augmentations import get_train_transforms, get_val_transforms

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

class PlantLeafDataset(Dataset):
    """
    PyTorch Dataset nạp ảnh lá cây từ danh sách mẫu (image_path, label_idx).
    """
    def __init__(self, samples: List[Tuple[Path, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Lỗi khi đọc ảnh: {img_path}. Chi tiết: {e}")

        if self.transform:
            image = self.transform(image)

        return image, label


def scan_dataset(data_dir: Path = config.DATA_DIR) -> Tuple[List[dict], Dict[str, int], Dict[int, dict]]:
    """
    Quét đệ quy thư mục ảnh theo cấu trúc 2 tầng:
    data_dir/
      └── <Loại_Cây>/
            └── <Loại_Bệnh>/
                  └── <tệp_ảnh>

    Returns:
        all_samples: Danh sách thông tin từng ảnh [{path, plant, disease, compound_label, label_idx}]
        class_to_idx: Dict ánh xạ tên lớp gộp sang chỉ số nguyên
        idx_to_info: Dict ánh xạ chỉ số nguyên sang {plant, disease, compound_label}
    """
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f"Không tìm thấy thư mục dữ liệu tại: {data_dir.resolve()}")

    plant_dirs = [d for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if not plant_dirs:
        raise ValueError(
            f"Thư mục '{data_dir}' chưa có các thư mục loại cây. "
            "Vui lòng tạo thư mục con đại diện cho từng loại cây trong ai/Image."
        )

    raw_samples = []
    compound_classes = set()

    for plant_dir in sorted(plant_dirs):
        plant_name = plant_dir.name
        disease_dirs = [d for d in plant_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
        
        for disease_dir in sorted(disease_dirs):
            disease_name = disease_dir.name
            compound_label = f"{plant_name}___{disease_name}"
            compound_classes.add(compound_label)

            for file_path in disease_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in VALID_EXTENSIONS:
                    raw_samples.append({
                        "path": file_path,
                        "plant": plant_name,
                        "disease": disease_name,
                        "compound_label": compound_label
                    })

    if not raw_samples:
        raise ValueError(
            f"Không tìm thấy ảnh hợp lệ (.jpg, .png, ...) trong các thư mục con của '{data_dir}'."
        )

    # Đánh chỉ số lớp theo thứ tự alphabet cố định
    sorted_classes = sorted(list(compound_classes))
    class_to_idx = {cls_name: idx for idx, cls_name in enumerate(sorted_classes)}
    idx_to_info = {
        idx: {
            "compound_label": cls_name,
            "plant": cls_name.split("___")[0],
            "disease": cls_name.split("___")[1] if "___" in cls_name else cls_name
        }
        for cls_name, idx in class_to_idx.items()
    }

    # Gán nhãn số vào từng mẫu
    all_samples = []
    for s in raw_samples:
        s["label_idx"] = class_to_idx[s["compound_label"]]
        all_samples.append(s)

    # Lưu lại file json để phục vụ inference sau này
    label_map_data = {
        "class_to_idx": class_to_idx,
        "idx_to_info": idx_to_info
    }
    with open(config.LABEL_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(label_map_data, f, ensure_ascii=False, indent=2)

    return all_samples, class_to_idx, idx_to_info


def create_dataloaders(
    data_dir: Path = config.DATA_DIR,
    batch_size: int = config.BATCH_SIZE,
    num_workers: int = config.NUM_WORKERS,
    random_seed: int = config.RANDOM_SEED
) -> Tuple[DataLoader, DataLoader, DataLoader, int, Dict[int, dict]]:
    """
    Quét dữ liệu, chia tập Train/Val/Test theo tỷ lệ (phân tầng Stratified) và tạo các DataLoader.
    """
    all_samples, class_to_idx, idx_to_info = scan_dataset(data_dir=data_dir)
    num_classes = len(class_to_idx)

    paths = [s["path"] for s in all_samples]
    labels = [s["label_idx"] for s in all_samples]

    # Kiểm tra tính phân tầng (Stratify): Mỗi lớp phải có tối thiểu 2 ảnh để split
    class_counts = {}
    for lbl in labels:
        class_counts[lbl] = class_counts.get(lbl, 0) + 1
    
    can_stratify = all(count >= 2 for count in class_counts.values())
    stratify_labels = labels if can_stratify else None

    # Chia Train + (Val + Test)
    val_test_ratio = config.VAL_RATIO + config.TEST_RATIO
    train_paths, val_test_paths, train_labels, val_test_labels = train_test_split(
        paths,
        labels,
        test_size=val_test_ratio,
        random_state=random_seed,
        stratify=stratify_labels
    )

    # Chia tiếp Val và Test (50/50 của phần còn lại)
    val_ratio_in_remaining = config.VAL_RATIO / val_test_ratio
    can_stratify_remaining = False
    if can_stratify:
        val_test_counts = {}
        for lbl in val_test_labels:
            val_test_counts[lbl] = val_test_counts.get(lbl, 0) + 1
        can_stratify_remaining = all(count >= 2 for count in val_test_counts.values())

    val_paths, test_paths, val_labels, test_labels = train_test_split(
        val_test_paths,
        val_test_labels,
        test_size=(1.0 - val_ratio_in_remaining),
        random_state=random_seed,
        stratify=val_test_labels if can_stratify_remaining else None
    )

    # Tạo mẫu (Path, Label)
    train_samples = list(zip(train_paths, train_labels))
    val_samples = list(zip(val_paths, val_labels))
    test_samples = list(zip(test_paths, test_labels))

    train_dataset = PlantLeafDataset(train_samples, transform=get_train_transforms())
    val_dataset = PlantLeafDataset(val_samples, transform=get_val_transforms())
    test_dataset = PlantLeafDataset(test_samples, transform=get_val_transforms())

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=config.PIN_MEMORY,
        drop_last=True if len(train_dataset) > batch_size else False
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=config.PIN_MEMORY
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=config.PIN_MEMORY
    )

    return train_loader, val_loader, test_loader, num_classes, idx_to_info
