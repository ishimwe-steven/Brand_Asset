import api from "./api";
export const getMyDesigners = async () => (await api.get("/designers/my-designers")).data;
export const createDesigner = async (data) => (await api.post("/designers", data)).data;
export const updateDesignerStatus = async (id, status) =>
  (await api.patch(`/designers/${id}/status`, { status })).data;
export const resetDesignerPassword = async (id) =>
  (await api.patch(`/designers/${id}/reset-password`)).data;
