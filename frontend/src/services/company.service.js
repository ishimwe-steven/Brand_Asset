import api from "./api";
export const getMyCompany = async () => (await api.get("/companies/mine")).data;
export const updateMyCompany = async (data) => (await api.put("/companies/mine", data)).data;
