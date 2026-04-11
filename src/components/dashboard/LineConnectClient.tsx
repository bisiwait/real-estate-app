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
    Settings,
    MessageCircle,
    AlertTriangle,
    User,
    Building2,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { LINE_OFFICIAL_ACCOUNT_APP_IOS, LINE_OFFICIAL_ACCOUNT_APP_ANDROID } from '@/lib/line-official'
import {
    isLineOfficialAccountAddFriendUrl,
    isLineOfficialConnectionUrl,
} from '@/lib/line-official-account-url'
import { clsx } from 'clsx'
import type { LineConnectUiMessages } from '@/lib/i18n/line-connect-messages'

/**
 * 公式アカウントアプリ手順の画像:
 * public/images/line-official-app-guide/step-1-home.png など
 */
const LINE_APP_GUIDE_IMAGES = {
    step1: '/images/line-official-app-guide/step-1-home.png',
    step2: '/images/line-official-app-guide/step-2-url-create.png',
    step3: '/images/line-official-app-guide/step-3-copy-url.png',
} as const

/** 個人LINE・友だち追加URL取得手順の挿絵 */
const LINE_PERSONAL_FRIEND_URL_IMAGES = {
    step1OpenApp: '/images/line-personal-friend-url-guide/step-1-open-line-app.png',
    step2LineHome: '/images/line-personal-friend-url-guide/step-2-line-home.png',
    step2AddFriend: '/images/line-personal-friend-url-guide/step-2-add-friend-screen.png',
    step3CopyLink: '/images/line-personal-friend-url-guide/step-3-my-qr-copy-link.png',
} as const

/**
 * public の PNG を同じファイル名で差し替えても、ブラウザ・CDN が古い内容を返し続けることがある。
 * 挿絵を更新したらこの数字だけ +1 してデプロイすると確実に新画像が読み込まれる。
 */
const LINE_GUIDE_SCREENSHOT_CACHE = '4'

function guideScreenshotSrc(path: string): string {
    const base = path.split('?')[0]
    return `${base}?v=${LINE_GUIDE_SCREENSHOT_CACHE}`
}

