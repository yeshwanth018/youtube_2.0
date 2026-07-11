import axios from "axios";

// 1. Return the current origin dynamically (localhost:3000, local network IP, or ngrok URL)
// Next.js config proxies all these requests internally to port 5000.
export const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
};

const BACKEND_URL = getBackendUrl();

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export const getFileUrl = (path) => {
  if (!path) return "";
  const normalized = path.replace(/\\/g, "/");
  // If it's already a full URL, return as-is
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const backendUrl = getBackendUrl();
  if (normalized.startsWith("uploads/")) {
    return `${backendUrl}/${normalized}`;
  }
  return `${backendUrl}/uploads/${normalized}`;
};

export default axiosInstance;
