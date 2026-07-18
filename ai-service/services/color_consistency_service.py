import cv2
import numpy as np


def rgb_to_hex(color):
    r, g, b = [int(value) for value in color]
    return f"#{r:02X}{g:02X}{b:02X}"


def extract_dominant_colors(
    image,
    number_of_colors=4,
    ignore_white=True,
    ignore_black=False,
    background_color=None,
    background_tolerance=38,
):
    if image is None:
        return []

    rgb_image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB,
    )

    pixels = rgb_image.reshape(-1, 3)

    filtered_pixels = []

    for pixel in pixels:
        r, g, b = [int(value) for value in pixel]

        if ignore_white and r > 245 and g > 245 and b > 245:
            continue

        if ignore_black and r < 15 and g < 15 and b < 15:
            continue

        # Ignore bright low-chroma paper, white, cream and label
        # backgrounds while retaining dark text and saturated artwork.
        if max(r, g, b) > 130 and (max(r, g, b) - min(r, g, b)) < 75:
            continue

        if background_color is not None:
            distance = np.linalg.norm(
                np.array([r, g, b], dtype=float)
                - np.array(background_color, dtype=float)
            )
            if distance < background_tolerance:
                continue

        filtered_pixels.append([r, g, b])

    if not filtered_pixels:
        return []

    pixel_array = np.float32(filtered_pixels)

    unique_pixels = np.unique(
        pixel_array,
        axis=0,
    )

    cluster_count = min(
        number_of_colors,
        len(unique_pixels),
    )

    if cluster_count <= 0:
        return []

    criteria = (
        cv2.TERM_CRITERIA_EPS
        + cv2.TERM_CRITERIA_MAX_ITER,
        100,
        0.2,
    )

    compactness, labels, centers = cv2.kmeans(
        pixel_array,
        cluster_count,
        None,
        criteria,
        10,
        cv2.KMEANS_PP_CENTERS,
    )

    labels = labels.flatten()
    counts = np.bincount(labels)

    sorted_indexes = np.argsort(counts)[::-1]

    dominant_colors = []

    total_count = max(len(labels), 1)

    for index in sorted_indexes:
        center = centers[index]
        percentage = (
            int(counts[index]) / total_count
        ) * 100

        dominant_colors.append(
            {
                "rgb": [
                    int(center[0]),
                    int(center[1]),
                    int(center[2]),
                ],
                "hex": rgb_to_hex(center),
                "percentage": round(
                    float(percentage),
                    2,
                ),
            }
        )

    return dominant_colors


def rgb_to_lab(rgb_color):
    rgb_array = np.uint8(
        [[rgb_color]]
    )

    lab_array = cv2.cvtColor(
        rgb_array,
        cv2.COLOR_RGB2LAB,
    )

    return lab_array[0][0].astype(
        np.float32
    )


def calculate_color_distance(
    first_rgb,
    second_rgb,
):
    first_lab = rgb_to_lab(
        first_rgb
    )

    second_lab = rgb_to_lab(
        second_rgb
    )

    return float(
        np.linalg.norm(
            first_lab - second_lab
        )
    )


def find_best_color_match(
    reference_color,
    detected_colors,
):
    best_match = None
    smallest_distance = float("inf")

    for detected_color in detected_colors:
        distance = calculate_color_distance(
            reference_color["rgb"],
            detected_color["rgb"],
        )

        if distance < smallest_distance:
            smallest_distance = distance
            best_match = detected_color

    return best_match, smallest_distance


def crop_logo_region(
    packaging_image,
    bbox,
):
    x = int(bbox["x"])
    y = int(bbox["y"])
    width = int(bbox["width"])
    height = int(bbox["height"])

    image_height, image_width = (
        packaging_image.shape[:2]
    )

    x = max(0, x)
    y = max(0, y)

    x2 = min(
        image_width,
        x + width,
    )

    y2 = min(
        image_height,
        y + height,
    )

    if x2 <= x or y2 <= y:
        return None

    return packaging_image[
        y:y2,
        x:x2,
    ]


