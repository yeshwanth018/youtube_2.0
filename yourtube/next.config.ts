import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: BACKEND_URL,
  },
};

export default nextConfig;


