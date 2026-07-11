const fs = require("fs");
const path = require("path");
const Upload = require("../models/upload.model");
const { success, error } = require("../utils/response");

exports.uploadPackaging = async (req, res) => {
  try {
    const { category_id, market_id, product_name } = req.body;

    if (!req.file) {
      return error(res, "Packaging file is required", 400);
    }

    if (!category_id || !market_id) {
      return error(res, "Category and export market are required", 400);
    }

    const uploadId = await Upload.create({
      user_id: req.user.id,
      category_id,
      market_id,
      product_name,
      file_path: `/uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
    });

    return success(
      res,
      "Packaging uploaded successfully",
      {
        upload_id: uploadId,
        file: `/uploads/${req.file.filename}`,
      },
      201
    );
  } catch (err) {
    return error(res, "Failed to upload packaging", 500, err.message);
  }
};

exports.getUploads = async (req, res) => {
  try {
    let uploads;

    if (req.user.role === "admin") {
      uploads = await Upload.getAll();
    } else {
      uploads = await Upload.getAllByUser(req.user.id);
    }

    return success(res, "Uploads fetched successfully", uploads);
  } catch (err) {
    return error(res, "Failed to fetch uploads", 500, err.message);
  }
};

exports.getUpload = async (req, res) => {
  try {
    const upload = await Upload.getById(req.params.id);

    if (!upload) {
      return error(res, "Upload not found", 404);
    }

    if (req.user.role !== "admin" && upload.user_id !== req.user.id) {
      return error(res, "You are not allowed to view this upload", 403);
    }

    const detectedAssets = await Upload.getDetectedAssets(req.params.id);

return success(res, "Upload fetched successfully", {
  ...upload,
  detected_assets: detectedAssets,
});
  } catch (err) {
    return error(res, "Failed to fetch upload", 500, err.message);
  }
};

exports.deleteUpload = async (req, res) => {
  try {
    const upload = await Upload.getById(req.params.id);

    if (!upload) {
      return error(res, "Upload not found", 404);
    }

    if (req.user.role !== "admin" && upload.user_id !== req.user.id) {
      return error(res, "You are not allowed to delete this upload", 403);
    }

    const filePath = path.join(__dirname, "..", upload.file_path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Upload.delete(req.params.id);

    return success(res, "Upload deleted successfully");
  } catch (err) {
    return error(res, "Failed to delete upload", 500, err.message);
  }
};