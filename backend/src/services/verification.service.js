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

const {
  normalizeOcrToAssets,
} = require("./normalizer.service");

const {
  generateSuggestionsFromIssues,
} = require("./suggestion.service");

/**
 * Safely converts a value to a number.
 */
const toNumber = (
  value,
  fallback = null
) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

/**
 * Unwraps nested Gradio/Hugging Face responses.
 *
 * Supported structures:
 *
 * {
 *   data: {...}
 * }
 *
 * {
 *   data: {
 *     data: {...}
 *   }
 * }
 *
 * {
 *   success: true,
 *   data: {...}
 * }
 */
const unwrapAiPayload = (response) => {
  let payload = response;

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    if (
      payload &&
      typeof payload === "object" &&
      payload.data !== undefined &&
      payload.data !== payload
    ) {
      payload = payload.data;
      continue;
    }

    break;
  }

  return payload;
};

/**
 * Extracts a logo-detection result from
 * different AI response formats.
 */
const extractLogoDetectionResult = (
  response
) => {
  const payload =
    unwrapAiPayload(response);

  if (!payload) {
    return null;
  }

  return (
    payload.logo_detection ||
    payload.detection ||
    payload.detection_result ||
    payload.result?.logo_detection ||
    payload.result?.detection ||
    payload
  );
};

/**
 * Extracts a logo-placement result.
 *
 * Hugging Face can return:
 *
 * {
 *   logo_detection: {...},
 *   logo_placement: {...}
 * }
 */
const extractPlacementResult = (
  response
) => {
  const payload =
    unwrapAiPayload(response);

  if (!payload) {
    return null;
  }

  return (
    payload.logo_placement ||
    payload.placement ||
    payload.placement_result ||
    payload.result?.logo_placement ||
    payload.result?.placement ||
    payload
  );
};

/**
 * Extracts brand-colour verification result.
 */
const extractColourResult = (
  response
) => {
  const payload =
    unwrapAiPayload(response);

  if (!payload) {
    return null;
  }

  return (
    payload.brand_colour_consistency ||
    payload.brand_color_consistency ||
    payload.colour_consistency ||
    payload.color_consistency ||
    payload.colour_result ||
    payload.color_result ||
    payload.result
      ?.brand_colour_consistency ||
    payload.result
      ?.brand_color_consistency ||
    payload
  );
};

/**
 * Extracts a useful score from different
 * AI response structures.
 */
const extractResultScore = (
  result
) => {
  if (!result) {
    return null;
  }

  const possibleScores = [
    result.score,
    result.confidence,
    result.overall_score,
    result.placement_score,
    result.consistency_score,
    result.colour_score,
    result.color_score,
    result.similarity_score,
    result.match_score,
    result.percentage,
  ];

  for (const value of possibleScores) {
    const numericValue =
      toNumber(value);

    if (numericValue !== null) {
      /*
       * Convert 0–1 scores into percentages.
       */
      if (
        numericValue >= 0 &&
        numericValue <= 1
      ) {
        return Number(
          (
            numericValue * 100
          ).toFixed(2)
        );
      }

      return Number(
        numericValue.toFixed(2)
      );
    }
  }

  return null;
};

/**
 * Finds a possible logo region using
 * OCR-detected brand text.
 */
