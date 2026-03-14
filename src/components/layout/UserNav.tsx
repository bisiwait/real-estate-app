'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, LayoutDashboard, Coins, LogIn, UserPlus, ShieldCheck, Search, Settings, Heart, BarChart3 } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '@/contexts/AuthContext'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

import { usePathname } from 'next/navigation'

export default function UserNav({ dict, isMobile = false, onCloseMobileMenu }: { dict: any, isMobile?: boolean, onCloseMobileMenu?: () => void }) {
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()
    const segments = pathname.split('/')
    const currentLocale = ['jp', 'en', 'th'].includes(segments[1]) ? segments[1] : 'jp'

    const { user, userData, isLoading } = useAuth()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        if (onCloseMobileMenu) onCloseMobileMenu()
        router.push(`/${currentLocale}`)
        router.refresh()
    }

    if (isLoading) return <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />

    if (!user) {
        return (
            <div className={cn("flex items-center", isMobile ? "flex-col space-y-4 w-full pt-4" : "space-x-4")}>
                <Link
                    href={`/${currentLocale}/login`}
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "text-sm font-bold text-navy-primary hover:text-navy-secondary transition-all active:scale-95",
                        isMobile && "w-full text-center py-3 border border-slate-100 rounded-xl active:bg-slate-50"
                    )}
                >
                    {dict.common.login}
                </Link>
                <Link
                    href={`/${currentLocale}/login?signup=true`}
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "bg-navy-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-navy-secondary transition-all shadow-sm active:scale-95 active:shadow-inner",
                        isMobile && "w-full text-center py-4 rounded-xl"
                    )}
                >
                    {dict.labels.register}
                </Link>
            </div>
        )
    }

    // User is logged in
    return (
        <div className={cn("flex items-center", isMobile ? "flex-col space-y-6 w-full pt-4" : "space-x-6")}>
            <div className={cn("flex items-center", isMobile ? "flex-col space-y-2" : "space-x-3")}>
                <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-navy-primary truncate max-w-[200px]">
                        {userData.role === 'agent'
                            ? (userData.fullName || user?.email)
                            : (user?.email || userData.fullName || 'Anonymous')}
                    </span>
                </div>
            </div>

            <div className={cn("flex items-center", isMobile ? "flex-col space-y-3 w-full" : "space-x-4")}>
                {userData.role === 'general' && (
                    <>
                        <Link
                            href={`/${currentLocale}/mypage`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <User className="w-4 h-4" />
                            <span>{dict.labels.mypage}</span>
                        </Link>
                        <Link
                            href={`/${currentLocale}/mypage?tab=favorites`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Heart className="w-4 h-4" />
                            <span>{dict.labels.favorites}</span>
                        </Link>
                        <Link
                            href={`/${currentLocale}/mypage?tab=searches`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Search className="w-4 h-4" />
                            <span>{dict.labels.saved_searches}</span>
                        </Link>
                        <Link
                            href={`/${currentLocale}/mypage?tab=settings`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            <span>{dict.labels.settings}</span>
                        </Link>
                    </>
                )}

                {userData.role === 'agent' && (
                    <>
                        <Link
                            href={`/${currentLocale}/dashboard`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>{dict.labels.dashboard}</span>
                        </Link>
                        <Link
                            href={`/${currentLocale}/dashboard/settings`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            <span>{dict.labels.settings}</span>
                        </Link>
                    </>
                )}

                {userData.role === 'admin' && (
                    <>
                        <Link
                            href={`/${currentLocale}/admin-secret`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{dict.labels.admin}</span>
                        </Link>
                        <Link
                            href={`/${currentLocale}/admin-secret/analytics`}
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors",
                                isMobile && "w-full justify-center py-3 bg-indigo-50/50 rounded-xl"
                            )}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>{dict.labels.analytics}</span>
                        </Link>
                    </>
                )}

                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-all active:scale-95",
                        isMobile && "w-full justify-center py-3 active:bg-red-50"
                    )}
                >
                    <LogOut className="w-4 h-4" />
                    <span>{dict.common.logout}</span>
                </button>
            </div>
        </div>
    )
}
