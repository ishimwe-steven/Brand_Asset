const Market = require("../models/market.model");
const { success, error } = require("../utils/response");

exports.getMarkets = async (req, res) => {
  try {
    const markets = await Market.getAll();
    return success(res, "Markets fetched successfully", markets);
  } catch (err) {
    return error(res, "Failed to fetch markets", 500, err.message);
  }
};

exports.getMarket = async (req, res) => {
  try {
    const market = await Market.getById(req.params.id);
    if (!market) return error(res, "Market not found", 404);
    return success(res, "Market fetched successfully", market);
  } catch (err) {
    return error(res, "Failed to fetch market", 500, err.message);
  }
};

exports.createMarket = async (req, res) => {
  try {
    const id = await Market.create(req.body);
    return success(res, "Market created successfully", { id }, 201);
  } catch (err) {
    return error(res, "Failed to create market", 500, err.message);
  }
};

exports.updateMarket = async (req, res) => {
  try {
    const updated = await Market.update(req.params.id, req.body);
    if (!updated) return error(res, "Market not found", 404);
    return success(res, "Market updated successfully");
  } catch (err) {
    return error(res, "Failed to update market", 500, err.message);
  }
};

exports.deleteMarket = async (req, res) => {
  try {
    const deleted = await Market.delete(req.params.id);
    if (!deleted) return error(res, "Market not found", 404);
    return success(res, "Market deleted successfully");
  } catch (err) {
    return error(res, "Failed to delete market", 500, err.message);
  }
};