function GuideStepScreenshot({
    src,
    alt,
    missingTitle,
    missingHelp,
}: {
    src: string
    alt: string
    missingTitle: string
    missingHelp: string
}) {
    const [failed, setFailed] = useState(false)
    const basePath = src.split('?')[0]
    const resolvedSrc = guideScreenshotSrc(src)
    if (failed) {
        return (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <ImageIcon className="h-10 w-10 text-slate-400" aria-hidden />
                <p className="text-xs font-black text-slate-600">{missingTitle}</p>
                <code className="max-w-full break-all rounded-lg bg-white px-2 py-1 text-[10px] text-slate-600">{basePath}</code>
                <p className="text-[10px] font-medium leading-relaxed text-slate-500">{missingHelp}</p>
            </div>
        )
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- 動的パス・配置漏れ時の onError 表示のため
        <img
            src={resolvedSrc}
            alt={alt}
            className="mx-auto max-h-[min(52vh,460px)] w-full max-w-[300px] rounded-2xl border border-slate-200 bg-slate-900/5 object-contain shadow-lg"
            loading="lazy"
            onError={() => setFailed(true)}
        />
    )
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

type LineSourceMode = 'personal' | 'official'

export default function LineConnectClient({ locale, ui }: { locale: string; ui: LineConnectUiMessages }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [celebrate, setCelebrate] = useState(false)
    const [lineMode, setLineMode] = useState<LineSourceMode>('personal')
    /** profiles.line_basic_id（https URL または @xxx どちらも可） */
    const [lineFriendAddUrl, setLineFriendAddUrl] = useState('')
    const [chatModeAcknowledged, setChatModeAcknowledged] = useState(false)
    const successRef = useRef<HTMLDivElement>(null)

    const urlFormatOk = useMemo(() => {
        const raw = lineFriendAddUrl.trim()
        if (!raw) return false
        if (/^@[A-Za-z0-9._-]{2,128}$/.test(raw)) return true
        return isLineOfficialConnectionUrl(raw) || isLineOfficialAccountAddFriendUrl(raw)
    }, [lineFriendAddUrl])

    const needsChatAck = lineMode === 'official' && urlFormatOk

    const personalLineGuideSteps = useMemo(
        () =>
            [
                {
                    key: 'personal-1',
                    num: ui.personal_step1_num,
                    title: ui.personal_step1_title,
                    body: ui.personal_step1_body,
                    images: [
                        {
                            src: LINE_PERSONAL_FRIEND_URL_IMAGES.step1OpenApp,
                            alt: ui.personal_step1_img_alt,
                        },
                    ],
                },
                {
                    key: 'personal-2',
                    num: ui.personal_step2_num,
                    title: ui.personal_step2_title,
                    body: ui.personal_step2_body,
                    images: [
                        {
                            src: LINE_PERSONAL_FRIEND_URL_IMAGES.step2LineHome,
                            alt: ui.personal_step2_img_alt_home,
                        },
                        {
                            src: LINE_PERSONAL_FRIEND_URL_IMAGES.step2AddFriend,
                            alt: ui.personal_step2_img_alt_add_friend,
                        },
                    ],
                },
                {
                    key: 'personal-3',
                    num: ui.personal_step3_num,
                    title: ui.personal_step3_title,
                    body: ui.personal_step3_body,
                    images: [
                        {
                            src: LINE_PERSONAL_FRIEND_URL_IMAGES.step3CopyLink,
                            alt: ui.personal_step3_img_alt,
                        },
                    ],
                },
            ] as const,
        [ui]
    )

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
            if (!user) throw new Error(ui.error_login)

            if (needsChatAck && !chatModeAcknowledged) {
                setError(ui.error_chat_mode)
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
                    {ui.back_link}
                </Link>
            </div>

            {celebrate && (
                <div
                    ref={successRef}
                    className="mb-8 rounded-[2rem] border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 p-8 md:p-10 shadow-xl"
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                            <Sparkles className="h-9 w-9" strokeWidth={2.2} />
                        </div>
                        <p className="text-xl md:text-2xl font-black text-emerald-900 leading-snug max-w-xl">{ui.celebrate_title}</p>
                        <p className="text-sm font-bold text-emerald-800/90 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            {ui.celebrate_body}
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6">
                    <p className="text-sm font-black leading-relaxed text-navy-secondary md:text-base">{ui.intro_both}</p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 md:text-sm">{ui.intro_personal_hint}</p>
                </div>

                <div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label={ui.intro_both}
                >
                    <button
                        type="button"
                        role="radio"
                        aria-checked={lineMode === 'personal'}
                        onClick={() => {
                            setLineMode('personal')
                            setCelebrate(false)
                        }}
                        className={clsx(
                            'flex w-full flex-col gap-3 rounded-2xl border-2 p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755] focus-visible:ring-offset-2',
                            lineMode === 'personal'
                                ? 'border-[#06C755] bg-gradient-to-br from-[#06C755]/10 via-white to-emerald-50/80'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                    >
                        <span className="flex items-center gap-3">
                            <span
                                className={clsx(
                                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2',
                                    lineMode === 'personal' ? 'border-[#06C755] bg-white text-[#047c3d]' : 'border-slate-200 bg-slate-50 text-slate-500'
                                )}
                            >
                                <User className="h-6 w-6" aria-hidden />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-base font-black text-navy-secondary">{ui.mode_personal_title}</span>
                                <span className="mt-0.5 block text-xs font-medium text-slate-600">{ui.mode_personal_desc}</span>
                            </span>
                        </span>
                    </button>

                    <button
                        type="button"
                        role="radio"
                        aria-checked={lineMode === 'official'}
                        onClick={() => {
                            setLineMode('official')
                            setCelebrate(false)
                        }}
                        className={clsx(
                            'flex w-full flex-col gap-3 rounded-2xl border-2 p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755] focus-visible:ring-offset-2',
                            lineMode === 'official'
                                ? 'border-[#06C755] bg-gradient-to-br from-[#06C755]/10 via-white to-emerald-50/80'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                    >
                        <span className="flex items-center gap-3">
                            <span
                                className={clsx(
                                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2',
                                    lineMode === 'official' ? 'border-[#06C755] bg-white text-[#047c3d]' : 'border-slate-200 bg-slate-50 text-slate-500'
                                )}
                            >
                                <Building2 className="h-6 w-6" aria-hidden />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-base font-black text-navy-secondary">{ui.mode_official_title}</span>
                                <span className="mt-0.5 block text-xs font-medium text-slate-600">{ui.mode_official_desc}</span>
                            </span>
                        </span>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
                    <div className="min-w-0 space-y-10">
                        {lineMode === 'personal' ? (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-navy-secondary md:text-xl">{ui.personal_guide_title}</h2>
                                </div>
                                {personalLineGuideSteps.map((step) => (
                                    <section
                                        key={step.key}
                                        className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
                                    >
                                        <div
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-sm font-black text-white shadow-md"
                                            aria-hidden
                                        >
                                            {step.num}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-4">
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-black text-navy-secondary md:text-base">{step.title}</h3>
                                                <p className="text-sm font-medium leading-relaxed text-slate-700">{step.body}</p>
                                            </div>
                                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                                {step.images.map((img) => (
                                                    <GuideStepScreenshot
                                                        key={img.src}
                                                        src={img.src}
                                                        alt={img.alt}
                                                        missingTitle={ui.guide_image_missing_title}
                                                        missingHelp={ui.guide_image_missing_help}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-navy-secondary md:text-xl">{ui.official_left_title}</h2>
                                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{ui.official_left_lead}</p>
                                    <div className="mt-5 rounded-2xl border-2 border-[#06C755]/40 bg-gradient-to-br from-[#06C755]/12 via-white to-[#06C755]/5 p-5 shadow-md md:p-6">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-[#047c3d]">{ui.official_prereq_badge}</p>
                                        <p className="mt-2 text-base font-black leading-snug text-navy-secondary md:text-lg">{ui.official_prereq_title}</p>
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
                                        {ui.official_step1_badge}
                                    </p>
                                    <h3 className="text-sm font-black text-navy-secondary md:text-base">{ui.official_step1_title}</h3>
                                    <GuideStepScreenshot
                                        src={LINE_APP_GUIDE_IMAGES.step1}
                                        alt={ui.official_step1_img_alt}
                                        missingTitle={ui.guide_image_missing_title}
                                        missingHelp={ui.guide_image_missing_help}
                                    />
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">{ui.official_step1_body}</p>
                                </section>

                                <section className="space-y-3">
                                    <p className="inline-flex rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                        {ui.official_step2_badge}
                                    </p>
                                    <h3 className="text-sm font-black text-navy-secondary md:text-base">{ui.official_step2_title}</h3>
                                    <GuideStepScreenshot
                                        src={LINE_APP_GUIDE_IMAGES.step2}
                                        alt={ui.official_step2_img_alt}
                                        missingTitle={ui.guide_image_missing_title}
                                        missingHelp={ui.guide_image_missing_help}
                                    />
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">{ui.official_step2_body}</p>
                                </section>

                                <section className="space-y-3">
                                    <p className="inline-flex rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                        {ui.official_step3_badge}
                                    </p>
                                    <h3 className="text-sm font-black text-navy-secondary md:text-base">{ui.official_step3_title}</h3>
                                    <GuideStepScreenshot
                                        src={LINE_APP_GUIDE_IMAGES.step3}
                                        alt={ui.official_step3_img_alt}
                                        missingTitle={ui.guide_image_missing_title}
                                        missingHelp={ui.guide_image_missing_help}
                                    />
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">{ui.official_step3_body}</p>
                                </section>

                                <section className="space-y-4 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50/90 to-white p-5 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="inline-flex rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white shadow-sm">
                                            {ui.official_step4_badge}
                                        </p>
                                        <h3 className="text-base font-black text-red-900 md:text-lg">{ui.official_step4_title}</h3>
                                    </div>
                                    <p className="flex items-start gap-2 text-sm font-black leading-snug text-red-700">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                                        {ui.official_step4_warning}
                                    </p>
                                    <ol className="list-decimal space-y-2.5 pl-5 text-sm font-medium leading-relaxed text-slate-800">
                                        <li>
                                            <span className="flex gap-2.5">
                                                <Settings className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                                <span className="min-w-0 flex-1 font-bold leading-relaxed text-navy-secondary">{ui.official_step4_li1}</span>
                                            </span>
                                        </li>
                                        <li>{ui.official_step4_li2}</li>
                                        <li>
                                            {ui.official_step4_li3}
                                            <MessageCircle className="ml-1 inline h-4 w-4 text-[#06C755] align-text-bottom" aria-hidden />
                                        </li>
                                    </ol>
                                    <div className="overflow-hidden rounded-xl border border-red-100 bg-white p-2">
                                        <SvgChatModeSettingsFlow />
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    <div className="min-w-0 lg:sticky lg:top-24">
                        <div className="rounded-[1.75rem] border-2 border-navy-primary/15 bg-gradient-to-b from-white via-slate-50/90 to-white p-6 shadow-xl md:p-8">
                            <div className="space-y-4">
                                <label htmlFor="line-official-account-url" className="block text-sm font-black text-navy-secondary">
                                    {ui.url_label}
                                </label>
                                <p className="text-xs font-medium text-slate-500">{ui.url_help}</p>
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
                                        placeholder={ui.url_placeholder}
                                        autoComplete="off"
                                        aria-invalid={lineFriendAddUrl.trim().length > 0 && !urlFormatOk}
                                    />
                                    {urlFormatOk ? (
                                        <>
                                            <span
                                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                                                title={ui.preview_valid_sr}
                                            >
                                                <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                                            </span>
                                            <span className="sr-only" aria-live="polite">
                                                {ui.preview_valid_sr}
                                            </span>
                                        </>
                                    ) : null}
                                </div>

                                {urlFormatOk ? (
                                    <div className="space-y-2" aria-live="polite">
                                        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900 shadow-sm">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                                            <span>{ui.preview_valid_title}</span>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                                            {ui.preview_valid_ready}
                                        </div>
                                    </div>
                                ) : null}

                                {lineFriendAddUrl.trim().length > 0 && !urlFormatOk ? (
                                    <p className="text-[11px] font-medium text-amber-800/90">{ui.url_invalid_hint}</p>
                                ) : null}
                            </div>

                            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200/80 pt-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                                    {needsChatAck ? (
                                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-3 text-left shadow-sm transition hover:border-amber-300 sm:max-w-md">
                                            <input
                                                type="checkbox"
                                                checked={chatModeAcknowledged}
                                                onChange={(e) => setChatModeAcknowledged(e.target.checked)}
                                                className="mt-1 h-4 w-4 shrink-0 rounded border-amber-400 text-[#06C755] focus:ring-[#06C755]"
                                            />
                                            <span className="text-sm font-bold leading-snug text-amber-950">
                                                {ui.chat_mode_checkbox}
                                                <span className="mt-1 block text-xs font-medium text-amber-900/80">{ui.chat_mode_checkbox_sub}</span>
                                            </span>
                                        </label>
                                    ) : null}
                                    <button
                                        type="submit"
                                        disabled={saving || (needsChatAck && !chatModeAcknowledged)}
                                        title={needsChatAck && !chatModeAcknowledged ? ui.save_needs_chat_title : undefined}
                                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#05a649] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        {ui.save}
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
