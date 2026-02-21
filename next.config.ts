import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTPS image URL for logo/prize images
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
