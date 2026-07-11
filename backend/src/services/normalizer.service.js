const normalizeText = (text = "") => {
  return text
    .replace(/\s+/g, " ")
    .replace(/[|]/g, "I")
    .trim();
};

const extractDate = (text) => {
  const patterns = [
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
};

const extractPhone = (text) => {
  const match = text.match(/(?:\+250|250|0)?\s?7[2389]\d[\s\-]?\d{3}[\s\-]?\d{3}/);
  return match ? match[0] : null;
};

const extractNetWeight = (text) => {
  const match = text.match(/\b\d+(\.\d+)?\s?(g|kg|ml|l|litre|liter)\b/i);
  return match ? match[0] : null;
};

const extractBatchNumber = (text) => {
  const match = text.match(/\b(batch|lot|bch|bn)[:\s\-]*[a-z0-9\-\/]+\b/i);
  return match ? match[0] : null;
};

const extractBarcode = (text) => {
  const match = text.match(/\b\d{8,14}\b/);
  return match ? match[0] : null;
};

const extractCountryOfOrigin = (text) => {
  const countries = ["rwanda", "kenya", "uganda", "tanzania", "usa", "united states"];
  const lower = text.toLowerCase();

  for (const country of countries) {
    if (lower.includes(country)) return country;
  }

  return null;
};

const extractStorageInstructions = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes("store in")) {
    const match = text.match(/store in.{0,80}/i);
    return match ? match[0] : "Storage instructions detected";
  }

  return null;
};

const normalizeOcrToAssets = (ocrText = "", upload = {}, aiResult = {}) => {
  const text = normalizeText(ocrText);

  const phone = extractPhone(text);
  const date = extractDate(text);
  const netWeight = extractNetWeight(text);
  const batch = extractBatchNumber(text);
  const barcode = aiResult.assets?.barcode?.value || extractBarcode(text);
  const qrCode = aiResult.assets?.qr_code?.value || null;
  const country = extractCountryOfOrigin(text);
  const storage = extractStorageInstructions(text);

  return [
    {
      asset_type: "ocr_text",
      detected_value: text || null,
      confidence: text ? 90 : 0,
      status: text ? "detected" : "missing",
    },
    {
      asset_type: "product_name",
      detected_value: upload.product_name || null,
      confidence: upload.product_name ? 90 : 0,
      status: upload.product_name ? "detected" : "missing",
    },
    {
      asset_type: "manufacturer_address",
      detected_value: phone,
      confidence: phone ? 80 : 0,
      status: phone ? "detected" : "missing",
    },
    {
      asset_type: "expiry_date",
      detected_value: date,
      confidence: date ? 80 : 0,
      status: date ? "detected" : "missing",
    },
    {
      asset_type: "net_weight",
      detected_value: netWeight,
      confidence: netWeight ? 80 : 0,
      status: netWeight ? "detected" : "missing",
    },
    {
      asset_type: "batch_number",
      detected_value: batch,
      confidence: batch ? 80 : 0,
      status: batch ? "detected" : "missing",
    },
    {
      asset_type: "barcode",
      detected_value: barcode,
      confidence: barcode ? 90 : 0,
      status: barcode ? "detected" : "missing",
    },
    {
      asset_type: "qr_code",
      detected_value: qrCode,
      confidence: qrCode ? 90 : 0,
      status: qrCode ? "detected" : "missing",
    },
    {
      asset_type: "country_of_origin",
      detected_value: country,
      confidence: country ? 80 : 0,
      status: country ? "detected" : "missing",
    },
    {
      asset_type: "storage_instructions",
      detected_value: storage,
      confidence: storage ? 80 : 0,
      status: storage ? "detected" : "missing",
    },
  ];
};

module.exports = {
  normalizeOcrToAssets,
};