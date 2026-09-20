import unittest

from torchvision import transforms
from torchvision.transforms import InterpolationMode

from PIL import Image

from ai.data.augmentations import (
    PADDING_COLOR,
    ResizeWithPadding,
    get_inference_transforms,
    get_train_transforms,
    get_val_transforms,
)
from ai.data.image_preprocessing import resize_with_padding


class AugmentationTests(unittest.TestCase):
    def test_train_rotation_uses_dataset_padding_color(self) -> None:
        pipeline = get_train_transforms()
        rotation = next(
            transform
            for transform in pipeline.transforms
            if isinstance(transform, transforms.RandomRotation)
        )

        self.assertEqual(rotation.fill, PADDING_COLOR)
        self.assertEqual(rotation.interpolation, InterpolationMode.BILINEAR)
        self.assertFalse(
            any(
                isinstance(transform, transforms.RandomGrayscale)
                for transform in pipeline.transforms
            )
        )

    def test_validation_has_no_random_augmentation(self) -> None:
        pipeline = get_val_transforms()
        random_transform_types = (
            transforms.RandomHorizontalFlip,
            transforms.RandomVerticalFlip,
            transforms.RandomRotation,
            transforms.ColorJitter,
            transforms.RandomResizedCrop,
            transforms.RandomGrayscale,
        )

        self.assertFalse(
            any(
                isinstance(transform, random_transform_types)
                for transform in pipeline.transforms
            )
        )


if __name__ == "__main__":
    unittest.main()
