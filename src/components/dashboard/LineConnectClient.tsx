'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Loader2,
    Save,
    Sparkles,
    ImageIcon,
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    ArrowBigDown,
    Smartphone,
    Settings,
    MessageCircle,
    AlertTriangle,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { getOfficialLineAddFriendUrl, LINE_OFFICIAL_ACCOUNT_APP_IOS, LINE_OFFICIAL_ACCOUNT_APP_ANDROID } from '@/lib/line-official'
import {
    isLineOfficialAccountAddFriendUrl,
    isLineOfficialConnectionUrl,
} from '@/lib/line-official-account-url'
import { clsx } from 'clsx'

/**
 * 提供スクリーンショット（Screenshot_2026-04-06-13-34-08-16… 等）を次のファイル名で配置してください:
 * public/images/line-official-app-guide/step-1-home.png
 * public/images/line-official-app-guide/step-2-url-create.png
 * public/images/line-official-app-guide/step-3-copy-url.png
 */
const LINE_APP_GUIDE_IMAGES = {
    step1: '/images/line-official-app-guide/step-1-home.png',
    step2: '/images/line-official-app-guide/step-2-url-create.png',
    step3: '/images/line-official-app-guide/step-3-copy-url.png',
} as const

function GuideStepScreenshot({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false)
    if (failed) {
        return (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <ImageIcon className="h-10 w-10 text-slate-400" aria-hidden />
                <p className="text-xs font-black text-slate-600">スクリーンショット画像を配置してください</p>
                <code className="max-w-full break-all rounded-lg bg-white px-2 py-1 text-[10px] text-slate-600">{src}</code>
                <p className="text-[10px] font-medium leading-relaxed text-slate-500">
                    ご提供の画像（Screenshot_2026-04-06-13-34-08-16… / 13-34-16-20… / 13-34-22-86…）を上記パスに保存してください。
                </p>
            </div>
        )
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- 動的パス・配置漏れ時の onError 表示のため
        <img
            src={src}
            alt={alt}
            className="mx-auto max-h-[min(52vh,460px)] w-full max-w-[300px] rounded-2xl border border-slate-200 bg-slate-900/5 object-contain shadow-lg"
            loading="lazy"
            onError={() => setFailed(true)}
        />
    )
}

function getOperationsSupportLineUrl(): string {
    const env = process.env.NEXT_PUBLIC_OPERATIONS_SUPPORT_LINE_URL?.trim()
    if (env) return env
    return getOfficialLineAddFriendUrl()
}

