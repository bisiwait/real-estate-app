import type { NextConfig } from "next";

/** カンマ区切りの旧ホスト名。未設定の場合はレガシー向け host リダイレクトを追加しない。 */
function legacyHostRedirects(): Array<{
  source: string;
  has: Array<{ type: "host"; value: string }>;
  destination: string;
  permanent: boolean;
}> {
  const raw = process.env.LEGACY_REDIRECT_HOSTS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://chonburihome.com/:path*",
      permanent: true,
    }));
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ブラウザのデフォルト取得先。SVG ファビコンと同一アセットを返す。
      { source: "/favicon.ico", destination: "/favicon.svg", permanent: false },
      ...legacyHostRedirects(),
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
