'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, LayoutDashboard, Coins, LogIn, UserPlus, ShieldCheck, Search, Settings, Heart } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function UserNav({ isMobile = false, onCloseMobileMenu }: { isMobile?: boolean, onCloseMobileMenu?: () => void }) {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [userData, setUserData] = useState<{ credits: number | null, isAdmin: boolean, fullName: string | null, role: string }>({
        credits: null,
        isAdmin: false,
        fullName: null,
        role: 'general'
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserData(session.user.id)
            }
            setIsLoading(false)
        }

        getInitialSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserData(session.user.id)
            } else {
                setUserData({ credits: null, isAdmin: false, fullName: null, role: 'general' })
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserData = async (userId: string) => {
        let { data, error } = await supabase
            .from('profiles')
            .select('available_credits, is_admin, full_name, user_role')
            .eq('id', userId)
            .single()

        // フォールバック: user_role がない場合
        if (error) {
            console.warn('UserNav: Fetch with role failed, falling back:', error)
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('profiles')
                .select('available_credits, is_admin, full_name')
                .eq('id', userId)
                .single()
            data = fallbackData as any
            error = fallbackError
        }

        if (!error && data) {
            const is_admin = data.is_admin === true || (data as any).user_role === 'admin';
            const is_agent = (data as any).user_role === 'agent' || (data.available_credits || 0) > 0;

            setUserData({
                credits: data.available_credits,
                isAdmin: is_admin,
                fullName: data.full_name || null,
                role: is_admin ? 'admin' : (is_agent ? 'agent' : 'general')
            })
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        if (onCloseMobileMenu) onCloseMobileMenu()
        router.push('/')
        router.refresh()
    }


    if (isLoading) return <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />

    if (!user) {
        return (
            <div className={cn("flex items-center", isMobile ? "flex-col space-y-4 w-full pt-4" : "space-x-4")}>
                <Link
                    href="/login"
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "text-sm font-bold text-navy-primary hover:text-navy-secondary transition-all active:scale-95",
                        isMobile && "w-full text-center py-3 border border-slate-100 rounded-xl active:bg-slate-50"
                    )}
                >
                    ログイン
                </Link>
                <Link
                    href="/login?signup=true"
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "bg-navy-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-navy-secondary transition-all shadow-sm active:scale-95 active:shadow-inner",
                        isMobile && "w-full text-center py-4 rounded-xl"
                    )}
                >
                    新規登録
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
                            href="/mypage"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <User className="w-4 h-4" />
                            <span>マイページ</span>
                        </Link>
                        <Link
                            href="/mypage?tab=favorites"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Heart className="w-4 h-4" />
                            <span>お気に入り</span>
                        </Link>
                        <Link
                            href="/mypage?tab=searches"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Search className="w-4 h-4" />
                            <span>保存した検索</span>
                        </Link>
                        <Link
                            href="/mypage?tab=settings"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            <span>設定</span>
                        </Link>
                    </>
                )}

                {userData.role === 'agent' && (
                    <>
                        <Link
                            href="/dashboard"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>ダッシュボード</span>
                        </Link>
                        <Link
                            href="/dashboard/settings"
                            onClick={onCloseMobileMenu}
                            className={cn(
                                "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                                isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            <span>設定</span>
                        </Link>
                    </>
                )}

                {userData.role === 'admin' && (
                    <Link
                        href="/admin-secret"
                        onClick={onCloseMobileMenu}
                        className={cn(
                            "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                            isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                        )}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span>管理画面</span>
                    </Link>
                )}

                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-all active:scale-95",
                        isMobile && "w-full justify-center py-3 active:bg-red-50"
                    )}
                >
                    <LogOut className="w-4 h-4" />
                    <span>ログアウト</span>
                </button>
            </div>
        </div>
    )
}
