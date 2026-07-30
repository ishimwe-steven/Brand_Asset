import api from "./api";

export const getVerification = async (id) => {
  const response = await api.get(`/verifications/${id}`);
  return response.data;
};
export const getVerificationHistory = async () => {
  const response = await api.get("/verifications/history");
  return response.data;
};
