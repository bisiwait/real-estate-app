import Link from 'next/link'
import { CheckCircle2, ChevronRight, Rocket, Star, UploadCloud, Users } from 'lucide-react'
import PricingSection from './PricingSection'

export const metadata = {
    title: '物件を掲載する（エージェント様向け） | Chonburi Connect',
    description: 'パタヤ・シラチャ最大級の日本人向け不動産ポータルで、質の高い顧客へアプローチ。AIを駆使した簡単な物件登録で、集客を効率化します。'
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
                            パタヤ・シラチャ最大級の<br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">日本人向け不動産ポータル</span>で、<br className="hidden md:block" />
                            質の高い顧客へアプローチ。
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 leading-relaxed max-w-2xl">
                            Chonburi Connectは、パタヤ・シラチャエリアに特化した不動産プラットフォームです。洗練されたUIと確かなターゲティングで、日本の駐在員・投資家とあなたを繋ぎます。
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/register" className="bg-navy-primary hover:bg-blue-600 text-white px-8 py-4 rounded-full font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center">
                                今すぐ無料で掲載を始める
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Link>
                            <a href="#plans" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center">
                                料金プランを見る
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps Section */}
            <div className="container mx-auto px-4 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-navy-secondary mb-4">掲載までのシンプルな3ステップ</h2>
                    <p className="text-slate-500 font-medium">最新のテクノロジーを活用し、驚くほど簡単に物件を公開できます。</p>
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
                        <h3 className="text-xl font-black text-navy-secondary mb-3">アカウント登録（無料）</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            メールアドレスのみで、わずか1分で登録完了。すぐにダッシュボードへアクセスできます。
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <UploadCloud className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Step 2</div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">物件情報の登録</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            <span className="font-bold text-navy-secondary">AIインポーター機能</span>により、外部サイトのURLを1つ入力するだけで、画像や詳細情報を自動取得・翻訳します。
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Rocket className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Step 3</div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">掲載開始・集客</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            ワンクリックで公開。ポータルサイトを訪れる日本人ユーザーからの問い合わせが、直接あなたに届きます。
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
                        <h2 className="text-3xl font-black text-navy-secondary mb-6">まずは無料で始めてみませんか？</h2>
                        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto font-medium">
                            Chonburi Connectは、現地の物件情報を探す日本人と、優良な物件を持つあなたを効率的に結びつけます。初期費用ゼロ、最短1分で登録完了です。
                        </p>
                        <Link href="/register" className="inline-flex bg-navy-secondary hover:bg-slate-800 text-white px-10 py-5 rounded-full font-black text-lg transition-all shadow-xl hover:-translate-y-1 items-center">
                            無料アカウントを作成する
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
} 
