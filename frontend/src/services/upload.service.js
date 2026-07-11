import api from "./api";

export const uploadPackaging = async (formData) => {
  const response = await api.post("/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getUploads = async () => {
  const response = await api.get("/uploads");
  return response.data;
};

export const getUpload = async (id) => {
  const response = await api.get(`/uploads/${id}`);
  return response.data;
};

export const startVerification = async (uploadId) => {
  const response = await api.post("/verifications/start", {
    upload_id: uploadId,
  });

  return response.data;
};