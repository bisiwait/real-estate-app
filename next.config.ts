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
    unoptimized: true, // Cloudflare Pages doesn't support Next.js Image Optimization natively without extra setup
  },
  // Ensure trailing slashes are consistent for SEO
  trailingSlash: true,
};

export default nextConfig;
