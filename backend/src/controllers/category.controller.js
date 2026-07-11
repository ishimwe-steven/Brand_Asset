const Category = require("../models/category.model");
const { success, error } = require("../utils/response");

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();
    return success(res, "Categories fetched successfully", categories);
  } catch (err) {
    return error(res, "Failed to fetch categories", 500, err.message);
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.getById(req.params.id);
    if (!category) return error(res, "Category not found", 404);
    return success(res, "Category fetched successfully", category);
  } catch (err) {
    return error(res, "Failed to fetch category", 500, err.message);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const id = await Category.create(req.body);
    return success(res, "Category created successfully", { id }, 201);
  } catch (err) {
    return error(res, "Failed to create category", 500, err.message);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const updated = await Category.update(req.params.id, req.body);
    if (!updated) return error(res, "Category not found", 404);
    return success(res, "Category updated successfully");
  } catch (err) {
    return error(res, "Failed to update category", 500, err.message);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.delete(req.params.id);
    if (!deleted) return error(res, "Category not found", 404);
    return success(res, "Category deleted successfully");
  } catch (err) {
    return error(res, "Failed to delete category", 500, err.message);
  }
};