'use client'

import { ChevronDown } from 'lucide-react'

const STEPS = [
    {
        step: 1,
        title: 'LINE Developers にログイン',
        body: 'ブラウザで developers.line.biz を開き、お手持ちの LINE アカウントでログインします。',
        image: '/images/line-tutorial/step1-developers-login.svg',
        imageAlt: 'LINE Developers ログイン画面のプレースホルダー',
    },
    {
        step: 2,
        title: '「Messaging API」設定タブを開く',
        body: '対象のプロバイダーとチャネルを選び、設定画面の「Messaging API」タブを開きます。',
        image: '/images/line-tutorial/step2-messaging-api-tab.svg',
        imageAlt: 'Messaging API タブのプレースホルダー',
    },
    {
        step: 3,
        title: '「発行」でトークンをコピー',
        body: 'ページ下部付近のチャネルアクセストークン（長期）で「発行」ボタンを押し、表示された文字列をすべてコピーして下のフォームに貼り付けます。',
        image: '/images/line-tutorial/step3-issue-token.svg',
        imageAlt: 'トークン発行ボタン周辺のプレースホルダー',
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
                    {STEPS.map((s) => (
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
                                <img
                                    src={s.image}
                                    alt={s.imageAlt}
                                    width={640}
                                    height={360}
                                    className="h-auto w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </details>
    )
}
