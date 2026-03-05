'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    ChevronRight,
    Coins,
    Plus,
    Minus,
    Loader2,
    ShieldCheck,
    Search,
    ChevronLeft,
    UserCircle,
    Building2
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { adminResetPassword } from '@/app/actions/adminAuth'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

type UserRoleFilter = 'agent' | 'general';

export default function AdminUserManagement() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [adjusting, setAdjusting] = useState<string | null>(null)
    const [resettingPassword, setResettingPassword] = useState<string | null>(null)
    const [amount, setAmount] = useState(1)
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('agent')

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

    const handleCreditAdjust = async (userId: string, currentCredits: number, type: 'add' | 'remove') => {
        const newCredits = type === 'add' ? currentCredits + amount : Math.max(0, currentCredits - amount)

        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ available_credits: newCredits })
                .eq('id', userId)

            if (!error) {
                await fetchUsers()
                setAdjusting(null)
            } else {
                throw error
            }
        } catch (err: any) {
            console.error('Credit adjustment error:', err)
            alert(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handlePlanChange = async (userId: string, newPlan: string) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ plan: newPlan })
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
            (user.available_credits !== undefined && user.available_credits > 0);

        // Step 1: Role Filter
        if (roleFilter === 'agent') {
            if (!isAgentRole) return false;
        } else {
            if (isAgentRole) return false;
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
    }, [searchQuery, roleFilter])

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-navy-primary/10 rounded-2xl text-navy-primary">
                            {roleFilter === 'agent' ? <Building2 className="w-6 h-6" /> : <UserCircle className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-navy-secondary">
                                {roleFilter === 'agent' ? 'エージェント・クレジット管理' : '一般ユーザー管理'}
                                <span className="ml-3 text-sm font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                    {filteredUsers.length} 件
                                </span>
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                {roleFilter === 'agent' ? 'Agent & Credit Management' : 'General User Management'}
                            </p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="名前、メールで検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy-secondary focus:ring-2 focus:ring-navy-primary outline-none transition-all placeholder:text-slate-300 shadow-sm"
                        />
                    </div>
                </div>

                {/* Tab UI */}
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setRoleFilter('agent')}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${roleFilter === 'agent'
                            ? 'bg-white text-navy-primary shadow-sm'
                            : 'text-slate-500 hover:text-navy-primary'
                            }`}
                    >
                        <Building2 size={14} />
                        <span>エージェント</span>
                    </button>
                    <button
                        onClick={() => setRoleFilter('general')}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${roleFilter === 'general'
                            ? 'bg-white text-navy-primary shadow-sm'
                            : 'text-slate-500 hover:text-navy-primary'
                            }`}
                    >
                        <UserCircle size={14} />
                        <span>一般ユーザー</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                <table className="w-full text-left min-w-[1000px]">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {roleFilter === 'agent' ? 'エージェント' : 'ユーザー'}
                            </th>
                            {roleFilter === 'agent' && (
                                <>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">プラン</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">登録物件数</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">現在のクレジット</th>
                                </>
                            )}
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">管理操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {errorMessage && (
                            <tr>
                                <td colSpan={roleFilter === 'agent' ? 4 : 2} className="px-8 py-4 bg-red-50 text-red-600 text-xs font-bold text-center">
                                    エラーが発生しました: {errorMessage}
                                </td>
                            </tr>
                        )}
                        {loading && users.length === 0 ? (
                            <tr>
                                <td colSpan={roleFilter === 'agent' ? 4 : 2} className="px-8 py-20 text-center">
                                    <Loader2 className="w-10 h-10 text-navy-primary/10 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Data...</p>
                                </td>
                            </tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan={roleFilter === 'agent' ? 4 : 2} className="px-8 py-20 text-center">
                                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold">データが見つかりません</p>
                                    <p className="text-xs text-slate-400 mt-1">検索条件を変更してお試しください</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-navy-primary/5 p-3 rounded-2xl group-hover:bg-navy-primary group-hover:text-white transition-all">
                                                <Users className="w-5 h-5 text-navy-primary group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-navy-secondary flex items-center">
                                                    {user.full_name || user.email || 'Anonymous'}
                                                    {user.user_role === 'admin' && <ShieldCheck className="w-3 h-3 ml-2 text-amber-500" />}
                                                </p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {roleFilter === 'agent' && (
                                        <>
                                            <td className="px-8 py-6 text-center">
                                                <select
                                                    value={user.plan || 'free'}
                                                    onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                                    className={`text-xs font-black px-3 py-1.5 rounded-lg border outline-none transition-all
                                                        ${user.plan === 'premium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                            user.plan === 'standard' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'}`}
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="standard">Standard</option>
                                                    <option value="premium">Premium</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/50 rounded-xl">
                                                    <span className="text-sm font-black text-navy-primary">{user.property_count || 0}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">物件</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-2">
                                                    <Coins className="w-4 h-4 text-amber-500" />
                                                    <span className="text-xl font-black text-navy-secondary">{user.available_credits || 0}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credits</span>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end space-y-2">
                                            {adjusting === user.id ? (
                                                <div className="flex items-center justify-end space-x-2 animate-in fade-in slide-in-from-right-2">
                                                    <input
                                                        type="number"
                                                        value={amount}
                                                        onChange={(e) => setAmount(Number(e.target.value))}
                                                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-navy-secondary focus:ring-2 focus:ring-navy-primary outline-none"
                                                        min="1"
                                                    />
                                                    <button
                                                        onClick={() => handleCreditAdjust(user.id, user.available_credits || 0, 'add')}
                                                        className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                                                        title="付与"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCreditAdjust(user.id, user.available_credits || 0, 'remove')}
                                                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md active:scale-95"
                                                        title="減算"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAdjusting(null)}
                                                        className="text-[10px] font-black text-slate-400 hover:text-navy-secondary ml-2 uppercase"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : resettingPassword === user.id ? (
                                                <div className="flex items-center justify-end space-x-2 animate-in fade-in slide-in-from-right-2">
                                                    <div className="relative">
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="新パスワード"
                                                            className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy-secondary focus:ring-2 focus:ring-navy-primary outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                                        >
                                                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleResetPassword(user.id)}
                                                        className="px-3 py-1.5 bg-navy-primary text-white rounded-lg text-[10px] font-black hover:bg-navy-secondary transition-all shadow-md"
                                                    >
                                                        保存
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setResettingPassword(null)
                                                            setNewPassword('')
                                                        }}
                                                        className="text-[10px] font-black text-slate-400 hover:text-navy-secondary ml-2 uppercase"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setResettingPassword(user.id)
                                                            setAdjusting(null)
                                                            setNewPassword('')
                                                        }}
                                                        className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-black hover:bg-slate-100 hover:text-navy-secondary transition-all border border-transparent"
                                                        title="パスワード変更"
                                                    >
                                                        <KeyRound className="w-3 h-3" />
                                                        <span className="hidden md:inline text-[10px]">PW変更</span>
                                                    </button>
                                                    {roleFilter === 'agent' && (
                                                        <button
                                                            onClick={() => {
                                                                setAdjusting(user.id)
                                                                setResettingPassword(null)
                                                                setAmount(1)
                                                            }}
                                                            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-50 text-navy-primary rounded-xl text-xs font-black hover:bg-navy-primary hover:text-white transition-all shadow-sm border border-transparent hover:border-navy-primary/20"
                                                        >
                                                            <span>クレジット管理</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                    ※ ユーザーの役割（エージェント/一般）は、クレジットの有無や物件の投稿履歴に基づいて自動的に分類されます。<br />
                    不審な操作はログを確認し、必要に応じてプロフィールを一時停止してください。
                </p>
            </div>
        </div>
    )
}
