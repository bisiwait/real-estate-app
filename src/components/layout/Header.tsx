'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, PlusCircle, Home, Search, Info, Mail, Building2, Heart, ShieldCheck, LayoutDashboard, User } from 'lucide-react'
import UserNav from '@/components/layout/UserNav'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { useSearchCount } from '@/contexts/SearchCountContext'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function Header({ dict }: { dict: any }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()
    const { propertiesHitCount } = useSearchCount()

    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    const segments = pathname.split('/')
    const currentLocale = ['jp', 'en', 'th'].includes(segments[1]) ? segments[1] : 'jp'

    const navLinks = [
        { href: `/${currentLocale}/properties`, label: dict.common.properties, icon: Search },
        {
            href: `/${currentLocale}/pricing`,
            label: dict.agent_plan?.nav_for_agents ?? dict.labels?.footer_want_to_list ?? "List properties",
            icon: Building2,
        },
    ]

    return (
        <header className="border-b border-slate-100 sticky top-0 z-[100] bg-white">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href={`/${currentLocale}`} className="flex items-center relative z-[110] active:scale-95 transition-transform duration-200 shrink-0 min-w-0 py-0">
                    <img
                        src="/logo_row_1000.svg"
                        alt="Chonburi Home"
                        width={1000}
                        height={303}
                        className="h-[3.75rem] w-auto max-w-[min(520px,94vw)] sm:h-[4.5rem] md:h-[4.625rem] lg:h-[4.75rem] object-contain object-left"
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-10">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-sm font-bold transition-all hover:text-navy-primary relative py-2 active:opacity-70",
                                pathname === link.href ? "text-navy-primary" : "text-slate-500"
                            )}
                        >
                            <span className="inline-flex items-center gap-2">
                                <span>{link.label}</span>
                                {link.href === `/${currentLocale}/properties` &&
                                    pathname === link.href &&
                                    typeof propertiesHitCount === 'number' && (
                                        <span className="px-2 py-0.5 rounded-full bg-navy-primary/10 text-navy-primary text-xs font-black tabular-nums">
                                            {propertiesHitCount}
                                        </span>
                                    )}
                            </span>
                            {pathname === link.href && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-primary rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Right Actions (Desktop & Mobile) */}
                <div className="flex items-center space-x-3 sm:space-x-6">
                    <div className="hidden sm:block">
                        <LanguageSwitcher dict={dict} />
                    </div>
                    <div className="hidden lg:block">
                        <UserNav dict={dict} />
                    </div>
                    
                    {/* Mobile Menu Trigger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden p-2 -mr-2 text-navy-primary hover:bg-slate-50 rounded-xl transition-all active:scale-90"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer - Simplified Full Width Dropdown */}
            <div className={cn(
                "lg:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-2xl transition-all duration-300 origin-top overflow-hidden z-[90]",
                isMenuOpen ? "max-h-[90vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-40px)]">
                    {/* Navigation Links - Moved above UserNav for mobile as requested */}
                    <div className="space-y-0.5">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-2xl text-base font-black transition-all",
                                    pathname === link.href ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600 active:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center space-x-4">
                                    <link.icon className={cn("w-5 h-5", pathname === link.href ? "text-navy-primary" : "text-slate-400")} />
                                    <span>{link.label}</span>
                                </div>
                                {link.href === `/${currentLocale}/properties` &&
                                    typeof propertiesHitCount === 'number' && (
                                        <span className="px-2 py-0.5 rounded-full bg-navy-primary/10 text-navy-primary text-xs font-black tabular-nums">
                                            {propertiesHitCount}
                                        </span>
                                    )}
                            </Link>
                        ))}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* User Navigation for Mobile (Login/Register or User Menu) */}
                    <div className="lg:hidden">
                        <UserNav dict={dict} isMobile={true} onCloseMobileMenu={() => setIsMenuOpen(false)} />
                    </div>

                    <div className="h-px bg-slate-100 w-full sm:hidden" />

                    {/* Language Switcher for Mobile */}
                    <div className="px-4 py-2 sm:hidden">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 block">Language</p>
                        <LanguageSwitcher dict={dict} />
                    </div>

                    {/* Footer Credit */}
                    <div className="pt-4 pb-2 text-center">
                        <p className="text-[10px] text-slate-300 font-bold tracking-widest italic">
                            Chonburi Home © {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    )
}
