import cv2
import numpy as np


def crop_white_background(image, threshold=245, padding=8):
    """
    Removes large white margins surrounding a reference logo.
    """
    if image is None:
        return None

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mask = (gray < threshold).astype(np.uint8) * 255

    coordinates = cv2.findNonZero(mask)

    if coordinates is None:
        return image

    x, y, width, height = cv2.boundingRect(coordinates)

    x = max(0, x - padding)
    y = max(0, y - padding)

    x2 = min(image.shape[1], x + width + (padding * 2))
    y2 = min(image.shape[0], y + height + (padding * 2))

    return image[y:y2, x:x2]


def polygon_area(points):
    points = np.asarray(points, dtype=np.float32)
    return float(abs(cv2.contourArea(points)))


def calculate_reprojection_error(
    source_points,
    destination_points,
    homography,
    inlier_mask,
):
    projected = cv2.perspectiveTransform(
        source_points,
        homography,
    )

    errors = np.linalg.norm(
        projected - destination_points,
        axis=2,
    ).reshape(-1)

    if inlier_mask is not None:
        inliers = inlier_mask.ravel().astype(bool)
        errors = errors[inliers]

    if len(errors) == 0:
        return float("inf")

    return float(np.mean(errors))


def validate_detected_polygon(
    transformed_corners,
    packaging_width,
    packaging_height,
    reference_width,
    reference_height,
):
    polygon = transformed_corners.reshape(4, 2)

    if not np.all(np.isfinite(polygon)):
        return False, "Detected polygon contains invalid coordinates."

    polygon_int = polygon.astype(np.int32)

    if not cv2.isContourConvex(polygon_int):
        return False, "Detected logo region is not geometrically valid."

    area = polygon_area(polygon)

    image_area = packaging_width * packaging_height
    area_ratio = area / max(image_area, 1)

    # Logo should not be extremely tiny or occupy most of packaging
    if area_ratio < 0.002:
        return False, "Detected region is too small to be a reliable logo."

    if area_ratio > 0.40:
        return False, "Detected region is too large to be a reliable logo."

    x_min = float(np.min(polygon[:, 0]))
    y_min = float(np.min(polygon[:, 1]))
    x_max = float(np.max(polygon[:, 0]))
    y_max = float(np.max(polygon[:, 1]))

    # Small tolerance is allowed because perspective transformation
    # may slightly exceed image borders.
    tolerance_x = packaging_width * 0.05
    tolerance_y = packaging_height * 0.05

    if (
        x_min < -tolerance_x
        or y_min < -tolerance_y
        or x_max > packaging_width + tolerance_x
        or y_max > packaging_height + tolerance_y
    ):
        return False, "Detected logo region falls outside packaging boundaries."

    detected_width = x_max - x_min
    detected_height = y_max - y_min

    if detected_width <= 5 or detected_height <= 5:
        return False, "Detected logo dimensions are invalid."

    reference_ratio = reference_width / max(reference_height, 1)
    detected_ratio = detected_width / max(detected_height, 1)

    ratio_difference = max(
        detected_ratio / max(reference_ratio, 0.001),
        reference_ratio / max(detected_ratio, 0.001),
    )

    # Perspective may change ratio, but not without limit.
    if ratio_difference > 3.0:
        return False, "Detected shape does not match the reference logo ratio."

    return True, None


def create_feature_detector():
    """
    Prefer SIFT because it is more reliable for scale and perspective.
    Use ORB only when SIFT is unavailable.
    """
    if hasattr(cv2, "SIFT_create"):
        detector = cv2.SIFT_create(
            nfeatures=4000,
            contrastThreshold=0.03,
            edgeThreshold=10,
        )

        return {
            "name": "SIFT",
            "detector": detector,
            "norm": cv2.NORM_L2,
            "ratio_threshold": 0.70,
            "minimum_good_matches": 14,
            "minimum_inliers": 9,
        }

    detector = cv2.ORB_create(
        nfeatures=5000,
        scaleFactor=1.15,
        nlevels=12,
        edgeThreshold=15,
        fastThreshold=10,
    )

    return {
        "name": "ORB",
        "detector": detector,
        "norm": cv2.NORM_HAMMING,
        "ratio_threshold": 0.65,
        "minimum_good_matches": 18,
        "minimum_inliers": 11,
    }


