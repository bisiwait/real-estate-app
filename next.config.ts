import type { NextConfig } from "next";

/** www 除外・レガシーホスト向けリダイレクトの宛先（末尾スラッシュなし）。 */
function redirectDestinationBase(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (raw && /^https:\/\//i.test(raw)) return raw;
  if (process.env.NEXT_PUBLIC_BASE_URL?.trim()) {
    const b = process.env.NEXT_PUBLIC_BASE_URL.trim().replace(/\/$/, "");
    if (/^https:\/\//i.test(b)) return b;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  throw new Error(
    "next.config: 本番ビルドでは NEXT_PUBLIC_SITE_URL（例: https://chonburihome.com）を設定してください。"
  );
}

const SITE_ORIGIN = redirectDestinationBase();

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
      destination: `${SITE_ORIGIN}/:path*`,
      permanent: true,
    }));
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...legacyHostRedirects(),
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.chonburihome.com" }],
        destination: `${SITE_ORIGIN}/:path*`,
        permanent: true,
      },
      // LIFF エンドポイントのよくある誤記（ハイフン抜け・スラッシュ末尾）
      {
        source: "/:locale/line/inquirybridge",
        destination: "/:locale/line/inquiry-bridge",
        permanent: true,
      },
      {
        source: "/:locale/line/inquiry_bridge",
        destination: "/:locale/line/inquiry-bridge",
        permanent: true,
      },
      {
        source: "/:locale/line/inquiry-bridge/",
        destination: "/:locale/line/inquiry-bridge",
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