const findBrandCandidate = (
  analysis,
  brandName
) => {
  const words =
    String(brandName || "")
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [];

  if (words.length === 0) {
    return null;
  }

  const detections = (
    analysis?.detected_text || []
  ).filter((item) => {
    const text = String(
      item?.text || ""
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      );

    return words.some(
      (word) =>
        text.includes(word)
    );
  });

  const anchorWord =
    words[0];

  const anchor =
    detections.find((item) =>
      String(item?.text || "")
        .toLowerCase()
        .includes(anchorWord)
    );

  if (
    !anchor ||
    !Array.isArray(anchor.bbox) ||
    anchor.bbox.length < 3
  ) {
    return null;
  }

  const anchorCenterX =
    (
      anchor.bbox[0][0] +
      anchor.bbox[2][0]
    ) / 2;

  const anchorY =
    anchor.bbox[0][1];

  const group =
    detections.filter((item) => {
      if (
        !Array.isArray(item.bbox) ||
        item.bbox.length < 3
      ) {
        return false;
      }

      const centerX =
        (
          item.bbox[0][0] +
          item.bbox[2][0]
        ) / 2;

      return (
        Math.abs(
          item.bbox[0][1] -
          anchorY
        ) < 160 &&
        Math.abs(
          centerX -
          anchorCenterX
        ) < 220
      );
    });

  const matchedWords =
    words.filter((word) =>
      group.some((item) =>
        String(item?.text || "")
          .toLowerCase()
          .includes(word)
      )
    );

  if (
    matchedWords.length === 0
  ) {
    return null;
  }

  const xs =
    group.flatMap((item) =>
      item.bbox.map(
        (point) => point[0]
      )
    );

  const ys =
    group.flatMap((item) =>
      item.bbox.map(
        (point) => point[1]
      )
    );

  if (
    xs.length === 0 ||
    ys.length === 0
  ) {
    return null;
  }

  const minX =
    Math.min(...xs);

  const maxX =
    Math.max(...xs);

  const minY =
    Math.min(...ys);

  const maxY =
    Math.max(...ys);

  const textWidth =
    Math.max(
      30,
      maxX - minX
    );

  const textHeight =
    Math.max(
      20,
      maxY - minY
    );

  return {
    bbox: {
      x: Math.max(
        0,
        Math.round(
          minX -
          textWidth * 0.25
        )
      ),

      y: Math.max(
        0,
        Math.round(
          minY -
          textHeight * 2
        )
      ),

      width: Math.round(
        textWidth * 1.5
      ),

      height: Math.round(
        textHeight * 3.8
      ),
    },

    textScore: Number(
      (
        (
          matchedWords.length /
          words.length
        ) * 100
      ).toFixed(2)
    ),
  };
};

/**
 * Converts regulation names into keys matching
 * detected asset types.
 *
 * Example:
 * "Expiry Date Required" => "expiry_date"
 */
const normalizeRuleName = (
  ruleName = ""
) => {
  return String(ruleName)
    .toLowerCase()
    .replace(
      /required/g,
      ""
    )
    .replace(
      /must be included/g,
      ""
    )
    .replace(
      /must appear/g,
      ""
    )
    .replace(
      /must exist/g,
      ""
    )
    .replace(
      /must be present/g,
      ""
    )
    .replace(
      /must be shown/g,
      ""
    )
    .replace(
      /must be readable/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    )
    .trim();
};

/**
 * Converts database detected assets
 * into an object map.
 */
const convertAssetsToMap = (
  assets = []
) => {
  const map = {};

  for (const asset of assets) {
    map[asset.asset_type] = {
      detected:
        asset.status ===
        "detected",

      value:
        asset.detected_value,

      confidence:
        asset.confidence,

      status:
        asset.status,
    };
  }

  return map;
};

/**
 * Safely converts confidence values.
 */
const normalizeConfidence = (
  value
) => {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return null;
  }

  return Number(
    numericValue.toFixed(2)
  );
};

/**
 * Converts objects to database-safe JSON.
 */
const stringifyValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
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
 *
 * It supports:
 * - passed: true
 * - detected: true
 * - compliant: true
 * - consistent: true
 * - status strings
 * - score thresholds
 */
const checkPassed = (
  result,
  options = {}
) => {
  if (!result) {
    return false;
  }

  const {
    minimumScore = 60,
  } = options;

  if (
    typeof result.passed ===
    "boolean"
  ) {
    return result.passed;
  }

  if (
    typeof result.detected ===
    "boolean"
  ) {
    return result.detected;
  }

  if (
    typeof result.compliant ===
    "boolean"
  ) {
    return result.compliant;
  }

  if (
    typeof result.consistent ===
    "boolean"
  ) {
    return result.consistent;
  }

  if (
    typeof result.acceptable ===
    "boolean"
  ) {
    return result.acceptable;
  }

  if (
    typeof result.correct ===
    "boolean"
  ) {
    return result.correct;
  }

  const status = String(
    result.status ||
    result.result ||
    result.verdict ||
    ""
  )
    .trim()
    .toLowerCase();

  if (
    [
      "passed",
      "pass",
      "detected",
      "compliant",
      "consistent",
      "acceptable",
      "good",
      "correct",
      "matched",
      "match",
      "valid",
      "approved",
    ].includes(status)
  ) {
    return true;
  }

  if (
    [
      "failed",
      "fail",
      "missing",
      "inconsistent",
      "incorrect",
      "invalid",
      "not_detected",
      "not detected",
      "not_matched",
      "not matched",
      "mismatch",
    ].includes(status)
  ) {
    return false;
  }

  const score =
    extractResultScore(result);

  if (score !== null) {
    return score >= minimumScore;
  }

  return false;
};

