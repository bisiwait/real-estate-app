import { getDictionary } from '@/lib/i18n/get-dictionary'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Building2, LayoutDashboard, Zap, ShieldCheck } from 'lucide-react'

export default async function AgentWelcomePage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const dict = await getDictionary(locale)

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-32">
            <div className="container mx-auto px-4">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <div className="inline-flex items-center space-x-2 bg-navy-primary/5 text-navy-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Building2 className="w-4 h-4" />
                        <span>For Real Estate Agents</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-navy-secondary mb-8 leading-tight">
                        {dict.auth.agent_welcome_title}
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12">
                        {dict.auth.agent_welcome_subtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href={`/${locale}/agent/signup`}
                            className="w-full sm:w-auto bg-navy-primary text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20 flex items-center justify-center space-x-3 group"
                        >
                            <span>{dict.auth.agent_signup_btn}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href={`/${locale}/login`}
                            className="w-full sm:w-auto bg-white text-navy-primary border border-slate-200 px-10 py-5 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center"
                        >
                            {dict.auth.agent_login_link}
                        </Link>
                    </div>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <BenefitCard
                        icon={Zap}
                        title={dict.auth.agent_benefit_1_title}
                        description={dict.auth.agent_benefit_1_desc}
                        color="bg-amber-500"
                    />
                    <BenefitCard
                        icon={LayoutDashboard}
                        title={dict.auth.agent_benefit_2_title}
                        description={dict.auth.agent_benefit_2_desc}
                        color="bg-blue-500"
                    />
                    <BenefitCard
                        icon={ShieldCheck}
                        title={dict.auth.agent_benefit_3_title}
                        description={dict.auth.agent_benefit_3_desc}
                        color="bg-emerald-500"
                    />
                </div>

                {/* Trust Section */}
                <div className="mt-32 max-w-3xl mx-auto bg-white rounded-[40px] p-8 md:p-16 shadow-2xl border border-slate-100 text-center">
                    <h2 className="text-3xl font-black text-navy-secondary mb-12">選ばれる理由</h2>
                    <div className="space-y-8 text-left">
                        <TrustItem text="パタヤ・シラチャに特化した集客力" />
                        <TrustItem text="日本語・英語・タイ語のマルチリンガル対応" />
                        <TrustItem text="AIを活用した効率的な物件管理システム" />
                        <TrustItem text="LINE連携による迅速な顧客対応" />
                    </div>
                    <div className="mt-16">
                        <Link
                            href={`/${locale}/agent/signup`}
                            className="inline-flex items-center space-x-3 text-navy-primary font-black text-xl hover:text-navy-secondary transition-colors group"
                        >
                            <span>今すぐ無料で始める</span>
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BenefitCard({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: string }) {
    return (
        <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-50 hover:border-navy-primary/20 transition-all group">
            <div className={`${color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-navy-secondary mb-4">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
    )
}

function TrustItem({ text }: { text: string }) {
    return (
        <div className="flex items-center space-x-4">
            <div className="bg-emerald-50 p-1 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-lg font-bold text-slate-700">{text}</span>
        </div>
    )
}
