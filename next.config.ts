import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 타입 및 린트 에러 무시
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
