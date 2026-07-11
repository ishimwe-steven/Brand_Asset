import api from "./api";

// Get all categories
export const getCategories = async () => {
  const response = await api.get("/categories");
  return response.data;
};

// Create category
export const createCategory = async (data) => {
  const response = await api.post("/categories", data);
  return response.data;
};

// Delete category
export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};

// Get one category
export const getCategory = async (id) => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

// Update category
export const updateCategory = async (id, data) => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};