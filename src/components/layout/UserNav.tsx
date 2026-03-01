'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, LayoutDashboard, Coins, LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function UserNav({ isMobile = false, onCloseMobileMenu }: { isMobile?: boolean, onCloseMobileMenu?: () => void }) {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [userData, setUserData] = useState<{ credits: number | null, isAdmin: boolean, fullName: string | null }>({
        credits: null,
        isAdmin: false,
        fullName: null
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
                setUserData({ credits: null, isAdmin: false, fullName: null })
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserData = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('available_credits, is_admin, full_name')
            .eq('id', userId)
            .single()

        if (!error && data) {
            setUserData({
                credits: data.available_credits,
                isAdmin: data.is_admin || false,
                fullName: data.full_name || null
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
                        "text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                        isMobile && "w-full text-center py-3 border border-slate-100 rounded-xl"
                    )}
                >
                    ログイン
                </Link>
                <Link
                    href="/auth/signup"
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "bg-navy-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-navy-secondary transition-all shadow-sm",
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
                    <span className="text-sm font-bold text-navy-primary truncate max-w-[150px]">
                        {userData.fullName || user?.email || 'Anonymous'}
                    </span>
                </div>
                {userData.credits !== null && (
                    <div className="flex items-center bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in duration-300">
                        <Coins className="w-3.5 h-3.5 mr-1.5" />
                        <span className="text-[11px] font-black">{userData.credits} pts</span>
                    </div>
                )}
            </div>

            <div className={cn("flex items-center", isMobile ? "flex-col space-y-3 w-full" : "space-x-4")}>
                <Link
                    href={userData.isAdmin ? "/admin-secret" : "/dashboard"}
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                        isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                    )}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{userData.isAdmin ? "管理者パネル" : "ダッシュボード"}</span>
                </Link>


                <Link
                    href="/dashboard/settings"
                    onClick={onCloseMobileMenu}
                    className={cn(
                        "flex items-center space-x-2 text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors",
                        isMobile && "w-full justify-center py-3 bg-slate-50 rounded-xl"
                    )}
                >
                    <User className="w-4 h-4" />
                    <span>設定</span>
                </Link>

                <button
                    onClick={handleLogout}

                    className={cn(
                        "flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors",
                        isMobile && "w-full justify-center py-3"
                    )}
                >
                    <LogOut className="w-4 h-4" />
                    <span>ログアウト</span>
                </button>
            </div>
        </div>
    )
}
