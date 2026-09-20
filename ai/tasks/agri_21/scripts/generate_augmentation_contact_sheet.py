from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

import torch
from PIL import Image, ImageDraw
from torchvision.transforms.functional import to_pil_image

from ai.data.augmentations import get_train_transforms


IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
CELL_SIZE = 224
LABEL_HEIGHT = 24
HEADER_HEIGHT = 28


def read_train_samples(dataset_dir: Path) -> list[dict[str, str]]:
    manifest_path = dataset_dir / "manifests" / "train.csv"
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    samples_by_plant: dict[str, dict[str, str]] = {}
    for row in rows:
        samples_by_plant.setdefault(row["plant"], row)
    if not samples_by_plant:
        raise ValueError(f"Không có mẫu train trong {manifest_path}")
    return [samples_by_plant[plant] for plant in sorted(samples_by_plant)]


def tensor_to_preview(tensor: torch.Tensor) -> Image.Image:
    denormalized = (tensor.cpu() * IMAGENET_STD + IMAGENET_MEAN).clamp(0, 1)
    return to_pil_image(denormalized)


def generate_contact_sheet(
    dataset_dir: Path,
    output_path: Path,
    variants: int = 3,
    seed: int = 20260920,
) -> list[dict[str, str]]:
    samples = read_train_samples(dataset_dir)
    transform = get_train_transforms(CELL_SIZE)
    columns = variants + 1
    width = columns * CELL_SIZE
    row_height = CELL_SIZE + LABEL_HEIGHT
    height = HEADER_HEIGHT + len(samples) * row_height
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)

    headers = ["Original"] + [f"Augment {index}" for index in range(1, variants + 1)]
    for column, header in enumerate(headers):
        draw.text((column * CELL_SIZE + 6, 7), header, fill="black")

    for row_index, sample in enumerate(samples):
        image_path = dataset_dir / "images" / sample["image_path"]
        with Image.open(image_path) as source:
            original = source.convert("RGB")
        if original.size != (CELL_SIZE, CELL_SIZE):
            raise ValueError(f"Ảnh v1.2 không phải 224x224: {image_path}")

        y = HEADER_HEIGHT + row_index * row_height
        sheet.paste(original, (0, y))
        for variant in range(variants):
            variant_seed = seed + row_index * variants + variant
            random.seed(variant_seed)
            torch.manual_seed(variant_seed)
            augmented = tensor_to_preview(transform(original))
            sheet.paste(augmented, ((variant + 1) * CELL_SIZE, y))

        label = f"{sample['plant']} | {sample['condition']} | {sample['image_path']}"
        draw.text((6, y + CELL_SIZE + 5), label, fill="black")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="PNG")
    with Image.open(output_path) as saved_sheet:
        saved_sheet.verify()
    return samples


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Xuất contact sheet từ đúng train augmentation pipeline."
    )
    parser.add_argument("dataset_dir", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument("--variants", type=int, default=3)
    parser.add_argument("--seed", type=int, default=20260920)
    args = parser.parse_args()

    samples = generate_contact_sheet(
        args.dataset_dir.resolve(),
        args.output_path.resolve(),
        variants=args.variants,
        seed=args.seed,
    )
    print(f"Đã tạo contact sheet: {args.output_path.resolve()}")
    for sample in samples:
        print(f"- {sample['plant']}: {sample['image_path']}")


if __name__ == "__main__":
    main()
