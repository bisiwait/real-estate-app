'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface FlashMessageProps {
    message: string
    duration?: number
}

export default function FlashMessage({ message, duration = 3000 }: FlashMessageProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [shouldRender, setShouldRender] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
        }, duration)

        const removeTimer = setTimeout(() => {
            setShouldRender(false)
        }, duration + 500) // Wait for fade animation

        return () => {
            clearTimeout(timer)
            clearTimeout(removeTimer)
        }
    }, [duration])

    if (!shouldRender) return null

    return (
        <div
            className={`mb-6 bg-emerald-500 text-white p-4 rounded-3xl shadow-lg border border-emerald-400 flex items-center justify-between space-x-3 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}
        >
            <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <span className="font-black">{message}</span>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
