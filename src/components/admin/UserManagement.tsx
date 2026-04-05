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
import { useAuth } from '@/contexts/AuthContext'
import { adminAgentLifecycle } from '@/app/actions/adminAgentLifecycle'

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
    const [agentActionBusy, setAgentActionBusy] = useState<string | null>(null)
    const [resumeRestoringUi, setResumeRestoringUi] = useState(false)

    const supabase = createClient()
    const { userData } = useAuth()
    const isAdminUser = userData.isAdmin || userData.role === 'admin'

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
                                            {/* Plan selector inline */}
                                            <select
                                                value={user.plan === 'standard' ? 'free' : (user.plan || 'free')}
                                                onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border outline-none bg-white border-slate-200 ml-1"
                                            >
                                                <option value="free">Free</option>
                                                <option value="premium">Pro</option>
                                            </select>
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
