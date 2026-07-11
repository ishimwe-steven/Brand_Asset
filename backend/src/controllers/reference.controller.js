const fs = require("fs");
const path = require("path");
const Reference = require("../models/reference.model");
const { success, error } = require("../utils/response");

exports.createReference = async (req, res) => {
      console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  try {
    const { category_id, market_id, title, description } = req.body;

    if (!req.file) {
      return error(res, "Reference packaging file is required", 400);
    }

    if (!category_id || !market_id || !title) {
      return error(res, "Category, market and title are required", 400);
    }

    const id = await Reference.create({
      category_id,
      market_id,
      title,
      description,
      file_path: `/uploads/${req.file.filename}`,
    });

    return success(res, "Reference packaging created successfully", { id }, 201);
  } catch (err) {
    return error(res, "Failed to create reference packaging", 500, err.message);
  }
};

exports.getReferences = async (req, res) => {
    
  try {
    const references = await Reference.getAll();
    return success(res, "Reference packagings fetched successfully", references);
  } catch (err) {
    return error(res, "Failed to fetch reference packagings", 500, err.message);
  }
};

exports.getReference = async (req, res) => {
  try {
    const reference = await Reference.getById(req.params.id);

    if (!reference) {
      return error(res, "Reference packaging not found", 404);
    }

    return success(res, "Reference packaging fetched successfully", reference);
  } catch (err) {
    return error(res, "Failed to fetch reference packaging", 500, err.message);
  }
};

exports.deleteReference = async (req, res) => {
  try {
    const reference = await Reference.getById(req.params.id);

    if (!reference) {
      return error(res, "Reference packaging not found", 404);
    }

    const filePath = path.join(__dirname, "..", reference.file_path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Reference.delete(req.params.id);

    return success(res, "Reference packaging deleted successfully");
  } catch (err) {
    return error(res, "Failed to delete reference packaging", 500, err.message);
  }
};