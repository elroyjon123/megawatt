import axios from "axios";

let isConfigured = false;
let isRefreshing = false;
let refreshPromise = null;

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem("accessToken", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("accessToken");
    delete axios.defaults.headers.common["Authorization"];
  }
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem("refreshToken", token);
  else localStorage.removeItem("refreshToken");
}

export function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");

  // Use absolute path (axios.baseURL already points to /api)
  const resp = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken });
  const newAccessToken = resp.data?.accessToken;
  if (!newAccessToken) throw new Error("Refresh did not return accessToken");
  setAccessToken(newAccessToken);
  return newAccessToken;
}

/**
 * Configure a single axios response interceptor with refresh-token retry.
 *
 * @param {{ onLogout?: () => void }} opts
 */
export function configureAxiosAuth({ onLogout } = {}) {
  if (isConfigured) return;
  isConfigured = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const status = error.response?.status;

      // Only attempt refresh on 401/403 once per request.
      if (!original || original._retry) {
        return Promise.reject(error);
      }

      if (status !== 401 && status !== 403) {
        return Promise.reject(error);
      }

      original._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshAccessToken().finally(() => {
            isRefreshing = false;
          });
        }

        await refreshPromise;

        // retry original request
        return axios(original);
      } catch (refreshErr) {
        clearTokens();
        if (typeof onLogout === "function") onLogout();
        return Promise.reject(refreshErr);
      }
    }
  );
}