/**
 * A warning result is usable,
 * but requires correction.
 */
const checkWarning = (
  result,
  options = {}
) => {
  if (!result) {
    return false;
  }

  const {
    minimumWarningScore = 35,
    passingScore = 60,
  } = options;

  const status = String(
    result.status ||
    result.result ||
    result.verdict ||
    ""
  )
    .trim()
    .toLowerCase();

  if (
    [
      "warning",
      "unclear",
      "needs_correction",
      "needs correction",
      "partially_compliant",
      "partially compliant",
      "partial_match",
      "partial match",
      "moderate",
    ].includes(status)
  ) {
    return true;
  }

  const score =
    extractResultScore(result);

  return (
    score !== null &&
    score >= minimumWarningScore &&
    score < passingScore
  );
};

/**
 * Reads preferred logo positions stored
 * as JSON, an array, or CSV.
 */
const parsePreferredPositions = (
  value
) => {
  if (
    Array.isArray(value) &&
    value.length > 0
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    try {
      const parsed =
        JSON.parse(value);

      if (
        Array.isArray(parsed) &&
        parsed.length > 0
      ) {
        return parsed;
      }
    } catch {
      const positions =
        value
          .split(",")
          .map(
            (position) =>
              position.trim()
          )
          .filter(Boolean);

      if (
        positions.length > 0
      ) {
        return positions;
      }
    }
  }

  return [
    "top_left",
    "top_center",
  ];
};

/**
 * Saves one AI brand asset result.
 */
const saveBrandAssetResult =
  async ({
    uploadId,
    assetType,
    result,
    detected,
    confidence,
    status,
  }) => {
    const allowedStatuses = [
      "detected",
      "missing",
      "unclear",
    ];

    const safeStatus =
      allowedStatuses.includes(status)
        ? status
        : detected
          ? "detected"
          : "missing";

    await Upload.saveDetectedAsset({
      upload_id: uploadId,

      asset_type:
        assetType,

      detected_value:
        stringifyValue(result),

      confidence:
        normalizeConfidence(
          confidence
        ),

      status:
        safeStatus,
    });
  };

/**
 * Produces one standard brand check.
 */
const createBrandCheck = ({
  name,
  passed,
  warning = false,
  score = null,
  message,
  data = null,
}) => {
  let status =
    "failed";

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

    score:
      normalizeConfidence(score),

    message,
    data,
  };
};

/**
 * Runs OCR, barcode and QR analysis.
 */
const runContentAnalysis =
  async (upload) => {
    const aiResponse =
      await analyzePackaging(
        upload
      );

    if (
      !aiResponse ||
      aiResponse.success !== true
    ) {
      throw new Error(
        aiResponse?.message ||
        "AI service failed to analyze the packaging."
      );
    }

    const normalizedAssets =
      normalizeOcrToAssets(
        aiResponse.ocr_text ||
        "",
        upload,
        aiResponse
      );

    for (
      const asset of
      normalizedAssets
    ) {
      await Upload.saveDetectedAsset({
        upload_id:
          upload.id,

        ...asset,
      });
    }

    return {
      aiResponse,
      normalizedAssets,
    };
  };

/**
 * Runs:
 * - logo detection
 * - logo identity
 * - logo placement
 * - brand colour consistency
 */
