import api from "./api";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};

export const getAdminDashboardAnalytics = async () => {
  const response = await api.get("/dashboard/admin-analytics");
  return response.data;
};
