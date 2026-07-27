import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan dev server diakses dari perangkat lain di LAN
  allowedDevOrigins: ["10.10.20.42", "*.local"],
};

export default nextConfig;
