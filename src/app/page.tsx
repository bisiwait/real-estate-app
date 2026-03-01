'use client'

import HeroSection from "@/components/home/HeroSection";
import SectionHeader from "@/components/ui/SectionHeader";
import PresaleCard, { PresaleProject } from "@/components/property/PresaleCard";
import PropertyCard from "@/components/property/PropertyCard";
import LifeSupportBanners from "@/components/home/LifeSupportBanners";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {

  // Mock Data for Presale Projects
  const mockPresaleProjects: PresaleProject[] = [
    {
      id: "p1",
      name: "The Riviera Malibu Hotel & Residence",
      area: "Pratumnak",
      completionYear: "2026年",
      priceRange: "3.5M 〜 12M THB",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
      hasJapaneseSupport: true,
      slug: "riviera-malibu",
    },
    {
      id: "p2",
      name: "Arom Jomtien",
      area: "Jomtien Beach",
      completionYear: "2026年Q4",
      priceRange: "4.2M 〜 22M THB",
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
      hasJapaneseSupport: true,
      slug: "arom-jomtien",
    },
    {
      id: "p3",
      name: "Copacabana Coral Reef",
      area: "Jomtien",
      completionYear: "2028年",
      priceRange: "2.9M 〜 15M THB",
      imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
      hasJapaneseSupport: false,
      slug: "copacabana-coral",
    }
  ];

  // Adapter for PropertyCard props based on existing properties structure
  const createMockProperty = (id: string, title: string, rent_price: number | undefined, sale_price: number | undefined, is_for_rent: boolean, is_for_sale: boolean, area: string, city: string, images: string[], beds: number, hasBath: boolean, sqm: number) => ({
    id,
    title,
    area_name: area,
    city_name: city,
    images,
    tags: ["おすすめ", "駅近"],
    has_bathtub: hasBath,
    allows_pets: false,
    sqm,
    bedrooms: beds,
    is_for_rent,
    is_for_sale,
    rent_price,
    sale_price,
    price: rent_price || sale_price || 0,
    ownership_type: is_for_sale ? "Foreign Quota" : undefined
  });

  const mockRentals = [
    createMockProperty("r1", "Base Central Pattaya 1BR 高層階", 25000, undefined, true, false, "Central Pattaya", "Pattaya", ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"], 1, true, 35),
    createMockProperty("r2", "Lumpini Seaview Jomtien 海が見える部屋", 15000, undefined, true, false, "Jomtien", "Pattaya", ["https://images.unsplash.com/photo-1502672260266-1c1e5239dfb3?auto=format&fit=crop&q=80&w=800"], 1, false, 28),
    createMockProperty("r3", "Knightsbridge The Ocean Sriracha", 35000, undefined, true, false, "Sriracha", "Sriracha", ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800"], 2, true, 55),
    createMockProperty("r4", "Unixx South Pattaya", 18000, undefined, true, false, "Pratumnak", "Pattaya", ["https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=800"], 1, false, 30),
  ];

  const mockSales = [
    createMockProperty("s1", "Riviera Wongamat 2BR オーシャンフロント", undefined, 12500000, false, true, "Wongamat", "Pattaya", ["https://images.unsplash.com/photo-1600607687935-ce50026c2e39?auto=format&fit=crop&q=80&w=800"], 2, true, 70),
    createMockProperty("s2", "Zire Wongamat お手頃価格のスタジオ", undefined, 4500000, false, true, "Wongamat", "Pattaya", ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800"], 0, false, 38),
    createMockProperty("s3", "Marina Bayfront Sriracha 高層階", undefined, 8800000, false, true, "Sriracha", "Sriracha", ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800"], 2, true, 65),
    createMockProperty("s4", "Edge Central Pattaya 投資用物件", undefined, 5200000, false, true, "Central Pattaya", "Pattaya", ["https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&q=80&w=800"], 1, false, 32),
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <HeroSection />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 space-y-24 mt-20">

        {/* Presale Section */}
        <section className="scroll-mt-24" id="presale">
          <SectionHeader
            title="注目のプレセール（新築投資案件）"
            subtitle="完成前の特別価格。キャピタルゲインと高い利回りが狙える厳選プロジェクト"
            action={
              <Link href="/presale" className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                すべてのプレセールを見る
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          {/* 横スクロール対応のコンテナ (モバイル向け) */}
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 md:mx-0 snap-x snap-mandatory hide-scrollbar">
            {mockPresaleProjects.map((project) => (
              <div key={project.id} className="min-w-[85vw] sm:min-w-[400px] md:min-w-0 pr-4 md:pr-0 snap-center md:snap-align-none">
                <PresaleCard project={project} />
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Rentals Section */}
        <section className="scroll-mt-24" id="rentals">
          <SectionHeader
            title="おすすめの賃貸物件（パタヤ・シラチャ）"
            subtitle="すぐに入居可能。日本語サポート対応のおすすめ物件"
            action={
              <Link href="/properties?type=rent" className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                賃貸物件をもっと見る
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockRentals.map((prop) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} />
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Sales Section */}
        <section className="scroll-mt-24" id="sales">
          <SectionHeader
            title="購入・オーナーチェンジ物件"
            subtitle="居住用から投資用まで。タイでの不動産購入を徹底サポート"
            action={
              <Link href="/properties?type=buy" className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                売買物件をもっと見る
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockSales.map((prop) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} />
              </div>
            ))}
          </div>
        </section>

        {/* Life Support Banners Section */}
        <section className="scroll-mt-24 pt-8" id="support">
          <div className="bg-slate-50 rounded-3xl p-8 lg:p-12 mb-12">
            <SectionHeader
              title="パタヤ・シラチャ生活サポート"
              subtitle="タイでの生活をより快適に。信頼できる弊社提携パートナーをご紹介します"
            />
            <LifeSupportBanners />
          </div>
        </section>

      </main>
    </div>
  );
}
