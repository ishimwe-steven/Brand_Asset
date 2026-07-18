const normalizeText = (text = "") => {
  return text
    .replace(/\s+/g, " ")
    .replace(/[|]/g, "I")
    .trim();
};

const extractDate = (text) => {
  const labelled = text.match(/(?:best\s*before|exp(?:iry|iration)?(?:\s*date)?)[^0-9]{0,100}(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
  if (labelled) return labelled[1];
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
  const labelIndex = text.search(/net\s*(?:weight|wt)/i);
  if (labelIndex >= 0) {
    const window = text.slice(labelIndex, labelIndex + 140);
    const values = [...window.matchAll(/\b(\d+(?:\.\d+)?)\s?(g|kg|ml|l|oz|lb)\b/gi)];
    if (values.length) {
      const best = values.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      return `${best[1]} ${best[2]}`;
    }
  }
  const match = text.match(/\b\d+(\.\d+)?\s?(g|kg|ml|l|litre|liter|oz|lb)\b/i);
  return match ? match[0] : null;
};

const extractBatchNumber = (text) => {
  const labelIndex = text.search(/\b(?:batch|lot)(?:\s*\/\s*(?:batch|lot))?/i);
  if (labelIndex < 0) return null;
  const window = text.slice(labelIndex, labelIndex + 140);
  const candidates = window.match(/\b(?=[a-z0-9-]*\d)[a-z]{1,5}-\d{2,}(?:-\d+)*\b/gi);
  return candidates?.[0] || null;
};

const extractBarcode = (text) => {
  const candidates = text.match(/(?:\d[\s"'_-]*){12,14}/g) || [];
  const hasValidCheckDigit = (digits) => {
    if (![12, 13, 14].includes(digits.length)) return false;
    const body = digits.slice(0, -1).split("").reverse();
    const sum = body.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
  };
  const normalized = candidates.map((candidate) => candidate.replace(/\D/g, ""));
  const valid = normalized.find(hasValidCheckDigit);
  if (valid) return valid;
  for (const digits of normalized) if (!digits.startsWith("250") && digits.length >= 12 && digits.length <= 14) return digits;
  const match = text.match(/\b\d{8,14}\b/);
  return match ? match[0] : null;
};

const containsLabel = (text, pattern) => pattern.test(text);

const containsBrandName = (text, brandName) => {
  const haystack = text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const words = String(brandName || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.length > 0 && words.every((word) => haystack.includes(word));
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
  const ingredients = containsLabel(text, /\bingredients?\s*[:\-]/i) ? "Ingredient statement detected" : null;
  const nutritionFacts = containsLabel(text, /\bnutrition\s+facts?\b/i) ? "Nutrition Facts panel detected" : null;
  const brandName = containsBrandName(text, upload.brand_name) ? upload.brand_name : null;

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
      asset_type: "brand_name",
      detected_value: brandName,
      confidence: brandName ? 85 : 0,
      status: brandName ? "detected" : "missing",
    },
    {
      asset_type: "ingredients",
      detected_value: ingredients,
      confidence: ingredients ? 85 : 0,
      status: ingredients ? "detected" : "missing",
    },
    {
      asset_type: "nutrition_facts",
      detected_value: nutritionFacts,
      confidence: nutritionFacts ? 85 : 0,
      status: nutritionFacts ? "detected" : "missing",
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
