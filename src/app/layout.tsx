// Triggering new build for Cloudflare Pages (Enabling Edge Runtime)
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chonburi Connect | チョンブリ県専門の日本人向け不動産プラットフォーム",
  description: "パタヤ・シラチャなどのチョンブリ県に特化した、日本人のための不動産マーケットプレイス。正確な位置情報と日本人基準のこだわり条件で、理想のタイ暮らしをサポートします。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <Header />
        <main className="min-h-[calc(100vh-80px)]">
          <Breadcrumb />
          {children}
        </main>
        <footer className="bg-navy-secondary text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12 border-b border-white/10 pb-12 text-center md:text-left">
              <div>
                <h2 className="text-xl font-black italic tracking-tighter mb-2">Chonburi Connect</h2>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Pattaya & Sriracha Real Estate</p>
              </div>
              <nav className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4">
                <Link href="/about" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">当サイトについて</Link>
                <Link href="/properties" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">物件を探す</Link>
                <Link href="/lp/post-property" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center">
                  物件を掲載する
                  <span className="ml-2 px-1.5 py-0.5 bg-navy-primary/20 text-[9px] text-navy-primary font-black uppercase tracking-widest rounded shadow-sm border border-navy-primary/30">Partner</span>
                </Link>
                <Link href="/contact" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">お問い合わせ</Link>
              </nav>
            </div>
            <div className="text-center text-xs text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Chonburi Connect. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
