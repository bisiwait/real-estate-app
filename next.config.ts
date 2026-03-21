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
  // @ts-expect-error - disable Turbopack, use webpack
  turbopack: false,
  transpilePackages: ['lucide-react'],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
