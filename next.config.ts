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
  /** LINE 手順の挿絵は同名差し替えが多いため、CDN の長期キャッシュを避ける */
  async headers() {
    return [
      {
        source: "/images/line-official-app-guide/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/images/line-personal-friend-url-guide/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/images/line-official-chat-mode-guide/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      ...legacyHostRedirects(),
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.chonburihome.com" }],
        destination: `${SITE_ORIGIN}/:path*`,
        permanent: true,
      },
      // 日本語 URL は ISO の ja ではなく jp（[locale] と一致）。旧リンクの /ja/... を正規化する。
      { source: "/ja", destination: "/jp", permanent: true },
      { source: "/ja/", destination: "/jp", permanent: true },
      { source: "/ja/:path*", destination: "/jp/:path*", permanent: true },
    ];
  },
  images: {
    /** 一般的なビューポート幅（デフォルトに近いが、一覧サムネ向けに 384 を明示） */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    /** 小さなアイコン・ダッシュボードサムネ用（80px 等の sizes に合わせやすくする） */
    imageSizes: [16, 32, 48, 64, 80, 96, 128, 256, 384],
    remotePatterns: [
      // 本番プロジェクト（ワイルドカードが効かない環境向けに明示）
      {
        protocol: 'https',
        hostname: 'ublmlivvaxqndbqlvszp.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'ublmlivvaxqndbqlvszp.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'http',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
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
