'use client'

import React from 'react'
import { Phone, Mail, MessageCircle } from 'lucide-react'
import { useLineOaLaunch } from '@/components/property/LineOaLaunch'

interface StickyContactBarProps {
    phoneNumber?: string
    /** false のとき電話ボタンを出さない（エージェント設定） */
    showPhoneInquiry?: boolean
    /** 物件オーナー／サイト既定の友だち追加URL。あればスティッキーに LINE ショートカットを表示 */
    lineInquiryUrl?: string
    dict: any
    isLoggedIn?: boolean
    onRequireAuth?: () => void
}

export default function StickyContactBar({
    phoneNumber,
    showPhoneInquiry = true,
    lineInquiryUrl,
    dict,
    isLoggedIn = true,
    onRequireAuth,
}: StickyContactBarProps) {
    const lineOaLaunch = useLineOaLaunch(lineInquiryUrl)

    const scrollToInquiry = () => {
        if (!isLoggedIn) {
            onRequireAuth?.()
            return
        }
        window.dispatchEvent(new CustomEvent('open-inquiry-form'))

        setTimeout(() => {
            const element = document.getElementById('inquiry-form-section')
            if (element) {
                const headerOffset = 100
                const elementPosition = element.getBoundingClientRect().top
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                })
            }
        }, 50)
    }

    const tel = showPhoneInquiry !== false && phoneNumber ? phoneNumber : undefined

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-full lg:hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent h-full -top-4 pointer-events-none" />

            <div className="relative min-w-0 max-w-full bg-white border-t border-slate-100 p-3 pb-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
                <div className="container mx-auto flex min-w-0 max-w-full items-center justify-center gap-2 sm:gap-3 px-1">
                    {tel ? (
                        <a
                            href={`tel:${tel}`}
                            className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-navy-secondary w-14 h-14 rounded-xl active:scale-95 transition-all flex-shrink-0"
                        >
                            <Phone className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px] font-black uppercase text-center">{dict.common.call_btn || 'Call'}</span>
                        </a>
                    ) : null}

                    {lineInquiryUrl ? (
                        <button
                            type="button"
                            onClick={lineOaLaunch.launch}
                            disabled={lineOaLaunch.isSending}
                            className="flex min-h-14 min-w-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#06C755]/40 bg-[#06C755] px-1 py-1 text-white shadow-md shadow-[#06C755]/20 transition-all active:scale-95 flex-shrink-0 disabled:opacity-85"
                            aria-label={dict.property?.line_inquiry_btn ?? 'LINEで空室を確認する'}
                        >
                            <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="max-w-[4.25rem] text-center text-[8px] font-black leading-tight">
                                {lineOaLaunch.isSending
                                    ? (dict.property?.line_inquiry_sending_short ?? '送信中')
                                    : (dict.property?.line_inquiry_sticky_short ?? '空室')}
                            </span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={scrollToInquiry}
                        className="flex min-h-14 flex-1 flex-row items-center justify-center gap-2 bg-navy-primary px-3 text-white min-w-0 rounded-xl active:scale-95 transition-all shadow-lg shadow-navy-primary/20"
                    >
                        <Mail className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-black tracking-tight">
                            {dict.common?.mail_btn ?? 'Inquiry'}
                        </span>
                    </button>
                </div>

                {lineInquiryUrl ? (
                    <div className="mx-auto mt-1.5 max-w-md px-2 text-center">
                        {lineOaLaunch.showFallback && lineOaLaunch.directUrl ? (
                            <a
                                href={lineOaLaunch.directUrl}
                                className="mb-1 inline-block text-[10px] font-black text-[#047c3d] underline"
                                rel="noopener noreferrer"
                            >
                                {dict.property?.line_open_line_direct_link ?? 'LINEを直接開く'}
                            </a>
                        ) : null}
                        <p className="text-[9px] font-medium leading-snug text-slate-500">
                            {dict.property?.inquiry_line_vacancy_sub ??
                                '※自動で物件名が入力された状態でLINEが開きます'}
                        </p>
                    </div>
                ) : null}

                <div className="h-safe-bottom pt-1" />
            </div>
        </div>
    )
}
