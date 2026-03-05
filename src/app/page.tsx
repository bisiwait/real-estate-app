import HeroSection from "@/components/home/HeroSection";
import SectionHeader from "@/components/ui/SectionHeader";
import PresaleCard, { PresaleProject } from "@/components/property/PresaleCard";
import PropertyCard from "@/components/property/PropertyCard";
import LifeSupportBanners from "@/components/home/LifeSupportBanners";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRecommendedRentals, getRecommendedSales } from "@/lib/services/propertyService";

export default async function Home() {

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

  // Fetch real data from service
  const rentals = await getRecommendedRentals();
  const sales = await getRecommendedSales();

  // Adapter to ensure data matches PropertyCard expected format
  const formatProperty = (p: any) => ({
    ...p,
    city_name: p.region_name || 'Pattaya',
    area_name: p.area_name || 'Unknown',
    price: p.rent_price || p.sale_price || 0,
    tags: p.tags || []
  });

  const rentalProperties = rentals.map(formatProperty);
  const saleProperties = sales.map(formatProperty);

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
            {rentalProperties.map((prop) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} />
              </div>
            ))}
            {rentalProperties.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                現在、おすすめの賃貸物件はありません。
              </div>
            )}
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
            {saleProperties.map((prop) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} />
              </div>
            ))}
            {saleProperties.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                現在、おすすめの売買物件はありません。
              </div>
            )}
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
