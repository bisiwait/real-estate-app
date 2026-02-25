'use client'

import Link from "next/link";
import { useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";

export default function Home() {
  const [activeCity, setActiveCity] = useState<'pattaya' | 'sriracha'>('pattaya');

  const content = {
    pattaya: {
      title: "大人のパタヤ移住。",
      subtitle: "上質な住まいを、日本語で。",
      description: "パタヤでの新しい生活を、もっとスマートに。厳選されたコンドミニアム情報を、安心の日本語環境でご提供します。",
      bgGradient: "from-navy-secondary/90 via-navy-primary/80 to-transparent",
      image: "https://images.unsplash.com/photo-1589394815804-964ed7be2eb5?auto=format&fit=crop&q=80&w=1920",
    },
    sriracha: {
      title: "職住近接、シラチャ生活。",
      subtitle: "利便性と安らぎを、日本語で。",
      description: "シラチャでの快適な毎日を。日本人街の利便性と、家族で安心して住める厳選物件をご案内します。",
      bgGradient: "from-slate-900/90 via-slate-800/80 to-transparent",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1920",
    }
  };

  const current = content[activeCity];

  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image with Transition */}
      <div className="absolute inset-0 z-0">
        <img
          src={content.pattaya.image}
          alt="Pattaya"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeCity === 'pattaya' ? 'opacity-100' : 'opacity-0'}`}
        />
        <img
          src={content.sriracha.image}
          alt="Sriracha"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeCity === 'sriracha' ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${current.bgGradient} transition-colors duration-1000`} />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20 pb-32">
        <div className="max-w-4xl">
          {/* City Selection Toggle */}
          <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl w-fit mb-12 border border-white/20">
            <button
              onClick={() => setActiveCity('pattaya')}
              className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeCity === 'pattaya' ? 'bg-white text-navy-primary shadow-lg' : 'text-white hover:bg-white/10'}`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              パタヤで探す
            </button>
            <button
              onClick={() => setActiveCity('sriracha')}
              className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeCity === 'sriracha' ? 'bg-white text-navy-primary shadow-lg' : 'text-white hover:bg-white/10'}`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              シラチャで探す
            </button>
          </div>

          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 leading-[1.05] tracking-tight">
              {current.title}<br />
              <span className="opacity-60">{current.subtitle}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed max-w-2xl font-medium">
              {current.description}
            </p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
              <Link
                href={`/properties?region=${activeCity === 'pattaya' ? 'Pattaya' : 'Sriracha'}`}
                className="group bg-white text-navy-primary px-10 py-5 rounded-2xl text-xl font-black hover:scale-105 transition-all text-center flex items-center justify-center shadow-2xl shadow-white/10"
              >
                物件を今すぐ探す
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/list-property"
                className="bg-navy-primary/20 backdrop-blur-md text-white border-2 border-white/30 px-10 py-5 rounded-2xl text-xl font-bold hover:bg-white/10 transition-all text-center"
              >
                物件を掲載したい方
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
