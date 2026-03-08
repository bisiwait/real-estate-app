'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'

interface PropertyInfo {
    id: string
    title: string
    price: string
    url: string
    refId?: string
    agentId?: string
}

interface LineContactButtonProps {
    property: PropertyInfo
    variant?: 'default' | 'outline' | 'full'
    className?: string
}

export default function LineContactButton({ property, variant = 'default', className = '' }: LineContactButtonProps) {
    // LINE Official Account ID (Should be configured per agent or globally)
    const LINE_ID = '@164exdsf'

    const handleLineContact = async () => {
        const greeting = 'こんにちは。物件ポータルサイトを見て連絡しました。'
        const message = `${greeting}\n\n【問い合わせ物件】\n物件名: ${property.title}\n価格: ${property.price}\nURL: ${property.url}${property.refId ? `\n管理ID: ${property.refId}` : ''}\n\n空き状況を教えてください。`

        const encodedMessage = encodeURIComponent(message)
        // Encode @ to %40 for the ID part as well for better compatibility
        const encodedId = LINE_ID.replace('@', '%40')

        // Use the official oaMessage scheme
        const lineUrl = `https://line.me/R/oaMessage/${encodedId}/?${encodedMessage}`

        // --- Log Inquiry to Supabase ---
        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()

            // Get current user if logged in
            const { data: { user } } = await supabase.auth.getUser()

            // We need the property's agent_id. 
            // In a real app, this should be passed in props, but for now we'll assume it's needed.
            // Let's modify the PropertyInfo to include a guessed agent_id if possible or fetch it.
            // For now, let's just log what we have.

            await supabase.from('inquiry_logs').insert({
                user_id: user?.id || null,
                property_id: property.id,
                agent_id: property.agentId || '00000000-0000-0000-0000-000000000000',
                inquiry_type: 'line',
                status: 'new',
                metadata: {
                    browser: navigator.userAgent,
                    url: window.location.href
                }
            })
        } catch (error) {
            console.error('Failed to log inquiry:', error)
        }
        // -------------------------------

        // Detection and logic for PC vs Mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

        if (isMobile) {
            window.location.href = lineUrl
        } else {
            // On PC, if the R scheme doesn't work, falling back to adding friend might be better than homepage redirect
            // But we try to open in a new tab first to see if it triggers the app
            const newWindow = window.open(lineUrl, '_blank')

            // If it redirects immediately to line.me/ja/, it means the app didn't trigger
            // Note: We can't easily detect the redirect, but we can provide a fallback link to the profile
            setTimeout(() => {
                if (newWindow && newWindow.location.href.includes('line.me/ja/')) {
                    newWindow.location.href = `https://line.me/ti/p/${LINE_ID}`
                }
            }, 500)
        }
    }

    const baseStyles = "inline-flex items-center justify-center gap-2 font-bold transition-all rounded-xl shadow-sm hover:shadow-md active:scale-95"

    const variants = {
        default: "bg-[#06C755] hover:bg-[#05b34c] text-white px-6 py-3",
        outline: "border-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755]/5 px-6 py-3",
        full: "bg-[#06C755] hover:bg-[#05b34c] text-white w-full py-4 text-lg"
    }

    return (
        <button
            onClick={handleLineContact}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.047c-.052.312-.252 1.226 1.135.669 1.386-.557 7.474-4.402 10.199-7.537C23.058 14.348 24 12.421 24 10.304zm-14.717 4.144H7.425a.864.864 0 01-.864-.864V8.341a.864.864 0 011.728 0v4.515h.994a.864.864 0 010 1.728v.164zm1.908-.864a.864.864 0 011.728 0V13.58a.864.864 0 01-1.728 0v.004zm5.111 0c.05.518-.328.983-.846 1.033-.03.003-.061.004-.092.004h-.008a.864.864 0 01-.812-.864V9.652l-1.396 1.956a.864.864 0 01-1.428-.992l1.696-2.376a.864.864 0 011.64.444v5.04zm4.288-2.58a.864.864 0 010 1.728h-1.121v1.121a.864.864 0 01-1.728 0v-2.376c0-.477.387-.864.864-.864h1.985v.004l-.004-.383c0-.477.387-.864.864-.864s.864.387.864.864v.374h.001z" />
            </svg>
            <span>LINEで空き状況を確認</span>
        </button>
    )
}
