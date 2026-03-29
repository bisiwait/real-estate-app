'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    Loader2,
    ShieldCheck,
    Search,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    Building2,
    KeyRound,
    Eye,
    EyeOff,
    X,
    ExternalLink
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { adminResetPassword } from '@/app/actions/adminAuth'

export type AdminUserManagementVariant = 'agent' | 'general'

export default function AdminUserManagement({
    locale,
    variant,
}: {
    locale: string
    /** 管理者ダッシュボードのタブごとに固定（エージェント / 一般ユーザー） */
    variant: AdminUserManagementVariant
}) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [resettingPassword, setResettingPassword] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Pagination & Search States
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 9

    const supabase = createClient()

    const fetchUsers = async () => {
        setLoading(true)
        setErrorMessage(null)

        // Profilesを取得
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Fetch users error:', error)
            setErrorMessage(getErrorMessage(error))
        } else if (data) {
            // 物件数を取得してマッピング
            const usersWithStats = await Promise.all(data.map(async (user) => {
                const { count } = await supabase
                    .from('properties')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                return { ...user, property_count: count || 0 }
            }))
            setUsers(usersWithStats)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handlePlanChange = async (userId: string, newPlan: string) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    plan: newPlan,
                    plan_type: newPlan
                })
                .eq('id', userId)

            if (!error) {
                await fetchUsers()
                alert('プランを変更しました。')
            } else {
                throw error
            }
        } catch (err: any) {
            console.error('Plan update error:', err)
            alert(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (userId: string) => {
        if (!newPassword || newPassword.length < 6) {
            alert('パスワードは6文字以上で入力してください。')
            return
        }

        setLoading(true)
        try {
            const result = await adminResetPassword(userId, newPassword)
            if (result.success) {
                alert(result.message)
                setResettingPassword(null)
                setNewPassword('')
            } else {
                alert(result.message)
            }
        } catch (err: any) {
            alert(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    // Filter AND Paginate Logic
    const filteredUsers = users.filter((user) => {
        // 管理者アカウントを完全に除外する
        const isAdmin = user.user_role === 'admin' || user.is_admin === true;
        if (isAdmin) return false;

        // エージェント判定ロジック
        const isAgentRole = user.user_role === 'agent' ||
            (user.property_count !== undefined && user.property_count > 0);

        if (variant === 'agent') {
            if (!isAgentRole) return false
        } else {
            if (isAgentRole) return false
        }

        // Step 2: Search Query
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            user.full_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.plan?.toLowerCase().includes(query)
        )
    })

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    // Reset page on search or filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, variant])

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-2 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg md:text-xl font-black text-navy-secondary">
                                {variant === 'agent' ? 'エージェント会員' : '一般ユーザー会員'}
                            </h2>
                            {!loading && (
                                <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
                                    {filteredUsers.length}件
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {variant === 'agent' ? 'Agent accounts' : 'End-user accounts'}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-64 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="名前、メールで検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] md:text-xs font-bold text-navy-secondary focus:outline-none focus:ring-2 focus:ring-navy-primary/20 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            <div className="p-2 md:p-8">
                {errorMessage && (
                    <div className="px-4 py-3 bg-red-50 text-red-600 text-xs font-bold text-center">
                        エラーが発生しました: {errorMessage}
                    </div>
                )}
                {loading && users.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-10 h-10 text-navy-primary/10 animate-spin mb-4" />
                        <p className="font-bold uppercase tracking-widest text-[10px]">Loading...</p>
                    </div>
                ) : paginatedUsers.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">データが見つかりません</p>
                        <p className="text-xs mt-1">検索条件を変更してください</p>
                    </div>
                ) : (
                    paginatedUsers.map((user) => (
                        <div key={user.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start gap-3 md:gap-4">
                                {/* Avatar */}
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-navy-primary/5 flex items-center justify-center flex-shrink-0">
                                    {variant === 'agent' ? <Building2 className="w-5 h-5 text-navy-primary/50" /> : <UserCircle className="w-5 h-5 text-slate-400" />}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-black text-navy-secondary truncate">
                                            {user.full_name || user.email || 'Anonymous'}
                                            {user.user_role === 'admin' && <ShieldCheck className="w-3 h-3 ml-1 text-amber-500 inline" />}
                                        </p>
                                        {variant === 'agent' && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${user.plan === 'premium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.plan === 'premium' ? 'Premium' : 'Free'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                                    {variant === 'agent' && (
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-navy-primary">{user.property_count || 0}</span>
                                                <span className="text-[10px] text-slate-400">物件</span>
                                            </div>
                                            {/* Plan selector inline */}
                                            <select
                                                value={user.plan === 'standard' ? 'free' : (user.plan || 'free')}
                                                onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border outline-none bg-white border-slate-200 ml-1"
                                            >
                                                <option value="free">Free</option>
                                                <option value="premium">Premium</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                {/* Actions */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    {resettingPassword === user.id ? (
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="新パスワード"
                                                    className="w-28 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none pr-7"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300">
                                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <button onClick={() => handleResetPassword(user.id)} className="px-2 py-1.5 bg-navy-primary text-white rounded-lg text-[10px] font-black">保存</button>
                                            <button onClick={() => { setResettingPassword(null); setNewPassword('') }} className="text-[10px] font-black text-slate-400">✕</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                                            {variant === 'agent' ? (
                                                <>
                                                    <Link
                                                        href={`/${locale}/admin-secret/agents?agent=${user.id}`}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-navy-primary/20 bg-navy-primary/5 px-3 py-1.5 text-[10px] font-black text-navy-primary transition-colors hover:bg-navy-primary hover:text-white"
                                                    >
                                                        詳細（分析）
                                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                                    </Link>
                                                    <Link
                                                        href={`/${locale}/agents/${user.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 underline-offset-2 hover:text-navy-primary hover:underline"
                                                    >
                                                        公開ページ
                                                    </Link>
                                                </>
                                            ) : (
                                                <Link
                                                    href={`/${locale}/admin-secret/users/${user.id}`}
                                                    className="inline-flex items-center gap-1 rounded-xl border border-navy-primary/20 bg-navy-primary/5 px-3 py-1.5 text-[10px] font-black text-navy-primary transition-colors hover:bg-navy-primary hover:text-white"
                                                >
                                                    詳細
                                                    <ExternalLink className="h-3 w-3 opacity-70" />
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => { setResettingPassword(user.id); setNewPassword('') }}
                                                className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                                                title="PW変更"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="bg-white border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-bold text-slate-400">
                        全 <span className="text-navy-secondary">{filteredUsers.length}</span> 件中
                        <span className="text-navy-secondary mx-1">
                            {(currentPage - 1) * PAGE_SIZE + 1}
                        </span>
                        〜
                        <span className="text-navy-secondary mx-1">
                            {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}
                        </span>
                        件を表示
                    </p>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center space-x-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1
                                        ? 'bg-navy-primary text-white shadow-md'
                                        : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-50 p-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    {variant === 'agent' ? (
                        <>
                            ※ エージェント会員は <code className="text-slate-500">user_role = agent</code>、または掲載物件があるプロフィールに含まれます。
                            <br />
                            不審な操作はログを確認し、必要に応じてプランやアカウントを見直してください。
                        </>
                    ) : (
                        <>
                            ※ 一般ユーザー会員は、上記に該当しない会員（お問い合わせ・お気に入り等の利用者）です。
                            <br />
                            詳細は各行の「詳細」からプロフィール・パスワードを管理できます。
                        </>
                    )}
                </p>
            </div>
        </div>
    )
}
