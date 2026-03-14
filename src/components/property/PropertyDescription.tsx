'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { clsx } from 'clsx'

interface PropertyDescriptionProps {
    description: string
    descriptionEn?: string
    descriptionTh?: string
    dict: any
}

export default function PropertyDescription({ description, descriptionEn, descriptionTh, dict }: PropertyDescriptionProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)
    const [activeLang, setActiveLang] = useState<'jp' | 'en' | 'th'>('jp')

    const hasMultilingual = !!descriptionEn || !!descriptionTh

    useEffect(() => {
        // Initial check
        setIsDesktop(window.innerWidth >= 1024)

        // Update on resize
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Format description text
    const getDescription = () => {
        if (activeLang === 'en' && descriptionEn) return descriptionEn
        if (activeLang === 'th' && descriptionTh) return descriptionTh
        return description
    }
    const formattedDescription = getDescription()?.replace(/<br\s*\/?>/gi, '\n') || ''

    return (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 lg:mb-0">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between lg:justify-start lg:cursor-default"
                    disabled={isDesktop}
                >
                    <h3 className="text-base font-semibold text-navy-secondary flex items-center">
                        <Layers className="w-5 h-5 mr-3 text-navy-primary" />
                        {dict.property.description_title}
                    </h3>
                    <div className="lg:hidden text-navy-primary bg-slate-50 p-1 rounded-lg ml-3">
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </button>

                {hasMultilingual && (
                    <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveLang('jp')}
                            className={clsx(
                                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                activeLang === 'jp' ? "bg-white text-navy-primary shadow-sm" : "text-slate-500 hover:text-navy-primary"
                            )}
                        >
                            JP
                        </button>
                        {descriptionEn && (
                            <button
                                onClick={() => setActiveLang('en')}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                    activeLang === 'en' ? "bg-white text-navy-primary shadow-sm" : "text-slate-500 hover:text-navy-primary"
                                )}
                            >
                                EN
                            </button>
                        )}
                        {descriptionTh && (
                            <button
                                onClick={() => setActiveLang('th')}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                    activeLang === 'th' ? "bg-white text-navy-primary shadow-sm" : "text-slate-500 hover:text-navy-primary"
                                )}
                            >
                                TH
                            </button>
                        )}
                    </div>
                )}
            </div>

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
