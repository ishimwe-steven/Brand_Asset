const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const BrandAsset = require("../models/brandAsset.model");
const { success, error } = require("../utils/response");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

exports.verifyLogoQuality = async (req, res) => {
  try {
    const uploadId = Number(req.params.uploadId);

    if (!uploadId || Number.isNaN(uploadId)) {
      return error(res, "Valid upload ID is required", 400);
    }

    const upload = await BrandAsset.getUploadById(uploadId);

    if (!upload) {
      return error(res, "Packaging upload not found", 404);
    }

    if (!upload.file_path) {
      return error(res, "Packaging file path is missing", 400);
    }

    const cleanFilePath = upload.file_path.replace(/^[/\\]+/, "");

    const absoluteFilePath = path.join(
      __dirname,
      "..",
      cleanFilePath
    );

    if (!fs.existsSync(absoluteFilePath)) {
      return error(
        res,
        "Uploaded packaging file was not found on the server",
        404,
        absoluteFilePath
      );
    }

    const formData = new FormData();

    formData.append(
      "file",
      fs.createReadStream(absoluteFilePath),
      {
        filename: path.basename(absoluteFilePath),
      }
    );

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/verify-logo-quality`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );

    const aiResult = aiResponse.data?.data;

    if (!aiResult?.success) {
      return error(res, "Logo quality verification failed", 400);
    }

    await BrandAsset.saveCheck({
      upload_id: uploadId,
      asset_type: aiResult.asset_type,
      status: aiResult.status,
      score: aiResult.score,
      detected_value: JSON.stringify(aiResult.details || {}),
      issues: aiResult.issues,
      recommendation: aiResult.recommendation,
    });

    return success(
      res,
      "Logo quality verification completed and saved successfully",
      {
        upload_id: uploadId,
        brand_asset_check: aiResult,
      }
    );
  } catch (err) {
    console.error("LOGO QUALITY ERROR:", err.response?.data || err.message);

    if (err.code === "ECONNREFUSED") {
      return error(
        res,
        "AI service is not running on port 8000",
        503
      );
    }

    return error(
      res,
      "Failed to verify logo quality",
      500,
      err.response?.data || err.message
    );
  }
};

exports.getBrandAssetChecks = async (req, res) => {
  try {
    const uploadId = Number(req.params.uploadId);

    if (!uploadId || Number.isNaN(uploadId)) {
      return error(res, "Valid upload ID is required", 400);
    }

    const checks = await BrandAsset.getByUploadId(uploadId);

    return success(
      res,
      "Brand asset checks fetched successfully",
      checks
    );
  } catch (err) {
    return error(
      res,
      "Failed to fetch brand asset checks",
      500,
      err.message
    );
  }
};
exports.verifyLogoPlacement = async (req, res) => {
  try {
    const uploadId = Number(req.params.uploadId);

    if (!uploadId || Number.isNaN(uploadId)) {
      return error(res, "Valid upload ID is required", 400);
    }

    const {
      x,
      y,
      width,
      height,
      preferred_positions = "top_left,top_center",
    } = req.body;

    const bboxValues = [x, y, width, height].map(Number);

    if (bboxValues.some((value) => Number.isNaN(value))) {
      return error(
        res,
        "x, y, width and height are required numeric values",
        400
      );
    }

    const upload = await BrandAsset.getUploadById(uploadId);

    if (!upload) {
      return error(res, "Packaging upload not found", 404);
    }

    const cleanFilePath = upload.file_path.replace(/^[/\\]+/, "");

    const absoluteFilePath = path.join(
      __dirname,
      "..",
      cleanFilePath
    );

    if (!fs.existsSync(absoluteFilePath)) {
      return error(
        res,
        "Uploaded packaging file was not found",
        404
      );
    }

    const formData = new FormData();

    formData.append(
      "file",
      fs.createReadStream(absoluteFilePath),
      {
        filename: path.basename(absoluteFilePath),
      }
    );

    formData.append("x", String(Number(x)));
    formData.append("y", String(Number(y)));
    formData.append("width", String(Number(width)));
    formData.append("height", String(Number(height)));
    formData.append(
      "preferred_positions",
      preferred_positions
    );

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/verify-logo-placement`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );

    const aiResult = aiResponse.data?.data;

    if (!aiResult?.success) {
      return error(
        res,
        "Logo placement verification failed",
        400
      );
    }

    await BrandAsset.saveCheck({
      upload_id: uploadId,
      asset_type: aiResult.asset_type,
      status: aiResult.status,
      score: aiResult.score,
      detected_value: JSON.stringify(aiResult.details || {}),
      issues: aiResult.issues,
      recommendation: aiResult.recommendation,
    });

    return success(
      res,
      "Logo placement verification completed and saved successfully",
      {
        upload_id: uploadId,
        brand_asset_check: aiResult,
      }
    );
  } catch (err) {
    console.error(
      "LOGO PLACEMENT ERROR:",
      err.response?.data || err.message
    );

    return error(
      res,
      "Failed to verify logo placement",
      500,
      err.response?.data || err.message
    );
  }
};
exports.detectAndVerifyLogoPlacement = async (req, res) => {
  try {
    const uploadId = Number(req.params.uploadId);

    if (!uploadId || Number.isNaN(uploadId)) {
      return error(res, "Valid upload ID is required", 400);
    }

    if (!req.file) {
      return error(res, "Reference logo file is required", 400);
    }

    const upload = await BrandAsset.getUploadById(uploadId);

    if (!upload) {
      return error(res, "Packaging upload not found", 404);
    }

    const cleanPackagingPath = upload.file_path.replace(/^[/\\]+/, "");

    const packagingPath = path.join(
      __dirname,
      "..",
      cleanPackagingPath
    );

    if (!fs.existsSync(packagingPath)) {
      return error(
        res,
        "Packaging image was not found on the server",
        404
      );
    }

    const referenceLogoPath = req.file.path;

    if (!fs.existsSync(referenceLogoPath)) {
      return error(res, "Reference logo file was not found", 404);
    }

    const formData = new FormData();

    formData.append(
      "packaging",
      fs.createReadStream(packagingPath),
      {
        filename: path.basename(packagingPath),
      }
    );

    formData.append(
      "reference_logo",
      fs.createReadStream(referenceLogoPath),
      {
        filename: path.basename(referenceLogoPath),
      }
    );

    formData.append(
      "threshold",
      String(req.body.threshold || 0.60)
    );

    formData.append(
      "preferred_positions",
      req.body.preferred_positions || "top_left,top_center"
    );

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/detect-and-verify-logo-placement`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );

    const aiData = aiResponse.data?.data;

    if (!aiData) {
      return error(res, "Invalid response from AI service", 500);
    }

    const detection = aiData.logo_detection;
    const placement = aiData.logo_placement;

    if (!detection?.detected) {
      return success(
        res,
        "Reference logo was not detected in the packaging",
        {
          upload_id: uploadId,
          logo_detection: detection,
          logo_placement: null,
        }
      );
    }

    if (!placement?.success) {
      return error(
        res,
        "Logo was detected but placement verification failed",
        400
      );
    }

    await BrandAsset.saveCheck({
      upload_id: uploadId,
      asset_type: placement.asset_type,
      status: placement.status,
      score: placement.score,
      detected_value: JSON.stringify({
        detection,
        placement: placement.details,
      }),
      issues: placement.issues,
      recommendation: placement.recommendation,
    });

    return success(
      res,
      "Logo detected, placement verified and result saved successfully",
      {
        upload_id: uploadId,
        logo_detection: detection,
        logo_placement: placement,
      }
    );
  } catch (err) {
    console.error(
      "AUTO LOGO PLACEMENT ERROR:",
      err.response?.data || err.message
    );

    return error(
      res,
      "Failed to detect and verify logo placement",
      500,
      err.response?.data || err.message
    );
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};
exports.detectAndVerifyBrandColours = async (req, res) => {
  try {
    const uploadId = Number(req.params.uploadId);

    if (!uploadId || Number.isNaN(uploadId)) {
      return error(res, "Valid upload ID is required", 400);
    }

    if (!req.file) {
      return error(res, "Official logo file is required", 400);
    }

    const upload = await BrandAsset.getUploadById(uploadId);

    if (!upload) {
      return error(res, "Packaging upload not found", 404);
    }

    if (!upload.file_path) {
      return error(res, "Packaging file path is missing", 400);
    }

    const cleanPackagingPath = String(upload.file_path)
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    const packagingPath = path.resolve(
      __dirname,
      "..",
      cleanPackagingPath
    );

    const officialLogoPath = req.file.path;

    if (!fs.existsSync(packagingPath)) {
      return error(
        res,
        "Packaging image was not found on the server",
        404
      );
    }

    if (!fs.existsSync(officialLogoPath)) {
      return error(
        res,
        "Official logo image was not found on the server",
        404
      );
    }

    const threshold = Number(req.body.threshold ?? 0.6);
    const numberOfColors = Number(
      req.body.number_of_colors ?? 4
    );

    if (
      Number.isNaN(threshold) ||
      threshold < 0 ||
      threshold > 1
    ) {
      return error(
        res,
        "Threshold must be between 0 and 1",
        400
      );
    }

    if (
      Number.isNaN(numberOfColors) ||
      numberOfColors < 2 ||
      numberOfColors > 8
    ) {
      return error(
        res,
        "Number of colours must be between 2 and 8",
        400
      );
    }

    const formData = new FormData();

    formData.append(
      "packaging",
      fs.createReadStream(packagingPath),
      {
        filename: path.basename(packagingPath),
      }
    );

    formData.append(
      "official_logo",
      fs.createReadStream(officialLogoPath),
      {
        filename: path.basename(officialLogoPath),
      }
    );

    formData.append("threshold", String(threshold));

    formData.append(
      "number_of_colors",
      String(numberOfColors)
    );

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/detect-and-verify-brand-colours`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );

    const aiData = aiResponse.data?.data;

    if (!aiData) {
      return error(
        res,
        "Invalid response received from AI service",
        500
      );
    }

    const logoDetection = aiData.logo_detection;
    const colourResult =
      aiData.brand_colour_consistency;

    if (!logoDetection?.detected) {
      return success(
        res,
        "Official logo was not detected in the packaging",
        {
          upload_id: uploadId,
          logo_detection: logoDetection,
          brand_colour_consistency: null,
        }
      );
    }

    if (!colourResult?.success) {
      return error(
        res,
        "Logo was detected but colour verification failed",
        400
      );
    }

    await BrandAsset.saveCheck({
      upload_id: uploadId,
      asset_type: colourResult.asset_type,
      status: colourResult.status,
      score: colourResult.score,
      detected_value: JSON.stringify({
        logo_detection: logoDetection,
        colour_details: colourResult.details,
      }),
      issues: colourResult.issues,
      recommendation: colourResult.recommendation,
    });

    return success(
      res,
      "Brand colour verification completed and saved successfully",
      {
        upload_id: uploadId,
        logo_detection: logoDetection,
        brand_colour_consistency: colourResult,
      }
    );
  } catch (err) {
    console.error(
      "BRAND COLOUR VERIFICATION ERROR:",
      err.response?.data || err.message
    );

    if (err.code === "ECONNREFUSED") {
      return error(
        res,
        "AI service is not running on port 8000",
        503
      );
    }

    return error(
      res,
      "Failed to verify brand colour consistency",
      500,
      err.response?.data || err.message
    );
  } finally {
    if (
      req.file?.path &&
      fs.existsSync(req.file.path)
    ) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error(
          "OFFICIAL LOGO CLEANUP ERROR:",
          cleanupError.message
        );
      }
    }
  }
};