import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router はデフォルトで有効 (Next.js 13+)
  async rewrites() {
    return [
      { source: "/lp", destination: "/lp.html" },
    ];
  },
};

export default nextConfig;
