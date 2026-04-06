'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Loader2,
    Save,
    ShieldCheck,
    Sparkles,
    ImageIcon,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Wrench,
} from 'lucide-react'
import Dialog from '@/components/ui/Dialog'
import { getErrorMessage } from '@/lib/utils/errors'
import { getOfficialLineAddFriendUrl } from '@/lib/line-official'

type GuideStep = 1 | 2 | 3

function getOperationsSupportLineUrl(): string {
    const env = process.env.NEXT_PUBLIC_OPERATIONS_SUPPORT_LINE_URL?.trim()
    if (env) return env
    return getOfficialLineAddFriendUrl()
}

function SvgGuideStep1() {
    const id = useId().replace(/:/g, '')
    return (
        <svg viewBox="0 0 560 300" className="w-full h-auto" role="img" aria-hidden>
            <defs>
                <linearGradient id={`lc-s1-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ecfdf5" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
            </defs>
            <rect width="560" height="300" rx="12" fill={`url(#lc-s1-${id})`} />
            <text
                x="280"
                y="36"
                textAnchor="middle"
                fontSize="13"
                fill="#334155"
                fontWeight="700"
                fontFamily="system-ui,sans-serif"
            >
                LINE Developers（イメージ）
            </text>
            <rect x="24" y="52" width="512" height="40" rx="8" fill="#fff" stroke="#e2e8f0" />
            <text x="40" y="78" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif">
                ログイン後、プロバイダー → チャネル（Messaging API）を選択
            </text>
            <rect x="24" y="108" width="240" height="160" rx="10" fill="#fff" stroke="#cbd5e1" />
            <text x="40" y="132" fontSize="10" fill="#64748b" fontFamily="system-ui,sans-serif">
                チャネル一覧
            </text>
            <rect x="40" y="144" width="200" height="28" rx="6" fill="#06C755" opacity="0.25" />
            <rect x="40" y="180" width="200" height="28" rx="6" fill="#f1f5f9" />
            <rect x="40" y="216" width="200" height="28" rx="6" fill="#f1f5f9" />
            <rect x="280" y="108" width="256" height="160" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeDasharray="6 4" />
            <text x="408" y="180" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                自分の公式アカウント用
            </text>
            <text x="408" y="198" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                チャネルを開く
            </text>
        </svg>
    )
}

function SvgGuideStep2() {
    const id = useId().replace(/:/g, '')
    return (
        <svg viewBox="0 0 560 300" className="w-full h-auto" role="img" aria-hidden>
            <defs>
                <linearGradient id={`lc-s2-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#eff6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width="560" height="300" rx="12" fill={`url(#lc-s2-${id})`} />
            <text
                x="280"
                y="32"
                textAnchor="middle"
                fontSize="13"
                fill="#334155"
                fontWeight="700"
                fontFamily="system-ui,sans-serif"
            >
                「基本設定」タブ（イメージ）
            </text>
            <rect x="24" y="48" width="512" height="36" rx="8" fill="#fff" stroke="#e2e8f0" />
            <rect x="36" y="58" width="72" height="16" rx="4" fill="#06C755" opacity="0.35" />
            <rect x="116" y="58" width="80" height="16" rx="4" fill="#e2e8f0" />
            <rect x="204" y="58" width="100" height="16" rx="4" fill="#e2e8f0" />
            <rect x="24" y="96" width="512" height="180" rx="10" fill="#fff" stroke="#cbd5e1" />
            <text x="40" y="120" fontSize="10" fill="#64748b" fontFamily="system-ui,sans-serif">
                下の方までスクロール
            </text>
            <rect x="40" y="200" width="480" height="56" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
            <text x="56" y="224" fontSize="11" fill="#334155" fontWeight="600" fontFamily="system-ui,sans-serif">
                Channel secret
            </text>
            <text x="56" y="244" fontSize="9" fill="#64748b" fontFamily="ui-monospace,monospace">
                ••••••••••••••••••••
            </text>
            <text
                x="280"
                y="292"
                textAnchor="middle"
                fontSize="10"
                fill="#b45309"
                fontFamily="system-ui,sans-serif"
                fontWeight="600"
            >
                ここをコピーして「LINE連携パスワード」欄に貼り付け
            </text>
        </svg>
    )
}

function SvgGuideStep3() {
    const id = useId().replace(/:/g, '')
    return (
        <svg viewBox="0 0 560 300" className="w-full h-auto" role="img" aria-hidden>
            <defs>
                <linearGradient id={`lc-s3-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
            </defs>
            <rect width="560" height="300" rx="12" fill={`url(#lc-s3-${id})`} />
            <text
                x="280"
                y="32"
                textAnchor="middle"
                fontSize="13"
                fill="#334155"
                fontWeight="700"
                fontFamily="system-ui,sans-serif"
            >
                「Messaging API」タブ（イメージ）
            </text>
            <rect x="24" y="48" width="512" height="36" rx="8" fill="#fff" stroke="#e2e8f0" />
            <rect x="140" y="58" width="120" height="16" rx="4" fill="#06C755" opacity="0.4" />
            <rect x="24" y="96" width="512" height="180" rx="10" fill="#fff" stroke="#cbd5e1" />
            <text x="40" y="124" fontSize="10" fill="#64748b" fontFamily="system-ui,sans-serif">
                ページの一番下付近
            </text>
            <text x="40" y="148" fontSize="11" fill="#334155" fontWeight="600" fontFamily="system-ui,sans-serif">
                Channel access token (long-lived)
            </text>
            <rect x="40" y="158" width="420" height="32" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
            <rect x="200" y="210" width="160" height="40" rx="10" fill="#06C755" opacity="0.9" />
            <text
                x="280"
                y="236"
                textAnchor="middle"
                fontSize="13"
                fill="#fff"
                fontWeight="700"
                fontFamily="system-ui,sans-serif"
            >
                発行
            </text>
            <text
                x="280"
                y="286"
                textAnchor="middle"
                fontSize="10"
                fill="#b45309"
                fontFamily="system-ui,sans-serif"
                fontWeight="600"
            >
                表示された長い文字列を「LINE接続キー」欄に貼り付け
            </text>
        </svg>
    )
}

const GUIDE_COPY: Record<GuideStep, { title: string; description: string; body: React.ReactNode }> = {
    1: {
        title: 'ステップ 1：ログインとチャネル選択',
        description: 'LINE Developers で自分の公式アカウント用チャネルを開きます。',
        body: (
            <>
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium text-slate-600">
                    <li>ブラウザで LINE Developers（developers.line.biz）にログインします。</li>
                    <li>プロバイダーと、お客様対応に使うチャネル（Messaging API）を選択します。</li>
                </ol>
                <p className="mt-4 text-xs text-slate-500">
                    Basic ID（@から始まるID）は、基本設定やアカウント情報に表示されることが多いです。見つからない場合は
                    LINE Official Account Manager のプロフィールも確認してください。
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <SvgGuideStep1 />
                </div>
            </>
        ),
    },
    2: {
        title: 'ステップ 2：Channel Secret をコピー',
        description: '「基本設定」タブの一番下付近にあります。',
        body: (
            <>
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium text-slate-600">
                    <li>チャネル設定で「基本設定」タブを開きます。</li>
                    <li>ページの一番下付近にある「Channel secret」の値をコピーします。</li>
                    <li>この画面の「LINE連携パスワード（Channel Secret）」欄に貼り付けます。</li>
                </ol>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <SvgGuideStep2 />
                </div>
            </>
        ),
    },
    3: {
        title: 'ステップ 3：チャネルアクセストークンを発行',
        description: '「Messaging API」タブの一番下付近です。',
        body: (
            <>
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium text-slate-600">
                    <li>「Messaging API」タブを開きます。</li>
                    <li>ページの一番下付近の「チャネルアクセストークン（長期）」で「発行」ボタンを押します。</li>
                    <li>
                        表示された長い文字列をすべてコピーし、「LINE接続キー（アクセストークン）」欄に貼り付けます。
                    </li>
                </ol>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <SvgGuideStep3 />
                </div>
            </>
        ),
    },
}

export default function LineConnectClient({ locale }: { locale: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [celebrate, setCelebrate] = useState(false)
    /** profiles.line_basic_id（https URL または @xxx どちらも可） */
    const [lineFriendAddUrl, setLineFriendAddUrl] = useState('')
    const [lineChannelSecret, setLineChannelSecret] = useState('')
    const [lineChannelAccessToken, setLineChannelAccessToken] = useState('')
    const [guideOpen, setGuideOpen] = useState<GuideStep | null>(null)
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const successRef = useRef<HTMLDivElement>(null)
    const operationsLineUrl = getOperationsSupportLineUrl()

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
            const { data: cred } = await supabase
                .from('profile_line_messaging_credentials')
                .select('line_channel_access_token, line_channel_secret')
                .eq('user_id', user.id)
                .maybeSingle()
            const tok = cred?.line_channel_access_token?.trim() || ''
            const sec = cred?.line_channel_secret?.trim() || ''
            setLineChannelAccessToken(tok)
            setLineChannelSecret(sec)
            setAdvancedOpen(Boolean(tok || sec))
            setLoading(false)
        }
        void run()
    }, [supabase])

    useEffect(() => {
        if (celebrate && successRef.current) {
            successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [celebrate])

    const openGuide = (step: GuideStep) => setGuideOpen(step)

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

            const { error: upErr } = await supabase
                .from('profiles')
                .update({
                    line_basic_id: lineFriendAddUrl.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
            if (upErr) throw upErr

            const tok = lineChannelAccessToken.trim()
            const sec = lineChannelSecret.trim()
            if (!tok && !sec) {
                const { error: delErr } = await supabase
                    .from('profile_line_messaging_credentials')
                    .delete()
                    .eq('user_id', user.id)
                if (delErr) throw delErr
            } else {
                const { error: credErr } = await supabase.from('profile_line_messaging_credentials').upsert(
                    {
                        user_id: user.id,
                        line_channel_access_token: tok || null,
                        line_channel_secret: sec || null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                )
                if (credErr) throw credErr
            }

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

    const FieldGuideButton = ({ step }: { step: GuideStep }) => (
        <button
            type="button"
            onClick={() => openGuide(step)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#06C755]/30 bg-[#06C755]/10 px-4 py-3 text-xs font-black text-[#047c3d] transition hover:bg-[#06C755]/20"
        >
            <ImageIcon className="h-4 w-4" aria-hidden />
            図で見る
        </button>
    )

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
                className="mb-8 flex flex-col gap-2 rounded-2xl border-2 border-[#06C755] bg-gradient-to-br from-[#06C755]/12 via-white to-emerald-50/80 p-5 shadow-md transition hover:border-[#05a649] hover:shadow-lg md:flex-row md:items-center md:justify-between"
            >
                <p className="text-sm font-black leading-snug text-navy-secondary md:max-w-[calc(100%-8rem)]">
                    設定がわからない方は、運営が無料で代行します。こちらからお問い合わせください
                </p>
                <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#06C755] px-5 py-3 text-xs font-black text-white shadow-md">
                    公式LINEを開く
                    <ExternalLink className="h-4 w-4" aria-hidden />
                </span>
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
                            設定は保存済みです。物件ページの「LINE問い合わせ」から友だち追加ページへ進めます。
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                </div>
            )}

            <div className="mb-6 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3.5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <p className="text-xs font-bold leading-relaxed text-emerald-900">
                    かんたん連携では API キーは不要です。LINE公式アカウントの
                    <strong>友だち追加用URL</strong>を1つ貼るだけで、物件ページからお客様をあなたのLINEへ案内できます。
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-3">
                    <div className="space-y-2">
                        <label className="block text-sm font-black text-navy-secondary">あなたのLINE友だち追加URL</label>
                        <p className="text-xs font-medium text-slate-500">
                            LINE Official Account Manager の「友だち追加」やトークのメニューからコピーできる
                            <code className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px]">https://line.me/R/ti/p/@...</code>
                            形式のURLを貼り付けてください。従来どおり <code className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px]">@あなたのID</code>{' '}
                            だけでも保存できます。
                        </p>
                        <input
                            type="text"
                            inputMode="url"
                            value={lineFriendAddUrl}
                            onChange={(e) => {
                                setLineFriendAddUrl(e.target.value)
                                setCelebrate(false)
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-navy-primary/0 transition focus:ring-2"
                            placeholder="https://line.me/R/ti/p/@your_basic_id"
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-1">
                    <button
                        type="button"
                        onClick={() => setAdvancedOpen((o) => !o)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-4 text-left transition hover:bg-white/60"
                    >
                        <span className="flex items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-primary/10 text-navy-primary">
                                <Wrench className="h-5 w-5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-black text-navy-secondary leading-snug">
                                    管理画面から直接1通目を送りたい方（上級者向け）
                                </span>
                                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                                    Channel Secret / チャネルアクセストークン（Messaging API）を登録する場合はこちら
                                </span>
                            </span>
                        </span>
                        {advancedOpen ? (
                            <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                        ) : (
                            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                        )}
                    </button>

                    {advancedOpen ? (
                        <div className="space-y-6 border-t border-amber-200/60 bg-white/90 px-4 py-6 md:px-6 rounded-b-xl">
                            <p className="text-xs font-medium leading-relaxed text-slate-600">
                                お問い合わせ一覧から<strong>公式LINE経由で Push 通知</strong>
                                として初回返信を送る場合に必要です。サイトの LIFF 設定とも連携します。不要なら空のまま保存して構いません。
                            </p>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:p-5 space-y-3">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <label className="block text-sm font-black text-navy-secondary">
                                            LINE連携パスワード（Channel Secret）
                                        </label>
                                        <p className="text-xs font-medium text-slate-500">
                                            LINE Developers の「基本設定」タブ一番下付近に表示されます。
                                        </p>
                                        <input
                                            type="password"
                                            value={lineChannelSecret}
                                            onChange={(e) => {
                                                setLineChannelSecret(e.target.value)
                                                setCelebrate(false)
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-navy-primary/30"
                                            placeholder="例：32文字前後の英数字（画面に表示される値）"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="flex lg:pt-8">
                                        <FieldGuideButton step={2} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:p-5 space-y-3">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <label className="block text-sm font-black text-navy-secondary">
                                            LINE接続キー（アクセストークン）
                                        </label>
                                        <p className="text-xs font-medium text-slate-500">
                                            「Messaging API」タブの下の方で「発行」して表示される、とても長い文字列です。
                                        </p>
                                        <input
                                            type="password"
                                            value={lineChannelAccessToken}
                                            onChange={(e) => {
                                                setLineChannelAccessToken(e.target.value)
                                                setCelebrate(false)
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-navy-primary/30"
                                            placeholder="例：非常に長い英数字の羅列です（発行後にコピー）"
                                            autoComplete="off"
                                        />
                                        <p className="text-[11px] font-medium text-slate-400">
                                            1行で長く続く英数字です。途中で改行されないよう、そのまま貼り付けてください。
                                        </p>
                                    </div>
                                    <div className="flex lg:pt-8">
                                        <FieldGuideButton step={3} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                                <p className="text-[11px] font-bold text-slate-500 mb-2">チャネルの選び方（図解）</p>
                                <button
                                    type="button"
                                    onClick={() => openGuide(1)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-[#047c3d] transition hover:bg-[#06C755]/10"
                                >
                                    <ImageIcon className="h-4 w-4" aria-hidden />
                                    ステップ1：Developers でチャネルを開く
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#06C755] px-10 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#05a649] disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        設定を保存する
                    </button>
                </div>
            </form>

            {guideOpen != null && (
                <Dialog
                    isOpen
                    onClose={() => setGuideOpen(null)}
                    title={GUIDE_COPY[guideOpen].title}
                    description={GUIDE_COPY[guideOpen].description}
                    panelClassName="max-w-2xl"
                >
                    <div className="space-y-4 text-slate-600">{GUIDE_COPY[guideOpen].body}</div>
                </Dialog>
            )}
        </>
    )
}
