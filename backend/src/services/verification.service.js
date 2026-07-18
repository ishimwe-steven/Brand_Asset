const Regulation = require("../models/regulation.model");
const Verification = require("../models/verification.model");
const Upload = require("../models/upload.model");
const Suggestion = require("../models/suggestion.model");

const {
  analyzePackaging,
  detectLogoBBox,
  verifyLogoPlacement,
  verifyBrandColourConsistency,
  verifyLogoIdentity,
} = require("./ai.service");

const findBrandCandidate = (analysis, brandName) => {
  const words = String(brandName || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const detections = (analysis?.detected_text || []).filter((item) => {
    const text = String(item.text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
    return words.some((word) => text.includes(word));
  });
  const anchorWord = words[0];
  const anchor = detections.find((item) => String(item.text).toLowerCase().includes(anchorWord));
  if (!anchor) return null;
  const anchorCenterX = (anchor.bbox[0][0] + anchor.bbox[2][0]) / 2;
  const anchorY = anchor.bbox[0][1];
  const group = detections.filter((item) => {
    const centerX = (item.bbox[0][0] + item.bbox[2][0]) / 2;
    return Math.abs(item.bbox[0][1] - anchorY) < 140 && Math.abs(centerX - anchorCenterX) < 190;
  });
  const matchedWords = words.filter((word) => group.some((item) => String(item.text).toLowerCase().includes(word)));
  if (!matchedWords.length) return null;
  const xs = group.flatMap((item) => item.bbox.map((point) => point[0]));
  const ys = group.flatMap((item) => item.bbox.map((point) => point[1]));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const textWidth = maxX - minX, textHeight = Math.max(20, maxY - minY);
  return {
    bbox: {
      x: Math.max(0, Math.round(minX - textWidth * 0.18)),
      y: Math.max(0, Math.round(minY - textHeight * 1.8)),
      width: Math.round(textWidth * 1.36),
      height: Math.round(textHeight * 3.3),
    },
    textScore: Number(((matchedWords.length / words.length) * 100).toFixed(2)),
  };
};

const {
  normalizeOcrToAssets,
} = require("./normalizer.service");

const {
  generateSuggestionsFromIssues,
} = require("./suggestion.service");

/**
 * Converts regulation names into keys matching detected asset types.
 *
 * Example:
 * "Expiry Date Required" => "expiry_date"
 */
const normalizeRuleName = (ruleName = "") => {
  return String(ruleName)
    .toLowerCase()
    .replace(/required/g, "")
    .replace(/must be included/g, "")
    .replace(/must appear/g, "")
    .replace(/must exist/g, "")
    .replace(/must be present/g, "")
    .replace(/must be shown/g, "")
    .replace(/must be readable/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
};

/**
 * Converts database detected assets into an object map.
 */
const convertAssetsToMap = (assets = []) => {
  const map = {};

  for (const asset of assets) {
    map[asset.asset_type] = {
      detected: asset.status === "detected",
      value: asset.detected_value,
      confidence: asset.confidence,
      status: asset.status,
    };
  }

  return map;
};

/**
 * Safely converts different confidence formats into a number.
 */
const normalizeConfidence = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number(numericValue.toFixed(2));
};

/**
 * Converts objects to a database-safe JSON string.
 */
const stringifyValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Determines whether an AI result passed.
 */
const checkPassed = (result) => {
  if (!result) {
    return false;
  }

  if (typeof result.passed === "boolean") {
    return result.passed;
  }

  if (typeof result.detected === "boolean") {
    return result.detected;
  }

  const status = String(
    result.status || result.result || ""
  ).toLowerCase();

  return [
    "passed",
    "pass",
    "detected",
    "compliant",
    "consistent",
    "acceptable",
    "good",
  ].includes(status);
};

/**
 * A warning result is usable, but requires correction.
 */
const checkWarning = (result) => {
  if (!result) {
    return false;
  }

  const status = String(
    result.status || result.result || ""
  ).toLowerCase();

  return [
    "warning",
    "needs_correction",
    "needs correction",
    "partially_compliant",
  ].includes(status);
};

/**
 * Reads preferred logo positions stored as JSON,
 * an array, or a comma-separated string.
 */
const parsePreferredPositions = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      const positions = value
        .split(",")
        .map((position) => position.trim())
        .filter(Boolean);

      if (positions.length > 0) {
        return positions;
      }
    }
  }

  return ["top_left", "top_center"];
};

