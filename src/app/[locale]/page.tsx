export const revalidate = 60

import HeroSection from "@/components/home/HeroSection";

import SectionHeader from "@/components/ui/SectionHeader";
import PresaleCard from "@/components/property/PresaleCard";
import PropertyCard from "@/components/property/PropertyCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRecommendedRentals, getRecommendedSales, getRecommendedPresales } from "@/lib/services/propertyService";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch real data from service
  const presales = await getRecommendedPresales();
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
      <HeroSection dict={dict} locale={locale} />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 space-y-24 mt-20">

        {/* Presale Section */}
        <section className="scroll-mt-24" id="presale">
          <SectionHeader
            title={dict.home.presale_title}
            subtitle={dict.home.presale_subtitle}
            action={
              <Link href={`/${locale}/properties?type=presale&region=Pattaya&price=0-30000000`} className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                {dict.home.presale_all}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          {/* 横スクロール対応のコンテナ (モバイル向け) */}
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 md:mx-0 snap-x snap-mandatory hide-scrollbar">
            {presales.map((project, idx) => (
              <div key={project.id} className="min-w-[85vw] sm:min-w-[400px] md:min-w-0 pr-4 md:pr-0 snap-center md:snap-align-none">
                <PresaleCard project={project} dict={dict} imagePriority={idx === 0} />
              </div>
            ))}
            {presales.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 w-full">
                現在、注目のプレセール物件はありません。
              </div>
            )}
          </div>
        </section>

        {/* Recommended Rentals Section */}
        <section className="scroll-mt-24" id="rentals">
          <SectionHeader
            title={dict.home.rent_title}
            subtitle={dict.home.rent_subtitle}
            action={
              <Link href={`/${locale}/properties?type=rent`} className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                {dict.home.rent_all}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rentalProperties.map((prop, idx) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} dict={dict} imagePriority={idx < 4} />
              </div>
            ))}
            {rentalProperties.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                {dict.home.no_rentals || '現在、おすすめの賃貸物件はありません。'}
              </div>
            )}
          </div>
        </section>

        {/* Recommended Sales Section */}
        <section className="scroll-mt-24" id="sales">
          <SectionHeader
            title={dict.home.sale_title}
            subtitle={dict.home.sale_subtitle}
            action={
              <Link href={`/${locale}/properties?type=buy`} className="text-navy-primary font-bold hover:text-navy-secondary flex items-center group text-sm">
                {dict.home.sale_all}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleProperties.map((prop, idx) => (
              <div key={prop.id} className="h-full">
                <PropertyCard property={prop} dict={dict} imagePriority={idx < 4} />
              </div>
            ))}
            {saleProperties.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                {dict.home.no_sales || '現在、おすすめの売買物件はありません。'}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