def verify_brand_color_consistency(
    official_logo_path,
    packaging_path,
    logo_bbox,
    number_of_colors=4,
):
    official_logo = cv2.imread(
        official_logo_path
    )

    packaging_image = cv2.imread(
        packaging_path
    )

    if official_logo is None:
        return {
            "success": False,
            "message": (
                "Unable to read official logo."
            ),
        }

    if packaging_image is None:
        return {
            "success": False,
            "message": (
                "Unable to read packaging image."
            ),
        }

    packaging_logo = crop_logo_region(
        packaging_image,
        logo_bbox,
    )

    def estimate_border_rgb(image):
        border = np.concatenate([
            image[0, :, :], image[-1, :, :], image[:, 0, :], image[:, -1, :]
        ], axis=0)
        median_bgr = np.median(border, axis=0)
        return [int(median_bgr[2]), int(median_bgr[1]), int(median_bgr[0])]

    if packaging_logo is None:
        return {
            "success": False,
            "message": (
                "Unable to crop detected logo "
                "from packaging."
            ),
        }

    official_colors = extract_dominant_colors(
        official_logo,
        number_of_colors=number_of_colors,
        ignore_white=True,
        background_color=estimate_border_rgb(official_logo),
    )

    detected_colors = extract_dominant_colors(
        packaging_logo,
        number_of_colors=number_of_colors,
        ignore_white=True,
        background_color=estimate_border_rgb(packaging_logo),
    )

    if not official_colors:
        return {
            "success": False,
            "message": (
                "No valid brand colours were "
                "extracted from the official logo."
            ),
        }

    if not detected_colors:
        return {
            "success": False,
            "message": (
                "No valid colours were extracted "
                "from the packaging logo."
            ),
        }

    matches = []
    distances = []

    for official_color in official_colors:
        matched_color, distance = (
            find_best_color_match(
                official_color,
                detected_colors,
            )
        )

        distances.append(distance)

        matches.append(
            {
                "official_color": (
                    official_color
                ),
                "matched_packaging_color": (
                    matched_color
                ),
                "distance": round(
                    float(distance),
                    2,
                ),
            }
        )

    weights = np.array(
        [max(float(color.get("percentage", 0)), 0.1) for color in official_colors],
        dtype=float,
    )
    average_distance = float(
        np.average(distances, weights=weights)
    )

    maximum_distance = float(
        np.max(distances)
    )

    color_score = max(
        0.0,
        100.0 - average_distance * 0.75,
    )

    color_score = round(
        color_score,
        2,
    )

    issues = []
    recommendations = []

    if average_distance <= 12:
        status = "passed"

    elif average_distance <= 25:
        status = "warning"

        issues.append(
            "Brand colours differ slightly "
            "from the official logo."
        )

        recommendations.append(
            "Use the official brand colours "
            "without unnecessary colour adjustments."
        )

    else:
        status = "failed"

        issues.append(
            "Packaging logo colours do not match "
            "the official brand colours."
        )

        recommendations.append(
            "Replace the packaging logo with the "
            "approved official logo or restore its "
            "original brand colours."
        )

    recommendation = (
        "Brand colours are consistent "
        "with the official logo."
        if not recommendations
        else " ".join(recommendations)
    )

    return {
        "success": True,
        "asset_type": (
            "brand_colour_consistency"
        ),
        "status": status,
        "score": color_score,
        "issues": issues,
        "recommendation": recommendation,
        "details": {
            "official_colours": (
                official_colors
            ),
            "detected_colours": (
                detected_colors
            ),
            "colour_matches": matches,
            "average_colour_distance": round(
                average_distance,
                2,
            ),
            "maximum_colour_distance": round(
                maximum_distance,
                2,
            ),
            "logo_bbox": logo_bbox,
        },
    }
