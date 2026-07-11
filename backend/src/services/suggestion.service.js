const positionMap = {
  barcode: "Bottom-right area of the back label",
  qr_code: "Bottom-left area or side panel",
  expiry_date: "Near batch number or lower back label",
  batch_number: "Near expiry date on the back label",
  manufacturer_address: "Lower back label section",
  net_weight: "Front label, below product name",
  country_of_origin: "Back label near manufacturer details",
  storage_instructions: "Back label below ingredients",
  ingredients: "Back label middle section",
  nutrition_information: "Back label in a clear table format",
  certification_mark: "Front or back label near brand assets",
  logo: "Top-center or top-left front label",
};

const suggestionMap = {
  barcode: "Add a clear and readable barcode with enough white space around it.",
  qr_code: "Add a readable QR code for traceability or product information.",
  expiry_date: "Add expiry date using a clear format such as EXP: DD/MM/YYYY.",
  batch_number: "Add batch number using a clear format such as BATCH: 001.",
  manufacturer_address: "Add manufacturer name, physical address, country, and phone number.",
  net_weight: "Add net weight clearly, for example: Net Weight: 500g.",
  country_of_origin: "Add country of origin, for example: Product of Rwanda.",
  storage_instructions: "Add storage instruction such as: Store in a cool dry place.",
  ingredients: "Add the list of ingredients clearly on the back label.",
  nutrition_information: "Add nutrition information in a readable table.",
  certification_mark: "Add required certification or quality mark where applicable.",
  logo: "Make sure the logo is visible and consistently positioned.",
};

const generateSuggestionsFromIssues = (issues = []) => {
  return issues.map((issue) => {
    const assetType = issue.rule_name || issue.asset_type || "general";
    const cleanType = assetType.toLowerCase().replace(/\s+/g, "_");

    return {
      asset_type: cleanType,
      problem: issue.issue_description,
      suggestion:
        suggestionMap[cleanType] ||
        issue.recommendation ||
        "Review this packaging element and correct it according to the regulation.",
      recommended_position:
        positionMap[cleanType] || "Place it clearly in a visible area of the packaging.",
    };
  });
};

module.exports = {
  generateSuggestionsFromIssues,
};