import api from "./api";

export const getRegulations = async () => (await api.get("/regulations")).data;
export const createRegulation = async (data) => (await api.post("/regulations", data)).data;
export const deleteRegulation = async (id) => (await api.delete(`/regulations/${id}`)).data;