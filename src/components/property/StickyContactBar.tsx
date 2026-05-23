'use client'

import React from 'react'
import { Phone, Mail } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

interface StickyContactBarProps {
    phoneNumber?: string
    /** WhatsApp（wa.me）問い合わせ。ログイン不要 */
    whatsAppUrl?: string
    /** false のとき電話ボタンを出さない（エージェント設定） */
    showPhoneInquiry?: boolean
    dict: any
    isLoggedIn?: boolean
    onRequireAuth?: () => void
}

export default function StickyContactBar({
    phoneNumber,
    whatsAppUrl,
    showPhoneInquiry = true,
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

                    {whatsAppUrl ? (
                        <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center bg-[#25D366]/12 border border-[#25D366]/35 text-[#128C7E] w-14 h-14 rounded-xl active:scale-95 transition-all flex-shrink-0"
                            aria-label={dict.common?.whatsapp_btn ?? 'WhatsApp'}
                            title={dict.common?.whatsapp_btn ?? 'WhatsApp'}
                        >
                            <WhatsAppIcon className="w-6 h-6 mb-0.5 text-[#25D366]" />
                            <span className="text-[9px] font-black uppercase text-center leading-tight">
                                {dict.common?.whatsapp_btn_short ?? 'WA'}
                            </span>
                        </a>
                    ) : null}

                    <button
                        type="button"
                        onClick={scrollToInquiry}
                        className="flex min-h-14 flex-1 flex-row items-center justify-center gap-2 bg-navy-primary px-4 text-white min-w-0 rounded-xl active:scale-95 transition-all shadow-lg shadow-navy-primary/20"
                    >
                        <Mail className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-black tracking-tight">
                            {dict.common?.mail_btn ?? 'Inquiry'}
                        </span>
                    </button>
                </div>

                <div className="h-safe-bottom pt-1" />
            </div>
        </div>
    )
}
