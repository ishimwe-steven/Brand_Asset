import cv2
import numpy as np

from services.logo_detection_service import crop_white_background
from services.color_consistency_service import verify_brand_color_consistency


def feature_similarity(reference, candidate):
    reference_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    candidate_gray = cv2.cvtColor(candidate, cv2.COLOR_BGR2GRAY)
    detector = cv2.SIFT_create(nfeatures=2500)
    ref_points, ref_descriptors = detector.detectAndCompute(reference_gray, None)
    crop_points, crop_descriptors = detector.detectAndCompute(candidate_gray, None)
    if ref_descriptors is None or crop_descriptors is None:
        return 0.0, 0
    matches = cv2.BFMatcher(cv2.NORM_L2).knnMatch(ref_descriptors, crop_descriptors, k=2)
    good = [pair[0] for pair in matches if len(pair) == 2 and pair[0].distance < 0.72 * pair[1].distance]
    expected = max(18, min(len(ref_points), len(crop_points)) * 0.08)
    return round(float(min(100, len(good) / expected * 100)), 2), len(good)


def verify_logo_identity(packaging_path, official_logo_path, bbox, text_score=0):
    packaging = cv2.imread(packaging_path)
    official = cv2.imread(official_logo_path)
    if packaging is None or official is None:
        raise ValueError("Unable to read packaging or official logo image.")

    height, width = packaging.shape[:2]
    x = max(0, int(bbox["x"])); y = max(0, int(bbox["y"]))
    w = min(width - x, int(bbox["width"])); h = min(height - y, int(bbox["height"]))
    candidate = packaging[y:y+h, x:x+w]
    official_artwork = crop_white_background(official)
    if candidate.size == 0 or official_artwork.size == 0:
        raise ValueError("The proposed logo region is invalid.")

    visual_score, good_matches = feature_similarity(official_artwork, candidate)
    colour_result = verify_brand_color_consistency(
        official_logo_path=official_logo_path,
        packaging_path=packaging_path,
        logo_bbox={"x": x, "y": y, "width": w, "height": h},
        number_of_colors=4,
    )
    colour_score = float(colour_result.get("score", 0) or 0)

    official_ratio = official_artwork.shape[1] / max(official_artwork.shape[0], 1)
    candidate_ratio = w / max(h, 1)
    aspect_score = min(official_ratio, candidate_ratio) / max(official_ratio, candidate_ratio) * 100
    aspect_score = round(float(aspect_score), 2)
    text_score = max(0.0, min(100.0, float(text_score)))

    final_score = round(
        visual_score * 0.45 + text_score * 0.25 + colour_score * 0.20 + aspect_score * 0.10,
        2,
    )
    status = "matched" if final_score >= 75 else "possible_match" if final_score >= 55 else "mismatch"

    return {
        "success": True,
        "detected": status == "matched",
        "status": status,
        "score": final_score,
        "confidence": final_score,
        "bbox": {"x": x, "y": y, "width": w, "height": h},
        "method": "ocr_guided_multimodal",
        "components": {
            "visual_feature_similarity": visual_score,
            "brand_text_similarity": text_score,
            "colour_consistency": round(colour_score, 2),
            "aspect_ratio_similarity": aspect_score,
            "good_feature_matches": good_matches,
        },
        "colour_analysis": colour_result,
        "message": (
            f"Official logo detected and matched with {final_score}% similarity."
            if status == "matched"
            else f"Logo comparison result: {status.replace('_', ' ')} ({final_score}%)."
        ),
    }
