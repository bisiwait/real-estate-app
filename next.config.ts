import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ブラウザのデフォルト取得先。SVG ファビコンと同一アセットを返す。
      { source: "/favicon.ico", destination: "/favicon.svg", permanent: false },
      {
        source: "/:path*",
        has: [{ type: "host", value: "real-estate-app-sigma-brown.vercel.app" }],
        destination: "https://chonburihome.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "real-estate-app-8oj.pages.dev" }],
        destination: "https://chonburihome.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.chonburihome.com" }],
        destination: "https://chonburihome.com/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
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
