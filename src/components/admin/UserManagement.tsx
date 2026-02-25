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
    ShieldCheck
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'


export default function AdminUserManagement() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [adjusting, setAdjusting] = useState<string | null>(null)
    const [amount, setAmount] = useState(1)
    const supabase = createClient()

    const fetchUsers = async () => {
        setLoading(true)
        setErrorMessage(null)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false })


        if (error) {
            console.error('Fetch users error:', error)
            setErrorMessage(getErrorMessage(error))
        } else if (data) {
            setUsers(data)
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

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-navy-secondary">エージェント・クレジット管理</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">User & Credit Management</p>
                </div>
                <Users className="w-8 h-8 text-navy-primary/20" />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">エージェント</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">現在のクレジット</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">管理操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {errorMessage && (
                            <tr>
                                <td colSpan={3} className="px-8 py-4 bg-red-50 text-red-600 text-xs font-bold text-center">
                                    エラーが発生しました: {errorMessage}
                                </td>
                            </tr>
                        )}
                        {loading && users.length === 0 ? (

                            <tr>
                                <td colSpan={3} className="px-8 py-20 text-center">
                                    <Loader2 className="w-10 h-10 text-navy-primary/10 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Agents...</p>
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-navy-primary/5 p-3 rounded-2xl group-hover:bg-navy-primary group-hover:text-white transition-all">
                                                <Users className="w-5 h-5 text-navy-primary group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-navy-secondary flex items-center">
                                                    {user.full_name || 'Anonymous Agent'}
                                                    {user.is_admin && <ShieldCheck className="w-3 h-3 ml-2 text-amber-500" />}
                                                </p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-2">
                                            <Coins className="w-4 h-4 text-amber-500" />
                                            <span className="text-xl font-black text-navy-secondary">{user.available_credits || 0}</span>

                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credits</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
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
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setAdjusting(user.id)
                                                    setAmount(1)
                                                }}
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-50 text-navy-primary rounded-xl text-xs font-black hover:bg-navy-primary hover:text-white transition-all shadow-sm border border-transparent hover:border-navy-primary/20"
                                            >
                                                <span>クレジットを管理</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-50 p-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    ※ クレジットの付与・減算は即座にデータベースに反映されます。<br />
                    不審な操作はログを確認し、必要に応じてプロフィールを一時停止してください。
                </p>
            </div>
        </div>
    )
}
