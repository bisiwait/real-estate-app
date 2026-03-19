"use client";
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
    ChevronDown,
    ChevronUp,
    HelpCircle,
    X,
    Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'
import Switch from '@/components/ui/Switch'

// Stripe Price IDs（管理画面で作成したもの）. 未設定時は確認モーダルでエラー表示
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY ?? ''
const STRIPE_PRICE_ID_YEARLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY ?? ''

export default function PricingPage() {
    const params = useParams()
    const router = useRouter()
    const locale = params.locale as string
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isAnnual, setIsAnnual] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [confirmError, setConfirmError] = useState<string | null>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        checkUser()
    }, [])

    const billingStartDate = addDays(new Date(), 30)
    const billingStartDateLabel = billingStartDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    const premiumPriceLabel = isAnnual ? '฿48,000 / 年' : '฿5,000 / 月'

    const openConfirm = () => {
        setConfirmError(null)
        setIsConfirmOpen(true)
    }

    const closeConfirm = () => {
        setConfirmError(null)
        setIsConfirmOpen(false)
    }

    /**
     * トライアル開始: /api/checkout でセッション作成し、返却された url へ遷移する。
     * 引数は isYearly に応じた Stripe の priceId（環境変数で設定）。
     */
    const handleCheckout = async (priceId: string) => {
        if (!user) {
            router.push(`/${locale}/login?redirect=pricing`)
            return
        }
        if (!priceId) {
            setConfirmError('Price ID が設定されていません。管理者にお問い合わせください。')
            return
        }

        setLoading(true)
        setConfirmError(null)
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId }),
            })

            const data = (await res.json()) as { url?: string; error?: string }

            if (!res.ok) {
                throw new Error(data.error || `Request failed (${res.status})`)
            }
            if (!data.url) {
                throw new Error(data.error || 'Checkout URL を取得できませんでした。')
            }

            window.location.href = data.url
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setConfirmError(msg)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmCheckout = () => {
        const priceId = isAnnual ? STRIPE_PRICE_ID_YEARLY : STRIPE_PRICE_ID_MONTHLY
        handleCheckout(priceId)
    }

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900 font-sans overflow-x-hidden pb-20">
            {/* Custom Styles for Shimmer */}
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
                        rgba(255, 255, 255, 0.55),
                        transparent
                    );
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {/* Hero (light, high-contrast) */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-50" />
                <div className="container mx-auto px-4 relative z-10 pt-16 pb-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-sm">
                            <Crown className="w-4 h-4 text-blue-600" />
                            Premium for Agents
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-slate-900">
                            不動産業務を、もっと速く。<br />
                            <span className="text-blue-600">もっと強く。</span>
                        </h1>
                        <p className="mt-5 text-slate-500 text-base md:text-xl font-medium leading-relaxed">
                            パタヤ・シラチャ市場向けの不動産SaaS。掲載・翻訳・資料作成・集客をひとつに。
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={openConfirm}
                                disabled={loading}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-colors shadow-md disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                1ヶ月の無料トライアルを開始
                                <ArrowRight className="w-5 h-5" />
                            </button>
                            <Link
                                href={user ? `/${locale}/dashboard/settings` : `/${locale}/register`}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black border border-slate-200 transition-colors shadow-sm"
                            >
                                {user ? '設定を開く' : '無料で始める'}
                            </Link>
                        </div>
                        <div className="mt-8 flex flex-col items-center gap-2 text-slate-400">
                            <span className="text-[10px] uppercase font-bold tracking-widest">Plans & Features</span>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 relative z-10 mt-6">
                {/* Billing switch */}
                <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm font-black text-slate-900">
                        お支払い方法
                        <span className="ml-2 text-slate-500 font-bold">（月払い / 年払い）</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm w-full sm:w-auto">
                        <span className={`text-sm font-black ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>月払い</span>
                        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                        <span className={`text-sm font-black ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
                            年払い
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                20% OFF
                            </span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Standard Plan (Free) */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-slate-900 mb-2">Standard</h3>
                            <p className="text-slate-500 text-sm">まずは物件を掲載したい方へ</p>
                        </div>
                        <div className="mb-10 flex items-baseline gap-2">
                            <span className="text-5xl font-black text-slate-900">Free</span>
                            <span className="text-slate-500 font-bold">（฿0）</span>
                        </div>

                        <div className="space-y-5 mb-12 flex-1">
                            <FeatureItem text="物件情報の一般掲載（制限なし）" />
                            <FeatureItem text="基本お問い合わせの受信" />
                            <FeatureItem text="エージェントプロフィールの表示" />
                            <FeatureItem text="AI多言語自動翻訳" strike active={false} />
                            <FeatureItem text="プレセール物件の優先掲載" strike active={false} />
                            <FeatureItem text="PDFチラシ作成" strike active={false} />
                        </div>

                        <Link
                            href={user ? `/${locale}/dashboard/settings` : `/${locale}/register`}
                            className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-center hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.98]"
                        >
                            {user ? '現在のプラン' : '無料で始める'}
                        </Link>
                    </div>

                    {/* Premium Plan */}
                    <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-md flex flex-col md:col-span-1 xl:col-span-2 overflow-hidden">
                        {/* Accent */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                        <div className="absolute top-6 right-6">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                <Zap className="w-3.5 h-3.5" />
                                Recommended
                            </span>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-black text-slate-900">Premium</h3>
                                <Crown className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-slate-500 text-sm">勝ち続けるためのプロフェッショナル装備</p>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl md:text-6xl font-black text-slate-900">
                                    {isAnnual ? '48,000' : '5,000'}
                                </span>
                                <span className="text-xl font-black text-slate-900 uppercase">THB</span>
                                <span className="text-slate-500 text-lg">{isAnnual ? '/ 年' : '/ 月'}</span>
                            </div>
                            <p className="mt-2 text-slate-500 text-sm font-bold flex items-center gap-2">
                                <Zap className="w-4 h-4 text-blue-600" />
                                成約1件で、約1年分の利用料を回収可能
                            </p>
                        </div>

                        <div className="space-y-6 mb-12 mt-8 flex-1">
                            <BenefitItem
                                icon={<Building2 className="w-5 h-5 text-blue-600" />}
                                title="プレセール物件の優先掲載"
                                desc="一般公開前の希少な情報を扱い、優良投資家顧客をいち早く囲い込みます。"
                            />
                            <BenefitItem
                                icon={<Sparkles className="w-5 h-5 text-blue-600" />}
                                title="AI 3か国語自動翻訳・執筆"
                                desc="日英タイの紹介文作成時間をゼロに。多言語で「売れる」文章を瞬時に生成。"
                            />
                            <BenefitItem
                                icon={<FileText className="w-5 h-5 text-blue-600" />}
                                title="プロ仕様PDFプレゼン資料"
                                desc="自身の連絡先・QRコード入りチラシを1クリック。即内見・即商談へ繋げます。"
                            />
                            <BenefitItem
                                icon={<Search className="w-5 h-5 text-blue-600" />}
                                title="検索結果の最上位表示"
                                desc="物件一覧のトップに固定。無料プラン比でPV数を最大10倍まで引き上げます。"
                            />
                        </div>

                        <button
                            onClick={openConfirm}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg transition-colors shadow-md active:scale-[0.98] flex items-center justify-center gap-3 shimmer-bg disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
                            1ヶ月の無料トライアルを開始
                            <ArrowRight className="w-6 h-6" />
                        </button>
                        <p className="text-center text-slate-500 text-[10px] mt-4 font-bold">
                            本日のお支払いは ฿0。期間内に解約すれば料金はかかりません。
                        </p>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-32 max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4 opacity-80" />
                        <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900">よくあるご質問</h2>
                        <p className="text-slate-500 mt-2 font-medium">Q&A</p>
                    </div>

                    <div className="space-y-4">
                        <FaqItem
                            question="2週間の無料トライアル中に解約はできますか？"
                            answer="はい、いつでも可能です。トライアル期間終了までに解約すれば、料金は一切かかりません。ダッシュボードからワンクリックで解約可能です。"
                        />
                        <FaqItem
                            question="AI翻訳の精度はどの程度ですか？"
                            answer="最新のGemini AIを使用しており、不動産専門用語を含めた自然な3ヶ国語（日・英・泰）を生成します。生成後の手動微調整も可能です。"
                        />
                        <FaqItem
                            question="PDFチラシに自分のロゴを入れることはできますか？"
                            answer="現在、エージェント名とLINE ID、QRコードが自動印字されます。個別ロゴ対応も順次アップデート予定です。"
                        />
                    </div>
                </div>

                {/* Comparison Section */}
                <div className="mt-32 max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900">機能比較表</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent mx-auto" />
                    </div>

                    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="p-6 md:p-8 text-sm font-bold text-slate-500 uppercase tracking-widest">機能</th>
                                    <th className="p-6 md:p-8 text-sm font-black text-center border-l border-slate-200 text-slate-900">Standard</th>
                                    <th className="p-6 md:p-8 text-sm font-black text-center text-blue-700 border-l border-slate-200 bg-blue-50">Premium</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                <TableRow label="物件掲載（賃貸・売買）" free={true} premium={true} />
                                <TableRow label="写真アップロード（無制限）" free={true} premium={true} />
                                <TableRow label="プレセール物件フラグ" free={false} premium={true} />
                                <TableRow label="AI 3か国語自動翻訳" free={false} premium={true} />
                                <TableRow label="AI 本文自動生成" free={false} premium={true} />
                                <TableRow label="プロ仕様PDFチラシ生成" free={false} premium={true} />
                                <TableRow label="検索結果の上位表示" free={false} premium={true} />
                                <TableRow label="エージェント認証バッジ" free={false} premium={true} />
                                <TableRow label="優先チャットサポート" free={false} premium={true} />
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="mt-40 text-center pb-20">
                    <h2 className="text-3xl md:text-6xl font-black mb-10 tracking-tight text-slate-900">
                        プロとしての結果を、<br className="md:hidden" />今ここで。
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            href={`/${locale}/dashboard`}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-black text-lg transition-colors shadow-md border border-slate-200 active:scale-95"
                        >
                            ダッシュボードに戻る
                        </Link>
                        <button
                            onClick={openConfirm}
                            disabled={loading}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-colors shadow-md active:scale-95 shimmer-bg disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                '無料トライアルを開始'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirm modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <button
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={closeConfirm}
                        aria-label="Close"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    <Zap className="w-3.5 h-3.5" />
                                    Confirm
                                </div>
                                <h3 className="mt-3 text-2xl font-black text-slate-900">プラン内容の確認</h3>
                                <p className="mt-2 text-slate-500 text-sm font-medium">
                                    次へ進む前に、内容をご確認ください。
                                </p>
                            </div>
                            <button
                                onClick={closeConfirm}
                                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</div>
                                        <div className="text-lg font-black text-slate-900">Premium</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price</div>
                                        <div className="text-lg font-black text-slate-900 tabular-nums">
                                            {premiumPriceLabel}
                                        </div>
                                    </div>
                                </div>
                                {isAnnual && (
                                    <div className="mt-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                            20% OFF
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-blue-200 rounded-2xl p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today</div>
                                <div className="mt-1 text-2xl font-black text-blue-700">本日のお支払いは ฿0 です</div>
                                <p className="mt-2 text-slate-500 text-sm font-medium">
                                    1ヶ月後の <span className="font-black text-slate-900">{billingStartDateLabel}</span> から課金が開始されます。期間内に解約すれば料金はかかりません。
                                </p>
                            </div>

                            {confirmError && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-bold">
                                    {confirmError}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={closeConfirm}
                                className="w-full sm:w-auto flex-1 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black border border-slate-200 transition-colors"
                                disabled={loading}
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
                                className="w-full sm:w-auto flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-colors shadow-md disabled:opacity-70 inline-flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        処理中...
                                    </>
                                ) : (
                                    '同意して次へ進む'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function FeatureItem({ text, strike = false, active = true }: { text: string, strike?: boolean, active?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${active ? 'text-slate-900' : 'text-slate-500'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                {active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3 text-slate-400" />}
            </div>
            <span className={`text-sm font-medium ${strike ? 'line-through opacity-50' : ''}`}>{text}</span>
        </div>
    )
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-5 items-start group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm group-hover:scale-105 transition-transform">
                {icon}
            </div>
            <div className="space-y-1.5 pt-0.5">
                <h4 className="text-slate-900 font-black text-lg leading-none">{title}</h4>
                <p className="text-slate-500 text-[13px] leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    )
}

function TableRow({ label, free, premium }: { label: string, free: any, premium: any }) {
    const renderVal = (val: any) => {
        if (typeof val === 'boolean') {
            return val ? (
                <div className="bg-emerald-50 w-9 h-9 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5 text-emerald-600" />
                </div>
            ) : (
                <div className="bg-slate-100 w-9 h-9 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                    <X className="w-4 h-4 text-slate-400" />
                </div>
            );
        }
        return <span className="text-sm font-bold text-slate-900">{val}</span>;
    }

    return (
        <tr className="hover:bg-slate-50 transition-colors group">
            <td className="p-6 md:p-8 text-sm font-bold text-slate-900">{label}</td>
            <td className="p-6 md:p-8 text-center border-l border-slate-200">{renderVal(free)}</td>
            <td className="p-6 md:p-8 text-center border-l border-slate-200 bg-blue-50">{renderVal(premium)}</td>
        </tr>
    )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`bg-white border transition-all duration-300 ${isOpen ? 'border-blue-200' : 'border-slate-200'} rounded-2xl overflow-hidden shadow-sm`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
                <span className="font-black text-lg pr-8 text-slate-900">{question}</span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-6 pt-0 text-slate-500 font-medium leading-relaxed border-t border-slate-200 mt-4">
                    {answer}
                </div>
            </div>
        </div>
    )
}
