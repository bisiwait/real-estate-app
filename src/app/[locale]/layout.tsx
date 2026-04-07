
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "../globals.css";
import Header from "@/components/layout/Header";
import Breadcrumb from "@/components/layout/Breadcrumb";
import NavigationPendingProvider from "@/components/layout/NavigationPendingProvider";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchCountProvider } from "@/contexts/SearchCountContext";
import { Toaster } from 'sonner';
import { getPublicSiteUrl } from '@/lib/site-url';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

/** スマホでのピンチ拡大を抑止（viewport はページ全体に適用） */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = getPublicSiteUrl();

  return {
    metadataBase: new URL(baseUrl),
    title: dict.metadata.title,
    description: dict.metadata.description,
    manifest: '/site.webmanifest',
    openGraph: {
      type: 'website',
      siteName: 'Chonburi Home',
      locale: locale === 'jp' ? 'ja_JP' : locale === 'th' ? 'th_TH' : 'en_US',
      url: `${baseUrl}/${locale}`,
      images: [
        {
          url: '/logo_800.svg',
          width: 800,
          height: 400,
          alt: 'Chonburi Home',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/logo_800.svg'],
    },
    alternates: {
      languages: {
        'ja': `${baseUrl}/jp`,
        'en': `${baseUrl}/en`,
        'th': `${baseUrl}/th`,
        'x-default': `${baseUrl}/jp`,
      },
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'jp' }, { locale: 'en' }, { locale: 'th' }]
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const htmlLang = locale === 'jp' ? 'ja' : locale;

  return (
    <html lang={htmlLang}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased bg-background min-w-0`}>
        <AuthProvider>
          <SearchCountProvider>
            <Header dict={dict} />
            <main className="min-h-[calc(100vh-80px)] min-w-0 w-full max-w-full">
              <Breadcrumb
              labels={dict.labels as unknown as Record<string, string>}
              comparePageTitle={dict.compare?.title}
              homeAriaLabel={dict.common?.home}
            />
              <NavigationPendingProvider>{children}</NavigationPendingProvider>
            </main>
            <Toaster />
            <footer className="bg-navy-secondary text-white py-16">
            <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12 border-b border-white/10 pb-12 text-center md:text-left">
              <div>
                <Link
                  href={`/${locale}`}
                  className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm"
                >
                  <span className="block text-xl sm:text-2xl font-black italic tracking-tighter text-white antialiased">
                    Chonburi{' '}
                    <span className="text-amber-400 not-italic">Home</span>
                  </span>
                </Link>
              </div>
              <nav className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4">
                <Link href={`/${locale}/about`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">{(dict.labels as any)?.about || 'About'}</Link>
                <Link href={`/${locale}/terms`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">{(dict.labels as any)?.terms || (dict.common as any)?.terms_of_service || 'Terms'}</Link>
                <Link href={`/${locale}/pricing`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                  {(dict.labels as any)?.footer_want_to_list || 'Want to list your property'}
                </Link>
                <Link href={`/${locale}/faq`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">{(dict.labels as any)?.faq || 'FAQ'}</Link>
              </nav>
            </div>
            <div className="text-center text-xs text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Chonburi Home. All rights reserved.
            </div>
          </div>
        </footer>
          </SearchCountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
