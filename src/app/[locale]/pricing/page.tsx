export const runtime = 'edge';
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Crown,
    Check,
    Zap,
    Building2,
    Sparkles,
    FileText,
    ArrowRight,
    Search,
    ShieldCheck,
    Minus,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    X,
    Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'

// Defined colors for convenience
const COLORS = {
    NAVY: '#2A4076',
    GOLD: '#D4AF37',
    GOLD_LIGHT: '#F4CE6A',
    NAVY_DARK: '#1A294A'
}

export default function PricingPage() {
    const params = useParams()
    const router = useRouter()
    const locale = params.locale as string
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        checkUser()
    }, [])

    const handleUpgrade = async () => {
        if (!user) {
            router.push(`/${locale}/login?redirect=pricing`)
            return
        }

        setLoading(true)
        try {
            const trialEndDate = addDays(new Date(), 14).toISOString()

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    plan: 'premium',
                    plan_type: 'premium',
                    current_period_end: trialEndDate,
                    auto_renew: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (updateError) {
                console.error('Supabase update error:', updateError)
                alert(`繧｢繝・・繧ｰ繝ｬ繝ｼ繝我ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${updateError.message} (${updateError.code})`)
                return
            }

            // Redirect to settings or dashboard with success message
            router.push(`/${locale}/dashboard/settings?upgrade_success=true`)
            router.refresh()
        } catch (err: any) {
            console.error('Upgrade catch error:', err)
            alert(`莠域悄縺帙〓繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${err.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-[#0A1128] min-h-screen text-white font-sans overflow-x-hidden pb-20">
            {/* Custom Styles for Shimmer and Shadows */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .shimmer-bg {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer-bg::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.4),
                        transparent
                    );
                    animation: shimmer 2s infinite;
                }
                .hero-shadow {
                    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
                }
            `}</style>

            {/* Hero Section with Background */}
            <div className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
                {/* Background Image with Professional Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/pattaya_skyline_premium.png')" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A1128]/90 via-[#0A1128]/70 to-[#0A1128]" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-2xl backdrop-blur-md animate-fade-in">
                        <Crown className="w-4 h-4" />
                        Exclusive Agent Club
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black mb-8 tracking-tight leading-tight hero-shadow">
                        縺ゅ↑縺溘・莉ｲ莉区･ｭ蜍吶ｒ縲・br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F4CE6A] via-[#D4AF37] to-[#F4CE6A]">
                            AI縺ｨ蜈ｱ縺ｫ谺｡縺ｮ繧ｹ繝・・繧ｸ縺ｸ縲・
                        </span>
                    </h1>
                    <p className="text-slate-200 text-lg md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-lg hero-shadow">
                        繝代ち繝､繝ｻ繧ｷ繝ｩ繝√Ε縺ｮ繝医ャ繝励Λ繝ｳ繝翫・縺碁∈縺ｶ縲・br className="hidden md:block" />
                        逕溽肇諤ｧ繧呈･ｵ髯舌∪縺ｧ鬮倥ａ縲∵・邏・ｒ蜉騾溘＆縺帙ｋ荳榊虚逕｣DX繝励Λ繝・ヨ繝輔か繝ｼ繝縲・
                    </p>

                    <div className="mt-12 animate-bounce flex flex-col items-center gap-2 text-slate-400">
                        <span className="text-[10px] uppercase font-bold tracking-widest">Pricing Plans</span>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 relative z-10 -mt-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Standard Plan (Free) */}
                    <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[3rem] p-8 md:p-12 flex flex-col hover:border-slate-700 transition-all group relative overflow-hidden opacity-90">
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-slate-400 mb-2">Standard</h3>
                            <p className="text-slate-600 text-sm">縺ｾ縺壹・迚ｩ莉ｶ繧呈軸霈峨＠縺溘＞譁ｹ縺ｸ</p>
                        </div>
                        <div className="mb-10 flex items-baseline gap-2">
                            <span className="text-5xl font-black text-slate-500 italic">Free</span>
                        </div>

                        <div className="space-y-5 mb-12 flex-1">
                            <FeatureItem text="迚ｩ莉ｶ諠・ｱ縺ｮ荳闊ｬ謗ｲ霈会ｼ亥宛髯舌↑縺暦ｼ・ />
                            <FeatureItem text="蝓ｺ譛ｬ縺雁撫縺・粋繧上○縺ｮ蜿嶺ｿ｡" />
                            <FeatureItem text="繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医・繝ｭ繝輔ぅ繝ｼ繝ｫ縺ｮ陦ｨ遉ｺ" />
                            <FeatureItem text="AI螟夊ｨ隱櫁・蜍慕ｿｻ險ｳ" strike active={false} />
                            <FeatureItem text="繝励Ξ繧ｻ繝ｼ繝ｫ迚ｩ莉ｶ縺ｮ蜆ｪ蜈域軸霈・ strike active={false} />
                            <FeatureItem text="PDF繝√Λ繧ｷ菴懈・" strike active={false} />
                        </div>

                        <Link
                            href={user ? `/${locale}/dashboard/settings` : `/${locale}/register`}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold text-center hover:bg-white/10 transition-all active:scale-[0.98]"
                        >
                            {user ? '迴ｾ蝨ｨ縺ｮ繝励Λ繝ｳ' : '辟｡譁吶〒蟋九ａ繧・}
                        </Link>
                    </div>

                    {/* Premium Plan */}
                    <div className="relative group">
                        {/* Gold Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-[#F4CE6A] rounded-[3.1rem] blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

                        <div className="relative bg-[#0F172A] border-4 border-[#D4AF37] rounded-[3rem] p-8 md:p-12 flex flex-col h-full shadow-[0_20px_50px_rgba(212,175,55,0.2)] overflow-hidden">
                            {/* MOST POPULAR Ribbon */}
                            <div className="absolute top-10 -right-12 bg-gradient-to-r from-[#D4AF37] to-[#F4CE6A] text-[#0A1128] font-black text-[10px] py-1.5 px-12 rotate-45 shadow-lg tracking-widest">
                                MOST POPULAR
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F4CE6A] to-[#D4AF37]">Premium Suite</h3>
                                    <Crown className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                                </div>
                                <p className="text-slate-400 text-sm italic">蜍昴■邯壹￠繧九◆繧√・繝励Ο繝輔ぉ繝・す繝ｧ繝翫Ν陬・ｙ</p>
                            </div>

                            <div className="mb-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-6xl font-black text-white">4,000</span>
                                    <span className="text-xl font-bold text-amber-200/80 uppercase">THB</span>
                                    <span className="text-slate-500 text-lg">/ Month</span>
                                </div>
                                <p className="mt-2 text-[#D4AF37] text-sm font-black flex items-center gap-2">
                                    <Zap className="w-4 h-4 fill-[#D4AF37]" />
                                    謌千ｴ・莉ｶ縺ｧ縲∫ｴ・蟷ｴ蛻・・蛻ｩ逕ｨ譁吶ｒ蝗槫庶蜿ｯ閭ｽ
                                </p>
                            </div>

                            <div className="space-y-6 mb-12 mt-8 flex-1">
                                <BenefitItem
                                    icon={<Building2 className="w-5 h-5 text-white" />}
                                    title="繝励Ξ繧ｻ繝ｼ繝ｫ迚ｩ莉ｶ縺ｮ蜆ｪ蜈域軸霈・
                                    desc="荳闊ｬ蜈ｬ髢句燕縺ｮ蟶悟ｰ代↑諠・ｱ繧呈桶縺・∝━濶ｯ謚戊ｳ・ｮｶ鬘ｧ螳｢繧偵＞縺｡譌ｩ縺丞峇縺・ｾｼ縺ｿ縺ｾ縺吶・
                                />
                                <BenefitItem
                                    icon={<Sparkles className="w-5 h-5 text-white" />}
                                    title="AI 3縺句嵜隱櫁・蜍慕ｿｻ險ｳ繝ｻ蝓ｷ遲・
                                    desc="譌･闍ｱ繧ｿ繧､縺ｮ邏ｹ莉区枚菴懈・譎る俣繧偵ぞ繝ｭ縺ｫ縲ょ､夊ｨ隱槭〒縲悟｣ｲ繧後ｋ縲肴枚遶繧堤椪譎ゅ↓逕滓・縲・
                                />
                                <BenefitItem
                                    icon={<FileText className="w-5 h-5 text-white" />}
                                    title="繝励Ο莉墓ｧ榔DF繝励Ξ繧ｼ繝ｳ雉・侭"
                                    desc="閾ｪ霄ｫ縺ｮ騾｣邨｡蜈医・QR繧ｳ繝ｼ繝牙・繧翫メ繝ｩ繧ｷ繧・繧ｯ繝ｪ繝・け縲ょ叉蜀・ｦ九・蜊ｳ蝠・ｫ・∈郢九￡縺ｾ縺吶・
                                />
                                <BenefitItem
                                    icon={<Search className="w-5 h-5 text-white" />}
                                    title="讀懃ｴ｢邨先棡縺ｮ譛荳贋ｽ崎｡ｨ遉ｺ"
                                    desc="迚ｩ莉ｶ荳隕ｧ縺ｮ繝医ャ繝励↓蝗ｺ螳壹ら┌譁吶・繝ｩ繝ｳ豈斐〒PV謨ｰ繧呈怙螟ｧ10蛟阪∪縺ｧ蠑輔″荳翫￡縺ｾ縺吶・
                                />
                            </div>

                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-[#D4AF37] via-[#F4CE6A] to-[#D4AF37] text-[#0A1128] font-black text-xl hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-[#B8860B] group/btn shimmer-bg disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        2騾ｱ髢薙・辟｡譁吶ヨ繝ｩ繧､繧｢繝ｫ繧帝幕蟋・
                                        <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            <p className="text-center text-slate-500 text-[10px] mt-4 font-bold">窶ｻ 繝医Λ繧､繧｢繝ｫ譛滄俣邨ゆｺ・∪縺ｧ雋ｻ逕ｨ縺ｯ荳蛻・°縺九ｊ縺ｾ縺帙ｓ</p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-32 max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <HelpCircle className="w-12 h-12 text-[#D4AF37] mx-auto mb-4 opacity-50" />
                        <h2 className="text-3xl md:text-5xl font-black mb-4">繧医￥縺ゅｋ縺碑ｳｪ蝠・/h2>
                        <p className="text-slate-400 mt-2 font-medium">Q&A</p>
                    </div>

                    <div className="space-y-4">
                        <FaqItem
                            question="2騾ｱ髢薙・辟｡譁吶ヨ繝ｩ繧､繧｢繝ｫ荳ｭ縺ｫ隗｣邏・・縺ｧ縺阪∪縺吶°・・
                            answer="縺ｯ縺・√＞縺､縺ｧ繧ょ庄閭ｽ縺ｧ縺吶ゅヨ繝ｩ繧､繧｢繝ｫ譛滄俣邨ゆｺ・∪縺ｧ縺ｫ隗｣邏・☆繧後・縲∵侭驥代・荳蛻・°縺九ｊ縺ｾ縺帙ｓ縲ゅム繝・す繝･繝懊・繝峨°繧峨Ρ繝ｳ繧ｯ繝ｪ繝・け縺ｧ隗｣邏・庄閭ｽ縺ｧ縺吶・
                        />
                        <FaqItem
                            question="AI鄙ｻ險ｳ縺ｮ邊ｾ蠎ｦ縺ｯ縺ｩ縺ｮ遞句ｺｦ縺ｧ縺吶°・・
                            answer="譛譁ｰ縺ｮGemini AI繧剃ｽｿ逕ｨ縺励※縺翫ｊ縲∽ｸ榊虚逕｣蟆る摩逕ｨ隱槭ｒ蜷ｫ繧√◆閾ｪ辟ｶ縺ｪ3繝ｶ蝗ｽ隱橸ｼ域律繝ｻ闍ｱ繝ｻ豕ｰ・峨ｒ逕滓・縺励∪縺吶ら函謌仙ｾ後・謇句虚蠕ｮ隱ｿ謨ｴ繧ょ庄閭ｽ縺ｧ縺吶・
                        />
                        <FaqItem
                            question="PDF繝√Λ繧ｷ縺ｫ閾ｪ蛻・・繝ｭ繧ｴ繧貞・繧後ｋ縺薙→縺ｯ縺ｧ縺阪∪縺吶°・・
                            answer="迴ｾ蝨ｨ縲√お繝ｼ繧ｸ繧ｧ繝ｳ繝亥錐縺ｨLINE ID縲＿R繧ｳ繝ｼ繝峨′閾ｪ蜍募魂蟄励＆繧後∪縺吶ょ句挨繝ｭ繧ｴ蟇ｾ蠢懊ｂ鬆・ｬ｡繧｢繝・・繝・・繝井ｺ亥ｮ壹〒縺吶・
                        />
                    </div>
                </div>

                {/* Comparison Section */}
                <div className="mt-32 max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4">讖溯・豈碑ｼ・｡ｨ</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto" />
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="p-8 text-sm font-bold text-slate-400 uppercase tracking-widest">讖溯・</th>
                                    <th className="p-8 text-sm font-black text-center border-l border-white/5">Standard</th>
                                    <th className="p-8 text-sm font-black text-center text-[#D4AF37] border-l border-white/5 bg-[#D4AF37]/5">Premium</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <TableRow label="迚ｩ莉ｶ謗ｲ霈会ｼ郁ｳ・ｲｸ繝ｻ螢ｲ雋ｷ・・ free={true} premium={true} />
                                <TableRow label="蜀咏悄繧｢繝・・繝ｭ繝ｼ繝会ｼ育┌蛻ｶ髯撰ｼ・ free={true} premium={true} />
                                <TableRow label="繝励Ξ繧ｻ繝ｼ繝ｫ迚ｩ莉ｶ繝輔Λ繧ｰ" free={false} premium={true} />
                                <TableRow label="AI 3縺句嵜隱櫁・蜍慕ｿｻ險ｳ" free={false} premium={true} />
                                <TableRow label="AI 譛ｬ譁・・蜍慕函謌・ free={false} premium={true} />
                                <TableRow label="繝励Ο莉墓ｧ榔DF繝√Λ繧ｷ逕滓・" free={false} premium={true} />
                                <TableRow label="讀懃ｴ｢邨先棡縺ｮ荳贋ｽ崎｡ｨ遉ｺ" free={false} premium={true} />
                                <TableRow label="繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝郁ｪ崎ｨｼ繝舌ャ繧ｸ" free={false} premium={true} />
                                <TableRow label="蜆ｪ蜈医メ繝｣繝・ヨ繧ｵ繝昴・繝・ free={false} premium={true} />
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="mt-40 text-center pb-20">
                    <h2 className="text-3xl md:text-6xl font-black mb-10 tracking-tight hero-shadow">
                        繝励Ο縺ｨ縺励※縺ｮ邨先棡繧偵・br className="md:hidden" />莉翫％縺薙〒縲・
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            href={`/${locale}/dashboard`}
                            className="inline-flex items-center gap-3 px-12 py-5 bg-[#2A4076] hover:bg-[#324D8E] text-white rounded-2xl font-black text-xl transition-all shadow-2xl hover:scale-105 active:scale-95 border-b-4 border-[#1A294A]"
                        >
                            繝繝・す繝･繝懊・繝峨↓謌ｻ繧・
                        </Link>
                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-[#D4AF37] to-[#F4CE6A] text-[#0A1128] rounded-2xl font-black text-xl transition-all shadow-2xl hover:scale-105 active:scale-95 border-b-4 border-[#B8860B] shimmer-bg disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                '辟｡譁吶ヨ繝ｩ繧､繧｢繝ｫ繧帝幕蟋・
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureItem({ text, strike = false, active = true }: { text: string, strike?: boolean, active?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${active ? 'text-slate-200' : 'text-slate-600'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-700 font-bold'}`}>
                {active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3 text-slate-600" />}
            </div>
            <span className={`text-sm font-medium ${strike ? 'line-through opacity-40' : ''}`}>{text}</span>
        </div>
    )
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-5 items-start group">
            <div className="w-12 h-12 rounded-2xl bg-[#2A4076] flex items-center justify-center shrink-0 border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="space-y-1.5 pt-0.5">
                <h4 className="text-white font-black text-lg leading-none">{title}</h4>
                <p className="text-slate-400 text-[13px] leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    )
}

function TableRow({ label, free, premium }: { label: string, free: any, premium: any }) {
    const renderVal = (val: any) => {
        if (typeof val === 'boolean') {
            return val ? (
                <div className="bg-emerald-500/10 w-9 h-9 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Check className="w-5 h-5 text-emerald-400" />
                </div>
            ) : (
                <div className="bg-slate-800/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto">
                    <X className="w-4 h-4 text-slate-700" />
                </div>
            );
        }
        return <span className="text-sm font-bold text-white">{val}</span>;
    }

    return (
        <tr className="hover:bg-white/[0.04] transition-colors group">
            <td className="p-8 text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</td>
            <td className="p-8 text-center border-l border-white/5">{renderVal(free)}</td>
            <td className="p-8 text-center border-l border-white/5 bg-[#D4AF37]/5">{renderVal(premium)}</td>
        </tr>
    )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`bg-slate-900/40 border transition-all duration-300 ${isOpen ? 'border-[#D4AF37]/30' : 'border-slate-800'} rounded-2xl overflow-hidden`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <span className="font-black text-lg pr-8">{question}</span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-[#D4AF37]" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-6 pt-0 text-slate-400 font-medium leading-relaxed border-t border-white/5 mt-4">
                    {answer}
                </div>
            </div>
        </div>
    )
}
