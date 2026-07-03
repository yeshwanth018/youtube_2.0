import axios from "axios";
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
});

export const getFileUrl = (path) => {
  if (!path) return "";
  const normalized = path.replace(/\\/g, "/");
  // If it's already a full URL, return as-is
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  if (normalized.startsWith("uploads/")) {
    return `${backendUrl}/${normalized}`;
  }
  return `${backendUrl}/uploads/${normalized}`;
};

export default axiosInstance;
