import cv2


def get_logo_region(
    center_x: float,
    center_y: float,
    image_width: int,
    image_height: int,
) -> str:
    horizontal_ratio = center_x / image_width
    vertical_ratio = center_y / image_height

    if horizontal_ratio < 0.33:
        horizontal = "left"
    elif horizontal_ratio < 0.66:
        horizontal = "center"
    else:
        horizontal = "right"

    if vertical_ratio < 0.33:
        vertical = "top"
    elif vertical_ratio < 0.66:
        vertical = "middle"
    else:
        vertical = "bottom"

    return f"{vertical}_{horizontal}"


def verify_logo_placement(
    image_path: str,
    x: int,
    y: int,
    width: int,
    height: int,
    preferred_positions=None,
):
    image = cv2.imread(image_path)

    if image is None:
        return {
            "success": False,
            "message": "Unable to read packaging image.",
        }

    image_height, image_width = image.shape[:2]

    if width <= 0 or height <= 0:
        return {
            "success": False,
            "message": "Logo width and height must be greater than zero.",
        }

    if x < 0 or y < 0:
        return {
            "success": False,
            "message": "Logo coordinates cannot be negative.",
        }

    if x + width > image_width or y + height > image_height:
        return {
            "success": False,
            "message": "Logo bounding box exceeds image boundaries.",
        }

    preferred_positions = preferred_positions or [
        "top_left",
        "top_center",
    ]

    logo_area = width * height
    image_area = image_width * image_height
    area_ratio = (logo_area / image_area) * 100

    center_x = x + width / 2
    center_y = y + height / 2

    detected_position = get_logo_region(
        center_x,
        center_y,
        image_width,
        image_height,
    )

    left_margin = x
    top_margin = y
    right_margin = image_width - (x + width)
    bottom_margin = image_height - (y + height)

    minimum_horizontal_margin = image_width * 0.02
    minimum_vertical_margin = image_height * 0.02

    issues = []
    recommendations = []

    # -------------------------
    # Logo size verification
    # -------------------------
    if 2 <= area_ratio <= 15:
        size_score = 100
        size_status = "acceptable"

    elif 1 <= area_ratio < 2 or 15 < area_ratio <= 25:
        size_score = 65
        size_status = "warning"

        issues.append(
            "Logo size may not be visually balanced."
        )

        recommendations.append(
            "Adjust the logo size to occupy approximately "
            "2% to 15% of the packaging design."
        )

    else:
        size_score = 30
        size_status = "poor"

        if area_ratio < 1:
            issues.append("Logo is too small.")

            recommendations.append(
                "Increase the logo size to improve visibility."
            )

        else:
            issues.append("Logo is too large.")

            recommendations.append(
                "Reduce the logo size to avoid dominating "
                "the packaging design."
            )

    # -------------------------
    # Safe margin verification
    # -------------------------
    margin_is_safe = (
        left_margin >= minimum_horizontal_margin
        and right_margin >= minimum_horizontal_margin
        and top_margin >= minimum_vertical_margin
        and bottom_margin >= minimum_vertical_margin
    )

    if margin_is_safe:
        margin_score = 100
        margin_status = "safe"

    else:
        margin_score = 35
        margin_status = "unsafe"

        issues.append(
            "Logo is too close to the packaging edge."
        )

        recommendations.append(
            "Leave at least 2% clear space between the logo "
            "and every packaging edge."
        )

    # -------------------------
    # Preferred position check
    # -------------------------
    if detected_position in preferred_positions:
        position_score = 100
        position_status = "preferred"

    else:
        position_score = 55
        position_status = "not_preferred"

        readable_position = detected_position.replace(
            "_",
            " ",
        )

        issues.append(
            f"Logo is positioned at {readable_position}."
        )

        approved_positions = ", ".join(
            position.replace("_", " ")
            for position in preferred_positions
        )

        recommendations.append(
            f"Move the logo to an approved position such as "
            f"{approved_positions}."
        )

    # -------------------------
    # Final placement score
    # -------------------------
    placement_score = round(
        size_score * 0.35
        + margin_score * 0.35
        + position_score * 0.30,
        2,
    )

    # Important fix:
    # A result cannot be passed when issues exist.
    if issues:
        if placement_score >= 55:
            status = "warning"
        else:
            status = "failed"

    else:
        if placement_score >= 80:
            status = "passed"
        elif placement_score >= 55:
            status = "warning"
        else:
            status = "failed"

    unique_recommendations = list(
        dict.fromkeys(recommendations)
    )

    recommendation = (
        "Logo placement is acceptable."
        if not unique_recommendations
        else " ".join(unique_recommendations)
    )

    return {
        "success": True,
        "asset_type": "logo_placement",
        "status": status,
        "score": placement_score,
        "issues": issues,
        "recommendation": recommendation,
        "details": {
            "image_dimensions": {
                "width": image_width,
                "height": image_height,
            },
            "logo_bbox": {
                "x": x,
                "y": y,
                "width": width,
                "height": height,
            },
            "logo_center": {
                "x": round(center_x, 2),
                "y": round(center_y, 2),
            },
            "detected_position": detected_position,
            "preferred_positions": preferred_positions,
            "area_ratio_percent": round(
                area_ratio,
                2,
            ),
            "scores": {
                "size_score": size_score,
                "margin_score": margin_score,
                "position_score": position_score,
                "overall_score": placement_score,
            },
            "size_status": size_status,
            "margin_status": margin_status,
            "position_status": position_status,
            "minimum_safe_margin": {
                "horizontal": round(
                    minimum_horizontal_margin,
                    2,
                ),
                "vertical": round(
                    minimum_vertical_margin,
                    2,
                ),
            },
            "margins": {
                "left": left_margin,
                "right": right_margin,
                "top": top_margin,
                "bottom": bottom_margin,
            },
        },
    }