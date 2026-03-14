'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const LOCALES = [
    { code: 'jp', label: '日本語', flag: '🇯🇵' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'th', label: 'ไทย', flag: '🇹🇭' },
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
                className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-100 bg-white shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Globe className="w-4 h-4 text-navy-primary" />
                <span className="text-xs font-bold text-navy-secondary">{currentLang.label}</span>
                <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[150] animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-1 mb-1">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{dict.labels.select_lang}</span>
                    </div>
                    {LOCALES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50",
                                currentLocale === lang.code ? "text-navy-primary bg-navy-primary/5" : "text-slate-600"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                            </div>
                            {currentLocale === lang.code && <Check className="w-4 h-4 text-navy-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
