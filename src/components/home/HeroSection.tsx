'use client'

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HeroSection({ dict, locale }: { dict: any, locale: string }) {
    const [activeTab, setActiveTab] = useState<'rent' | 'buy' | 'presale'>('rent');
    const [activeArea, setActiveArea] = useState<'pattaya' | 'sriracha'>('pattaya');
    const [activePropertyType, setActivePropertyType] = useState('');
    /** 英語では括弧行を見せないが、レイアウト幅・高さは維持するため invisible で占位 */
    const tabSubLabelHidden = locale === 'en';

    return (
        <div className="relative isolate min-w-0 max-w-full overflow-x-hidden pt-14">
            {/* Background image */}
            <div className="absolute inset-0 -z-10">
                <Image
                    src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1920"
                    alt="Pattaya/Sriracha View"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                />
                {/* Gradient overlay for better readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
            </div>

            <div className="mx-auto max-w-7xl px-6 py-8 sm:py-32 lg:px-8 lg:py-40">
                <div className="mx-auto max-w-3xl text-center mb-6 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h1 className="text-2xl font-bold tracking-tight text-white !text-white sm:text-6xl drop-shadow-lg whitespace-pre-wrap">
                        {dict.home.hero_title}
                    </h1>
                    <p className="mt-3 sm:mt-6 text-base sm:text-lg leading-8 text-white drop-shadow-md font-medium">
                        {dict.home.hero_subtitle}
                    </p>
                </div>

                <div className="mx-auto max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    {/* Search Tabs */}
                    <div className="flex justify-center mb-0 relative z-20 px-2 sm:px-0">
                        <div className="bg-white/95 backdrop-blur-md rounded-t-2xl overflow-hidden flex w-full sm:w-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
                            <button
                                onClick={() => setActiveTab('rent')}
                                className={`flex-1 sm:flex-none px-1 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-bold transition-all relative flex flex-col sm:block items-center justify-center gap-0.5 sm:gap-0 active:scale-95 ${activeTab === 'rent'
                                    ? 'bg-navy-primary text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-navy-primary'
                                    }`}
                            >
                                <span>{dict.home.hero_rent}</span>
                                <span
                                    className={`text-[10px] sm:text-lg font-normal sm:font-bold ${tabSubLabelHidden ? 'invisible' : ''}`}
                                    aria-hidden={tabSubLabelHidden}
                                >
                                    （RENT）
                                </span>
                                {activeTab === 'rent' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-navy-primary pointer-events-none z-30" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('buy')}
                                className={`flex-1 sm:flex-none px-1 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-bold transition-all relative flex flex-col sm:block items-center justify-center gap-0.5 sm:gap-0 active:scale-95 ${activeTab === 'buy'
                                    ? 'bg-navy-primary text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-navy-primary'
                                    }`}
                            >
                                <span>{dict.home.hero_buy}</span>
                                <span
                                    className={`text-[10px] sm:text-lg font-normal sm:font-bold ${tabSubLabelHidden ? 'invisible' : ''}`}
                                    aria-hidden={tabSubLabelHidden}
                                >
                                    （BUY）
                                </span>
                                {activeTab === 'buy' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-navy-primary pointer-events-none z-30" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('presale')}
                                className={`flex-1 sm:flex-none px-1 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-bold transition-all relative flex flex-col sm:block items-center justify-center gap-0.5 sm:gap-0 active:scale-95 ${activeTab === 'presale'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-amber-500'
                                    }`}
                            >
                                <span className="pt-1 sm:pt-0">{dict.home.hero_presale}</span>
                                <span
                                    className={`text-[10px] sm:text-lg font-normal sm:font-bold ${tabSubLabelHidden ? 'invisible' : ''}`}
                                    aria-hidden={tabSubLabelHidden}
                                >
                                    （PRESALE）
                                </span>
                                {activeTab === 'presale' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-amber-500 pointer-events-none z-30" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl rounded-t-none sm:rounded-tl-2xl shadow-xl flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-navy-primary mb-3">{dict.home.area}</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveArea('pattaya')}
                                    className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${activeArea === 'pattaya' ? 'bg-white text-navy-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MapPin className="w-4 h-4 mr-1.5" />
                                    {dict.home.city_pattaya}
                                </button>
                                <button
                                    onClick={() => setActiveArea('sriracha')}
                                    className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeArea === 'sriracha' ? 'bg-white text-navy-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MapPin className="w-4 h-4 mr-1.5" />
                                    {dict.home.city_sriracha}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="type" className="block text-sm font-bold text-navy-primary mb-3">{dict.home.property_type}</label>
                            <select
                                id="type"
                                className="w-full h-[44px] rounded-xl border-gray-200 border px-4 focus:ring-navy-primary focus:border-navy-primary text-gray-700 bg-gray-50"
                                value={activePropertyType}
                                onChange={(e) => setActivePropertyType(e.target.value)}
                            >
                                <option value="">{dict.home.all_types}</option>
                                <option value="Condo">{dict.home.condo}</option>
                                <option value="House">{dict.home.house}</option>
                                <option value="Townhouse">{dict.home.townhouse}</option>
                                <option value="Apartment">{dict.home.apartment}</option>
                                <option value="ServiceApartment">{dict.home.service_apartment}</option>
                                <option value="Commercial">{dict.home.commercial}</option>
                            </select>
                        </div>
                        <div className="flex-[0.8] flex items-end">
                            <Link
                                href={`/${locale}/properties?type=${activeTab === 'buy' ? 'sell' : activeTab}&region=${activeArea === 'pattaya' ? 'Pattaya' : 'Sriracha'}${activePropertyType ? `&property_type=${activePropertyType}` : ''}`}
                                className="w-full h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                            >
                                <Search className="w-5 h-5 mr-2" />
                                {dict.home.search_btn}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
