'use client'

import React from 'react'
import LineContactButton from './LineContactButton'
import { Phone, Mail } from 'lucide-react'

interface PropertyInfo {
    id: string
    title: string
    price: string
    url: string
    refId?: string
    agentId?: string
    agentLineContact?: string | null
}

interface StickyContactBarProps {
    property: PropertyInfo
    phoneNumber?: string
    /** false のとき電話ボタンを出さない（エージェント設定） */
    showPhoneInquiry?: boolean
    /** false のとき LINE ボタンを出さない（エージェント設定） */
    showLineInquiry?: boolean
    dict: any
    isLoggedIn?: boolean
    onRequireAuth?: () => void
    viewerLineContact?: string | null
    viewerLineGateReady?: boolean
    onRequireViewerLine?: () => void
}

export default function StickyContactBar({
    property,
    phoneNumber,
    showPhoneInquiry = true,
    showLineInquiry = true,
    dict,
    isLoggedIn = true,
    onRequireAuth,
    viewerLineContact = null,
    viewerLineGateReady = true,
    onRequireViewerLine,
}: StickyContactBarProps) {
    const scrollToInquiry = () => {
        if (!isLoggedIn) {
            onRequireAuth?.()
            return
        }
        // Dispatch event to open the accordion before calculating dimensions
        window.dispatchEvent(new CustomEvent('open-inquiry-form'))
        
        // Small delay to allow the accordion rendering to begin affecting the DOM height
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
    const showLineBlock = showLineInquiry !== false

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-full lg:hidden pointer-events-none">
            {/* Gradient backdrop */}
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

                    <button
                        onClick={scrollToInquiry}
                        className="flex flex-1 flex-col items-center justify-center bg-navy-primary text-white h-14 min-w-0 rounded-xl active:scale-95 transition-all shadow-lg shadow-navy-primary/20"
                    >
                        <Mail className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-black uppercase text-center">{dict.common.mail_btn || 'Mail'}</span>
                    </button>

                    {showLineBlock ? (
                        <LineContactButton
                            property={property}
                            variant="icon"
                            className="flex-1 h-14 min-w-0"
                            dict={dict}
                            isLoggedIn={isLoggedIn}
                            onRequireAuth={onRequireAuth}
                            viewerLineContact={viewerLineContact}
                            viewerLineGateReady={viewerLineGateReady}
                            onRequireViewerLine={onRequireViewerLine}
                        />
                    ) : null}
                </div>

                {/* Safe area padding for newer mobile devices */}
                <div className="h-safe-bottom" />
            </div>
        </div>
    )
}
