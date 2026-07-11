const Regulation = require("../models/regulation.model");
const { success, error } = require("../utils/response");

exports.getRegulations = async (req, res) => {
  try {
    const { market_id, category_id } = req.query;

    let regulations;

    if (market_id && category_id) {
      regulations = await Regulation.getByMarketAndCategory(market_id, category_id);
    } else {
      regulations = await Regulation.getAll();
    }

    return success(res, "Regulations fetched successfully", regulations);
  } catch (err) {
    return error(res, "Failed to fetch regulations", 500, err.message);
  }
};

exports.getRegulation = async (req, res) => {
  try {
    const regulation = await Regulation.getById(req.params.id);
    if (!regulation) return error(res, "Regulation not found", 404);
    return success(res, "Regulation fetched successfully", regulation);
  } catch (err) {
    return error(res, "Failed to fetch regulation", 500, err.message);
  }
};

exports.createRegulation = async (req, res) => {
  try {
    const id = await Regulation.create(req.body);
    return success(res, "Regulation created successfully", { id }, 201);
  } catch (err) {
    return error(res, "Failed to create regulation", 500, err.message);
  }
};

exports.updateRegulation = async (req, res) => {
  try {
    const updated = await Regulation.update(req.params.id, req.body);
    if (!updated) return error(res, "Regulation not found", 404);
    return success(res, "Regulation updated successfully");
  } catch (err) {
    return error(res, "Failed to update regulation", 500, err.message);
  }
};

exports.deleteRegulation = async (req, res) => {
  try {
    const deleted = await Regulation.delete(req.params.id);
    if (!deleted) return error(res, "Regulation not found", 404);
    return success(res, "Regulation deleted successfully");
  } catch (err) {
    return error(res, "Failed to delete regulation", 500, err.message);
  }
};