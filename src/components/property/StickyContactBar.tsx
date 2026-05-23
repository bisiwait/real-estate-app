'use client'

import React from 'react'
import { Mail } from 'lucide-react'

interface StickyContactBarProps {
    dict: any
    isLoggedIn?: boolean
    onRequireAuth?: () => void
}

/**
 * スマホのみ表示。電話・WhatsApp は物件ページお問い合わせエリアへ集約する。
 */
export default function StickyContactBar({
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
                    behavior: 'smooth',
                })
            }
        }, 50)
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-full lg:hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent h-full -top-4 pointer-events-none" />

            <div className="relative min-w-0 max-w-full bg-white border-t border-slate-100 p-3 pb-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
                <div className="container mx-auto flex min-w-0 max-w-full items-center justify-center px-1">
                    <button
                        type="button"
                        onClick={scrollToInquiry}
                        className="flex min-h-14 w-full flex-row items-center justify-center gap-2 bg-navy-primary px-4 text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-navy-primary/20"
                    >
                        <Mail className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-black tracking-tight">
                            {dict.common?.mail_btn ?? dict.property?.inquiry_title ?? 'Inquiry'}
                        </span>
                    </button>
                </div>

                <div className="h-safe-bottom pt-1" />
            </div>
        </div>
    )
}
