'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, LayoutDashboard, Coins, LogIn, UserPlus, ShieldCheck, Search, Settings, Heart, BarChart3, ChevronDown } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

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
    if (isMobile) {
        return (
            <div className="flex flex-col space-y-6 w-full pt-4">
                <div className="flex flex-col space-y-2 px-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Logged in as</span>
                    <span className="text-sm font-bold text-navy-primary truncate">
                        {userData.role === 'agent'
                            ? (userData.fullName || user?.email)
                            : (user?.email || userData.fullName || 'Anonymous')}
                    </span>
                </div>

                <div className="flex flex-col space-y-3 w-full">
                    {userData.role === 'general' && (
                        <>
                            <Link
                                href={`/${currentLocale}/mypage`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <User className="w-5 h-5" />
                                <span>{dict.labels.mypage}</span>
                            </Link>
                            <Link
                                href={`/${currentLocale}/mypage?tab=favorites`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <Heart className="w-5 h-5" />
                                <span>{dict.labels.favorites}</span>
                            </Link>
                            <Link
                                href={`/${currentLocale}/mypage?tab=searches`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <Search className="w-5 h-5" />
                                <span>{dict.labels.saved_searches}</span>
                            </Link>
                            <Link
                                href={`/${currentLocale}/mypage?tab=settings`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <Settings className="w-5 h-5" />
                                <span>{dict.labels.settings}</span>
                            </Link>
                        </>
                    )}

                    {userData.role === 'agent' && (
                        <>
                            <Link
                                href={`/${currentLocale}/dashboard`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span>{dict.labels.dashboard}</span>
                            </Link>
                            <Link
                                href={`/${currentLocale}/dashboard/settings`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <Settings className="w-5 h-5" />
                                <span>{dict.labels.settings}</span>
                            </Link>
                        </>
                    )}

                    {userData.role === 'admin' && (
                        <>
                            <Link
                                href={`/${currentLocale}/admin-secret`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl text-lg font-black text-navy-primary active:scale-[0.98] transition-all"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                <span>{dict.labels.admin}</span>
                            </Link>
                            <Link
                                href={`/${currentLocale}/admin-secret/analytics`}
                                onClick={onCloseMobileMenu}
                                className="flex items-center space-x-4 px-4 py-4 bg-indigo-50/50 rounded-2xl text-lg font-black text-indigo-600 active:scale-[0.98] transition-all"
                            >
                                <BarChart3 className="w-5 h-5" />
                                <span>{dict.labels.analytics}</span>
                            </Link>
                        </>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-4 px-4 py-4 text-lg font-black text-red-500 active:bg-red-50 rounded-2xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>{dict.common.logout}</span>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="flex items-center space-x-3 px-4 py-2 rounded-full border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 group">
                    <div className="w-8 h-8 rounded-full bg-navy-primary/10 flex items-center justify-center text-navy-primary group-hover:bg-navy-primary group-hover:text-white transition-colors">
                        <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-navy-primary truncate max-w-[150px]">
                        {userData.role === 'agent'
                            ? (userData.fullName || user?.email)
                            : (user?.email || userData.fullName || 'Anonymous')}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-navy-primary transition-colors" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-100 rounded-2xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[120] overflow-hidden border border-slate-100">
                    <div className="px-1 py-1">
                        {userData.role === 'general' && (
                            <>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/mypage`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <User className="w-4 h-4" />
                                            <span>{dict.labels.mypage}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/mypage?tab=favorites`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <Heart className="w-4 h-4" />
                                            <span>{dict.labels.favorites}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/mypage?tab=settings`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span>{dict.labels.settings}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                            </>
                        )}

                        {userData.role === 'agent' && (
                            <>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/dashboard`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span>{dict.labels.dashboard}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/dashboard/settings`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span>{dict.labels.settings}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                            </>
                        )}

                        {userData.role === 'admin' && (
                            <>
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href={`/${currentLocale}/admin-secret`}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                                active ? "bg-navy-primary/5 text-navy-primary" : "text-slate-600"
                                            )}
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>{dict.labels.admin}</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                            </>
                        )}
                    </div>

                    <div className="px-1 py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={handleLogout}
                                    className={cn(
                                        "w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                        active ? "bg-red-50 text-red-600" : "text-slate-500"
                                    )}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>{dict.common.logout}</span>
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    )
}
