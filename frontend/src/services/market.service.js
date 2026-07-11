import api from "./api";

// Get all markets
export const getMarkets = async () => {
  const response = await api.get("/markets");
  return response.data;
};

// Create market
export const createMarket = async (data) => {
  const response = await api.post("/markets", data);
  return response.data;
};

// Delete market
export const deleteMarket = async (id) => {
  const response = await api.delete(`/markets/${id}`);
  return response.data;
};

// Get single market
export const getMarket = async (id) => {
  const response = await api.get(`/markets/${id}`);
  return response.data;
};

// Update market
export const updateMarket = async (id, data) => {
  const response = await api.put(`/markets/${id}`, data);
  return response.data;
};