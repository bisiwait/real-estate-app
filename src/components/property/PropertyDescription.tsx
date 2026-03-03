'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { clsx } from 'clsx'

interface PropertyDescriptionProps {
    description: string
}

export default function PropertyDescription({ description }: PropertyDescriptionProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Format description text
    const formattedDescription = description?.replace(/<br\s*\/?>/gi, '\n') || ''

    return (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between lg:cursor-default"
                disabled={typeof window !== 'undefined' && window.innerWidth >= 1024}
            >
                <h3 className="text-lg font-black text-navy-secondary flex items-center">
                    <Layers className="w-5 h-5 mr-3 text-navy-primary" />
                    物件詳細
                </h3>
                <div className="lg:hidden text-navy-primary bg-slate-50 p-1 rounded-lg">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </button>

            <div className={clsx(
                "transition-all duration-500 ease-in-out overflow-hidden lg:opacity-100 lg:max-h-none lg:mt-6",
                isOpen
                    ? "mt-6 max-h-[5000px] opacity-100"
                    : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
            )}>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {formattedDescription}
                </div>
            </div>
        </div>
    )
}
