
import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "../globals.css";
import Header from "@/components/layout/Header";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchCountProvider } from "@/contexts/SearchCountContext";
import { Toaster } from 'sonner';

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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased bg-background`}>
        <AuthProvider>
          <SearchCountProvider>
            <Header dict={dict} />
            <main className="min-h-[calc(100vh-80px)]">
              <Breadcrumb labels={dict.labels as unknown as Record<string, string>} />
              {children}
            </main>
            <Toaster />
            <footer className="bg-navy-secondary text-white py-16">
            <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12 border-b border-white/10 pb-12 text-center md:text-left">
              <div>
                <h2 className="text-xl font-black italic tracking-tighter mb-2">Chonburi Connect</h2>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Pattaya & Sriracha Real Estate</p>
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
              &copy; {new Date().getFullYear()} Chonburi Connect. All rights reserved.
            </div>
          </div>
        </footer>
          </SearchCountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
