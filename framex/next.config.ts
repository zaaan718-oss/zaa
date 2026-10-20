import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default Next.js cuma 10MB buat body request yang lewat middleware -
    // kekecilan buat upload video (sampai 500MB di plan Max) dan foto
    // profil (sampai 20MB). Dinaikin di sini biar semua fitur upload jalan.
    proxyClientMaxBodySize: "600mb",
  },
};

export default nextConfig;
