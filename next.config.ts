import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.divvy.es',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
