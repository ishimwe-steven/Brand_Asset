const Upload = require("../models/upload.model");
const Verification = require("../models/verification.model");
const Suggestion = require("../models/suggestion.model");

const {
  runVerification,
} = require("../services/verification.service");

const {
  success,
  error,
} = require("../utils/response");

/**
 * Start packaging verification
 * POST /api/verifications/start
 */
exports.startVerification = async (req, res) => {
  try {
    const { upload_id } = req.body;

    if (!upload_id) {
      return error(
        res,
        "Upload ID is required",
        400
      );
    }

    if (
      Number.isNaN(Number(upload_id)) ||
      Number(upload_id) <= 0
    ) {
      return error(
        res,
        "Invalid upload ID",
        400
      );
    }

    const upload = await Upload.getById(
      Number(upload_id)
    );

    if (!upload) {
      return error(
        res,
        "Packaging upload not found",
        404
      );
    }

    /*
     * Admin can verify every upload.
     * SME/designer can verify only uploads
     * created using their own account.
     */
    if (
      req.user.role !== "admin" &&
      Number(upload.user_id) !== Number(req.user.id)
    ) {
      return error(
        res,
        "You are not allowed to verify this packaging upload",
        403
      );
    }

    /*
     * Every new packaging upload must be linked
     * to an official company brand.
     */
    if (!upload.brand_id) {
      return error(
        res,
        "This packaging upload is not linked to a brand",
        400
      );
    }

    if (!upload.official_logo_path) {
      return error(
        res,
        "The selected brand does not have an official logo",
        400
      );
    }

    const result = await runVerification(
      upload
    );

    return success(
      res,
      "Verification completed successfully",
      result,
      201
    );
  } catch (err) {
    console.error(
      "START VERIFICATION ERROR:",
      err
    );

    return error(
      res,
      "Verification failed",
      500,
      err.message
    );
  }
};

/**
 * Get one verification result
 * GET /api/verifications/:id
 */
exports.getVerification = async (req, res) => {
  try {
    const verificationId = Number(
      req.params.id
    );

    if (
      Number.isNaN(verificationId) ||
      verificationId <= 0
    ) {
      return error(
        res,
        "Invalid verification ID",
        400
      );
    }

    const result =
      await Verification.getById(
        verificationId
      );

    if (!result) {
      return error(
        res,
        "Verification result not found",
        404
      );
    }

    /*
     * This assumes Verification.getById()
     * returns user_id from packaging_uploads.
     */
    if (
      req.user.role !== "admin" &&
      result.user_id &&
      Number(result.user_id) !== Number(req.user.id)
    ) {
      return error(
        res,
        "You are not allowed to view this verification result",
        403
      );
    }

    const issues =
      await Verification.getIssuesByResult(
        verificationId
      );

    const suggestions =
      await Suggestion.getByResultId(
        verificationId
      );

    return success(
      res,
      "Verification result fetched successfully",
      {
        ...result,
        issues,
        suggestions,
      }
    );
  } catch (err) {
    console.error(
      "GET VERIFICATION ERROR:",
      err
    );

    return error(
      res,
      "Failed to fetch verification result",
      500,
      err.message
    );
  }
};

/**
 * Get verification history
 * GET /api/verifications/history
 */
exports.getHistory = async (req, res) => {
  try {
    let history = [];

    if (req.user.role === "admin") {
      history =
        await Verification.getAllHistory();
    } else {
      history =
        await Verification.getHistoryByUser(
          req.user.id
        );
    }

    return success(
      res,
      "Verification history fetched successfully",
      history
    );
  } catch (err) {
    console.error(
      "GET VERIFICATION HISTORY ERROR:",
      err
    );

    return error(
      res,
      "Failed to fetch verification history",
      500,
      err.message
    );
  }
};