'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

function PlaceholderStep1() {
    const gid = useId().replace(/:/g, '')
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 360"
            className="h-auto w-full"
            role="img"
            aria-label="LINE Developers ログイン画面のプレースホルダー"
        >
            <defs>
                <linearGradient id={`lt-g1-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ecfdf5" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
            </defs>
            <rect width="640" height="360" rx="16" fill={`url(#lt-g1-${gid})`} />
            <rect x="20" y="20" width="600" height="36" rx="8" fill="#ffffff" opacity="0.95" />
            <rect x="36" y="30" width="120" height="16" rx="4" fill="#cbd5e1" />
            <rect x="480" y="28" width="120" height="20" rx="6" fill="#06C755" opacity="0.35" />
            <text x="320" y="130" textAnchor="middle" fontSize="15" fill="#334155" fontWeight="600" fontFamily="system-ui,sans-serif">
                プレースホルダー画像
            </text>
            <text x="320" y="158" textAnchor="middle" fontSize="13" fill="#64748b" fontFamily="system-ui,sans-serif">
                STEP 1: LINE Developers にログイン
            </text>
            <text x="320" y="186" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                developers.line.biz を開き、LINE アカウントでログイン
            </text>
            <rect x="80" y="220" width="480" height="100" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <rect x="120" y="252" width="200" height="14" rx="3" fill="#e2e8f0" />
            <rect x="120" y="278" width="160" height="14" rx="3" fill="#e2e8f0" />
            <rect x="400" y="268" width="100" height="32" rx="8" fill="#06C755" opacity="0.4" />
        </svg>
    )
}

function PlaceholderStep2() {
    const gid = useId().replace(/:/g, '')
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 360"
            className="h-auto w-full"
            role="img"
            aria-label="Messaging API タブのプレースホルダー"
        >
            <defs>
                <linearGradient id={`lt-g2-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#eff6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width="640" height="360" rx="16" fill={`url(#lt-g2-${gid})`} />
            <rect x="20" y="20" width="600" height="44" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
            <rect x="32" y="32" width="88" height="20" rx="4" fill="#e0f2fe" />
            <rect x="128" y="32" width="100" height="20" rx="4" fill="#06C755" opacity="0.45" />
            <rect x="236" y="32" width="72" height="20" rx="4" fill="#f1f5f9" />
            <rect x="316" y="32" width="72" height="20" rx="4" fill="#f1f5f9" />
            <text x="320" y="130" textAnchor="middle" fontSize="15" fill="#334155" fontWeight="600" fontFamily="system-ui,sans-serif">
                プレースホルダー画像
            </text>
            <text x="320" y="158" textAnchor="middle" fontSize="13" fill="#64748b" fontFamily="system-ui,sans-serif">
                STEP 2: 「Messaging API」タブを開く
            </text>
            <text x="320" y="186" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                チャネル設定のタブから Messaging API を選択
            </text>
            <rect x="60" y="210" width="520" height="120" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <text x="80" y="238" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif">
                Channel access token (long-lived) などのエリア
            </text>
            <rect x="80" y="252" width="400" height="12" rx="2" fill="#e2e8f0" />
            <rect x="80" y="276" width="360" height="12" rx="2" fill="#e2e8f0" />
            <rect x="80" y="300" width="380" height="12" rx="2" fill="#e2e8f0" />
        </svg>
    )
}

function PlaceholderStep3() {
    const gid = useId().replace(/:/g, '')
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 360"
            className="h-auto w-full"
            role="img"
            aria-label="トークン発行ボタン周辺のプレースホルダー"
        >
            <defs>
                <linearGradient id={`lt-g3-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
            </defs>
            <rect width="640" height="360" rx="16" fill={`url(#lt-g3-${gid})`} />
            <rect x="40" y="40" width="560" height="280" rx="14" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <text x="320" y="88" textAnchor="middle" fontSize="14" fill="#334155" fontWeight="600" fontFamily="system-ui,sans-serif">
                Channel access token (long-lived)
            </text>
            <rect x="80" y="110" width="480" height="36" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
            <text x="100" y="132" fontSize="10" fill="#94a3b8" fontFamily="ui-monospace, monospace">
                •••••••••••••••••••••••••••••••••
            </text>
            <rect x="200" y="200" width="240" height="44" rx="10" fill="#06C755" opacity="0.85" />
            <text x="320" y="228" textAnchor="middle" fontSize="14" fill="#ffffff" fontWeight="700" fontFamily="system-ui,sans-serif">
                発行
            </text>
            <text x="320" y="290" textAnchor="middle" fontSize="13" fill="#64748b" fontFamily="system-ui,sans-serif">
                STEP 3: 一番下の「発行」を押し、表示されたトークンをコピー
            </text>
            <text x="320" y="312" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                プレースホルダー（実際の画面と異なる場合があります）
            </text>
        </svg>
    )
}

const STEPS = [
    {
        step: 1,
        title: 'LINE Developers にログイン',
        body: 'ブラウザで developers.line.biz を開き、お手持ちの LINE アカウントでログインします。',
        Visual: PlaceholderStep1,
    },
    {
        step: 2,
        title: '「Messaging API」設定タブを開く',
        body: '対象のプロバイダーとチャネルを選び、設定画面の「Messaging API」タブを開きます。',
        Visual: PlaceholderStep2,
    },
    {
        step: 3,
        title: '「発行」でトークンをコピー',
        body: 'ページ下部付近のチャネルアクセストークン（長期）で「発行」ボタンを押し、表示された文字列をすべてコピーして下のフォームに貼り付けます。',
        Visual: PlaceholderStep3,
    },
] as const

export function LineMessagingSetupTutorial() {
    return (
        <details className="group rounded-2xl border border-slate-200 bg-slate-50/90 overflow-hidden shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left font-black text-sm text-navy-secondary transition-colors hover:bg-slate-100/90 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#06C755]/15 text-[11px] font-black text-[#047c3d]">
                        ?
                    </span>
                    設定方法の確認
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-8 border-t border-slate-200 bg-white px-4 py-6 md:px-6">
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                    画面の名称や位置は LINE 側の更新で変わることがあります。迷ったときは公式の LINE Developers ドキュメントもあわせてご確認ください。
                </p>
                <ol className="space-y-10">
                    {STEPS.map((s) => {
                        const V = s.Visual
                        return (
                            <li key={s.step} className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-primary text-xs font-black text-white">
                                        {s.step}
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-black text-navy-secondary">{s.title}</h4>
                                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{s.body}</p>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                                    <V />
                                </div>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </details>
    )
}
