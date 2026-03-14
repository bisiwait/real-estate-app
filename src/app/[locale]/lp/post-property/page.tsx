export const runtime = 'edge';
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Rocket, Star, UploadCloud, Users } from 'lucide-react'
import PricingSection from './PricingSection'

export const metadata = {
    title: '迚ｩ莉ｶ繧呈軸霈峨☆繧具ｼ医お繝ｼ繧ｸ繧ｧ繝ｳ繝域ｧ伜髄縺托ｼ・| Chonburi Connect',
    description: '繝代ち繝､繝ｻ繧ｷ繝ｩ繝√Ε譛螟ｧ邏壹・譌･譛ｬ莠ｺ蜷代￠荳榊虚逕｣繝昴・繧ｿ繝ｫ縺ｧ縲∬ｳｪ縺ｮ鬮倥＞鬘ｧ螳｢縺ｸ繧｢繝励Ο繝ｼ繝√・I繧帝ｧ・ｽｿ縺励◆邁｡蜊倥↑迚ｩ莉ｶ逋ｻ骭ｲ縺ｧ縲・寔螳｢繧貞柑邇・喧縺励∪縺吶・
}

export default function PostPropertyLandingPage() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Hero Section */}
            <div className="relative bg-navy-secondary text-white overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20">
                    <img
                        src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                        alt="Pattaya Cityscape"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-navy-secondary via-navy-secondary/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 py-24 md:py-32 relative z-10">
                    <div className="max-w-3xl">
                        <span className="inline-block px-3 py-1 mb-6 bg-navy-primary/20 border border-navy-primary/30 rounded-full text-navy-primary text-xs font-black uppercase tracking-widest">
                            For Real Estate Agents
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
                            繝代ち繝､繝ｻ繧ｷ繝ｩ繝√Ε譛螟ｧ邏壹・<br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">譌･譛ｬ莠ｺ蜷代￠荳榊虚逕｣繝昴・繧ｿ繝ｫ</span>縺ｧ縲・br className="hidden md:block" />
                            雉ｪ縺ｮ鬮倥＞鬘ｧ螳｢縺ｸ繧｢繝励Ο繝ｼ繝√・
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 leading-relaxed max-w-2xl">
                            Chonburi Connect縺ｯ縲√ヱ繧ｿ繝､繝ｻ繧ｷ繝ｩ繝√Ε繧ｨ繝ｪ繧｢縺ｫ迚ｹ蛹悶＠縺滉ｸ榊虚逕｣繝励Λ繝・ヨ繝輔か繝ｼ繝縺ｧ縺吶よｴ礼ｷｴ縺輔ｌ縺欟I縺ｨ遒ｺ縺九↑繧ｿ繝ｼ繧ｲ繝・ぅ繝ｳ繧ｰ縺ｧ縲∵律譛ｬ縺ｮ鬧仙惠蜩｡繝ｻ謚戊ｳ・ｮｶ縺ｨ縺ゅ↑縺溘ｒ郢九℃縺ｾ縺吶・
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/register" className="bg-navy-primary hover:bg-blue-600 text-white px-8 py-4 rounded-full font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center">
                                莉翫☆縺千┌譁吶〒謗ｲ霈峨ｒ蟋九ａ繧・
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Link>
                            <a href="#plans" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center">
                                譁咎≡繝励Λ繝ｳ繧定ｦ九ｋ
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps Section */}
            <div className="container mx-auto px-4 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-navy-secondary mb-4">謗ｲ霈峨∪縺ｧ縺ｮ繧ｷ繝ｳ繝励Ν縺ｪ3繧ｹ繝・ャ繝・/h2>
                    <p className="text-slate-500 font-medium">譛譁ｰ縺ｮ繝・け繝弱Ο繧ｸ繝ｼ繧呈ｴｻ逕ｨ縺励・ｩ壹￥縺ｻ縺ｩ邁｡蜊倥↓迚ｩ莉ｶ繧貞・髢九〒縺阪∪縺吶・/p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting line for desktop */}
                    <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-0.5 bg-slate-200 z-0"></div>

                    {/* Step 1 */}
                    <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Users className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Step 1</div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">繧｢繧ｫ繧ｦ繝ｳ繝育匳骭ｲ・育┌譁呻ｼ・/h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｮ縺ｿ縺ｧ縲√ｏ縺壹°1蛻・〒逋ｻ骭ｲ螳御ｺ・ゅ☆縺舌↓繝繝・す繝･繝懊・繝峨∈繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪∪縺吶・
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <UploadCloud className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Step 2</div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">迚ｩ莉ｶ諠・ｱ縺ｮ逋ｻ骭ｲ</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            <span className="font-bold text-navy-secondary">AI繧､繝ｳ繝昴・繧ｿ繝ｼ讖溯・</span>縺ｫ繧医ｊ縲∝､夜Κ繧ｵ繧､繝医・URL繧・縺､蜈･蜉帙☆繧九□縺代〒縲∫判蜒上ｄ隧ｳ邏ｰ諠・ｱ繧定・蜍募叙蠕励・鄙ｻ險ｳ縺励∪縺吶・
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Rocket className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Step 3</div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">謗ｲ霈蛾幕蟋九・髮・ｮ｢</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            繝ｯ繝ｳ繧ｯ繝ｪ繝・け縺ｧ蜈ｬ髢九ゅ・繝ｼ繧ｿ繝ｫ繧ｵ繧､繝医ｒ險ｪ繧後ｋ譌･譛ｬ莠ｺ繝ｦ繝ｼ繧ｶ繝ｼ縺九ｉ縺ｮ蝠上＞蜷医ｏ縺帙′縲∫峩謗･縺ゅ↑縺溘↓螻翫″縺ｾ縺吶・
                        </p>
                    </div>
                </div>
            </div>

            {/* Pricing Section */}
            <PricingSection />

            {/* Bottom CTA */}
            <div className="container mx-auto px-4 py-16">
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-3xl p-12 text-center border top-0 border-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-navy-secondary mb-6">縺ｾ縺壹・辟｡譁吶〒蟋九ａ縺ｦ縺ｿ縺ｾ縺帙ｓ縺具ｼ・/h2>
                        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto font-medium">
                            Chonburi Connect縺ｯ縲∫樟蝨ｰ縺ｮ迚ｩ莉ｶ諠・ｱ繧呈爾縺呎律譛ｬ莠ｺ縺ｨ縲∝━濶ｯ縺ｪ迚ｩ莉ｶ繧呈戟縺､縺ゅ↑縺溘ｒ蜉ｹ邇・噪縺ｫ邨舌・縺､縺代∪縺吶ょ・譛溯ｲｻ逕ｨ繧ｼ繝ｭ縲∵怙遏ｭ1蛻・〒逋ｻ骭ｲ螳御ｺ・〒縺吶・
                        </p>
                        <Link href="/register" className="inline-flex bg-navy-secondary hover:bg-slate-800 text-white px-10 py-5 rounded-full font-black text-lg transition-all shadow-xl hover:-translate-y-1 items-center">
                            辟｡譁吶い繧ｫ繧ｦ繝ｳ繝医ｒ菴懈・縺吶ｋ
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
} 
