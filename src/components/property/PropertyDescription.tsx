'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Layers, Gem } from 'lucide-react'
import { clsx } from 'clsx'

interface PropertyDescriptionProps {
    description: string
    descriptionEn?: string
    descriptionTh?: string
    dict: any
    activeLang: 'jp' | 'en' | 'th'
    setActiveLang: (lang: 'jp' | 'en' | 'th') => void
    isPremium?: boolean
}

export default function PropertyDescription({ description, descriptionEn, descriptionTh, dict, activeLang, setActiveLang, isPremium = false }: PropertyDescriptionProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)

    const hasEn = !!descriptionEn && descriptionEn.trim().length > 0
    const hasTh = !!descriptionTh && descriptionTh.trim().length > 0
    const hasMultilingual = hasEn || hasTh

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
        if (activeLang === 'en') return descriptionEn
        if (activeLang === 'th') return descriptionTh
        return description
    }
    const rawDescription = getDescription() || ''
    const hasContent = rawDescription.trim().length > 0

    if (!hasContent) return null

    const isLocked = !isPremium && activeLang !== 'jp'
    
    const renderText = () => {
        let text = rawDescription;
        if (isLocked && text.length > 150) {
            text = text.slice(0, 150) + '...';
        }
        return text.replace(/<br\s*\/?>/gi, '\n');
    }
    const formattedDescription = renderText();

    return (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 lg:mb-0">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between lg:justify-start lg:cursor-default"
                    disabled={isDesktop}
                >
                    <h3 className="text-base font-normal text-navy-secondary flex items-center">
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
                                "px-3 py-1 rounded-lg text-xs font-normal transition-all",
                                activeLang === 'jp' ? "bg-white text-navy-primary shadow-sm" : "text-slate-500 hover:text-navy-primary"
                            )}
                        >
                            JP
                        </button>
                         {hasEn && (
                            <button
                                onClick={() => setActiveLang('en')}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-xs font-normal transition-all",
                                    activeLang === 'en' ? "bg-white text-navy-primary shadow-sm" : "text-slate-500 hover:text-navy-primary"
                                )}
                            >
                                EN
                            </button>
                        )}
                         {hasTh && (
                            <button
                                onClick={() => setActiveLang('th')}
                                className={clsx(
                                    "px-3 py-1 rounded-lg text-xs font-normal transition-all",
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
                "transition-all duration-500 ease-in-out overflow-hidden lg:opacity-100 lg:max-h-none lg:mt-6 relative",
                isOpen
                    ? "mt-6 max-h-[5000px] opacity-100"
                    : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
            )}>
                <div className={clsx("text-slate-600 leading-relaxed whitespace-pre-wrap text-[12px] md:text-[14px]", isLocked && "relative pb-24")}>
                    {formattedDescription}
                    {isLocked && (
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent flex flex-col items-center justify-end pb-4 z-10 pointer-events-none select-none">
                            <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[11px] font-bold mb-3 flex items-center gap-1.5 tracking-wider uppercase border border-amber-200">
                                <Gem className="w-3.5 h-3.5" />
                                Premium Feature
                            </div>
                            <p className="text-[13px] text-slate-700 font-medium text-center px-4 max-w-[280px]">
                               {activeLang === 'en' ? 'Upgrade to Premium to view the full translation.' : 'อัปเกรดเพื่อดูคำแปลฉบับเต็ม'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
