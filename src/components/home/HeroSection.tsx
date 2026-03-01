'use client'

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
    const [activeTab, setActiveTab] = useState<'rent' | 'buy' | 'presale'>('rent');
    const [activeArea, setActiveArea] = useState<'pattaya' | 'sriracha'>('pattaya');
    const [activePropertyType, setActivePropertyType] = useState('');

    return (
        <div className="relative isolate pt-14">
            {/* Background image */}
            <div className="absolute inset-0 -z-10">
                <img
                    src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1920"
                    alt="Pattaya/Sriracha View"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Gradient overlay for better readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
            </div>

            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
                <div className="mx-auto max-w-3xl text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h1 className="text-4xl font-bold tracking-tight text-white !text-white sm:text-6xl drop-shadow-lg">
                        パタヤ・シラチャで<br />理想の住まいを見つける
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-white drop-shadow-md font-medium">
                        あなたの快適なタイ生活を全力でサポートします。
                    </p>
                </div>

                <div className="mx-auto max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    {/* Search Tabs */}
                    <div className="flex justify-center mb-0 relative z-20">
                        <div className="bg-white/95 backdrop-blur-md rounded-t-2xl overflow-hidden flex shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
                            <button
                                onClick={() => setActiveTab('rent')}
                                className={`px-8 py-5 text-lg font-bold transition-all relative ${activeTab === 'rent'
                                    ? 'bg-navy-primary text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-navy-primary'
                                    }`}
                            >
                                賃貸（RENT）
                                {activeTab === 'rent' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-navy-primary pointer-events-none z-30" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('buy')}
                                className={`px-8 py-5 text-lg font-bold transition-all relative ${activeTab === 'buy'
                                    ? 'bg-navy-primary text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-navy-primary'
                                    }`}
                            >
                                売買（SELL）
                                {activeTab === 'buy' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-navy-primary pointer-events-none z-30" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('presale')}
                                className={`px-8 py-5 text-lg font-bold transition-all relative ${activeTab === 'presale'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-amber-500'
                                    }`}
                            >
                                プレセール
                                {activeTab === 'presale' && (
                                    <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-amber-500 pointer-events-none z-30" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl rounded-t-none sm:rounded-tl-2xl shadow-xl flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-navy-primary mb-3">エリア</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveArea('pattaya')}
                                    className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeArea === 'pattaya' ? 'bg-white text-navy-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MapPin className="w-4 h-4 mr-1.5" />
                                    パタヤ
                                </button>
                                <button
                                    onClick={() => setActiveArea('sriracha')}
                                    className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeArea === 'sriracha' ? 'bg-white text-navy-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MapPin className="w-4 h-4 mr-1.5" />
                                    シラチャ
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="type" className="block text-sm font-bold text-navy-primary mb-3">物件タイプ</label>
                            <select
                                id="type"
                                className="w-full h-[44px] rounded-xl border-gray-200 border px-4 focus:ring-navy-primary focus:border-navy-primary text-gray-700 bg-gray-50"
                                value={activePropertyType}
                                onChange={(e) => setActivePropertyType(e.target.value)}
                            >
                                <option value="">すべてのタイプ</option>
                                <option value="Condo">コンドミニアム</option>
                                <option value="House">一軒家・ヴィラ</option>
                            </select>
                        </div>
                        <div className="flex-[0.8] flex items-end">
                            <Link
                                href={`/properties?type=${activeTab}&region=${activeArea === 'pattaya' ? 'Pattaya' : 'Sriracha'}${activePropertyType ? `&property_type=${activePropertyType}` : ''}`}
                                className="w-full h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                <Search className="w-5 h-5 mr-2" />
                                検索する
                            </Link>
                        </div>
                    </div>

                    {/* Partner Ads Area */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ad Placeholder 1 */}
                        <div className="h-24 bg-white/80 backdrop-blur border border-white/50 rounded-xl overflow-hidden flex items-center justify-center relative group cursor-pointer shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-semibold mb-1 tracking-wider uppercase">Partner Ad</p>
                                <p className="text-navy-primary font-bold">ビザ取得サポート・代行</p>
                            </div>
                        </div>
                        {/* Ad Placeholder 2 */}
                        <div className="h-24 bg-white/80 backdrop-blur border border-white/50 rounded-xl overflow-hidden flex items-center justify-center relative group cursor-pointer shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-semibold mb-1 tracking-wider uppercase">Partner Ad</p>
                                <p className="text-navy-primary font-bold">安心の引越しサービス</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
