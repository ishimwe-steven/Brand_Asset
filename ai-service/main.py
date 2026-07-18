import io
import os
import shutil
import uuid
from pathlib import Path

import cv2
import easyocr
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pyzbar.pyzbar import decode

from services.logo_detection_service import detect_logo_bbox
from services.logo_placement_service import verify_logo_placement
from services.logo_quality_service import verify_logo_quality
from services.color_consistency_service import (
    verify_brand_color_consistency,
)
from services.regulation_extraction_service import extract_regulation_requirements
from services.logo_identity_service import verify_logo_identity
from services.brand_profile_service import build_brand_profile

app = FastAPI(
    title="Brand Asset AI Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

reader = easyocr.Reader(["en"], gpu=False)


def convert_bbox(bbox):
    return [
        [float(point[0]), float(point[1])]
        for point in bbox
    ]


def get_extension(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def validate_image_extension(filename: str, label: str = "File"):
    extension = get_extension(filename)

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"{label} must be JPG, JPEG or PNG.",
        )

    return extension


def create_temp_path(extension: str) -> str:
    return os.path.join(
        UPLOAD_DIR,
        f"{uuid.uuid4()}{extension}",
    )


def save_upload_file(upload_file: UploadFile, destination: str):
    with open(destination, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)


def remove_temp_files(*file_paths):
    for file_path in file_paths:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass


def detect_barcodes_and_qr(img_np):
    decoded_objects = decode(img_np)

    barcode = None
    qr_code = None

    for obj in decoded_objects:
        data = obj.data.decode(
            "utf-8",
            errors="ignore",
        )

        item = {
            "type": obj.type,
            "value": data,
            "rect": {
                "left": int(obj.rect.left),
                "top": int(obj.rect.top),
                "width": int(obj.rect.width),
                "height": int(obj.rect.height),
            },
        }

        if obj.type == "QRCODE":
            qr_code = item
        else:
            barcode = item

    return barcode, qr_code


@app.get("/")
def home():
    return {
        "success": True,
        "message": "Brand Asset AI Service is running",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy",
    }


@app.post("/analyze")
async def analyze_packaging(
    file: UploadFile = File(...),
):
    try:
        validate_image_extension(
            file.filename,
            "Packaging image",
        )

        contents = await file.read()

        image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")

        img_np = np.array(image)

        results = reader.readtext(img_np)

        detected_text = []
        full_text_parts = []

        for bbox, text, confidence in results:
            detected_text.append(
                {
                    "text": str(text),
                    "confidence": round(
                        float(confidence) * 100,
                        2,
                    ),
                    "bbox": convert_bbox(bbox),
                }
            )

            full_text_parts.append(str(text))

        barcode, qr_code = detect_barcodes_and_qr(
            img_np
        )

        return {
            "success": True,
            "ocr_text": " ".join(full_text_parts).strip(),
            "detected_text": detected_text,
            "assets": {
                "barcode": barcode,
                "qr_code": qr_code,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Packaging analysis failed: {str(error)}",
        )


@app.post("/verify-logo-quality")
async def verify_logo_quality_endpoint(
    file: UploadFile = File(...),
):
    temp_file_path = None

    try:
        extension = validate_image_extension(
            file.filename,
            "Logo image",
        )

        temp_file_path = create_temp_path(extension)

        save_upload_file(
            file,
            temp_file_path,
        )

        result = verify_logo_quality(
            temp_file_path
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Logo quality verification failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Logo quality verification "
                "completed successfully."
            ),
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(temp_file_path)


@app.post("/verify-logo-placement")
async def verify_logo_placement_endpoint(
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    width: int = Form(...),
    height: int = Form(...),
    preferred_positions: str = Form(
        "top_left,top_center"
    ),
):
    temp_file_path = None

    try:
        extension = validate_image_extension(
            file.filename,
            "Packaging image",
        )

        temp_file_path = create_temp_path(extension)

        save_upload_file(
            file,
            temp_file_path,
        )

        positions = [
            position.strip()
            for position in preferred_positions.split(",")
            if position.strip()
        ]

        result = verify_logo_placement(
            image_path=temp_file_path,
            x=x,
            y=y,
            width=width,
            height=height,
            preferred_positions=positions,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Logo placement verification failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Logo placement verification "
                "completed successfully."
            ),
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(temp_file_path)


@app.post("/detect-logo-bbox")
async def detect_logo_bbox_endpoint(
    packaging: UploadFile = File(...),
    reference_logo: UploadFile = File(...),
    threshold: float = Form(0.60),
):
    packaging_path = None
    logo_path = None

    try:
        packaging_extension = validate_image_extension(
            packaging.filename,
            "Packaging image",
        )

        logo_extension = validate_image_extension(
            reference_logo.filename,
            "Reference logo",
        )

        if threshold < 0 or threshold > 1:
            raise HTTPException(
                status_code=400,
                detail="Threshold must be between 0 and 1.",
            )

        packaging_path = create_temp_path(
            packaging_extension
        )

        logo_path = create_temp_path(
            logo_extension
        )

        save_upload_file(
            packaging,
            packaging_path,
        )

        save_upload_file(
            reference_logo,
            logo_path,
        )

        result = detect_logo_bbox(
            packaging_path=packaging_path,
            logo_template_path=logo_path,
            threshold=threshold,
        )

        return {
            "success": True,
            "message": (
                "Automatic logo detection completed."
            ),
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(
            packaging_path,
            logo_path,
        )


@app.post("/detect-and-verify-logo-placement")
async def detect_and_verify_logo_placement_endpoint(
    packaging: UploadFile = File(...),
    reference_logo: UploadFile = File(...),
    threshold: float = Form(0.60),
    preferred_positions: str = Form(
        "top_left,top_center"
    ),
):
    packaging_path = None
    logo_path = None

    try:
        packaging_extension = validate_image_extension(
            packaging.filename,
            "Packaging image",
        )

        logo_extension = validate_image_extension(
            reference_logo.filename,
            "Reference logo",
        )

        if threshold < 0 or threshold > 1:
            raise HTTPException(
                status_code=400,
                detail="Threshold must be between 0 and 1.",
            )

        packaging_path = create_temp_path(
            packaging_extension
        )

        logo_path = create_temp_path(
            logo_extension
        )

        save_upload_file(
            packaging,
            packaging_path,
        )

        save_upload_file(
            reference_logo,
            logo_path,
        )

        detection = detect_logo_bbox(
            packaging_path=packaging_path,
            logo_template_path=logo_path,
            threshold=threshold,
        )

        if not detection.get("success"):
            raise HTTPException(
                status_code=400,
                detail=detection.get(
                    "message",
                    "Logo detection failed.",
                ),
            )

        if not detection.get("detected"):
            return {
                "success": True,
                "message": (
                    "Logo was not detected reliably."
                ),
                "data": {
                    "logo_detection": detection,
                    "logo_placement": None,
                },
            }

        bbox = detection.get("bbox")

        if not bbox:
            raise HTTPException(
                status_code=400,
                detail="Logo bounding box was not generated.",
            )

        positions = [
            position.strip()
            for position in preferred_positions.split(",")
            if position.strip()
        ]

        placement = verify_logo_placement(
            image_path=packaging_path,
            x=int(bbox["x"]),
            y=int(bbox["y"]),
            width=int(bbox["width"]),
            height=int(bbox["height"]),
            preferred_positions=positions,
        )

        if not placement.get("success"):
            raise HTTPException(
                status_code=400,
                detail=placement.get(
                    "message",
                    "Logo placement verification failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Logo detected and placement "
                "verified successfully."
            ),
            "data": {
                "logo_detection": detection,
                "logo_placement": placement,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(
            packaging_path,
            logo_path,
        )


@app.post("/verify-brand-colour-consistency")
async def verify_brand_colour_consistency_endpoint(
    packaging: UploadFile = File(...),
    official_logo: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    width: int = Form(...),
    height: int = Form(...),
    number_of_colors: int = Form(4),
):
    packaging_path = None
    logo_path = None

    try:
        packaging_extension = (
            validate_image_extension(
                packaging.filename,
                "Packaging image",
            )
        )

        logo_extension = (
            validate_image_extension(
                official_logo.filename,
                "Official logo",
            )
        )

        if number_of_colors < 2 or number_of_colors > 8:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Number of colours must be "
                    "between 2 and 8."
                ),
            )

        packaging_path = create_temp_path(
            packaging_extension
        )

        logo_path = create_temp_path(
            logo_extension
        )

        save_upload_file(
            packaging,
            packaging_path,
        )

        save_upload_file(
            official_logo,
            logo_path,
        )

        result = (
            verify_brand_color_consistency(
                official_logo_path=logo_path,
                packaging_path=packaging_path,
                logo_bbox={
                    "x": x,
                    "y": y,
                    "width": width,
                    "height": height,
                },
                number_of_colors=number_of_colors,
            )
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Brand colour verification failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Brand colour consistency "
                "verification completed successfully."
            ),
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(
            packaging_path,
            logo_path,
        )
@app.post("/detect-and-verify-brand-colours")
async def detect_and_verify_brand_colours_endpoint(
    packaging: UploadFile = File(...),
    official_logo: UploadFile = File(...),
    threshold: float = Form(0.60),
    number_of_colors: int = Form(4),
):
    packaging_path = None
    logo_path = None

    try:
        packaging_extension = validate_image_extension(
            packaging.filename,
            "Packaging image",
        )

        logo_extension = validate_image_extension(
            official_logo.filename,
            "Official logo",
        )

        if threshold < 0 or threshold > 1:
            raise HTTPException(
                status_code=400,
                detail="Threshold must be between 0 and 1.",
            )

        if number_of_colors < 2 or number_of_colors > 8:
            raise HTTPException(
                status_code=400,
                detail="Number of colours must be between 2 and 8.",
            )

        packaging_path = create_temp_path(
            packaging_extension
        )

        logo_path = create_temp_path(
            logo_extension
        )

        save_upload_file(
            packaging,
            packaging_path,
        )

        save_upload_file(
            official_logo,
            logo_path,
        )

        detection = detect_logo_bbox(
            packaging_path=packaging_path,
            logo_template_path=logo_path,
            threshold=threshold,
        )

        if not detection.get("success"):
            raise HTTPException(
                status_code=400,
                detail=detection.get(
                    "message",
                    "Logo detection failed.",
                ),
            )

        if not detection.get("detected"):
            return {
                "success": True,
                "message": "Official logo was not detected in the packaging.",
                "data": {
                    "logo_detection": detection,
                    "brand_colour_consistency": None,
                },
            }

        bbox = detection.get("bbox")

        if not bbox:
            raise HTTPException(
                status_code=400,
                detail="Logo bounding box was not generated.",
            )

        colour_result = verify_brand_color_consistency(
            official_logo_path=logo_path,
            packaging_path=packaging_path,
            logo_bbox={
                "x": int(bbox["x"]),
                "y": int(bbox["y"]),
                "width": int(bbox["width"]),
                "height": int(bbox["height"]),
            },
            number_of_colors=number_of_colors,
        )

        if not colour_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=colour_result.get(
                    "message",
                    "Brand colour consistency verification failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Logo detected and brand colour consistency "
                "verified successfully."
            ),
            "data": {
                "logo_detection": detection,
                "brand_colour_consistency": colour_result,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(
            packaging_path,
            logo_path,
        )
@app.post("/extract-brand-profile")
async def extract_brand_profile_endpoint(
    official_logo: UploadFile = File(...),
):
    logo_path = None

    try:
        logo_extension = validate_image_extension(
            official_logo.filename,
            "Official logo",
        )

        logo_path = create_temp_path(
            logo_extension
        )

        save_upload_file(
            official_logo,
            logo_path,
        )

        result = build_brand_profile(
            logo_path=logo_path,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Brand profile extraction failed.",
                ),
            )

        return {
            "success": True,
            "message": (
                "Brand profile extracted successfully."
            ),
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:
        remove_temp_files(logo_path)
@app.post("/extract-regulation-requirements")
async def extract_regulation_requirements_endpoint(
    document: UploadFile = File(...),
):
    extension = Path(document.filename or "").suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX documents are supported.")
    document_path = create_temp_path(extension)
    try:
        save_upload_file(document, document_path)
        result = extract_regulation_requirements(document_path)
        return {"success": True, "message": "Regulation requirements extracted successfully.", "data": result}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    finally:
        remove_temp_files(document_path)


@app.post("/verify-logo-identity")
async def verify_logo_identity_endpoint(
    packaging: UploadFile = File(...),
    official_logo: UploadFile = File(...),
    x: int = Form(...), y: int = Form(...), width: int = Form(...), height: int = Form(...),
    text_score: float = Form(0),
):
    packaging_path = logo_path = None
    try:
        packaging_path = create_temp_path(validate_image_extension(packaging.filename, "Packaging image"))
        logo_path = create_temp_path(validate_image_extension(official_logo.filename, "Official logo"))
        save_upload_file(packaging, packaging_path); save_upload_file(official_logo, logo_path)
        result = verify_logo_identity(packaging_path, logo_path, {"x": x, "y": y, "width": width, "height": height}, text_score)
        return {"success": True, "data": result}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    finally:
        remove_temp_files(packaging_path, logo_path)
