export const runtime = 'edge';
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
                            繧ｿ繧､縺ｧ縺ｮ證ｮ繧峨＠繧偵・br />
                            <span className="text-navy-primary underline decoration-slate-200 underline-offset-8">螯･蜊斐°繧牙ｧ九ａ縺ｪ縺・◆繧√↓縲・/span>
                        </h1>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-10">
                            繝代ち繝､縺ｮ髢区叛諢溘→縲√す繝ｩ繝√Ε縺ｮ蛻ｩ萓ｿ諤ｧ縲ゅメ繝ｧ繝ｳ繝悶Μ逵後↓迚ｹ蛹悶＠縺溘・br className="hidden md:block" />
                            譌･譛ｬ莠ｺ縺ｮ縺溘ａ縺ｮ荳榊虚逕｣繝励Λ繝・ヨ繝輔か繝ｼ繝縲擦honburi Connect縲・
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <Link
                                href="/properties"
                                className="w-full md:w-auto px-10 py-4 bg-navy-primary text-white rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2"
                            >
                                <span>迚ｩ莉ｶ繧呈爾縺・/span>
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
                                縲後ち繧､縺縺九ｉ莉墓婿縺ｪ縺・阪ｒ縲・br />驕主悉縺ｮ繧ゅ・縺ｫ縲・
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                        <Bath className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">譌･譛ｬ莠ｺ縺梧悽蠖薙↓遏･繧翫◆縺・・岼縺ｸ縺ｮ縺薙□繧上ｊ</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            繝舌せ繧ｿ繝悶・譛臥┌縲√え繧ｩ繧ｷ繝･繝ｬ繝・ヨ縺ｮ險ｭ鄂ｮ蜿ｯ蜷ｦ縲・崕豌嶺ｻ｣縺ｮ隲区ｱょｽ｢諷具ｼ域帆蠎懃峩謗･縺倶ｸ贋ｹ励○縺具ｼ峨↑縺ｩ縲∫ｧｻ菴剰・・逕滓ｴｻ蜩∬ｳｪ縺ｫ逶ｴ邨舌☆繧玖ｩｳ邏ｰ諠・ｱ繧堤ｶｲ鄒・＠縺ｦ縺・∪縺吶・
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <MapPin className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">豁｣遒ｺ縺ｪ菴咲ｽｮ諠・ｱ縺ｨ蜻ｨ霎ｺ迺ｰ蠅・/h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            荳埼乗・縺ｪ蝨ｰ蝗ｳ諠・ｱ縺ｧ縺ｯ縺ｪ縺上；oogle Maps縺ｨ騾｣謳ｺ縺励◆豁｣遒ｺ縺ｪ蝨ｰ轤ｹ陦ｨ遉ｺ縺ｨ縲∵律譛ｬ莠ｺ繧ｹ繧ｿ繝・ヵ縺ｫ繧医ｋ繝ｪ繧｢繝ｫ縺ｪ蜻ｨ霎ｺ隗｣隱ｬ繧呈署萓帙・
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-purple-50 rounded-xl">
                                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-navy-secondary text-lg mb-1">蠕ｹ蠎輔＠縺溷諺蜷肴ｧ縺ｨ繝励Λ繧､繝舌す繝ｼ菫晁ｭｷ</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            繝励Λ繝・ヨ繝輔か繝ｼ繝繧剃ｻ九＠縺溘Γ繝・そ繝ｼ繧ｸ繧ｷ繧ｹ繝・Β縺ｫ繧医ｊ縲√♀蝠上＞蜷医ｏ縺帶ｮｵ髫弱〒螳画・縺ｫ蛟倶ｺｺ縺ｮ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧・｣邨｡蜈医′繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医↓髢狗､ｺ縺輔ｌ繧九％縺ｨ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・
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
                                    蜈ｨ謗ｲ霈臥黄莉ｶ縺ｯ縲√・繝ｩ繝・ヨ繝輔か繝ｼ繝迢ｬ閾ｪ縺ｮ蝓ｺ貅悶〒螳壽悄逧・↓諠・ｱ縺檎｢ｺ隱阪＆繧後※縺・∪縺吶・
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
                                    <h5 className="font-black mb-2 text-lg">蜆ｪ濶ｯ鬘ｧ螳｢螻､</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">High intent customers</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 mt-8">
                                    <CreditCard className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">繧ｯ繝ｬ繧ｸ繝・ヨ蛻ｶ</h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Pay per inquiry</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 -mt-4">
                                    <Clock className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">24h 邂｡逅・/h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Self-service dashboard</p>
                                </div>
                                <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/5 mt-4">
                                    <Zap className="w-10 h-10 mb-4 text-white" />
                                    <h5 className="font-black mb-2 text-lg">蜊ｳ譎よ軸霈・/h5>
                                    <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">Instant listing</p>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">For Agents</h2>
                            <h3 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                                雉ｪ縺ｮ鬮倥＞鬘ｧ螳｢縺ｨ縲・br />繧ｹ繝槭・繝医↓郢九′繧九・
                            </h3>
                            <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                謌千ｴ・э谺ｲ縺ｮ鬮倥＞譌･譛ｬ莠ｺ螻､縺ｫ迚ｹ蛹悶＠縺滄寔螳｢繝励Λ繝・ヨ繝輔か繝ｼ繝縺ｧ縺吶ら┌鬧・↑蠎・相雋ｻ繧偵°縺代★縲√♀蝠上＞蜷医ｏ縺帙・繝ｼ繧ｹ縺ｮ蜉ｹ邇・噪縺ｪ繝槭・繧ｱ繝・ぅ繝ｳ繧ｰ繧貞庄閭ｽ縺ｫ縺励∪縺吶・
                            </p>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">譌･譛ｬ莠ｺ鬧仙惠蜩｡繝ｻ髟ｷ譛溽ｧｻ菴乗､懆ｨ手・∈縺ｮ繝繧､繝ｬ繧ｯ繝医い繝励Ο繝ｼ繝・/span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">譛磯｡榊崋螳夊ｲｻ繧ｼ繝ｭ縲ょｿ・ｦ√↑蛻・□縺大茜逕ｨ縺ｧ縺阪ｋ繧ｯ繝ｬ繧ｸ繝・ヨ豎ｺ貂・/span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="font-bold">PC繝ｻ繧ｹ繝槭・縺九ｉ縺・▽縺ｧ繧ら黄莉ｶ諠・ｱ縺ｮ譖ｴ譁ｰ繝ｻ蜿埼涸邂｡逅・′蜿ｯ閭ｽ</span>
                                </li>
                            </ul>
                            <Link
                                href="/register"
                                className="inline-flex items-center space-x-2 bg-white text-navy-primary px-8 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl"
                            >
                                <span>謗ｲ霈我ｸｻ縺ｨ縺励※逋ｻ骭ｲ縺吶ｋ</span>
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
                            荳也阜荳騾乗・諤ｧ縺ｮ鬮倥＞縲・br />
                            繧ｿ繧､縺ｮ荳榊虚逕｣繝励Λ繝・ヨ繝輔か繝ｼ繝繧堤岼謖・＠縺ｦ縲・
                        </h3>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed italic">
                            遘√◆縺｡縺ｯ縲√梧ュ蝣ｱ縺ｮ髱槫ｯｾ遘ｰ諤ｧ縲阪′豼縺励＞繧ｿ繧､縺ｮ荳榊虚逕｣蟶ょｴ縺ｫ縺翫＞縺ｦ縲・br className="hidden md:block" />
                            蛟溘ｊ繧倶ｺｺ繝ｻ雋ｷ縺・ｺｺ繝ｻ雋ｸ縺吩ｺｺ縺ｮ荳芽・′縲∽ｺ偵＞縺ｫ菫｡鬆ｼ縺怜粋縺医ｋ迺ｰ蠅・ｒ蜑ｵ蜃ｺ縺励∪縺吶・br className="hidden md:block" />
                            Chonburi Connect 縺ｯ縲√メ繝ｧ繝ｳ繝悶Μ逵後°繧峨∵眠縺励＞荳榊虚逕｣縺ｮ繧ｹ繧ｿ繝ｳ繝繝ｼ繝峨ｒ菴懊ｊ縺ｾ縺吶・
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="pb-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-navy-primary/20 to-transparent pointer-events-none"></div>
                        <h3 className="text-3xl md:text-4xl font-black text-white mb-8 relative z-10">逅・Φ縺ｮ繧ｿ繧､證ｮ繧峨＠繧偵√％縺薙°繧芽ｦ九▽縺代ｈ縺・・/h3>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 relative z-10">
                            <Link
                                href="/properties"
                                className="w-full md:w-auto px-10 py-5 bg-white text-navy-primary rounded-2xl font-black hover:bg-slate-50 transition-all shadow-2xl active:scale-95"
                            >
                                迚ｩ莉ｶ荳隕ｧ繧定ｦ九※縺ｿ繧・
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
