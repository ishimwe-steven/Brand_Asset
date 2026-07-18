import cv2
import numpy as np


def calculate_blur_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    variance = cv2.Laplacian(gray, cv2.CV_64F).var()

    if variance >= 300:
        status = "sharp"
        score = 100
    elif variance >= 150:
        status = "acceptable"
        score = 80
    elif variance >= 70:
        status = "slightly_blurred"
        score = 55
    else:
        status = "blurred"
        score = 25

    return {
        "variance": round(float(variance), 2),
        "status": status,
        "score": score,
    }


def calculate_contrast_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    contrast_value = gray.std()

    if contrast_value >= 60:
        status = "good"
        score = 100
    elif contrast_value >= 40:
        status = "acceptable"
        score = 75
    elif contrast_value >= 25:
        status = "low"
        score = 50
    else:
        status = "very_low"
        score = 25

    return {
        "value": round(float(contrast_value), 2),
        "status": status,
        "score": score,
    }


def calculate_resolution_score(image):
    height, width = image.shape[:2]
    total_pixels = width * height

    if width >= 1000 and height >= 1000:
        status = "high"
        score = 100
    elif width >= 600 and height >= 600:
        status = "acceptable"
        score = 80
    elif width >= 300 and height >= 300:
        status = "low"
        score = 55
    else:
        status = "very_low"
        score = 25

    return {
        "width": width,
        "height": height,
        "total_pixels": total_pixels,
        "status": status,
        "score": score,
    }


def build_logo_recommendation(blur, contrast, resolution):
    issues = []

    if blur["status"] == "blurred":
        issues.append("Logo appears blurred.")
    elif blur["status"] == "slightly_blurred":
        issues.append("Logo appears slightly blurred.")

    if contrast["status"] == "low":
        issues.append("Logo contrast is low.")
    elif contrast["status"] == "very_low":
        issues.append("Logo contrast is very low.")

    if resolution["status"] == "low":
        issues.append("Logo resolution is low.")
    elif resolution["status"] == "very_low":
        issues.append("Logo resolution is very low.")

    if not issues:
        return issues, "Logo quality is acceptable."

    recommendation = (
        "Use a higher-resolution logo, improve image sharpness, "
        "and ensure sufficient contrast between the logo and background."
    )

    return issues, recommendation


def verify_logo_quality(image_path):
    image = cv2.imread(image_path)

    if image is None:
        return {
            "success": False,
            "message": "Unable to read the image.",
        }

    blur = calculate_blur_score(image)
    contrast = calculate_contrast_score(image)
    resolution = calculate_resolution_score(image)

    quality_score = round(
        (
            blur["score"] * 0.40
            + contrast["score"] * 0.30
            + resolution["score"] * 0.30
        ),
        2,
    )

    if quality_score >= 80:
        status = "passed"
    elif quality_score >= 50:
        status = "warning"
    else:
        status = "failed"

    issues, recommendation = build_logo_recommendation(
        blur,
        contrast,
        resolution,
    )

    return {
        "success": True,
        "asset_type": "logo_quality",
        "status": status,
        "score": quality_score,
        "issues": issues,
        "recommendation": recommendation,
        "details": {
            "blur": blur,
            "contrast": contrast,
            "resolution": resolution,
        },
    }