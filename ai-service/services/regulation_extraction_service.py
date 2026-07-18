import re
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET


RULE_KEYS = {
    "product name": "product_name",
    "brand name": "brand_name",
    "ingredient": "ingredients",
    "net quantity": "net_weight",
    "net weight": "net_weight",
    "country of origin": "country_of_origin",
    "manufacturer": "manufacturer_address",
    "packer": "manufacturer_address",
    "distributor": "manufacturer_address",
    "nutrition facts": "nutrition_facts",
    "lot": "batch_number",
    "batch": "batch_number",
    "best-before": "expiry_date",
    "expiry": "expiry_date",
    "storage": "storage_instructions",
    "barcode": "barcode",
    "qr code": "qr_code",
    "certification": "certification_mark",
}


def extract_docx_text(path):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    lines = []
    for paragraph in root.findall(".//w:p", namespace):
        text = "".join(
            node.text or "" for node in paragraph.findall(".//w:t", namespace)
        ).strip()
        if text:
            lines.append(text)
    return "\n".join(lines)


def extract_pdf_text(path):
    from pypdf import PdfReader
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def canonical_rule_name(heading):
    normalized = re.sub(r"[^a-z0-9 ]", " ", heading.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    for phrase, key in RULE_KEYS.items():
        if phrase in normalized:
            return key
    return None


def build_requirements(text):
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    requirements = []

    for index, line in enumerate(lines):
        heading_match = re.match(r"^(\d+(?:\.\d+)*)(?:\.)?\s+(.+)$", line)
        if not heading_match:
            continue

        section, heading = heading_match.groups()
        rule_name = canonical_rule_name(heading)
        if not rule_name:
            continue

        body = []
        for following in lines[index + 1:]:
            if re.match(r"^\d+(?:\.\d+)*(?:\.)?\s+.+$", following):
                break
            body.append(following)
            if len(" ".join(body)) >= 600:
                break

        requirement = " ".join(body).strip()
        if not requirement:
            requirement = heading if re.search(r"\b(must|shall|should|may|mandatory|required)\b", heading, re.I) else f"The packaging must clearly display {heading.lower()}."

        mandatory = not bool(re.search(r"\b(may|optional|voluntary)\b", requirement, re.I))
        requirements.append({
            "section": section,
            "title": heading,
            "rule_name": rule_name,
            "requirement": requirement,
            "mandatory": mandatory,
            "recommendation": f"Add or clearly display {heading.lower()} on the packaging.",
        })

    # Keep one authoritative rule per detectable asset.
    unique = {}
    for item in requirements:
        unique.setdefault(item["rule_name"], item)
    return list(unique.values())


def extract_regulation_requirements(document_path):
    path = Path(document_path)
    extension = path.suffix.lower()
    if extension == ".pdf":
        text = extract_pdf_text(path)
    elif extension == ".docx":
        text = extract_docx_text(path)
    else:
        raise ValueError("Only text-based PDF and DOCX documents are supported for extraction.")

    if not text.strip():
        raise ValueError("No readable text was found in the regulation document.")

    requirements = build_requirements(text)
    if not requirements:
        raise ValueError("No structured packaging requirements could be identified.")

    return {"requirements": requirements, "text_length": len(text)}
