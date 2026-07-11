import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
  async rewrites() {
    return [
      {
        source: "/user/:path*",
        destination: "http://localhost:5000/user/:path*",
      },
      {
        source: "/video/:path*",
        destination: "http://localhost:5000/video/:path*",
      },
      {
        source: "/like/:path*",
        destination: "http://localhost:5000/like/:path*",
      },
      {
        source: "/watch/:path*",
        destination: "http://localhost:5000/watch/:path*",
      },
      {
        source: "/history/:path*",
        destination: "http://localhost:5000/history/:path*",
      },
      {
        source: "/comment/:path*",
        destination: "http://localhost:5000/comment/:path*",
      },
      {
        source: "/download/:path*",
        destination: "http://localhost:5000/download/:path*",
      },
      {
        source: "/payment/:path*",
        destination: "http://localhost:5000/payment/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5000/uploads/:path*",
      },
      {
        source: "/room/:path*",
        destination: "http://localhost:5000/room/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:5000/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