/** 設定 → 応答設定 → チャットモード の流れ（概念図） */
function SvgChatModeSettingsFlow() {
    const id = useId().replace(/:/g, '')
    return (
        <svg viewBox="0 0 520 200" className="h-auto w-full max-w-[520px]" role="img" aria-label="設定から応答設定へ進み、チャットモードを選ぶ流れ">
            <defs>
                <linearGradient id={`cm-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef2f2" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
            </defs>
            <rect width="520" height="200" rx="12" fill={`url(#cm-${id})`} stroke="#fecaca" strokeWidth="1" />
            <text x="260" y="28" textAnchor="middle" fontSize="12" fill="#991b1b" fontWeight="700" fontFamily="system-ui,sans-serif">
                LINE公式アカウントアプリ内のイメージ
            </text>
            {/* ホーム */}
            <rect x="24" y="52" width="100" height="72" rx="10" fill="#fff" stroke="#cbd5e1" />
            <text x="74" y="82" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui,sans-serif">
                ホーム
            </text>
            <circle cx="74" cy="108" r="14" fill="#e2e8f0" stroke="#94a3b8" />
            <text x="74" y="112" textAnchor="middle" fontSize="12" fill="#475569">
                ⚙
            </text>
            <text x="74" y="128" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="system-ui,sans-serif">
                設定
            </text>
            <text x="140" y="92" fontSize="18" fill="#94a3b8">
                →
            </text>
            {/* 応答設定 */}
            <rect x="164" y="52" width="120" height="72" rx="10" fill="#fff" stroke="#06C755" strokeWidth="2" />
            <text x="224" y="82" textAnchor="middle" fontSize="11" fill="#0f172a" fontWeight="700" fontFamily="system-ui,sans-serif">
                応答設定
            </text>
            <text x="224" y="100" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="system-ui,sans-serif">
                応答モード
            </text>
            <text x="300" y="92" fontSize="18" fill="#94a3b8">
                →
            </text>
            {/* チャット選択 */}
            <rect x="324" y="52" width="172" height="72" rx="10" fill="#ecfdf5" stroke="#06C755" strokeWidth="2" />
            <text x="410" y="80" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="system-ui,sans-serif">
                「ボット」ではなく
            </text>
            <text x="410" y="100" textAnchor="middle" fontSize="12" fill="#047857" fontWeight="800" fontFamily="system-ui,sans-serif">
                「チャット」を選択
            </text>
            <text x="260" y="178" textAnchor="middle" fontSize="10" fill="#b91c1c" fontWeight="700" fontFamily="system-ui,sans-serif">
                ※ アプリの表示はバージョンにより異なる場合があります
            </text>
        </svg>
    )
}

export default function LineConnectClient({ locale }: { locale: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [celebrate, setCelebrate] = useState(false)
    /** profiles.line_basic_id（https URL または @xxx どちらも可） */
    const [lineFriendAddUrl, setLineFriendAddUrl] = useState('')
    const [deviceTestUrl, setDeviceTestUrl] = useState<string | null>(null)
    const [deviceTestErr, setDeviceTestErr] = useState<string | null>(null)
    const [deviceTestLoading, setDeviceTestLoading] = useState(false)
    const [chatModeAcknowledged, setChatModeAcknowledged] = useState(false)
    const successRef = useRef<HTMLDivElement>(null)
    const operationsLineUrl = getOperationsSupportLineUrl()

    const urlFormatOk = useMemo(() => {
        const raw = lineFriendAddUrl.trim()
        if (!raw) return false
        if (/^@[A-Za-z0-9._-]{2,128}$/.test(raw)) return true
        return isLineOfficialConnectionUrl(raw) || isLineOfficialAccountAddFriendUrl(raw)
    }, [lineFriendAddUrl])

    const runDeviceOaMessageTest = async () => {
        const raw = lineFriendAddUrl.trim()
        if (!urlFormatOk) return
        setDeviceTestLoading(true)
        setDeviceTestErr(null)
        try {
            const res = await fetch('/api/line/preview-oa-message-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawUrl: raw }),
            })
            const data = (await res.json()) as { url?: string; error?: string }
            if (!res.ok || !data.url) {
                setDeviceTestErr(data.error || 'プレビューに失敗しました')
                setDeviceTestUrl(null)
                return
            }
            setDeviceTestUrl(data.url)
            window.open(data.url, '_blank', 'noopener,noreferrer')
        } catch {
            setDeviceTestErr('通信に失敗しました')
            setDeviceTestUrl(null)
        } finally {
            setDeviceTestLoading(false)
        }
    }

    useEffect(() => {
        const run = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }
            const { data } = await supabase.from('profiles').select('line_basic_id').eq('id', user.id).maybeSingle()
            setLineFriendAddUrl((data as { line_basic_id?: string | null } | null)?.line_basic_id?.trim() || '')
            setLoading(false)
        }
        void run()
    }, [supabase])

    useEffect(() => {
        if (celebrate && successRef.current) {
            successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [celebrate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setCelebrate(false)
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) throw new Error('ログインが必要です。')

            if (urlFormatOk && !chatModeAcknowledged) {
                setError(
                    'お客様からのメッセージに返信できるよう、下の「チャットモードをONにしました」にチェックを入れてから保存してください。'
                )
                setSaving(false)
                return
            }

            const { error: upErr } = await supabase
                .from('profiles')
                .update({
                    line_basic_id: lineFriendAddUrl.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
            if (upErr) throw upErr

            setCelebrate(true)
        } catch (err: unknown) {
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-navy-primary" />
            </div>
        )
    }

    return (
        <>
            <div className="mb-8">
                <Link
                    href={`/${locale}/dashboard/settings`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-navy-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    プロフィール設定に戻る
                </Link>
            </div>

            <a
                href={operationsLineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-8 block overflow-hidden rounded-[1.75rem] border-[3px] border-[#06C755] bg-gradient-to-br from-[#06C755]/20 via-white to-emerald-50 p-6 shadow-xl shadow-[#06C755]/15 transition hover:border-[#049948] hover:shadow-2xl md:p-8"
            >
                <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
                    <div className="min-w-0 space-y-2">
                        <p className="text-base font-black leading-snug text-navy-secondary md:text-lg md:leading-relaxed">
                            作成方法がわからない場合は、運営のLINEが画面越しにサポートします
                        </p>
                        <p className="text-xs font-bold text-emerald-900/80">
                            無料でご案内します。お気軽にトークでお声がけください。
                        </p>
                    </div>
                    <span className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-8 py-4 text-sm font-black text-white shadow-lg shadow-[#06C755]/35">
                        運営の公式LINEを開く
                        <ExternalLink className="h-5 w-5" aria-hidden />
                    </span>
                </div>
            </a>

            {celebrate && (
                <div
                    ref={successRef}
                    className="mb-8 rounded-[2rem] border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 p-8 md:p-10 shadow-xl"
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                            <Sparkles className="h-9 w-9" strokeWidth={2.2} />
                        </div>
                        <p className="text-xl md:text-2xl font-black text-emerald-900 leading-snug max-w-xl">
                            おめでとうございます！これであなたのLINEでお客様と繋がれるようになりました
                        </p>
                        <p className="text-sm font-bold text-emerald-800/90 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            設定は保存済みです。物件ページの「LINE問い合わせ」は oaMessage 形式で開き、物件名入りの下書き付きトークになります。
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
                    <div className="min-w-0 space-y-10">
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-navy-secondary md:text-xl">
                                アプリからURLをコピーするだけ
                            </h2>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                                左の画面どおりに進め、最後にコピーしたURLを右の欄に貼って保存してください。
                            </p>
                            <div className="mt-5 rounded-2xl border-2 border-[#06C755]/40 bg-gradient-to-br from-[#06C755]/12 via-white to-[#06C755]/5 p-5 shadow-md md:p-6">
                                <p className="text-[11px] font-black uppercase tracking-wider text-[#047c3d]">
                                    導入の前提（必須）
                                </p>
                                <p className="mt-2 text-base font-black leading-snug text-navy-secondary md:text-lg">
                                    アプリをまだ入れていない方
                                </p>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                    <a
                                        href={LINE_OFFICIAL_ACCOUNT_APP_IOS}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#06C755] bg-white px-6 py-3.5 text-base font-black text-[#047c3d] shadow-sm transition hover:bg-[#06C755]/10 active:scale-[0.99] sm:min-w-[200px]"
                                    >
                                        App Store
                                        <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
                                    </a>
                                    <a
                                        href={LINE_OFFICIAL_ACCOUNT_APP_ANDROID}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#06C755] bg-white px-6 py-3.5 text-base font-black text-[#047c3d] shadow-sm transition hover:bg-[#06C755]/10 active:scale-[0.99] sm:min-w-[200px]"
                                    >
                                        Google Play
                                        <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <section className="space-y-3">
                            <p className="inline-flex rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                ステップ①
                            </p>
                            <h3 className="text-sm font-black text-navy-secondary md:text-base">アプリのホーム画面</h3>
                            <GuideStepScreenshot
                                src={LINE_APP_GUIDE_IMAGES.step1}
                                alt="LINE公式アカウントアプリのホーム。右下に友だちを増やすボタンがある画面"
                            />
                            <p className="text-sm font-medium leading-relaxed text-slate-700">
                                「LINE公式アカウント」アプリを開き、右下の{' '}
                                <strong className="text-navy-secondary">『友だちを増やす』</strong> ボタンをタップします。
                            </p>
                        </section>

                        <section className="space-y-3">
                            <p className="inline-flex rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                ステップ②
                            </p>
                            <h3 className="text-sm font-black text-navy-secondary md:text-base">増やす方法の選択</h3>
                            <GuideStepScreenshot
                                src={LINE_APP_GUIDE_IMAGES.step2}
                                alt="友だちを増やす画面。右下にURLを作成パネルがある画面"
                            />
                            <p className="text-sm font-medium leading-relaxed text-slate-700">
                                右下にある <strong className="text-navy-secondary">『URLを作成』</strong> パネルをタップします。
                            </p>
                        </section>

                        <section className="space-y-3">
                            <p className="inline-flex rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                ステップ③
                            </p>
                            <h3 className="text-sm font-black text-navy-secondary md:text-base">URLのコピー</h3>
                            <GuideStepScreenshot
                                src={LINE_APP_GUIDE_IMAGES.step3}
                                alt="作成されたURLと緑色のURLをコピーボタンがある画面"
                            />
                            <p className="text-sm font-medium leading-relaxed text-slate-700">
                                表示されたURLを確認し、緑色の{' '}
                                <strong className="text-navy-secondary">『URLをコピー』</strong> ボタンをタップします。
                            </p>
                        </section>

                        <section className="space-y-4 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50/90 to-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="inline-flex rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                    ステップ④
                                </p>
                                <h3 className="text-base font-black text-red-900 md:text-lg">重要：チャット機能をONにする</h3>
                            </div>
                            <p className="flex items-start gap-2 text-sm font-black leading-snug text-red-700">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                                ここを忘れると、お客様からメッセージが届いても返信ができません！
                            </p>
                            <ol className="list-decimal space-y-2.5 pl-5 text-sm font-medium leading-relaxed text-slate-800">
                                <li>
                                    <span className="flex gap-2.5">
                                        <Settings
                                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                                            aria-hidden
                                        />
                                        <span className="min-w-0 flex-1 font-bold leading-relaxed text-navy-secondary">
                                            LINE公式アカウントアプリの<strong>ホーム画面</strong>から「<strong>設定（歯車マーク）</strong>」をタップ。
                                        </span>
                                    </span>
                                </li>
                                <li>
                                    <strong className="text-navy-secondary">「応答設定」</strong>をタップ。
                                </li>
                                <li>
                                    応答モードを「<strong>ボット</strong>」から「
                                    <strong className="text-[#047c3d]">チャット</strong>」に切り替える。
                                    <MessageCircle className="ml-1 inline h-4 w-4 text-[#06C755] align-text-bottom" aria-hidden />
                                </li>
                            </ol>
                            <div className="overflow-hidden rounded-xl border border-red-100 bg-white p-2">
                                <SvgChatModeSettingsFlow />
                            </div>
                        </section>
                    </div>

                    <div className="min-w-0 lg:sticky lg:top-24">
                        <div className="rounded-[1.75rem] border-2 border-navy-primary/15 bg-gradient-to-b from-white via-slate-50/90 to-white p-6 shadow-xl md:p-8">
                            <div className="flex flex-col items-center gap-1 text-center">
                                <ArrowBigDown className="h-12 w-12 shrink-0 text-[#06C755]" strokeWidth={1.25} aria-hidden />
                                <p className="text-lg font-black leading-snug text-navy-secondary">
                                    ここに貼り付けて保存してください
                                </p>
                                <p className="text-xs font-medium text-slate-500">
                                    コピーしたURL（または <code className="rounded bg-slate-100 px-1">@BasicID</code>
                                    ）を貼り付けてください
                                </p>
                            </div>

                            <div className="mt-8 space-y-4">
                                <label htmlFor="line-official-account-url" className="block text-sm font-black text-navy-secondary">
                                    LINE公式アカウントのURL
                                </label>
                                <p className="text-xs font-medium text-slate-500">
                                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">https://lin.ee/...</code> または{' '}
                                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">https://line.me/...</code>{' '}
                                    で始まる形式です。
                                </p>
                                <div className="relative">
                                    <input
                                        id="line-official-account-url"
                                        type="text"
                                        inputMode="url"
                                        value={lineFriendAddUrl}
                                        onChange={(e) => {
                                            setLineFriendAddUrl(e.target.value)
                                            setCelebrate(false)
                                            setChatModeAcknowledged(false)
                                        }}
                                        className={clsx(
                                            'w-full rounded-xl border bg-slate-50 py-3 pl-4 pr-12 text-sm outline-none transition focus:ring-2',
                                            urlFormatOk
                                                ? 'border-emerald-400 ring-navy-primary/0 focus:border-emerald-500 focus:ring-emerald-500/20'
                                                : 'border-slate-200 ring-navy-primary/0 focus:ring-navy-primary/30'
                                        )}
                                        placeholder="https://lin.ee/xxxxxxxx"
                                        autoComplete="off"
                                        aria-invalid={lineFriendAddUrl.trim().length > 0 && !urlFormatOk}
                                    />
                                    {urlFormatOk ? (
                                        <>
                                            <span
                                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                                                title="URLの形式を確認しました"
                                            >
                                                <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                                            </span>
                                            <span className="sr-only" aria-live="polite">
                                                連携準備が整いました。
                                            </span>
                                        </>
                                    ) : null}
                                </div>

                                {urlFormatOk ? (
                                    <div
                                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900 shadow-sm"
                                        aria-live="polite"
                                    >
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                                        連携準備が整いました！
                                    </div>
                                ) : null}

                                {urlFormatOk ? (
                                    <div className="space-y-3 rounded-2xl border border-navy-primary/15 bg-white p-4 shadow-sm">
                                        <p className="text-xs font-bold leading-relaxed text-navy-secondary">
                                            <Smartphone className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-[#06C755]" aria-hidden />
                                            自分のスマホで動作確認（iPhone / Android）
                                        </p>
                                        <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                                            ボタンで<strong>物件ページと同じ方式</strong>のリンクを新しいタブで開きます。LINE
                                            アプリに切り替わり、<strong>下書き付きのトーク画面</strong>
                                            が表示されれば成功です。公式アカウント未友だちの場合は、先に友だち追加が出ることがあります（LINE
                                            側の仕様です）。
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => void runDeviceOaMessageTest()}
                                            disabled={deviceTestLoading}
                                            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[#06C755] bg-white py-3 text-sm font-black text-[#047c3d] transition hover:bg-[#06C755]/10 disabled:opacity-50"
                                        >
                                            {deviceTestLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                                            ) : (
                                                <Smartphone className="h-5 w-5" aria-hidden />
                                            )}
                                            自分のスマホで動作確認
                                        </button>
                                        {deviceTestErr ? (
                                            <p className="text-[11px] font-bold text-red-600">{deviceTestErr}</p>
                                        ) : null}
                                        {deviceTestUrl ? (
                                            <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-3">
                                                <p className="text-[10px] font-bold text-slate-500">スマホのカメラで読み取り（同一URL）</p>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- 外部QR API・動的URL */}
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=1&data=${encodeURIComponent(deviceTestUrl)}`}
                                                    alt=""
                                                    className="rounded-xl border border-slate-200 bg-white p-1"
                                                    width={180}
                                                    height={180}
                                                />
                                                <a
                                                    href={deviceTestUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] font-black text-[#047c3d] underline"
                                                >
                                                    リンクをもう一度開く
                                                </a>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {lineFriendAddUrl.trim().length > 0 && !urlFormatOk ? (
                                    <p className="text-[11px] font-medium text-amber-800/90">
                                        <code className="rounded bg-amber-100/80 px-1">https://lin.ee/...</code> または{' '}
                                        <code className="rounded bg-amber-100/80 px-1">https://line.me/...</code>（https必須）、または{' '}
                                        <code className="rounded bg-amber-100/80 px-1">@BasicID</code> を入力してください。
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200/80 pt-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                                    {urlFormatOk ? (
                                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-3 text-left shadow-sm transition hover:border-amber-300 sm:max-w-md">
                                            <input
                                                type="checkbox"
                                                checked={chatModeAcknowledged}
                                                onChange={(e) => setChatModeAcknowledged(e.target.checked)}
                                                className="mt-1 h-4 w-4 shrink-0 rounded border-amber-400 text-[#06C755] focus:ring-[#06C755]"
                                            />
                                            <span className="text-sm font-bold leading-snug text-amber-950">
                                                チャットモードをONにしました
                                                <span className="mt-1 block text-xs font-medium text-amber-900/80">
                                                    （応答モードを「チャット」に切り替え済み）
                                                </span>
                                            </span>
                                        </label>
                                    ) : null}
                                    <button
                                        type="submit"
                                        disabled={saving || (urlFormatOk && !chatModeAcknowledged)}
                                        title={
                                            urlFormatOk && !chatModeAcknowledged
                                                ? 'チャットモード確認のチェックが必要です'
                                                : undefined
                                        }
                                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#05a649] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        設定を保存する
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}
