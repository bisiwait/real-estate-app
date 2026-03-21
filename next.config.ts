import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