/**
 * Saves one AI brand asset result in detected_assets.
 */
const saveBrandAssetResult = async ({
  uploadId,
  assetType,
  result,
  detected,
  confidence,
  status,
}) => {
  await Upload.saveDetectedAsset({
    upload_id: uploadId,
    asset_type: assetType,
    detected_value: stringifyValue(result),
    confidence: normalizeConfidence(confidence),
    status:
      status ||
      (detected ? "detected" : "missing"),
  });
};

/**
 * Produces one standard brand check object.
 */
const createBrandCheck = ({
  name,
  passed,
  warning = false,
  score = null,
  message,
  data = null,
}) => {
  let status = "failed";

  if (passed) {
    status = "passed";
  } else if (warning) {
    status = "warning";
  }

  return {
    name,
    passed,
    warning,
    status,
    score: normalizeConfidence(score),
    message,
    data,
  };
};

/**
 * Runs OCR, barcode and QR analysis.
 */
const runContentAnalysis = async (upload) => {
  const aiResponse = await analyzePackaging(upload);

  if (!aiResponse || aiResponse.success !== true) {
    throw new Error(
      "AI service failed to analyze the packaging."
    );
  }

  const normalizedAssets = normalizeOcrToAssets(
    aiResponse.ocr_text || "",
    upload,
    aiResponse
  );

  for (const asset of normalizedAssets) {
    await Upload.saveDetectedAsset({
      upload_id: upload.id,
      ...asset,
    });
  }

  return {
    aiResponse,
    normalizedAssets,
  };
};

/**
 * Runs automatic logo detection, logo placement,
 * and brand colour consistency verification.
 */
