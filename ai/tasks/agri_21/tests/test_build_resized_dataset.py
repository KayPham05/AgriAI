import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.audit_dataset import MANIFEST_FIELDS, calculate_difference_hash
from ai.tasks.agri_21.scripts.build_resized_dataset import (
    PADDING_COLOR,
    _safe_image_path,
    build_resized_dataset,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class BuildResizedDatasetTests(unittest.TestCase):
    def test_safe_image_path_rejects_traversal(self) -> None:
        images_dir = Path("dataset/images")
        self.assertEqual(
            _safe_image_path(images_dir, "Cay/Benh/image.jpg"),
            images_dir / "Cay/Benh/image.jpg",
        )
        with self.assertRaisesRegex(ValueError, "không an toàn"):
            _safe_image_path(images_dir, "../outside.jpg")

    def test_build_preserves_source_content_and_split_membership(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_dir = root / "v1.1"
            output_dir = root / "v1.2"
            output_dir.mkdir()
            records = []

            for split, size in (
                ("train", (320, 160)),
                ("val", (160, 320)),
                ("test", (224, 224)),
            ):
                relative_path = Path("Cay") / "Benh" / f"{split}.jpg"
                image_path = source_dir / "images" / relative_path
                image_path.parent.mkdir(parents=True, exist_ok=True)
                image = Image.new("RGB", size, "red")
                image.putpixel((0, 0), (0, 255, 0))
                image.save(image_path, quality=95)
                with Image.open(image_path) as saved_image:
                    records.append(
                        {
                            "image_path": relative_path.as_posix(),
                            "plant": "Cay",
                            "condition": "Benh",
                            "compound_label": "Cay___Benh",
                            "extension": ".jpg",
                            "image_format": saved_image.format,
                            "width": saved_image.width,
                            "height": saved_image.height,
                            "file_size": image_path.stat().st_size,
                            "sha256": sha256(image_path),
                            "phash": calculate_difference_hash(saved_image),
                            "quality_flags": "",
                            "status": "valid",
                            "rejection_reason": "",
                            "group_id": f"group-{split}",
                            "split": split,
                        }
                    )

            manifests_dir = source_dir / "manifests"
            manifests_dir.mkdir(parents=True)
            self._write_manifest(manifests_dir / "dataset_manifest.csv", records)
            for split in ("train", "val", "test"):
                self._write_manifest(
                    manifests_dir / f"{split}.csv",
                    [record for record in records if record["split"] == split],
                )
            metadata_dir = source_dir / "metadata"
            metadata_dir.mkdir()
            (metadata_dir / "dataset_version.json").write_text(
                json.dumps(
                    {"dataset_version": "v1.1", "source_dataset_version": "v1.0"}
                ),
                encoding="utf-8",
            )
            source_hashes = {
                record["image_path"]: sha256(source_dir / "images" / record["image_path"])
                for record in records
            }

            result = build_resized_dataset(
                source_dir,
                output_dir,
                workers=1,
                progress_interval=0,
            )

            self.assertEqual(result["image_count"], 3)
            for record in records:
                source_path = source_dir / "images" / record["image_path"]
                output_path = output_dir / "images" / record["image_path"]
                self.assertEqual(sha256(source_path), source_hashes[record["image_path"]])
                with Image.open(output_path) as output_image:
                    self.assertEqual(output_image.size, (224, 224))
            with Image.open(output_dir / "images/Cay/Benh/train.jpg") as landscape:
                corner = landscape.getpixel((0, 0))
                self.assertTrue(
                    all(
                        abs(actual - expected) <= 2
                        for actual, expected in zip(corner, PADDING_COLOR)
                    )
                )

            output_records = self._read_manifest(
                output_dir / "manifests" / "dataset_manifest.csv"
            )
            self.assertEqual(
                [(row["image_path"], row["split"]) for row in output_records],
                [(row["image_path"], row["split"]) for row in records],
            )
            self.assertTrue(all(row["width"] == "224" for row in output_records))
            self.assertTrue(all(row["height"] == "224" for row in output_records))

    @staticmethod
    def _write_manifest(path: Path, rows: list[dict[str, object]]) -> None:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS)
            writer.writeheader()
            writer.writerows(rows)

    @staticmethod
    def _read_manifest(path: Path) -> list[dict[str, str]]:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))


if __name__ == "__main__":
    unittest.main()
