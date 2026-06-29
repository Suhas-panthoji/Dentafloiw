import axios from "axios";
import { safeStorage } from "./storage";

// Configured backend URL (statically replaced by Vercel/CRA during build)
const configuredBackendUrl = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)?.trim();
const BACKEND_URL = configuredBackendUrl && configuredBackendUrl !== "auto"
  ? configuredBackendUrl
  : "";
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = safeStorage.getItem("df_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login") {
        safeStorage.removeItem("df_token");
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
