export const assetLabels = {
  logo_detection: "Logo Detection", logo_placement: "Logo Position",
  brand_colour_consistency: "Brand Colour Consistency", product_name: "Product Name",
  qr_code: "QR Code", barcode: "Barcode", country_of_origin: "Country of Origin",
  storage_instructions: "Storage Instructions", batch_number: "Batch Number",
  net_weight: "Net Weight", expiry_date: "Expiry Date",
  manufacturer_address: "Manufacturer Address", ocr_text: "Extracted Text",
};

const parseValue = (value) => {
  if (!value || typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};

export const friendlyStatus = (status) => ({
  detected: "Detected", passed: "Compliant", warning: "Warning",
  failed: "Not compliant", missing: "Not found",
}[status] || status || "Not found");

export const formatAssetResult = (asset) => {
  const value = parseValue(asset.detected_value);
  if (!value || value === "N/A") return { result: "Not found", details: "—" };
  if (typeof value !== "object") return { result: String(value), details: "" };

  const status = value.status || asset.status;
  const score = value.score ?? value.confidence ?? value.consistency_score;
  let details = value.message || value.recommendation || "";

  if (asset.asset_type === "logo_placement") {
    const position = value.position || value.detected_position || value.placement;
    if (position) details = `Position: ${String(position).replaceAll("_", " ")}${details ? `. ${details}` : ""}`;
  }

  if (asset.asset_type === "brand_colour_consistency") {
    const colours = value.details?.detected_colours || value.detected_colours || [];
    const palette = colours.map((colour) => colour.hex).filter(Boolean).join(", ");
    if (palette) details = `Detected palette: ${palette}${details ? `. ${details}` : ""}`;
  }

  return { result: `${friendlyStatus(status)}${score != null ? ` (${Number(score).toFixed(1)}%)` : ""}`, details };
};
