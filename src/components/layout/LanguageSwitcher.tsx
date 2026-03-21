'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const LOCALES = [
    { code: 'jp', label: '日本語', flagSvg: 'https://flagcdn.com/jp.svg' },
    { code: 'en', label: 'English', flagSvg: 'https://flagcdn.com/us.svg' },
    { code: 'th', label: 'ไทย', flagSvg: 'https://flagcdn.com/th.svg' },
]

export default function LanguageSwitcher({ dict }: { dict: any }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Detect current locale from pathname
    const segments = pathname.split('/')
    const currentLocale = segments[1] || 'jp'
    const currentLang = LOCALES.find(l => l.code === currentLocale) || LOCALES[0]

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLanguageChange = (newLocale: string) => {
        if (newLocale === currentLocale) {
            setIsOpen(false)
            return
        }

        // Set cookie for middleware
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`

        // Construct new path
        const newSegments = [...segments]
        newSegments[1] = newLocale
        const newPath = newSegments.join('/') || '/'

        setIsOpen(false)
        router.push(newPath)
        router.refresh()
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={`Select language. Current language is ${currentLang.label}`}
                className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2.5 md:py-2 min-h-[44px] md:min-h-0 rounded-xl border border-slate-100 bg-white shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <img src={currentLang.flagSvg} alt="" className="w-5 h-auto shadow-sm rounded-[2px]" aria-hidden="true" />
                <span className="text-xs md:text-sm font-bold text-navy-secondary uppercase">{currentLang.code}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[150] animate-in fade-in zoom-in duration-200"
                    role="listbox"
                    aria-label="Language options"
                >
                    <div className="px-4 py-2 mb-1">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{dict.labels.select_lang}</span>
                    </div>
                    {LOCALES.map((lang) => (
                        <button
                            key={lang.code}
                            role="option"
                            aria-selected={currentLocale === lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 md:py-2.5 min-h-[44px] md:min-h-0 text-sm font-bold transition-colors hover:bg-slate-50",
                                currentLocale === lang.code ? "text-navy-primary bg-navy-primary/5" : "text-slate-600"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <img src={lang.flagSvg} alt="" className="w-5 h-auto shadow-sm rounded-[2px]" aria-hidden="true" />
                                <span>{lang.label}</span>
                            </div>
                            {currentLocale === lang.code && <Check className="w-4 h-4 text-navy-primary" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
