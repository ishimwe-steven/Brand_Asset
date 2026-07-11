import api from "./api";

export const getVerification = async (id) => {
  const response = await api.get(`/verifications/${id}`);
  return response.data;
};