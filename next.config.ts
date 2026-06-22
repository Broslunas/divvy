import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
