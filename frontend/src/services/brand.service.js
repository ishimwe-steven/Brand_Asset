import api from "./api";

export const getMyBrands = async () => {
  const response = await api.get("/brands/my-brands");
  return response.data;
};

export const getBrandById = async (brandId) => {
  const response = await api.get(`/brands/${brandId}`);
  return response.data;
};

export const createBrand = async (formData) => {
  const response = await api.post("/brands", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const updateBrand = async (brandId, formData) => {
  const response = await api.put(
    `/brands/${brandId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const changeBrandStatus = async (
  brandId,
  status
) => {
  const response = await api.patch(
    `/brands/${brandId}/status`,
    { status }
  );

  return response.data;
};

export const getAvailableBrands = async () => {
  const response = await api.get("/brands/available");
  return response.data;
};
