import os
from pathlib import Path

import torch

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_VERSION = "v1.3"
DEFAULT_DATASET_DIR = Path(r"D:\AgriVisionAI_Data") / DATASET_VERSION
DATASET_DIR = Path(
    os.getenv("AGRIVISION_DATASET_DIR", str(DEFAULT_DATASET_DIR))
)
IMAGE_DIR = DATASET_DIR / "images"
MANIFEST_DIR = DATASET_DIR / "manifests"
TRAIN_MANIFEST_PATH = MANIFEST_DIR / "train.csv"
VAL_MANIFEST_PATH = MANIFEST_DIR / "val.csv"
TEST_MANIFEST_PATH = MANIFEST_DIR / "test.csv"
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
OUTPUT_DIR = BASE_DIR / "outputs"
LABEL_MAP_PATH = BASE_DIR / "class_to_idx.json"

# Make sure output directories exist
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Hardware & Device Settings
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
USE_AMP = True if torch.cuda.is_available() else False
NUM_WORKERS = 2
PIN_MEMORY = True if torch.cuda.is_available() else False

# Training Hyperparameters 
IMAGE_SIZE = 224
EXPECTED_NUM_CLASSES = 58
BATCH_SIZE = 8
GRADIENT_ACCUMULATION_STEPS = 4
EPOCHS = 10
FREEZE_EPOCHS = 3
WARMUP_EPOCHS = 3
HEAD_LEARNING_RATE = 3e-4
BACKBONE_LEARNING_RATE = 3e-5
LEARNING_RATE = HEAD_LEARNING_RATE
MIN_LR_FACTOR = 0.01
WEIGHT_DECAY = 0.05
LABEL_SMOOTHING = 0.1               # Tránh overfit và cải thiện độ khái quát
DROPOUT_RATE = 0.2
EARLY_STOPPING_PATIENCE = 7

# Seed này chỉ điều khiển khởi tạo mô hình, augmentation và thứ tự batch.
# Thành viên train/val/test được cố định bởi ba manifest CSV, không chia lại ở đây.
TRAINING_SEED = 42

# Model checkpoint names
BEST_MODEL_PATH = CHECKPOINT_DIR / "best_convnext_tiny.pth"
LAST_MODEL_PATH = CHECKPOINT_DIR / "last_convnext_tiny.pth"