const runBrandAssetVerification = async (upload, contentAnalysis = {}) => {
  const brandChecks = [];
  const brandIssues = [];

  const preferredPositions = parsePreferredPositions(
    upload.preferred_logo_positions
  );

  if (!upload.official_logo_path) {
    const missingLogoCheck = createBrandCheck({
      name: "official_logo_reference",
      passed: false,
      message:
        "The selected brand does not have an official logo reference.",
    });

    brandChecks.push(missingLogoCheck);

    brandIssues.push({
      issue_type: "brand_reference_missing",
      issue_description:
        "The selected brand does not have an official logo reference.",
      recommendation:
        "The SME must upload an official brand logo before packaging verification.",
      severity: "high",
    });

    return {
      brandChecks,
      brandIssues,
      logoDetection: null,
      logoPlacement: null,
      colourConsistency: null,
    };
  }

  /*
   * Step 1: Find the official logo inside the packaging.
   */
  const detectionResponse = await detectLogoBBox(upload, {
    threshold: 0.6,
  });

  let logoDetection =
    detectionResponse?.data || null;

  if (!logoDetection?.detected) {
    const candidate = findBrandCandidate(contentAnalysis, upload.brand_name);
    if (candidate) {
      const identityResponse = await verifyLogoIdentity(upload, candidate.bbox, candidate.textScore);
      if (identityResponse?.data) logoDetection = identityResponse.data;
    }
  }

  const logoDetected =
    logoDetection?.detected === true;

  const normalizedOcr = String(contentAnalysis.ocr_text || "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const brandWords = String(upload.brand_name || "")
    .toLowerCase().match(/[a-z0-9]+/g) || [];
  const textMatched = brandWords.length > 0 && brandWords.every((word) => normalizedOcr.includes(word));
  const visualEvidenceScore = Math.min(100, Number(logoDetection?.inlier_matches || 0) * 5);
  const textEvidenceScore = textMatched ? 100 : 0;
  const identityScore = Number(((visualEvidenceScore * 0.45 + textEvidenceScore * 0.25) / 0.70).toFixed(2));
  const partialLogoMatch =
    !logoDetected && textMatched && Number(logoDetection?.inlier_matches || 0) >= 12;

  if (logoDetection) {
    logoDetection.identity_evidence = {
      visual_feature_score: visualEvidenceScore,
      brand_text_score: textEvidenceScore,
      available_evidence_score: identityScore,
      exact_geometry_match: logoDetected,
    };
  }

  const detectionConfidence =
    logoDetection?.confidence || 0;

  const detectionCheck = createBrandCheck({
    name: "logo_detection",
    passed: logoDetected,
    warning: partialLogoMatch,
    score: logoDetected ? detectionConfidence : partialLogoMatch ? identityScore : detectionConfidence,
    message:
      (partialLogoMatch
        ? "A strong partial brand-logo match was found, but the complete official artwork differs."
        : logoDetection?.message) ||
      (logoDetected
        ? "Official logo detected successfully."
        : "Official logo was not detected."),
    data: logoDetection,
  });

  brandChecks.push(detectionCheck);

  await saveBrandAssetResult({
    uploadId: upload.id,
    assetType: "logo_detection",
    result: logoDetection,
    detected: logoDetected || partialLogoMatch,
    confidence: logoDetected ? detectionConfidence : partialLogoMatch ? identityScore : detectionConfidence,
    status: logoDetected ? "detected" : partialLogoMatch ? "warning" : "missing",
  });

  if (!logoDetected || !logoDetection?.bbox) {
    const strongPartialEvidence = partialLogoMatch;
    brandIssues.push({
      issue_type: strongPartialEvidence ? "logo_mismatch" : "logo_missing",
      issue_description: strongPartialEvidence
        ? "Related brand artwork was found, but the complete official logo could not be matched reliably."
        : "The official brand logo was not detected reliably on the packaging.",
      recommendation: strongPartialEvidence
        ? "Use the complete approved official logo without removing its border, tagline or other visual elements."
        : "Add the official logo clearly and avoid changing its shape, text or visual elements.",
      severity: strongPartialEvidence ? "medium" : "high",
    });

    return {
      brandChecks,
      brandIssues,
      logoDetection,
      logoPlacement: null,
      colourConsistency: null,
    };
  }

  const bbox = logoDetection.bbox;

  /*
   * Step 2 and 3 run after the bounding box is available.
   */
  const [
    placementResponse,
    colourResponse,
  ] = await Promise.all([
    verifyLogoPlacement(upload, bbox, {
      preferredPositions,
    }),

    verifyBrandColourConsistency(upload, bbox, {
      numberOfColors: 4,
    }),
  ]);

  const logoPlacement =
    placementResponse?.data || null;

  const colourConsistency =
    colourResponse?.data || null;

  /*
   * Logo placement check.
   */
  const placementPassed = checkPassed(
    logoPlacement
  );

  const placementWarning = checkWarning(
    logoPlacement
  );

  const placementScore =
    logoPlacement?.score ??
    logoPlacement?.placement_score ??
    logoPlacement?.overall_score ??
    null;

  brandChecks.push(
    createBrandCheck({
      name: "logo_placement",
      passed: placementPassed,
      warning: placementWarning,
      score: placementScore,
      message:
        logoPlacement?.message ||
        (placementPassed
          ? "Logo placement is acceptable."
          : "Logo placement requires correction."),
      data: logoPlacement,
    })
  );

  await saveBrandAssetResult({
    uploadId: upload.id,
    assetType: "logo_placement",
    result: logoPlacement,
    detected:
      placementPassed || placementWarning,
    confidence: placementScore,
    status: placementPassed
      ? "detected"
      : placementWarning
        ? "warning"
        : "failed",
  });

  if (!placementPassed) {
    brandIssues.push({
      issue_type: "incorrect_logo_placement",
      issue_description:
        logoPlacement?.message ||
        "The logo is not placed in an approved brand position.",
      recommendation:
        logoPlacement?.recommendation ||
        "Move the logo to one of the preferred positions and maintain safe margins.",
      severity: placementWarning
        ? "medium"
        : "high",
    });
  }

  /*
   * Brand colour consistency check.
   */
  const colourPassed = checkPassed(
    colourConsistency
  );

  const colourWarning = checkWarning(
    colourConsistency
  );

  const colourScore =
    colourConsistency?.score ??
    colourConsistency?.consistency_score ??
    colourConsistency?.overall_score ??
    null;

  brandChecks.push(
    createBrandCheck({
      name: "brand_colour_consistency",
      passed: colourPassed,
      warning: colourWarning,
      score: colourScore,
      message:
        colourConsistency?.message ||
        (colourPassed
          ? "Brand colours are consistent."
          : "Brand colours require correction."),
      data: colourConsistency,
    })
  );

  await saveBrandAssetResult({
    uploadId: upload.id,
    assetType: "brand_colour_consistency",
    result: colourConsistency,
    detected:
      colourPassed || colourWarning,
    confidence: colourScore,
    status: colourPassed
      ? "detected"
      : colourWarning
        ? "warning"
        : "failed",
  });

  if (!colourPassed) {
    brandIssues.push({
      issue_type: "brand_colour_mismatch",
      issue_description:
        colourConsistency?.message ||
        "Packaging logo colours do not sufficiently match the official brand logo.",
      recommendation:
        colourConsistency?.recommendation ||
        "Use the official brand colour values extracted from the registered logo.",
      severity: colourWarning
        ? "medium"
        : "high",
    });
  }

  return {
    brandChecks,
    brandIssues,
    logoDetection,
    logoPlacement,
    colourConsistency,
  };
};

/**
 * Checks detected content against market regulations.
 */
const runRegulationVerification = async (
  upload,
  detectedAssets
) => {
  const detectedMap =
    convertAssetsToMap(detectedAssets);

  const regulations =
    await Regulation.getByMarketAndCategory(
      upload.market_id,
      upload.category_id
    );

  let passedRules = 0;
  let failedRules = 0;
  const mandatoryRules = regulations.filter((rule) => Boolean(rule.mandatory));

  const regulationIssues = [];
  const ruleResults = [];

  for (const rule of regulations) {
    const key = normalizeRuleName(
      rule.rule_name
    );

    const detected = detectedMap[key];

    const passed =
      Boolean(detected) &&
      detected.detected === true;

    if (passed && rule.mandatory) {
      passedRules++;
    } else if (!passed && rule.mandatory) {
      failedRules++;

      regulationIssues.push({
        regulation_id: rule.id,
        issue_type: "missing",
        issue_description:
          `${rule.rule_name} is missing or was not detected.`,
        recommendation:
          rule.recommendation ||
          `Please add or clearly display ${rule.rule_name} on the packaging.`,
        severity: "high",
      });
    }

    ruleResults.push({
      regulation_id: rule.id,
      rule_name: rule.rule_name,
      asset_key: key,
      mandatory: Boolean(rule.mandatory),
      passed,
      detected_asset: detected || null,
    });
  }

  return {
    regulations,
    ruleResults,
    regulationIssues,
    totalRules: mandatoryRules.length,
    passedRules,
    failedRules,
  };
};

/**
 * Main packaging verification function.
 */
exports.runVerification = async (upload) => {
  /*
   * Remove old detected assets before rerunning verification.
   */
  await Upload.clearDetectedAssets(upload.id);

  /*
   * OCR, barcode and QR.
   */
  const {
    aiResponse,
    normalizedAssets,
  } = await runContentAnalysis(upload);

  /*
   * Official logo, placement and colours.
   */
  const brandVerification =
    await runBrandAssetVerification(upload, aiResponse);

  /*
   * Fetch all stored detected assets after AI checks.
   */
  const detectedAssets =
    await Upload.getDetectedAssets(upload.id);

  /*
   * Verify packaging content against regulations.
   */
  const regulationVerification =
    await runRegulationVerification(
      upload,
      detectedAssets
    );

  const {
    regulations,
    ruleResults,
    regulationIssues,
    totalRules,
    passedRules,
    failedRules,
  } = regulationVerification;

  /*
   * Regulation score.
   */
  const regulatoryScore =
    totalRules > 0
      ? Number(
          (
            (passedRules / totalRules) *
            100
          ).toFixed(2)
        )
      : 0;

  /*
   * Brand asset score.
   *
   * Passed = 100
   * Warning = 50
   * Failed = 0
   */
  const brandChecks =
    brandVerification.brandChecks;

  const brandPoints =
    brandChecks.reduce(
      (total, check) => {
        if (check.passed) {
          return total + 100;
        }

        if (check.warning) {
          return total + 50;
        }

        return total;
      },
      0
    );

  const brandScore =
    brandChecks.length > 0
      ? Number(
          (
            brandPoints /
            brandChecks.length
          ).toFixed(2)
        )
      : 0;

  /*
   * Overall score:
   * 70% regulations
   * 30% brand assets
   */
  const complianceScore = Number(
    (
      regulatoryScore * 0.7 +
      brandScore * 0.3
    ).toFixed(2)
  );

  const logoWasDetected =
    brandVerification.logoDetection
      ?.detected === true;

  const hasFailedBrandCheck = brandChecks.some(
    (check) => !check.passed && !check.warning
  );

  let exportStatus = "not_ready";

  if (
    complianceScore >= 80 &&
    logoWasDetected &&
    !hasFailedBrandCheck
  ) {
    exportStatus = "ready";
  } else if (complianceScore >= 50) {
    exportStatus =
      "needs_correction";
  }

  const summary =
    `Verification completed. ` +
    `${passedRules} of ${totalRules} regulatory rules passed. ` +
    `Regulation score: ${regulatoryScore}%. ` +
    `Brand asset score: ${brandScore}%. ` +
    `Overall compliance score: ${complianceScore}%.`;

  /*
   * Save summary result.
   */
  const resultId =
    await Verification.createResult({
      upload_id: upload.id,
      total_rules: totalRules,
      passed_rules: passedRules,
      failed_rules: failedRules,
      compliance_score: complianceScore,
      export_status: exportStatus,
      summary,
    });

  /*
   * Current compliance_issues table is linked to regulations.
   * Therefore only regulation issues are stored there.
   * Brand issues are returned separately to the frontend.
   */
  for (const issue of regulationIssues) {
    await Verification.createIssue({
      result_id: resultId,
      ...issue,
    });
  }

  /*
   * Generate correction suggestions from all issues.
   */
  await Suggestion.deleteByResultId(
    resultId
  );

  const issuesForSuggestions = [
    ...regulationIssues.map(
      (issue) => ({
        ...issue,
        rule_name:
          regulations.find(
            (regulation) =>
              regulation.id ===
              issue.regulation_id
          )?.rule_name ||
          "general",
      })
    ),

    ...brandVerification.brandIssues.map(
      (issue) => ({
        ...issue,
        rule_name: issue.issue_type,
      })
    ),
  ];

  const suggestions =
    generateSuggestionsFromIssues(
      issuesForSuggestions
    );

  for (const suggestion of suggestions) {
    await Suggestion.create({
      result_id: resultId,
      ...suggestion,
    });
  }

  return {
    verification_id: resultId,
    result_id: resultId,
    upload_id: upload.id,

    brand: {
      brand_id: upload.brand_id,
      brand_name: upload.brand_name,
      official_logo_path:
        upload.official_logo_path,
    },

    scores: {
      regulatory_score:
        regulatoryScore,
      brand_asset_score: brandScore,
      overall_compliance_score:
        complianceScore,
    },

    total_rules: totalRules,
    passed_rules: passedRules,
    failed_rules: failedRules,

    compliance_score:
      complianceScore,

    export_status:
      exportStatus,

    summary,

    ai_result: {
      content_analysis: aiResponse,
      logo_detection:
        brandVerification.logoDetection,
      logo_placement:
        brandVerification.logoPlacement,
      brand_colour_consistency:
        brandVerification.colourConsistency,
    },

    normalized_assets:
      normalizedAssets,

    detected_assets:
      detectedAssets,

    brand_checks:
      brandChecks,

    rule_results:
      ruleResults,

    issues: {
      regulation_issues:
        regulationIssues,
      brand_asset_issues:
        brandVerification.brandIssues,
      all: [
        ...regulationIssues,
        ...brandVerification.brandIssues,
      ],
    },

    suggestions,
  };
};
