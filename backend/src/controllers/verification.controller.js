const Upload = require("../models/upload.model");
const Verification = require("../models/verification.model");
const { runVerification } = require("../services/verification.service");
const { success, error } = require("../utils/response");
const Suggestion = require("../models/suggestion.model");
const { generateSuggestionsFromIssues } = require("../services/suggestion.service");

exports.startVerification = async (req, res) => {
  try {
    const { upload_id } = req.body;

    if (!upload_id) {
      return error(res, "Upload ID is required", 400);
    }

    const upload = await Upload.getById(upload_id);

    if (!upload) {
      return error(res, "Upload not found", 404);
    }

    if (req.user.role !== "admin" && upload.user_id !== req.user.id) {
      return error(res, "You are not allowed to verify this upload", 403);
    }

    const result = await runVerification(upload);

    return success(res, "Verification completed successfully", result, 201);
  } catch (err) {
    return error(res, "Verification failed", 500, err.message);
  }
};

exports.getVerification = async (req, res) => {
  try {
    const result = await Verification.getById(req.params.id);

    if (!result) {
      return error(res, "Verification result not found", 404);
    }

const issues = await Verification.getIssuesByResult(req.params.id);
const suggestions = await Suggestion.getByResultId(req.params.id);

return success(res, "Verification result fetched successfully", {
  ...result,
  issues,
  suggestions,
});
  } catch (err) {
    return error(res, "Failed to fetch verification result", 500, err.message);
  }
};

exports.getHistory = async (req, res) => {
  try {
    let history;

    if (req.user.role === "admin") {
      history = await Verification.getAllHistory();
    } else {
      history = await Verification.getHistoryByUser(req.user.id);
    }

    return success(res, "Verification history fetched successfully", history);
  } catch (err) {
    return error(res, "Failed to fetch verification history", 500, err.message);
  }
};