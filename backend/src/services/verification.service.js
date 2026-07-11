const Regulation = require("../models/regulation.model");
const Verification = require("../models/verification.model");
const Upload = require("../models/upload.model");
const { analyzePackaging } = require("./ai.service");
const { normalizeOcrToAssets } = require("./normalizer.service");
const Suggestion = require("../models/suggestion.model");
const { generateSuggestionsFromIssues } = require("./suggestion.service");

const normalizeRuleName = (ruleName = "") => {
  return ruleName
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

const convertAssetsToMap = (assets = []) => {
  const map = {};

  assets.forEach((asset) => {
    map[asset.asset_type] = {
      detected: asset.status === "detected",
      value: asset.detected_value,
      confidence: asset.confidence,
      status: asset.status,
    };
  });

  return map;
};

exports.runVerification = async (upload) => {
  await Upload.clearDetectedAssets(upload.id);

  const aiResponse = await analyzePackaging(upload);

  if (!aiResponse || aiResponse.success !== true) {
    throw new Error("AI service failed to analyze packaging");
  }

  const aiAssets = normalizeOcrToAssets(
    aiResponse.ocr_text || "",
    upload,
    aiResponse
  );

  for (const asset of aiAssets) {
    await Upload.saveDetectedAsset({
      upload_id: upload.id,
      ...asset,
    });
  }

  const detectedAssets = await Upload.getDetectedAssets(upload.id);
  const detectedMap = convertAssetsToMap(detectedAssets);

  const regulations = await Regulation.getByMarketAndCategory(
    upload.market_id,
    upload.category_id
  );

  const totalRules = regulations.length;
  let passedRules = 0;
  let failedRules = 0;
  const issues = [];

  for (const rule of regulations) {
    const key = normalizeRuleName(rule.rule_name);
    const detected = detectedMap[key];

    if (detected && detected.detected) {
      passedRules++;
    } else {
      failedRules++;

      issues.push({
        regulation_id: rule.id,
        issue_type: "missing",
        issue_description: `${rule.rule_name} is missing or not detected.`,
        recommendation:
          rule.recommendation ||
          `Please add or clearly display ${rule.rule_name} on the packaging.`,
        severity: rule.mandatory ? "high" : "medium",
      });
    }
  }

  const complianceScore =
    totalRules > 0 ? Number(((passedRules / totalRules) * 100).toFixed(2)) : 0;

  let exportStatus = "not_ready";

  if (complianceScore >= 80) exportStatus = "ready";
  else if (complianceScore >= 50) exportStatus = "needs_correction";

  const summary = `Verification completed. ${passedRules} rules passed and ${failedRules} rules failed.`;

  const resultId = await Verification.createResult({
    upload_id: upload.id,
    total_rules: totalRules,
    passed_rules: passedRules,
    failed_rules: failedRules,
    compliance_score: complianceScore,
    export_status: exportStatus,
    summary,
  });

  for (const issue of issues) {
    await Verification.createIssue({
      result_id: resultId,
      ...issue,
    });
  }
  await Suggestion.deleteByResultId(resultId);

const suggestions = generateSuggestionsFromIssues(
  issues.map((issue) => ({
    ...issue,
    rule_name:
      regulations.find((r) => r.id === issue.regulation_id)?.rule_name ||
      "general",
  }))
);

for (const suggestion of suggestions) {
  await Suggestion.create({
    result_id: resultId,
    ...suggestion,
  });
}

  return {
    result_id: resultId,
    upload_id: upload.id,
    ai_result: aiResponse,
    detected_assets: detectedAssets,
    total_rules: totalRules,
    passed_rules: passedRules,
    failed_rules: failedRules,
    compliance_score: complianceScore,
    export_status: exportStatus,
    summary,
    issues,
    suggestions,
  };
};