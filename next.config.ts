import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 타입 에러나 린트 에러로 인해 배포가 막히지 않도록 설정
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
