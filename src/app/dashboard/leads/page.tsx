import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    MessageCircle,
    Phone,
    FileText,
    Calendar,
    Home,
    User,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgentLeadsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch leads for properties owned by this agent
    const { data: leads, error } = await supabase
        .from('inquiry_logs')
        .select(`
            *,
            property:properties(title, id),
            profile:user_id(full_name, email)
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching leads:', error)
    }

    // Secondary fetch for profiles to avoid complex JOIN issues if they fail
    // In a real app, you'd want a single join, but for debugging/reliability we can split or simplify.
    // Let's keep it simple for now and just show the leads.

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">新規</span>
            case 'contacted': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">対応中</span>
            case 'closed': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">成約</span>
            default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{status}</span>
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'line': return <MessageCircle className="w-4 h-4 text-[#06C755]" />
            case 'phone': return <Phone className="w-4 h-4 text-blue-500" />
            case 'form': return <FileText className="w-4 h-4 text-slate-500" />
            default: return <MessageCircle className="w-4 h-4 text-slate-400" />
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-navy-secondary flex items-center gap-2">
                        <Users className="w-8 h-8 text-navy-primary" />
                        リード（見込み客）管理
                    </h1>
                    <p className="text-slate-500 text-sm font-bold mt-1">
                        物件に興味を持ったユーザーのアクション履歴を確認・追跡します。
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="物件名やユーザー名で検索..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-primary/20 w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">日時</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">種別</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">問い合わせ物件</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ユーザー</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">メモ</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads && leads.length > 0 ? leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-navy-secondary">
                                                    {new Date(lead.created_at).toLocaleDateString('ja-JP')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(lead.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(lead.inquiry_type)}
                                                <span className="text-xs font-bold text-slate-600 capitalize">{lead.inquiry_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/properties/${lead.property_id}`}
                                                className="text-xs font-bold text-navy-primary hover:underline flex items-center gap-1"
                                            >
                                                <Home className="w-3 h-3" />
                                                {lead.property?.title}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-navy-secondary">
                                                        {lead.profile?.full_name || 'ゲスト（未ログイン）'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {lead.profile?.email || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] text-slate-500 font-medium max-w-[200px] truncate italic">
                                                {lead.notes || 'メモなし'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* We will add an interactive edit component here later */}
                                            <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-navy-primary transition-all shadow-sm border border-transparent hover:border-slate-100">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Users className="w-12 h-12 opacity-20" />
                                                <p className="text-sm font-bold">まだリード情報がありません。</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Users({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
