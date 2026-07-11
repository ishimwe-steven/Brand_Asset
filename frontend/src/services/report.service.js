import api from "./api";

export const getReports = async () => {
  const response = await api.get("/reports");
  return response.data;
};

export const getReport = async (id) => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

export const generateReport = async (resultId) => {
  const response = await api.post("/reports/generate", {
    result_id: resultId,
  });

  return response.data;
};

export const downloadReportUrl = (resultId) => {
  return `${import.meta.env.VITE_BACKEND_URL}/api/reports/download/${resultId}`;
};