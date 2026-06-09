'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import AdminRowsPerPageSelect from '@/components/admin/AdminRowsPerPageSelect'
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
    ExternalLink,
    MessageCircle,
    LogIn,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { adminResetPassword } from '@/app/actions/adminAuth'
import { useAuth } from '@/contexts/AuthContext'
import { adminAgentLifecycle } from '@/app/actions/adminAgentLifecycle'
import {
    beginAdminAgentImpersonation,
    discardAdminImpersonationRevert,
} from '@/app/actions/adminAgentImpersonation'

export type AdminUserManagementVariant = 'agent' | 'general'

export type AdminImpersonationActionCopy = {
    login_as_agent: string
    confirm: string
}

const DEFAULT_IMPERSONATION_COPY: AdminImpersonationActionCopy = {
    login_as_agent: 'エージェントとしてログイン',
    confirm:
        'このエージェントとしてログインし、ダッシュボード等を代行操作しますか？\n画面上部から管理者に戻れます。',
}

export default function AdminUserManagement({
    locale,
    variant,
    lineInquiryClicksByAgent = {},
    impersonation,
}: {
    locale: string
    /** 管理者ダッシュボードのタブごとに固定（エージェント / 一般ユーザー） */
    variant: AdminUserManagementVariant
    /** variant=agent のとき、今月の LINE 問い合わせボタンクリック数（日本時間の月初から） */
    lineInquiryClicksByAgent?: Record<string, number>
    /** 管理者がエージェントとしてログインするボタン文言（エージェントタブのみ） */
    impersonation?: AdminImpersonationActionCopy | null
}) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [resettingPassword, setResettingPassword] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const { limit, page, setPage, setLimit } = useAdminTablePagination()

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => window.clearTimeout(t)
    }, [searchQuery])

    const prevDebouncedRef = useRef(debouncedSearch)
    useEffect(() => {
        if (prevDebouncedRef.current !== debouncedSearch) {
            prevDebouncedRef.current = debouncedSearch
            if (page !== 1) setPage(1)
        }
    }, [debouncedSearch, page, setPage])
    const [agentActionBusy, setAgentActionBusy] = useState<string | null>(null)
    const [resumeRestoringUi, setResumeRestoringUi] = useState(false)
    const [impersonateBusy, setImpersonateBusy] = useState<string | null>(null)

    const { userData, refreshUser } = useAuth()
    const router = useRouter()
    const isAdminUser = userData.isAdmin || userData.role === 'admin'
    const impersonationCopy = impersonation ?? DEFAULT_IMPERSONATION_COPY

    const fetchUsers = async () => {
        setLoading(true)
        setErrorMessage(null)

        try {
            const res = await fetch('/api/admin/users', { credentials: 'include' })
            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string }
                setErrorMessage(body.error ?? res.statusText)
                setUsers([])
            } else {
                const body = (await res.json()) as { users?: unknown[] }
                setUsers(body.users ?? [])
            }
        } catch (err: unknown) {
            console.error('Fetch users error:', err)
            setErrorMessage(getErrorMessage(err))
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handlePlanChange = async (userId: string, newPlan: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan, plan_type: newPlan }),
            })
            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string }
                throw new Error(body.error ?? res.statusText)
            }
            await fetchUsers()
            alert('プランを変更しました。')
        } catch (err: unknown) {
            console.error('Plan update error:', err)
            alert(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const isExpiredPremiumUser = (user: any): boolean => {
        const premium = user?.plan === 'premium' || user?.plan_type === 'premium'
        if (!premium) return false
        if (!user?.current_period_end) return false
        const t = new Date(user.current_period_end).getTime()
        if (Number.isNaN(t)) return false
        return t <= Date.now()
    }

    const runAgentSuspendResume = async (user: any, suspend: boolean) => {
        const msg = suspend
            ? 'このエージェントを停止しますか？掲載中の物件は、停止前のステータスを記録したうえで一括で下書きになります。'
            : 'このエージェントのアカウントを再開しますか？停止前の状態に戻せる物件は一覧で復元されます。'
        if (!confirm(msg)) return
        if (!suspend) setResumeRestoringUi(true)
        setAgentActionBusy(user.id)
        try {
            const result = await adminAgentLifecycle({
                action: suspend ? 'suspend' : 'resume',
                targetUserId: user.id,
                property_handling: suspend ? 'unpublish' : 'keep',
            })
            if (result.error) {
                alert(getErrorMessage(result.error))
                return
            }
            if (!suspend && result.restoredPropertyCount != null) {
                alert(`${result.restoredPropertyCount}件の物件ステータスを復元しました。`)
            }
            await fetchUsers()
        } catch (e) {
            console.error(e)
            alert(getErrorMessage(e))
        } finally {
            setResumeRestoringUi(false)
            setAgentActionBusy(null)
        }
    }

    const runAgentDelete = async (user: any) => {
        if (
            !confirm(
                'このエージェントを削除（論理削除）し、認証アカウントを完全に削除しますか？\n公開中の物件は非公開になります。この操作は取り消せません。'
            )
        ) {
            return
        }
        setAgentActionBusy(user.id)
        try {
            const result = await adminAgentLifecycle({
                action: 'delete',
                targetUserId: user.id,
                property_handling: 'unpublish',
            })
            if (result.error) {
                alert(getErrorMessage(result.error))
                return
            }
            await fetchUsers()
        } catch (e) {
            console.error(e)
            alert(getErrorMessage(e))
        } finally {
            setAgentActionBusy(null)
        }
    }

    const runImpersonateAsAgent = async (user: { id: string; email?: string | null }) => {
        if (!confirm(impersonationCopy.confirm)) return
        if (!user.email) {
            alert('メールアドレスが無いため、代行ログインできません。')
            return
        }
        setImpersonateBusy(user.id)
        try {
            const res = await beginAdminAgentImpersonation(user.id, locale)
            if (!res.ok) {
                alert(res.error)
                return
            }
            const { error } = await supabase.auth.verifyOtp({
                type: 'magiclink',
                token_hash: res.token_hash,
            })
            if (error) {
                console.error(error)
                const discarded = await discardAdminImpersonationRevert()
                if (!discarded.ok) {
                    console.warn(discarded.error)
                }
                alert(error.message || 'エージェントへの切り替えに失敗しました。')
                return
            }
            await refreshUser()
            router.refresh()
            router.push(`/${locale}/dashboard`)
        } catch (e) {
            console.error(e)
            alert(getErrorMessage(e))
        } finally {
            setImpersonateBusy(null)
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
            if (user.deleted_at != null) return false
        } else {
            if (isAgentRole) return false
        }

        // Step 2: Search Query
        if (!debouncedSearch) return true
        const query = debouncedSearch.toLowerCase()
        return (
            user.full_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.plan?.toLowerCase().includes(query)
        )
    })

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / limit))
    const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit)

    const prevVariantRef = useRef(variant)
    useEffect(() => {
        if (prevVariantRef.current !== variant) {
            prevVariantRef.current = variant
            if (page !== 1) setPage(1)
        }
    }, [variant, page, setPage])

    useEffect(() => {
        if (filteredUsers.length === 0) return
        const maxP = Math.max(1, Math.ceil(filteredUsers.length / limit))
        if (page > maxP) setPage(maxP)
    }, [filteredUsers.length, limit, page, setPage])

    return (
        <>
            {resumeRestoringUi && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-navy-secondary/40 backdrop-blur-sm px-6"
                    role="status"
                    aria-live="polite"
                >
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                    <p className="text-center text-sm font-black text-white drop-shadow-sm">
                        物件ステータスを復元しています…
                    </p>
                </div>
            )}
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
                        {variant === 'agent' ? (
                            <p className="mt-1 max-w-xl text-[9px] font-medium leading-snug text-slate-500">
                                LINE問い合わせクリック数は、物件ページの LINE 導線（スマホ起動・PCのQR表示など）を line_inquiry_counts から、日本時間の今月1日0時以降に集計した件数です。
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                        <AdminRowsPerPageSelect
                            id={`admin-users-limit-${variant}`}
                            value={limit}
                            onChange={setLimit}
                            className="order-last md:order-none"
                        />
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
                                            <>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${user.plan === 'premium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {user.plan === 'premium' ? 'Pro' : 'Free'}
                                                </span>
                                                {user.deleted_at && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                        削除済み
                                                    </span>
                                                )}
                                                {!user.deleted_at && (user.status === 'suspended' || user.is_suspended) && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                                                        一時停止中
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                                    {variant === 'agent' && (
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-navy-primary">{user.property_count || 0}</span>
                                                <span className="text-[10px] text-slate-400">物件</span>
                                            </div>
                                            <div
                                                className="flex items-center gap-1 rounded-lg border border-[#06C755]/25 bg-[#06C755]/5 px-2 py-0.5"
                                                title="日本時間の今月1日0時以降のクリック"
                                            >
                                                <MessageCircle className="h-3 w-3 shrink-0 text-[#06C755]" aria-hidden />
                                                <span className="text-[10px] font-black text-[#047c3d] tabular-nums">
                                                    {lineInquiryClicksByAgent[user.id] ?? 0}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-600">LINE問い合わせクリック（今月）</span>
                                            </div>
                                            {/* Plan selector inline */}
                                            <select
                                                value={user.plan === 'standard' ? 'free' : (user.plan || 'free')}
                                                onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border outline-none bg-white border-slate-200 ml-1"
                                            >
                                                <option value="free">Free</option>
                                                <option value="premium">Pro</option>
                                            </select>
                                            {isExpiredPremiumUser(user) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePlanChange(user.id, 'premium')}
                                                    className="text-[10px] font-black px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                                    title="期限切れの Pro を手動で再有効化"
                                                >
                                                    Pro再有効化
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Actions */}
                                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                                    {resettingPassword === user.id ? (
                                        <div className="flex flex-row flex-wrap items-center justify-end gap-1.5">
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
                                        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                                            {variant === 'agent' ? (
                                                <>
                                                    <Link
                                                        href={`/${locale}/admin-secret?tab=agents&agent=${encodeURIComponent(user.id)}`}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-navy-primary/20 bg-navy-primary/5 px-3 py-1.5 text-[10px] font-black text-navy-primary transition-colors hover:bg-navy-primary hover:text-white"
                                                    >
                                                        詳細（分析）
                                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                                    </Link>
                                                    {isAdminUser && !user.deleted_at && (
                                                        <button
                                                            type="button"
                                                            disabled={impersonateBusy === user.id || !!agentActionBusy}
                                                            onClick={() => runImpersonateAsAgent(user)}
                                                            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-600/25 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-800 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                                            title={impersonationCopy.login_as_agent}
                                                        >
                                                            {impersonateBusy === user.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <LogIn className="h-3 w-3 opacity-80" />
                                                            )}
                                                            {impersonationCopy.login_as_agent}
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/${locale}/agents/${user.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 transition-colors hover:border-navy-primary/30 hover:text-navy-primary"
                                                    >
                                                        公開ページ
                                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                                    </Link>
                                                    {isAdminUser && !user.deleted_at && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={agentActionBusy === user.id}
                                                                onClick={() =>
                                                                    runAgentSuspendResume(
                                                                        user,
                                                                        !(user.status === 'suspended' || user.is_suspended)
                                                                    )
                                                                }
                                                                className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                                                            >
                                                                {user.status === 'suspended' || user.is_suspended
                                                                    ? '再開'
                                                                    : '利用停止'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={agentActionBusy === user.id}
                                                                onClick={() => runAgentDelete(user)}
                                                                className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-black text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                削除
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <Link
                                                    href={`/${locale}/admin-secret/users/${user.id}`}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-navy-primary/20 bg-navy-primary/5 px-3 py-1.5 text-[10px] font-black text-navy-primary transition-colors hover:bg-navy-primary hover:text-white"
                                                >
                                                    詳細
                                                    <ExternalLink className="h-3 w-3 opacity-70" />
                                                </Link>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => { setResettingPassword(user.id); setNewPassword('') }}
                                                className="inline-flex shrink-0 items-center justify-center p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
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
            {filteredUsers.length > 0 && totalPages > 1 && (
                <div className="bg-white border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-bold text-slate-400">
                        全 <span className="text-navy-secondary">{filteredUsers.length}</span> 件中
                        <span className="text-navy-secondary mx-1">
                            {(page - 1) * limit + 1}
                        </span>
                        〜
                        <span className="text-navy-secondary mx-1">
                            {Math.min(page * limit, filteredUsers.length)}
                        </span>
                        件を表示
                    </p>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center space-x-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${page === i + 1
                                        ? 'bg-navy-primary text-white shadow-md'
                                        : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
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
                            ※ エージェント会員は <code className="text-slate-500">user_role = agent</code>、または掲載物件があるプロフィールに含まれます。削除済み（論理削除）のエージェントはこの一覧には表示されません。
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
        </>
    )
}
