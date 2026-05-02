import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router はデフォルトで有効 (Next.js 13+)
  async rewrites() {
    return [
      { source: "/lp", destination: "/lp.html" },
      { source: "/save-guide", destination: "/save-guide.html" },
    ];
  },
  async redirects() {
    return [
      // portal: 相対パス解決のため必ず末尾スラを付ける
      { source: "/portal", destination: "/portal/", permanent: false },
    ];
  },
};

export default nextConfig;
