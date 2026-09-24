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

    def test_v1_3_training_uses_light_geometry_without_resizing(self) -> None:
        pipeline = get_train_transforms()
        rotation = next(
            transform
            for transform in pipeline.transforms
            if isinstance(transform, transforms.RandomRotation)
        )

        self.assertFalse(
            any(
                isinstance(
                    transform,
                    (transforms.Resize, transforms.RandomVerticalFlip),
                )
                for transform in pipeline.transforms
            )
        )
        self.assertEqual(rotation.degrees, [-15.0, 15.0])

    def test_v1_3_validation_does_not_resize_preprocessed_images(self) -> None:
        pipeline = get_val_transforms()

        self.assertFalse(
            any(isinstance(transform, transforms.Resize) for transform in pipeline.transforms)
        )

    def test_inference_preserves_aspect_ratio_and_uses_dataset_padding(self) -> None:
        pipeline = get_inference_transforms(image_size=224)
        letterbox = pipeline.transforms[0]

        self.assertIsInstance(letterbox, ResizeWithPadding)
        for source_size, expected_resized_size, expected_padding in (
            ((400, 100), (224, 56), (0, 84, 0, 84)),
            ((100, 400), (56, 224), (84, 0, 84, 0)),
            ((224, 224), (224, 224), (0, 0, 0, 0)),
        ):
            with self.subTest(source_size=source_size):
                source = Image.new("RGB", source_size, (255, 0, 0))
                output = letterbox(source)
                expected_output, resized_size, padding = resize_with_padding(source)

                self.assertEqual(output.size, (224, 224))
                self.assertEqual(resized_size, expected_resized_size)
                self.assertEqual(padding, expected_padding)
                self.assertEqual(output.tobytes(), expected_output.tobytes())
                if any(expected_padding):
                    self.assertEqual(output.getpixel((0, 0)), PADDING_COLOR)
                else:
                    self.assertEqual(output.getpixel((0, 0)), (255, 0, 0))


if __name__ == "__main__":
    unittest.main()
