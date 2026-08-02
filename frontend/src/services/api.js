import axios from "axios";

/*
 * Supports:
 * VITE_BACKEND_URL=https://brand-asset.onrender.com
 *
 * or the older Render configuration:
 * VITE_API_URL=https://brand-asset.onrender.com/api
 */
const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const normalizedBackendUrl = String(rawBackendUrl)
  .trim()
  .replace(/\/+$/, "");

if (!normalizedBackendUrl) {
  console.error(
    "API configuration error: VITE_BACKEND_URL or VITE_API_URL is missing."
  );
}

/*
 * Add /api only when the configured URL does not already end with /api.
 *
 * Examples:
 * https://brand-asset.onrender.com
 * becomes:
 * https://brand-asset.onrender.com/api
 *
 * https://brand-asset.onrender.com/api
 * remains unchanged.
 */
const apiBaseUrl = normalizedBackendUrl.endsWith("/api")
  ? normalizedBackendUrl
  : `${normalizedBackendUrl}/api`;

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (requestError) => Promise.reject(requestError)
);

api.interceptors.response.use(
  (response) => response,
  (responseError) => {
    /*
     * Only clear expired/invalid authentication.
     * Avoid redirecting when the login request itself returns 401.
     */
    const status = responseError.response?.status;
    const requestUrl = String(
      responseError.config?.url || ""
    );

    const isLoginRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.endsWith("/login");

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(responseError);
  }
);

export default api;