import api from "./api";

// Get all regulation sets
export const getRegulationSets = async () => {
  const response = await api.get("/regulation-sets");
  return response.data;
};

// Get one regulation set
export const getRegulationSetById = async (id) => {
  const response = await api.get(`/regulation-sets/${id}`);
  return response.data;
};

// Upload regulation document
export const createRegulationSet = async (formData) => {
  const response = await api.post(
    "/regulation-sets",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// Activate or deactivate regulation set
export const updateRegulationSetStatus = async (
  id,
  status
) => {
  const response = await api.patch(
    `/regulation-sets/${id}/status`,
    { status }
  );

  return response.data;
};

// Delete regulation set
export const deleteRegulationSet = async (id) => {
  const response = await api.delete(
    `/regulation-sets/${id}`
  );

  return response.data;
};