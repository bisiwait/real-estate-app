'use client'

import React from 'react'
import { Phone, Mail, MessageCircle } from 'lucide-react'
import { lineAddFriendLinkHref, isLineInAppBrowser, normalizeLineFriendUrlInput } from '@/lib/line-contact-url'

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

            <div className="relative min-w-0 max-w-full bg-white border-t border-slate-100 p-3 pb-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
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
                        <a
                            href={lineAddFriendLinkHref(lineInquiryUrl)}
                            rel="noopener"
                            onClick={(e) => {
                                // LINE 内蔵ブラウザで target=_blank や別タブ経由の https 遷移が 404 になることがあるため、https のときは同一タブで開く
                                const raw = normalizeLineFriendUrlInput(lineInquiryUrl)
                                const go = lineAddFriendLinkHref(raw)
                                if (!go.startsWith('http')) return
                                if (!isLineInAppBrowser()) return
                                e.preventDefault()
                                window.location.assign(go)
                            }}
                            className="flex flex-col items-center justify-center border border-[#06C755]/40 bg-[#06C755] text-white w-14 h-14 rounded-xl active:scale-95 transition-all flex-shrink-0 shadow-md shadow-[#06C755]/20"
                        >
                            <MessageCircle className="w-5 h-5 mb-0.5" aria-hidden />
                            <span className="text-[9px] font-black uppercase text-center">LINE</span>
                        </a>
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

                <div className="h-safe-bottom" />
            </div>
        </div>
    )
}
