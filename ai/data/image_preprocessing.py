from __future__ import annotations

from PIL import Image


TARGET_SIZE = 224
PADDING_COLOR = (124, 116, 104)


def resize_with_padding(
    image: Image.Image,
    target_size: int = TARGET_SIZE,
    fill: tuple[int, int, int] = PADDING_COLOR,
) -> tuple[Image.Image, tuple[int, int], tuple[int, int, int, int]]:
    """Resize while preserving aspect ratio, then center-pad to a square."""

    rgb_image = image.convert("RGB")
    width, height = rgb_image.size
    if width <= 0 or height <= 0:
        raise ValueError(f"Kích thước ảnh không hợp lệ: {width}x{height}")
    if target_size <= 0:
        raise ValueError(f"Kích thước đích không hợp lệ: {target_size}")
    if (width, height) == (target_size, target_size):
        return rgb_image, (width, height), (0, 0, 0, 0)

    scale = min(target_size / width, target_size / height)
    resized_size = (
        max(1, min(target_size, round(width * scale))),
        max(1, min(target_size, round(height * scale))),
    )
    resized = rgb_image.resize(resized_size, Image.Resampling.LANCZOS)
    pad_left = (target_size - resized_size[0]) // 2
    pad_top = (target_size - resized_size[1]) // 2
    pad_right = target_size - resized_size[0] - pad_left
    pad_bottom = target_size - resized_size[1] - pad_top

    output = Image.new("RGB", (target_size, target_size), fill)
    output.paste(resized, (pad_left, pad_top))
    return output, resized_size, (pad_left, pad_top, pad_right, pad_bottom)


class ResizeWithPadding:
    """Torchvision-compatible wrapper around the shared letterbox resize."""

    def __init__(
        self,
        target_size: int = TARGET_SIZE,
        fill: tuple[int, int, int] = PADDING_COLOR,
    ) -> None:
        self.target_size = target_size
        self.fill = fill

    def __call__(self, image: Image.Image) -> Image.Image:
        output, _, _ = resize_with_padding(image, self.target_size, self.fill)
        return output
