import csv
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ai.tasks.agri_21.scripts.assign_group_ids import MANIFEST_FIELDS, write_csv
from ai.tasks.agri_21.scripts.extend_dataset_with_new_plants import extend_dataset


class ExtendDatasetWithNewPlantsTests(unittest.TestCase):
    def test_extend_dataset_merges_v12_and_new_plants_correctly(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)

            v12_dir = root / "v1.2"
            new_source_dir = root / "new_plants"
            output_dir = root / "v1.3"

            # 1. Mock v1.2 dataset
            v12_images = v12_dir / "images" / "Cam" / "Khoe_manh"
            v12_images.mkdir(parents=True)
            v12_img_path = v12_images / "cam_001.jpg"
            img_cam = Image.new("RGB", (224, 224), "green")
            img_cam.save(v12_img_path, quality=95)

            v12_manifest_dir = v12_dir / "manifests"
            v12_manifest_dir.mkdir(parents=True)
            v12_record = {
                "image_path": "Cam/Khoe_manh/cam_001.jpg",
                "plant": "Cam",
                "condition": "Khoe_manh",
                "compound_label": "Cam___Khoe_manh",
                "extension": ".jpg",
                "image_format": "JPEG",
                "width": 224,
                "height": 224,
                "file_size": v12_img_path.stat().st_size,
                "sha256": "sha-cam-1",
                "phash": "hash-cam-1",
                "quality_flags": "",
                "status": "valid",
                "rejection_reason": "",
                "group_id": "group-cam-1",
                "split": "train",
            }
            write_csv(v12_manifest_dir / "dataset_manifest.csv", MANIFEST_FIELDS, [v12_record])
            write_csv(v12_manifest_dir / "train.csv", MANIFEST_FIELDS, [v12_record])

            v12_meta_dir = v12_dir / "metadata"
            v12_meta_dir.mkdir()
            (v12_meta_dir / "dataset_version.json").write_text(
                json.dumps({"dataset_version": "v1.2", "stage": "v1_2_complete"}),
                encoding="utf-8",
            )

            # 2. Mock new source (Lúa & Xoài)
            lua_dir = new_source_dir / "Lua" / "Chay_la"
            xoai_dir = new_source_dir / "Xoai" / "Thanthu"
            lua_dir.mkdir(parents=True)
            xoai_dir.mkdir(parents=True)

            img_lua = Image.new("RGB", (300, 200), "yellow")
            img_lua.save(lua_dir / "lua_001.jpg", quality=95)

            img_xoai = Image.new("RGB", (224, 224), "red")
            img_xoai.save(xoai_dir / "xoai_001.jpg", quality=95)

            # 3. Run extension
            result = extend_dataset(
                new_source_dir=new_source_dir,
                v12_dir=v12_dir,
                output_dir=output_dir,
                seed=20260919,
                workers=1,
            )

            # 4. Asserts
            self.assertEqual(result["dataset_version"], "v1.3")
            self.assertEqual(result["total_images"], 3)
            self.assertEqual(result["v12_images"], 1)
            self.assertEqual(result["new_images_added"], 2)
            self.assertEqual(result["total_plants"], 3)  # Cam, Lua, Xoai
            self.assertEqual(result["leakage_groups"], 0)

            # Check output files
            out_manifest = output_dir / "manifests" / "dataset_manifest.csv"
            self.assertTrue(out_manifest.is_file())
            with out_manifest.open(encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
                self.assertEqual(len(rows), 3)
                labels = {r["compound_label"] for r in rows}
                self.assertIn("Cam___Khoe_manh", labels)
                self.assertIn("Lua___Chay_la", labels)
                self.assertIn("Xoai___Thanthu", labels)

            # Check images created and resized
            self.assertTrue((output_dir / "images" / "Cam" / "Khoe_manh" / "cam_001.jpg").is_file())
            self.assertTrue((output_dir / "images" / "Lua" / "Chay_la" / "lua_001.jpg").is_file())
            self.assertTrue((output_dir / "images" / "Xoai" / "Thanthu" / "xoai_001.jpg").is_file())

            with Image.open(output_dir / "images" / "Lua" / "Chay_la" / "lua_001.jpg") as img:
                self.assertEqual(img.size, (224, 224))

    def test_extend_dataset_when_new_plants_placed_inside_v12_images(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)

            v12_dir = root / "v1.2"
            output_dir = root / "v1.3"

            # 1. Mock v1.2 dataset with Cam (indexed in manifest) and Lua (not indexed) inside v1.2/images
            cam_dir = v12_dir / "images" / "Cam" / "Khoe_manh"
            lua_dir = v12_dir / "images" / "Lua" / "Chay_la"
            cam_dir.mkdir(parents=True)
            lua_dir.mkdir(parents=True)

            cam_img_path = cam_dir / "cam_001.jpg"
            img_cam = Image.new("RGB", (224, 224), "green")
            img_cam.save(cam_img_path, quality=95)

            lua_img_path = lua_dir / "lua_001.jpg"
            img_lua = Image.new("RGB", (224, 224), "yellow")
            img_lua.save(lua_img_path, quality=95)

            from ai.tasks.agri_21.scripts.audit_dataset import calculate_difference_hash, calculate_sha256
            cam_sha = calculate_sha256(cam_img_path)
            cam_phash = calculate_difference_hash(img_cam)

            v12_manifest_dir = v12_dir / "manifests"
            v12_manifest_dir.mkdir(parents=True)
            v12_record = {
                "image_path": "Cam/Khoe_manh/cam_001.jpg",
                "plant": "Cam",
                "condition": "Khoe_manh",
                "compound_label": "Cam___Khoe_manh",
                "extension": ".jpg",
                "image_format": "JPEG",
                "width": 224,
                "height": 224,
                "file_size": cam_img_path.stat().st_size,
                "sha256": cam_sha,
                "phash": cam_phash,
                "quality_flags": "",
                "status": "valid",
                "rejection_reason": "",
                "group_id": "group-cam-1",
                "split": "train",
            }

            write_csv(v12_manifest_dir / "dataset_manifest.csv", MANIFEST_FIELDS, [v12_record])
            write_csv(v12_manifest_dir / "train.csv", MANIFEST_FIELDS, [v12_record])

            v12_meta_dir = v12_dir / "metadata"
            v12_meta_dir.mkdir()
            (v12_meta_dir / "dataset_version.json").write_text(
                json.dumps({"dataset_version": "v1.2", "stage": "v1_2_complete"}),
                encoding="utf-8",
            )

            # 2. Run extension pointing --new-source directly to v1.2/images
            result = extend_dataset(
                new_source_dir=v12_dir / "images",
                v12_dir=v12_dir,
                output_dir=output_dir,
                seed=20260919,
                workers=1,
            )

            self.assertEqual(result["dataset_version"], "v1.3")
            self.assertEqual(result["total_images"], 2)  # 1 Cam + 1 Lua
            self.assertEqual(result["v12_images"], 1)
            self.assertEqual(result["new_images_added"], 1)
            self.assertEqual(result["total_plants"], 2)  # Cam, Lua



if __name__ == "__main__":
    unittest.main()
