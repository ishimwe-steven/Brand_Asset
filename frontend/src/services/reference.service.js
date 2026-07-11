import api from "./api";

export const getReferences = async () => (await api.get("/references")).data;

export const createReference = async (formData) => {
  const res = await api.post("/references", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteReference = async (id) => (await api.delete(`/references/${id}`)).data;          