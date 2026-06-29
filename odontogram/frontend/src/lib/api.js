import axios from "axios";

// Points to the ODONTOGRAM standalone backend on port 8001
const configuredBackendUrl = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)?.trim();
const BACKEND_URL =
  configuredBackendUrl && configuredBackendUrl !== "auto"
    ? configuredBackendUrl
    : `${window.location.protocol}//${window.location.hostname}:8001`;

export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("odont_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login") {
        localStorage.removeItem("odont_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatErr(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join(" ");
  return String(d);
}
