import cv2
import numpy as np


def rgb_to_hex(color):
    r, g, b = [int(value) for value in color]
    return f"#{r:02X}{g:02X}{b:02X}"


def remove_background_pixels(
    pixels,
    ignore_white=True,
    ignore_black=False,
):
    filtered = []

    for pixel in pixels:
        r, g, b = [int(value) for value in pixel]

        if ignore_white and r >= 245 and g >= 245 and b >= 245:
            continue

        if ignore_black and r <= 10 and g <= 10 and b <= 10:
            continue

        filtered.append([r, g, b])

    return filtered


def extract_dominant_colours(
    image,
    number_of_colours=None,
):
    if image is None:
        return []

    rgb_image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB,
    )

    pixels = rgb_image.reshape(-1, 3)

    filtered_pixels = remove_background_pixels(
        pixels,
        ignore_white=True,
        ignore_black=False,
    )

    if not filtered_pixels:
        return []

    pixel_array = np.float32(filtered_pixels)

    # A representative sample is sufficient for dominant-colour
    # extraction and prevents large logos from making k-means slow.
    maximum_samples = 5000
    if len(pixel_array) > maximum_samples:
        sample_indexes = np.linspace(
            0,
            len(pixel_array) - 1,
            maximum_samples,
            dtype=np.int32,
        )
        pixel_array = pixel_array[sample_indexes]

    unique_pixels = np.unique(
        pixel_array,
        axis=0,
    )

    # Start with a broad palette, then let the image determine
    # how many visually meaningful colours remain.
    cluster_count = min(
        number_of_colours or 8,
        len(unique_pixels),
    )

    if cluster_count <= 0:
        return []

    criteria = (
        cv2.TERM_CRITERIA_EPS
        + cv2.TERM_CRITERIA_MAX_ITER,
        30,
        0.5,
    )

    _, labels, centres = cv2.kmeans(
        pixel_array,
        cluster_count,
        None,
        criteria,
        2,
        cv2.KMEANS_PP_CENTERS,
    )

    labels = labels.flatten()
    counts = np.bincount(labels)
    sorted_indexes = np.argsort(counts)[::-1]

    total = max(len(labels), 1)
    colours = []

    for index in sorted_indexes:
        centre = centres[index]
        percentage = (
            int(counts[index]) / total
        ) * 100

        rgb = [
            int(centre[0]),
            int(centre[1]),
            int(centre[2]),
        ]

        # Ignore tiny anti-aliasing/compression clusters when
        # colour count is being inferred automatically.
        if number_of_colours is None and percentage < 2.5:
            continue

        # Merge near-identical shades so they count as one
        # approved brand colour.
        if number_of_colours is None:
            duplicate = next(
                (
                    colour
                    for colour in colours
                    if np.linalg.norm(
                        np.array(colour["rgb"], dtype=float)
                        - np.array(rgb, dtype=float)
                    ) < 28
                ),
                None,
            )
            if duplicate:
                duplicate["percentage"] = round(
                    duplicate["percentage"] + float(percentage),
                    2,
                )
                continue

        colours.append(
            {
                "rgb": rgb,
                "hex": rgb_to_hex(rgb),
                "percentage": round(
                    float(percentage),
                    2,
                ),
            }
        )

    return colours


def calculate_logo_quality_summary(image):
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    blur_variance = cv2.Laplacian(
        gray,
        cv2.CV_64F,
    ).var()

    contrast_value = gray.std()

    height, width = image.shape[:2]

    return {
        "width": int(width),
        "height": int(height),
        "aspect_ratio": round(
            width / max(height, 1),
            4,
        ),
        "blur_variance": round(
            float(blur_variance),
            2,
        ),
        "contrast": round(
            float(contrast_value),
            2,
        ),
    }


def build_brand_profile(
    logo_path: str,
    number_of_colours=None,
):
    image = cv2.imread(logo_path)

    if image is None:
        return {
            "success": False,
            "message": "Unable to read official logo.",
        }

    dominant_colours = extract_dominant_colours(
        image,
        number_of_colours=number_of_colours,
    )

    if not dominant_colours:
        return {
            "success": False,
            "message": (
                "No valid colours could be extracted "
                "from the official logo."
            ),
        }

    primary_colour = dominant_colours[0]["hex"]

    secondary_colour = (
        dominant_colours[1]["hex"]
        if len(dominant_colours) > 1
        else None
    )

    quality_summary = calculate_logo_quality_summary(
        image
    )

    return {
        "success": True,
        "asset_type": "brand_profile",
        "primary_colour": primary_colour,
        "secondary_colour": secondary_colour,
        "dominant_colours": dominant_colours,
        "number_of_colours": len(dominant_colours),
        "logo_metadata": quality_summary,
        "message": (
            "Official brand profile extracted successfully."
        ),
    }