def detect_logo_bbox(
    packaging_path: str,
    logo_template_path: str,
    threshold: float = 0.60,
):
    packaging = cv2.imread(packaging_path)
    reference_logo = cv2.imread(logo_template_path)

    if packaging is None:
        return {
            "success": False,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "message": "Unable to read packaging image.",
        }

    if reference_logo is None:
        return {
            "success": False,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "message": "Unable to read reference logo image.",
        }

    reference_logo = crop_white_background(reference_logo)

    packaging_gray = cv2.cvtColor(
        packaging,
        cv2.COLOR_BGR2GRAY,
    )

    reference_gray = cv2.cvtColor(
        reference_logo,
        cv2.COLOR_BGR2GRAY,
    )

    # Improve contrast without heavily changing image structure.
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    packaging_gray = clahe.apply(packaging_gray)
    reference_gray = clahe.apply(reference_gray)

    # Ignore the uploaded logo's plain white background. Feature
    # descriptors should represent the artwork, not its canvas edges.
    reference_mask = cv2.inRange(
        reference_logo,
        np.array([0, 0, 0], dtype=np.uint8),
        np.array([242, 242, 242], dtype=np.uint8),
    )
    reference_mask = cv2.morphologyEx(
        reference_mask,
        cv2.MORPH_CLOSE,
        np.ones((3, 3), np.uint8),
    )

    settings = create_feature_detector()
    detector = settings["detector"]

    reference_keypoints, reference_descriptors = detector.detectAndCompute(
        reference_gray,
        reference_mask,
    )

    packaging_keypoints, packaging_descriptors = detector.detectAndCompute(
        packaging_gray,
        None,
    )

    if (
        reference_descriptors is None
        or packaging_descriptors is None
        or len(reference_keypoints) < settings["minimum_good_matches"]
        or len(packaging_keypoints) < settings["minimum_good_matches"]
    ):
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "message": "Not enough visual features to identify the logo reliably.",
        }

    matcher = cv2.BFMatcher(
        settings["norm"],
        crossCheck=False,
    )

    forward_matches = matcher.knnMatch(
        reference_descriptors,
        packaging_descriptors,
        k=2,
    )

    good_matches = []

    for pair in forward_matches:
        if len(pair) < 2:
            continue

        first, second = pair

        if first.distance < settings["ratio_threshold"] * second.distance:
            good_matches.append(first)

    minimum_good_matches = settings["minimum_good_matches"]

    if len(good_matches) < minimum_good_matches:
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "minimum_good_matches": minimum_good_matches,
            "message": "Reference logo does not sufficiently match the packaging.",
        }

    source_points = np.float32(
        [
            reference_keypoints[match.queryIdx].pt
            for match in good_matches
        ]
    ).reshape(-1, 1, 2)

    destination_points = np.float32(
        [
            packaging_keypoints[match.trainIdx].pt
            for match in good_matches
        ]
    ).reshape(-1, 1, 2)

    homography, inlier_mask = cv2.findHomography(
        source_points,
        destination_points,
        cv2.RANSAC,
        4.0,
    )

    if homography is None or inlier_mask is None:
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "message": "Logo matches did not form a reliable geometric pattern.",
        }

    inlier_count = int(inlier_mask.sum())
    inlier_ratio = inlier_count / max(len(good_matches), 1)

    minimum_inliers = settings["minimum_inliers"]

    if inlier_count < minimum_inliers:
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "message": "Too few reliable logo matches were found.",
        }

    # Multiple occurrences of the same logo create valid matches for
    # different locations. RANSAC selects one occurrence, so use strong
    # absolute inlier evidence even when the global ratio is lower.
    if inlier_ratio < 0.35 and inlier_count < (minimum_inliers * 2):
        return {
            "success": True,
            "detected": False,
            "confidence": round(inlier_ratio * 100, 2),
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "message": "Most feature matches were inconsistent with the reference logo.",
        }

    reference_height, reference_width = reference_gray.shape[:2]

    reference_corners = np.float32(
        [
            [0, 0],
            [reference_width - 1, 0],
            [reference_width - 1, reference_height - 1],
            [0, reference_height - 1],
        ]
    ).reshape(-1, 1, 2)

    transformed_corners = cv2.perspectiveTransform(
        reference_corners,
        homography,
    )

    packaging_height, packaging_width = packaging_gray.shape[:2]

    polygon_valid, polygon_error = validate_detected_polygon(
        transformed_corners,
        packaging_width,
        packaging_height,
        reference_width,
        reference_height,
    )

    if not polygon_valid:
        mask = inlier_mask.ravel().astype(bool)
        inlier_destinations = destination_points.reshape(-1, 2)[mask]
        if len(inlier_destinations) >= minimum_inliers * 2:
            x, y, width, height = cv2.boundingRect(
                inlier_destinations.reshape(-1, 1, 2).astype(np.float32)
            )
            padding_x = max(8, int(width * 0.12))
            padding_y = max(8, int(height * 0.12))
            x = max(0, x - padding_x)
            y = max(0, y - padding_y)
            width = min(packaging_width - x, width + padding_x * 2)
            height = min(packaging_height - y, height + padding_y * 2)
            if width >= 24 and height >= 24:
                return {
                    "success": True,
                    "detected": True,
                    "partial_match": True,
                    "confidence": 65.0,
                    "bbox": {"x": int(x), "y": int(y), "width": int(width), "height": int(height)},
                    "method": settings["name"],
                    "good_matches": len(good_matches),
                    "inlier_matches": inlier_count,
                    "message": "A strong partial official-logo match was detected; some surrounding artwork differs from the reference.",
                }
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "message": polygon_error,
        }

    reprojection_error = calculate_reprojection_error(
        source_points,
        destination_points,
        homography,
        inlier_mask,
    )

    if reprojection_error > 6.0:
        return {
            "success": True,
            "detected": False,
            "confidence": 0,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "reprojection_error": round(reprojection_error, 2),
            "message": "Matched points do not align accurately enough.",
        }

    polygon = transformed_corners.reshape(4, 2)

    x_min = max(0, int(np.floor(np.min(polygon[:, 0]))))
    y_min = max(0, int(np.floor(np.min(polygon[:, 1]))))
    x_max = min(
        packaging_width,
        int(np.ceil(np.max(polygon[:, 0]))),
    )
    y_max = min(
        packaging_height,
        int(np.ceil(np.max(polygon[:, 1]))),
    )

    bbox_width = x_max - x_min
    bbox_height = y_max - y_min

    # Conservative confidence:
    # 45% inlier ratio, 30% absolute inlier strength,
    # 25% geometric accuracy.
    ratio_score = min(1.0, inlier_ratio)

    inlier_strength = min(
        1.0,
        inlier_count / 20.0,
    )

    geometry_score = max(
        0.0,
        1.0 - (reprojection_error / 8.0),
    )

    confidence = (
        ratio_score * 0.45
        + inlier_strength * 0.30
        + geometry_score * 0.25
    ) * 100

    confidence = round(float(confidence), 2)

    required_confidence = max(
        60.0,
        float(threshold) * 100,
    )

    if confidence < required_confidence:
        return {
            "success": True,
            "detected": False,
            "confidence": confidence,
            "bbox": None,
            "method": settings["name"],
            "good_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "inlier_ratio": round(inlier_ratio, 3),
            "reprojection_error": round(reprojection_error, 2),
            "message": "Logo match confidence is below the required threshold.",
        }

    return {
        "success": True,
        "detected": True,
        "confidence": confidence,
        "bbox": {
            "x": x_min,
            "y": y_min,
            "width": bbox_width,
            "height": bbox_height,
        },
        "polygon": [
            {
                "x": round(float(point[0]), 2),
                "y": round(float(point[1]), 2),
            }
            for point in polygon
        ],
        "method": settings["name"],
        "good_matches": len(good_matches),
        "inlier_matches": inlier_count,
        "inlier_ratio": round(inlier_ratio, 3),
        "reprojection_error": round(reprojection_error, 2),
        "message": "Logo detected successfully.",
    }
