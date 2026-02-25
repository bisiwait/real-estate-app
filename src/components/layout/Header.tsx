'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, PlusCircle, Home, Search, Info, Mail } from 'lucide-react'
import UserNav from '@/components/layout/UserNav'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isMenuOpen])

    const navLinks = [
        { href: '/properties', label: '物件を探す', icon: Search },
        { href: '/about', label: 'サービスについて', icon: Info },
        { href: '/contact', label: 'お問い合わせ', icon: Mail },
    ]

    return (
        <header className={cn("border-b border-slate-100 sticky top-0 z-[100] transition-colors duration-300", isMenuOpen ? "bg-white" : "bg-white/80 backdrop-blur-md")}>
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex flex-col relative z-[110]">
                    <span className="text-2xl font-black text-navy-primary tracking-tighter italic whitespace-nowrap">Chonburi Connect</span>
                    <span className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase -mt-1 ml-0.5">Chonburi Real Estate for Japanese</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-10">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-sm font-bold transition-all hover:text-navy-primary relative py-2",
                                pathname === link.href ? "text-navy-primary" : "text-slate-500"
                            )}
                        >
                            {link.label}
                            {pathname === link.href && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-primary rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Auth & Actions */}
                <div className="hidden lg:flex items-center space-x-8">
                    <UserNav />
                </div>

                {/* Mobile Menu Trigger */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden relative z-[110] p-2 -mr-2 text-navy-primary hover:bg-slate-50 rounded-xl transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                </button>
            </div>

            {/* Mobile Navigation Drawer */}
            {isMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col p-8 animate-in slide-in-from-right duration-500">
                        <div className="mt-16 flex flex-col h-full">
                            {/* Navigation Links */}
                            <div className="space-y-2 mb-8">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4 mb-2 block">Menu</span>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={cn(
                                            "flex items-center space-x-4 px-4 py-4 rounded-2xl text-lg font-black transition-all",
                                            pathname === link.href ? "bg-navy-primary/5 text-navy-primary shadow-sm" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <link.icon className={cn("w-5 h-5", pathname === link.href ? "text-navy-primary" : "text-slate-400")} />
                                        <span>{link.label}</span>
                                    </Link>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-slate-100 w-full mb-8" />

                            {/* Auth Section */}
                            <div className="flex-1">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4 mb-4 block">Account</span>
                                <UserNav isMobile onCloseMobileMenu={() => setIsMenuOpen(false)} />
                            </div>

                            {/* Footer Credit */}
                            <div className="pt-8 text-center">
                                <p className="text-[10px] text-slate-300 font-bold tracking-widest italic">
                                    Chonburi Connect © 2026
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
