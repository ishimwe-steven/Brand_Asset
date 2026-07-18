import api from "./api";

export const getAdminUsers = async () => (await api.get("/users")).data;
export const createAdminUser = async (data) => (await api.post("/users", data)).data;
export const updateAdminUser = async (id, data) => (await api.put(`/users/${id}`, data)).data;
export const changeAdminUserStatus = async (id, status) => (await api.patch(`/users/${id}/status`, { status })).data;
export const resetAdminUserPassword = async (id) => (await api.post(`/users/${id}/reset-password`)).data;
