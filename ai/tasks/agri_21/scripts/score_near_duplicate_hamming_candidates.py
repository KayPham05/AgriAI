from __future__ import annotations

import argparse
import csv
import json
import math
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

from ai.tasks.agri_21.scripts.assign_group_ids import write_csv
from ai.tasks.agri_21.scripts.audit_near_duplicates_by_hamming import CANDIDATE_FIELDS


SCORED_FIELDS = [
    *CANDIDATE_FIELDS,
    "grayscale_correlation",
    "normalized_mae",
    "similarity_decision",
]


def grayscale_correlation(left: Image.Image, right: Image.Image) -> float:
    left_pixels = left.tobytes()
    right_pixels = right.tobytes()
    pixel_count = len(left_pixels)
    left_sum = sum(left_pixels)
    right_sum = sum(right_pixels)
    left_square_sum = sum(value * value for value in left_pixels)
    right_square_sum = sum(value * value for value in right_pixels)
    cross_sum = sum(
        left_value * right_value
        for left_value, right_value in zip(left_pixels, right_pixels)
    )
    covariance = cross_sum - left_sum * right_sum / pixel_count
    left_variance = left_square_sum - left_sum * left_sum / pixel_count
    right_variance = right_square_sum - right_sum * right_sum / pixel_count
    denominator = math.sqrt(left_variance * right_variance)
    if denominator == 0:
        return float(left_pixels == right_pixels)
    return covariance / denominator


def normalized_mae(left: Image.Image, right: Image.Image) -> float:
    return ImageStat.Stat(ImageChops.difference(left, right)).mean[0] / 255


def score_near_duplicate_hamming_candidates(
    output_dir: Path,
    min_correlation: float = 0.9999,
    max_normalized_mae: float = 0.005,
) -> dict[str, object]:
    output_dir = output_dir.resolve()
    images_dir = output_dir / "images"
    candidate_path = output_dir / "reports" / "near_duplicate_hamming_candidates.csv"
    scored_path = output_dir / "reports" / "near_duplicate_hamming_similarity_review.csv"
    if scored_path.exists():
        raise FileExistsError("Artifact similarity review đã tồn tại; không ghi đè")

    with candidate_path.open(encoding="utf-8-sig", newline="") as input_file:
        candidate_rows = list(csv.DictReader(input_file))
    if not candidate_rows:
        raise ValueError("Báo cáo ứng viên Hamming không có dữ liệu")

    @lru_cache(maxsize=None)
    def load_grayscale(image_path: str) -> Image.Image:
        full_path = images_dir / image_path
        if not full_path.is_file():
            raise FileNotFoundError(f"Thiếu ảnh ứng viên: {full_path}")
        with Image.open(full_path) as image:
            return image.convert("L").resize((64, 64), Image.Resampling.LANCZOS)

    scored_rows: list[dict[str, object]] = []
    high_confidence_count = 0
    for row in candidate_rows:
        left = load_grayscale(row["left_sample_path"])
        right = load_grayscale(row["right_sample_path"])
        mae = normalized_mae(left, right)
        is_cross_label = row["relationship"] != "same_label"
        correlation: float | None = None
        if mae <= max_normalized_mae or is_cross_label:
            correlation = grayscale_correlation(left, right)

        is_high_confidence = (
            correlation is not None
            and correlation >= min_correlation
            and mae <= max_normalized_mae
        )
        if is_high_confidence:
            high_confidence_count += 1
        if is_high_confidence or is_cross_label:
            scored_rows.append(
                {
                    **row,
                    "grayscale_correlation": (
                        f"{correlation:.6f}" if correlation is not None else ""
                    ),
                    "normalized_mae": f"{mae:.6f}",
                    "similarity_decision": (
                        "high_confidence_near_duplicate"
                        if is_high_confidence
                        else "insufficient_similarity"
                    ),
                }
            )

    write_csv(scored_path, SCORED_FIELDS, scored_rows)
    return {
        "candidate_group_pairs_scored": len(candidate_rows),
        "images_loaded": load_grayscale.cache_info().currsize,
        "high_confidence_group_pairs": high_confidence_count,
        "cross_label_group_pairs": sum(
            row["relationship"] != "same_label" for row in candidate_rows
        ),
        "review_rows_written": len(scored_rows),
        "min_correlation": min_correlation,
        "max_normalized_mae": max_normalized_mae,
        "review_report": str(scored_path),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lọc ứng viên Hamming bằng tương đồng pixel grayscale."
    )
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--min-correlation", type=float, default=0.9999)
    parser.add_argument("--max-normalized-mae", type=float, default=0.005)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = score_near_duplicate_hamming_candidates(
        output_dir=args.output_dir,
        min_correlation=args.min_correlation,
        max_normalized_mae=args.max_normalized_mae,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
