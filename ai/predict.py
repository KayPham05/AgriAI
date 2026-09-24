import argparse
import sys
from pathlib import Path
from typing import Dict, Union

import torch
import torch.nn.functional as F
from PIL import Image

from ai.configs import config
from ai.data.augmentations import get_inference_transforms
from ai.networks.convnext import build_model
from ai.utils.label_mapping import normalize_checkpoint_label_mapping

class LeafDiseasePredictor:
    """
    Module Inference cho mô hình ConvNeXt-Tiny chẩn đoán bệnh cây trồng.
    Có thể sử dụng độc lập qua Command Line hoặc nhúng vào API (FastAPI/Flask/Streamlit).
    """
    def __init__(self, checkpoint_path: Union[str, Path] = config.BEST_MODEL_PATH):
        self.checkpoint_path = Path(checkpoint_path)
        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Không tìm thấy checkpoint mô hình tại: {self.checkpoint_path.resolve()}")

        # Nạp checkpoint
        checkpoint = torch.load(self.checkpoint_path, map_location=config.DEVICE)
        self.num_classes = checkpoint["num_classes"]
        self.idx_to_info = normalize_checkpoint_label_mapping(
            checkpoint.get("idx_to_info"), self.num_classes
        )

        # Khởi tạo mô hình
        self.model = build_model(num_classes=self.num_classes, pretrained=False, device=config.DEVICE)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        self.transform = get_inference_transforms()

    @torch.no_grad()
    def predict_image(self, image_path: Union[str, Path], top_k: int = 3) -> Dict:
        """
        Dự đoán nhãn cho 1 bức ảnh lá cây đơn lẻ.
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Không tìm thấy file ảnh: {image_path.resolve()}")

        with Image.open(image_path) as source:
            image = source.convert("RGB")
        tensor = self.transform(image).unsqueeze(0).to(config.DEVICE)

        with torch.amp.autocast("cuda", enabled=config.USE_AMP):
            logits = self.model(tensor)
            probs = F.softmax(logits, dim=1).squeeze(0)

        # Lấy Top K xác suất cao nhất
        topk_probs, topk_indices = torch.topk(probs, k=min(top_k, self.num_classes))
        topk_probs = topk_probs.cpu().tolist()
        topk_indices = topk_indices.cpu().tolist()

        predictions = []
        for prob, idx in zip(topk_probs, topk_indices):
            info = self.idx_to_info[idx]
            predictions.append({
                "plant": info["plant"],
                "disease": info["disease"],
                "compound_label": info["compound_label"],
                "confidence": round(prob * 100, 2)
            })

        best = predictions[0]
        return {
            "image_path": str(image_path.resolve()),
            "plant": best["plant"],
            "disease": best["disease"],
            "confidence": best["confidence"],
            "top_predictions": predictions
        }


def main():
    parser = argparse.ArgumentParser(description="Dự đoán loại cây và loại bệnh từ ảnh lá cây (ConvNeXt-Tiny)")
    parser.add_argument("--image", type=str, required=True, help="Đường dẫn đến file ảnh lá cây (.jpg, .png)")
    parser.add_argument("--checkpoint", type=str, default=str(config.BEST_MODEL_PATH), help="Đường dẫn file trọng số .pth")
    parser.add_argument("--topk", type=int, default=3, help="Số lượng dự đoán xác suất cao nhất hiển thị")
    args = parser.parse_args()

    try:
        predictor = LeafDiseasePredictor(checkpoint_path=args.checkpoint)
        result = predictor.predict_image(args.image, top_k=args.topk)

        print("\n" + "=" * 55)
        print("🌿 KẾT QUẢ CHẨN ĐOÁN LÁ CÂY (AgriVisionAI) 🌿")
        print("=" * 55)
        print(f"📁 Tệp ảnh           : {result['image_path']}")
        print(f"🌱 LOẠI CÂY TRỒNG    : {result['plant']}")
        print(f"🦠 TÌNH TRẠNG BỆNH   : {result['disease']}")
        print(f"🎯 ĐỘ TIN CẬY        : {result['confidence']:.2f}%")
        print("-" * 55)
        print(f"🔍 Top {len(result['top_predictions'])} khả năng cao nhất:")
        for rank, p in enumerate(result['top_predictions'], start=1):
            print(f"  {rank}. [{p['plant']} - {p['disease']}]: {p['confidence']:.2f}%")
        print("=" * 55 + "\n")

    except Exception as e:
        print(f"\n[!] Lỗi khi thực hiện dự đoán: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
