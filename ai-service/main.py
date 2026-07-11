from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import numpy as np
from PIL import Image
import io
import cv2
from pyzbar.pyzbar import decode

app = FastAPI(title="Brand Asset AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reader = easyocr.Reader(["en"], gpu=False)

def convert_bbox(bbox):
    return [[float(point[0]), float(point[1])] for point in bbox]

def detect_barcodes_and_qr(img_np):
    decoded_objects = decode(img_np)

    barcode = None
    qr_code = None

    for obj in decoded_objects:
        data = obj.data.decode("utf-8", errors="ignore")
        obj_type = obj.type

        item = {
            "type": obj_type,
            "value": data,
            "rect": {
                "left": int(obj.rect.left),
                "top": int(obj.rect.top),
                "width": int(obj.rect.width),
                "height": int(obj.rect.height),
            }
        }

        if obj_type == "QRCODE":
            qr_code = item
        else:
            barcode = item

    return barcode, qr_code

@app.get("/")
def home():
    return {"message": "AI Service is running"}

@app.post("/analyze")
async def analyze_packaging(file: UploadFile = File(...)):
    contents = await file.read()

    image = Image.open(io.BytesIO(contents)).convert("RGB")
    img_np = np.array(image)

    results = reader.readtext(img_np)

    detected_text = []
    full_text = ""

    for bbox, text, confidence in results:
        detected_text.append({
            "text": str(text),
            "confidence": round(float(confidence) * 100, 2),
            "bbox": convert_bbox(bbox)
        })
        full_text += str(text) + " "

    barcode, qr_code = detect_barcodes_and_qr(img_np)

    return {
        "success": True,
        "ocr_text": full_text.strip(),
        "detected_text": detected_text,
        "assets": {
            "barcode": barcode,
            "qr_code": qr_code
        }
    }