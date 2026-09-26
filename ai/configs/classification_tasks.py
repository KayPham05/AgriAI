"""Task-specific labels and artifact locations for classification baselines."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ai.configs import config


@dataclass(frozen=True)
class ClassificationTaskConfig:
    name: str
    target_field: str
    expected_num_classes: int
    use_class_weights: bool
    checkpoint_dir: Path
    output_dir: Path
    tensorboard_dir: Path
    label_map_path: Path

    @property
    def best_checkpoint_path(self) -> Path:
        return self.checkpoint_dir / "best_convnext_tiny.pth"

    @property
    def last_checkpoint_path(self) -> Path:
        return self.checkpoint_dir / "last_convnext_tiny.pth"


_REPOSITORY_ROOT = config.BASE_DIR.parent

_TASKS = {
    "plant": ClassificationTaskConfig(
        name="plant",
        target_field="plant",
        expected_num_classes=10,
        use_class_weights=False,
        checkpoint_dir=config.CHECKPOINT_DIR / "plant",
        output_dir=config.OUTPUT_DIR / "plant",
        tensorboard_dir=_REPOSITORY_ROOT / "runs" / "plant",
        label_map_path=config.CHECKPOINT_DIR / "plant" / "class_to_idx.json",
    ),
    "disease": ClassificationTaskConfig(
        name="disease",
        target_field="condition",
        expected_num_classes=45,
        use_class_weights=True,
        checkpoint_dir=config.CHECKPOINT_DIR / "disease",
        output_dir=config.OUTPUT_DIR / "disease",
        tensorboard_dir=_REPOSITORY_ROOT / "runs" / "disease",
        label_map_path=config.CHECKPOINT_DIR / "disease" / "class_to_idx.json",
    ),
    "compound": ClassificationTaskConfig(
        name="compound",
        target_field="compound_label",
        expected_num_classes=config.EXPECTED_NUM_CLASSES,
        use_class_weights=True,
        checkpoint_dir=config.CHECKPOINT_DIR,
        output_dir=config.OUTPUT_DIR,
        tensorboard_dir=_REPOSITORY_ROOT / "runs" / "compound",
        label_map_path=config.LABEL_MAP_PATH,
    ),
}


def get_task_config(task_name: str) -> ClassificationTaskConfig:
    """Return a validated classification task configuration."""

    try:
        return _TASKS[task_name]
    except KeyError as error:
        choices = ", ".join(sorted(_TASKS))
        raise ValueError(
            f"Task không hợp lệ: {task_name!r}; chọn một trong: {choices}"
        ) from error


def task_names() -> tuple[str, ...]:
    return tuple(_TASKS)
