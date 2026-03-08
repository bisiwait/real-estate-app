'use client'

import React from 'react'
import LineContactButton from './LineContactButton'
import { Phone } from 'lucide-react'

interface PropertyInfo {
    id: string
    title: string
    price: string
    url: string
    refId?: string
}

interface StickyContactBarProps {
    property: PropertyInfo
    phoneNumber?: string
}

export default function StickyContactBar({ property, phoneNumber = '012-345-6789' }: StickyContactBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none">
            {/* Gradient backdrop to make it pop but not block content too much */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent h-full -top-4 pointer-events-none" />

            <div className="relative bg-white border-t border-slate-100 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
                <div className="container mx-auto max-w-md flex items-center gap-3">
                    {/* Phone Call Button */}
                    <a
                        href={`tel:${phoneNumber}`}
                        className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-navy-secondary w-14 h-14 rounded-xl active:scale-95 transition-all flex-shrink-0"
                    >
                        <Phone className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-black uppercase">Call</span>
                    </a>

                    {/* Main Action: LINE Button */}
                    <LineContactButton
                        property={property}
                        variant="full"
                        className="flex-1 shadow-lg shadow-[#06C755]/20"
                    />
                </div>

                {/* Safe area padding for newer mobile devices */}
                <div className="h-safe-bottom" />
            </div>
        </div>
    )
}
