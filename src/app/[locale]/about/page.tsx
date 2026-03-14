'use client'

import dynamic from 'next/dynamic'

const FadeIn = dynamic(() => import('@/components/animations/FadeIn'), {
    ssr: true // Animations can often run on client only but we can pre-render the structure
})

import {
    CheckCircle2,
    ShieldCheck,
    Home,
    Users,
    ArrowRight,
    Zap,
    Bath,
    MapPin,
    Clock,
    CreditCard,
    Globe
} from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    }

    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 bg-slate-50">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <FadeIn>
                        <span className="inline-block px-4 py-1.5 bg-navy-primary/10 text-navy-primary text-xs font-black uppercase tracking-[0.2em] rounded-full mb-6">
                            About Chonburi Connect
                        </span>
                        <h1 className="text-4xl md:text-6xl font-black text-navy-secondary mb-8 leading-[1.1]">
                            タイでの暮らしを、<br />
                            <span className="text-navy-primary underline decoration-slate-200 underline-offset-8">妥協から始めないために。</span>
                        </h1>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-10">
                            パタヤの開放感と、シラチャの利便性。チョンブリ県に特化した、<br className="hidden md:block" />
                            日本人のための不動産プラットフォーム『Chonburi Connect』
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <Link
                                href="/properties"
                                className="w-full md:w-auto px-10 py-4 bg-navy-primary text-white rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2"
                            >
                                <span>物件を探す</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* For Users Section */}
            <section className="py-24 border-b border-slate-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeIn>
                            <h2 className="text-sm font-black text-navy-primary uppercase tracking-widest mb-4">For Users</h2>
                            <h3 className="text-3xl md:text-4xl font-black text-navy-secondary mb-8">
                                「タイだから仕方ない」を、<br />過去のものに。
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                        <Bath className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">日本人が本当に知りたい項目へのこだわり</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            バスタブの有無、ウォシュレットの設置可否、電気代の請求形態（政府直接か上乗せか）など、移住者の生活品質に直結する詳細情報を網羅しています。
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <MapPin className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">正確な位置情報と周辺環境</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            不透明な地図情報ではなく、Google Mapsと連携した正確な地点表示と、日本人スタッフによるリアルな周辺解説を提供。
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-purple-50 rounded-xl">
                                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">徹底した匿名性とプライバシー保護</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            プラットフォームを介したメッセージシステムにより、お問い合わせ段階で安易に個人のメールアドレスや連絡先がエージェントに開示されることはありません。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.2}>
                            <div className="aspect-square rounded-[3rem] bg-slate-100 overflow-hidden shadow-2xl rotate-3">
                                <img
                                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"
                                    alt="Luxury Condo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-[280px]">
                                <div className="flex items-center space-x-3 mb-4 text-emerald-500">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-black text-sm uppercase">Verification System</span>
                                </div>
                                <p className="text-xs font-bold text-navy-secondary leading-relaxed">
                                    全掲載物件は、プラットフォーム独自の基準で定期的に情報が確認されています。
                                </p>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* For Agents Section */}
            <section className="py-24 bg-navy-secondary text-white relative">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-[-15deg] transform translate-x-1/2 overflow-hidden pointer-events-none"></div>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeIn>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5">
                                    <Users className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">優良顧客層</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">High intent customers</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 mt-8">
                                    <CreditCard className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">クレジット制</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Pay per inquiry</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 -mt-4">
                                    <Clock className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">24h 管理</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Self-service dashboard</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 mt-4">
                                    <Zap className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">即時掲載</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Instant listing</p>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">For Agents</h2>
                            <h3 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                                質の高い顧客と、<br />スマートに繋がる。
                            </h3>
                            <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                成約意欲の高い日本人層に特化した集客プラットフォームです。無駄な広告費をかけず、お問い合わせベースの効率的なマーケティングを可能にします。
                            </p>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">日本人駐在員・長期移住検討者へのダイレクトアプローチ</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">月額固定費ゼロ。必要な分だけ利用できるクレジット決済</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">PC・スマホからいつでも物件情報の更新・反響管理が可能</span>
                                </li>
                            </ul>
                            <Link
                                href="/register"
                                className="inline-flex items-center space-x-2 bg-white text-navy-primary px-8 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl"
                            >
                                <span>掲載主として登録する</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <FadeIn>
                        <div className="w-20 h-20 bg-navy-primary/5 rounded-full flex items-center justify-center mx-auto mb-10">
                            <Globe className="w-10 h-10 text-navy-primary" />
                        </div>
                        <h2 className="text-sm font-black text-navy-primary uppercase tracking-widest mb-6">Our Mission</h2>
                        <h3 className="text-3xl md:text-5xl font-black text-navy-secondary mb-10 leading-tight">
                            世界一透明性の高い、<br />
                            タイの不動産プラットフォームを目指して。
                        </h3>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed italic">
                            私たちは、「情報の非対称性」が激しいタイの不動産市場において、<br className="hidden md:block" />
                            借りる人・買う人・貸す人の三者が、互いに信頼し合える環境を創出します。<br className="hidden md:block" />
                            Chonburi Connect は、チョンブリ県から、新しい不動産のスタンダードを作ります。
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="pb-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-navy-primary/20 to-transparent pointer-events-none"></div>
                        <h3 className="text-3xl md:text-4xl font-black text-white mb-8 relative z-10">理想のタイ暮らしを、ここから見つけよう。</h3>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 relative z-10">
                            <Link
                                href="/properties"
                                className="w-full md:w-auto px-10 py-5 bg-white text-navy-primary rounded-2xl font-black hover:bg-slate-50 transition-all shadow-2xl active:scale-95"
                            >
                                物件一覧を見てみる
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
