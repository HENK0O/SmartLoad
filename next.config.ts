import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",") || ["localhost"],
};

export default withPWA(nextConfig);
