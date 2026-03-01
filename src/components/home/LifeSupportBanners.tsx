import Link from "next/link";
import { Car, Utensils, Stethoscope, CarFront } from "lucide-react"; // Note: Used CarFront instead of a generic Golf icon for now, adjust as needed or use a different icon set if golf is available

export default function LifeSupportBanners() {
    const banners = [
        {
            id: 'rentacar',
            title: 'レンタカー・カーリース',
            subtitle: '安心の日本語対応',
            icon: <Car className="w-8 h-8 mb-2 opacity-80" />,
            href: '/support/renta-car',
            bgGradient: 'from-blue-600/90 to-blue-800/90',
            image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600',
        },
        {
            id: 'golf',
            title: 'ゴルフ場予約手配',
            subtitle: '名門コースをお得に',
            icon: <CarFront className="w-8 h-8 mb-2 opacity-80" />, // Using CarFront as placeholder
            href: '/support/golf',
            bgGradient: 'from-emerald-600/90 to-emerald-800/90',
            image: 'https://images.unsplash.com/photo-1587222818619-a1d2e1329881?auto=format&fit=crop&q=80&w=600',
        },
        {
            id: 'food',
            title: '日本食デリバリー',
            subtitle: 'パタヤ・シラチャ全域',
            icon: <Utensils className="w-8 h-8 mb-2 opacity-80" />,
            href: '/support/food-delivery',
            bgGradient: 'from-orange-600/90 to-orange-800/90',
            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=600',
        },
        {
            id: 'medical',
            title: '医療通訳・病院同行',
            subtitle: '24時間365日対応',
            icon: <Stethoscope className="w-8 h-8 mb-2 opacity-80" />,
            href: '/support/medical',
            bgGradient: 'from-rose-600/90 to-rose-800/90',
            image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600',
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {banners.map((banner) => (
                <Link key={banner.id} href={banner.href} className="group block aspect-square rounded-2xl overflow-hidden relative shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <img src={banner.image} alt={banner.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${banner.bgGradient} z-10`} />

                    {/* Content */}
                    <div className="absolute inset-0 z-20 p-4 sm:p-6 flex flex-col items-center justify-center text-center text-white">
                        <div className="transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-110">
                            {banner.icon}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base mb-1 drop-shadow-md">{banner.title}</h3>
                        <p className="text-xs sm:text-sm text-white/80 font-medium drop-shadow">{banner.subtitle}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