const runBrandAssetVerification =
  async (
    upload,
    contentAnalysis = {}
  ) => {
    const brandChecks = [];
    const brandIssues = [];

    const preferredPositions =
      parsePreferredPositions(
        upload
          .preferred_logo_positions
      );

    if (
      !upload.official_logo_path
    ) {
      const missingLogoCheck =
        createBrandCheck({
          name:
            "official_logo_reference",

          passed:
            false,

          message:
            "The selected brand does not have an official logo reference.",
        });

      brandChecks.push(
        missingLogoCheck
      );

      brandIssues.push({
        issue_type:
          "brand_reference_missing",

        issue_description:
          "The selected brand does not have an official logo reference.",

        recommendation:
          "The SME must upload an official brand logo before packaging verification.",

        severity:
          "high",
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
     * Use a more tolerant threshold because the logo
     * displayed on packaging is normally smaller than
     * the uploaded official logo.
     */
    const detectionResponse =
      await detectLogoBBox(
        upload,
        {
          threshold: 0.35,
        }
      );

    console.log(
      "LOGO DETECTION RAW RESPONSE:",
      JSON.stringify(
        detectionResponse
      )
    );

    let logoDetection =
      extractLogoDetectionResult(
        detectionResponse
      );

    console.log(
      "NORMALIZED LOGO DETECTION:",
      JSON.stringify(
        logoDetection
      )
    );

    /*
     * If standard visual matching fails,
     * use OCR text to identify a possible logo region,
     * then run multimodal logo identity verification.
     */
    if (
      !logoDetection?.detected
    ) {
      const candidate =
        findBrandCandidate(
          contentAnalysis,
          upload.brand_name
        );

      if (candidate) {
        console.log(
          "OCR BRAND CANDIDATE:",
          JSON.stringify(
            candidate
          )
        );

        const identityResponse =
          await verifyLogoIdentity(
            upload,
            candidate.bbox,
            candidate.textScore
          );

        console.log(
          "LOGO IDENTITY RAW RESPONSE:",
          JSON.stringify(
            identityResponse
          )
        );

        const identityResult =
          extractLogoDetectionResult(
            identityResponse
          );

        if (identityResult) {
          logoDetection =
            identityResult;
        }
      }
    }

    const logoDetected =
      logoDetection?.detected ===
      true;

    const normalizedOcr =
      String(
        contentAnalysis.ocr_text ||
        ""
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        );

    const brandWords =
      String(
        upload.brand_name ||
        ""
      )
        .toLowerCase()
        .match(/[a-z0-9]+/g) ||
      [];

    const matchedBrandWords =
      brandWords.filter(
        (word) =>
          normalizedOcr.includes(
            word
          )
      );

    const textMatched =
      brandWords.length > 0 &&
      matchedBrandWords.length ===
        brandWords.length;

    const partialTextMatch =
      brandWords.length > 0 &&
      matchedBrandWords.length > 0;

    const inlierMatches =
      Number(
        logoDetection
          ?.inlier_matches ||
        0
      );

    const visualEvidenceScore =
      Math.min(
        100,
        inlierMatches * 5
      );

    const textEvidenceScore =
      brandWords.length > 0
        ? Number(
            (
              (
                matchedBrandWords.length /
                brandWords.length
              ) * 100
            ).toFixed(2)
          )
        : 0;

    const identityScore =
      Number(
        (
          (
            visualEvidenceScore *
              0.6 +
            textEvidenceScore *
              0.4
          )
        ).toFixed(2)
      );

    const partialLogoMatch =
      !logoDetected &&
      partialTextMatch &&
      (
        inlierMatches >= 8 ||
        textEvidenceScore >= 50
      );

    if (
      logoDetection &&
      typeof logoDetection ===
        "object"
    ) {
      logoDetection
        .identity_evidence = {
          visual_feature_score:
            visualEvidenceScore,

          brand_text_score:
            textEvidenceScore,

          available_evidence_score:
            identityScore,

          exact_geometry_match:
            logoDetected,

          matched_brand_words:
            matchedBrandWords,

          expected_brand_words:
            brandWords,
        };
    }

    const detectionConfidence =
      extractResultScore(
        logoDetection
      ) ??
      (
        logoDetected
          ? 100
          : identityScore
      );

    const detectionPassed =
      logoDetected ||
      (
        textMatched &&
        identityScore >= 60
      );

    const detectionWarning =
      !detectionPassed &&
      partialLogoMatch;

    const detectionCheck =
      createBrandCheck({
        name:
          "logo_detection",

        passed:
          detectionPassed,

        warning:
          detectionWarning,

        score:
          detectionPassed
            ? Math.max(
                detectionConfidence ||
                  0,
                identityScore
              )
            : detectionWarning
              ? identityScore
              : detectionConfidence,

        message:
          detectionPassed
            ? (
                logoDetection
                  ?.message ||
                "Official brand logo was detected successfully."
              )
            : detectionWarning
              ? "Related brand artwork and brand text were detected, but the complete official logo match was uncertain."
              : (
                  logoDetection
                    ?.message ||
                  "Official logo was not detected."
                ),

        data:
          logoDetection,
      });

    brandChecks.push(
      detectionCheck
    );

    await saveBrandAssetResult({
      uploadId:
        upload.id,

      assetType:
        "logo_detection",

      result:
        logoDetection,

      detected:
        detectionPassed ||
        detectionWarning,

      confidence:
        detectionCheck.score,

      status:
        detectionPassed
          ? "detected"
          : detectionWarning
            ? "unclear"
            : "missing",
    });

    /*
     * A bounding box is required for placement
     * and colour analysis.
     */
    if (
      !logoDetection?.bbox
    ) {
      brandIssues.push({
        issue_type:
          detectionWarning
            ? "logo_mismatch"
            : "logo_missing",

        issue_description:
          detectionWarning
            ? "Related brand artwork was found, but the complete official logo could not be matched reliably."
            : "The official brand logo was not detected reliably on the packaging.",

        recommendation:
          detectionWarning
            ? "Use the complete approved official logo without removing its border, tagline or visual elements."
            : "Add the official logo clearly and avoid changing its shape, text or visual elements.",

        severity:
          detectionWarning
            ? "medium"
            : "high",
      });

      return {
        brandChecks,
        brandIssues,
        logoDetection,
        logoPlacement:
          null,

        colourConsistency:
          null,
      };
    }

    const bbox =
      logoDetection.bbox;

    /*
     * Placement and colours are both evaluated.
     */
    const [
      placementResponse,
      colourResponse,
    ] = await Promise.all([
      verifyLogoPlacement(
        upload,
        bbox,
        {
          preferredPositions,
          threshold: 0.35,
        }
      ),

      verifyBrandColourConsistency(
        upload,
        bbox,
        {
          numberOfColors: 4,
          threshold: 0.35,
        }
      ),
    ]);

    console.log(
      "LOGO PLACEMENT RAW RESPONSE:",
      JSON.stringify(
        placementResponse
      )
    );

    console.log(
      "BRAND COLOUR RAW RESPONSE:",
      JSON.stringify(
        colourResponse
      )
    );

    const logoPlacement =
      extractPlacementResult(
        placementResponse
      );

    const colourConsistency =
      extractColourResult(
        colourResponse
      );

    console.log(
      "NORMALIZED LOGO PLACEMENT:",
      JSON.stringify(
        logoPlacement
      )
    );

    console.log(
      "NORMALIZED BRAND COLOURS:",
      JSON.stringify(
        colourConsistency
      )
    );

    /*
     * Logo placement check.
     */
    const placementScore =
      extractResultScore(
        logoPlacement
      );

    const placementPassed =
      checkPassed(
        logoPlacement,
        {
          minimumScore: 55,
        }
      );

    const placementWarning =
      !placementPassed &&
      checkWarning(
        logoPlacement,
        {
          minimumWarningScore:
            30,

          passingScore:
            55,
        }
      );

    brandChecks.push(
      createBrandCheck({
        name:
          "logo_placement",

        passed:
          placementPassed,

        warning:
          placementWarning,

        score:
          placementScore,

        message:
          logoPlacement?.message ||
          (
            placementPassed
              ? "Logo placement is acceptable."
              : placementWarning
                ? "Logo placement is usable but requires minor correction."
                : "Logo placement requires correction."
          ),

        data:
          logoPlacement,
      })
    );

    await saveBrandAssetResult({
      uploadId:
        upload.id,

      assetType:
        "logo_placement",

      result:
        logoPlacement,

      detected:
        placementPassed ||
        placementWarning,

      confidence:
        placementScore,

      status:
        placementPassed
          ? "detected"
          : placementWarning
            ? "unclear"
            : "missing",
    });

    if (!placementPassed) {
      brandIssues.push({
        issue_type:
          "incorrect_logo_placement",

        issue_description:
          logoPlacement?.message ||
          "The logo is not placed in an approved brand position.",

        recommendation:
          logoPlacement
            ?.recommendation ||
          "Move the logo to one of the preferred positions and maintain safe margins.",

        severity:
          placementWarning
            ? "medium"
            : "high",
      });
    }

    /*
     * Brand-colour consistency check.
     */
    const colourScore =
      extractResultScore(
        colourConsistency
      );

    const colourPassed =
      checkPassed(
        colourConsistency,
        {
          minimumScore: 55,
        }
      );

    const colourWarning =
      !colourPassed &&
      checkWarning(
        colourConsistency,
        {
          minimumWarningScore:
            30,

          passingScore:
            55,
        }
      );

    brandChecks.push(
      createBrandCheck({
        name:
          "brand_colour_consistency",

        passed:
          colourPassed,

        warning:
          colourWarning,

        score:
          colourScore,

        message:
          colourConsistency?.message ||
          (
            colourPassed
              ? "Brand colours are consistent."
              : colourWarning
                ? "Brand colours are partly consistent and require minor correction."
                : "Brand colours require correction."
          ),

        data:
          colourConsistency,
      })
    );

    await saveBrandAssetResult({
      uploadId:
        upload.id,

      assetType:
        "brand_colour_consistency",

      result:
        colourConsistency,

      detected:
        colourPassed ||
        colourWarning,

      confidence:
        colourScore,

      status:
        colourPassed
          ? "detected"
          : colourWarning
            ? "unclear"
            : "missing",
    });

    if (!colourPassed) {
      brandIssues.push({
        issue_type:
          "brand_colour_mismatch",

        issue_description:
          colourConsistency
            ?.message ||
          "Packaging logo colours do not sufficiently match the official brand logo.",

        recommendation:
          colourConsistency
            ?.recommendation ||
          "Use the official brand colour values extracted from the registered logo.",

        severity:
          colourWarning
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
 * Checks detected content against
 * market regulations.
 */
const runRegulationVerification =
  async (
    upload,
    detectedAssets
  ) => {
    const detectedMap =
      convertAssetsToMap(
        detectedAssets
      );

    const regulations =
      await Regulation
        .getByMarketAndCategory(
          upload.market_id,
          upload.category_id
        );

    let passedRules = 0;
    let failedRules = 0;

    const mandatoryRules =
      regulations.filter(
        (rule) =>
          Boolean(
            rule.mandatory
          )
      );

    const regulationIssues = [];
    const ruleResults = [];

    for (
      const rule of regulations
    ) {
      const key =
        normalizeRuleName(
          rule.rule_name
        );

      const detected =
        detectedMap[key];

      const passed =
        Boolean(detected) &&
        detected.detected ===
          true;

      if (
        passed &&
        rule.mandatory
      ) {
        passedRules += 1;
      } else if (
        !passed &&
        rule.mandatory
      ) {
        failedRules += 1;

        regulationIssues.push({
          regulation_id:
            rule.id,

          issue_type:
            "missing",

          issue_description:
            `${rule.rule_name} is missing or was not detected.`,

          recommendation:
            rule.recommendation ||
            `Please add or clearly display ${rule.rule_name} on the packaging.`,

          severity:
            "high",
        });
      }

      ruleResults.push({
        regulation_id:
          rule.id,

        rule_name:
          rule.rule_name,

        asset_key:
          key,

        mandatory:
          Boolean(
            rule.mandatory
          ),

        passed,

        detected_asset:
          detected || null,
      });
    }

    return {
      regulations,
      ruleResults,
      regulationIssues,

      totalRules:
        mandatoryRules.length,

      passedRules,
      failedRules,
    };
  };

/**
 * Main packaging verification function.
 */
exports.runVerification =
  async (upload) => {
    /*
     * Remove previous detected assets.
     */
    await Upload.clearDetectedAssets(
      upload.id
    );

    /*
     * OCR, barcode and QR analysis.
     */
    const {
      aiResponse,
      normalizedAssets,
    } =
      await runContentAnalysis(
        upload
      );

    /*
     * Official logo, placement and colours.
     */
    const brandVerification =
      await runBrandAssetVerification(
        upload,
        aiResponse
      );

    /*
     * Load stored detected assets.
     */
    const detectedAssets =
      await Upload.getDetectedAssets(
        upload.id
      );

    /*
     * Regulatory verification.
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
    } =
      regulationVerification;

    /*
     * Regulation score.
     */
    const regulatoryScore =
      totalRules > 0
        ? Number(
            (
              (
                passedRules /
                totalRules
              ) * 100
            ).toFixed(2)
          )
        : 0;

    /*
     * Brand asset score:
     *
     * Passed = 100 points
     * Warning = 50 points
     * Failed = 0 points
     */
    const brandChecks =
      brandVerification
        .brandChecks;

    const brandPoints =
      brandChecks.reduce(
        (
          total,
          check
        ) => {
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
     * - regulations: 70%
     * - brand assets: 30%
     */
    const complianceScore =
      Number(
        (
          regulatoryScore *
            0.7 +
          brandScore *
            0.3
        ).toFixed(2)
      );

    const logoWasDetected =
      brandChecks.some(
        (check) =>
          check.name ===
            "logo_detection" &&
          check.passed
      );

    const hasFailedBrandCheck =
      brandChecks.some(
        (check) =>
          !check.passed &&
          !check.warning
      );

    let exportStatus =
      "not_ready";

    if (
      complianceScore >= 80 &&
      logoWasDetected &&
      !hasFailedBrandCheck
    ) {
      exportStatus =
        "ready";
    } else if (
      complianceScore >= 50
    ) {
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
        upload_id:
          upload.id,

        total_rules:
          totalRules,

        passed_rules:
          passedRules,

        failed_rules:
          failedRules,

        compliance_score:
          complianceScore,

        export_status:
          exportStatus,

        summary,
      });

    /*
     * Save regulation issues.
     */
    for (
      const issue of
      regulationIssues
    ) {
      await Verification.createIssue({
        result_id:
          resultId,

        ...issue,
      });
    }

    /*
     * Generate AI correction suggestions.
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

      ...brandVerification
        .brandIssues
        .map((issue) => ({
          ...issue,

          rule_name:
            issue.issue_type,
        })),
    ];

    const suggestions =
      generateSuggestionsFromIssues(
        issuesForSuggestions
      );

    for (
      const suggestion of
      suggestions
    ) {
      await Suggestion.create({
        result_id:
          resultId,

        ...suggestion,
      });
    }

    return {
      verification_id:
        resultId,

      result_id:
        resultId,

      upload_id:
        upload.id,

      brand: {
        brand_id:
          upload.brand_id,

        brand_name:
          upload.brand_name,

        official_logo_path:
          upload
            .official_logo_path,
      },

      scores: {
        regulatory_score:
          regulatoryScore,

        brand_asset_score:
          brandScore,

        overall_compliance_score:
          complianceScore,
      },

      total_rules:
        totalRules,

      passed_rules:
        passedRules,

      failed_rules:
        failedRules,

      compliance_score:
        complianceScore,

      export_status:
        exportStatus,

      summary,

      ai_result: {
        content_analysis:
          aiResponse,

        logo_detection:
          brandVerification
            .logoDetection,

        logo_placement:
          brandVerification
            .logoPlacement,

        brand_colour_consistency:
          brandVerification
            .colourConsistency,
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
          brandVerification
            .brandIssues,

        all: [
          ...regulationIssues,
          ...brandVerification
            .brandIssues,
        ],
      },

      suggestions,
    };
  };