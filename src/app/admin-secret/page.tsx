import { redirect } from 'next/navigation'
export const runtime = 'edge';
import { isAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import {
    BarChart3,
    Home,
    Users,
    MessageSquare,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertTriangle,
    ShieldCheck,
    Sparkles
} from 'lucide-react'
import Link from 'next/link'

import AdminPropertyManagement from '@/components/admin/PropertyManagement'
import AdminUserManagement from '@/components/admin/UserManagement'
import AdminProjectManagement from '@/components/admin/ProjectManagement'

export default async function AdminSecretDashboard() {
    const isUserAdmin = await isAdmin()

    // Strict redirect for non-admins
    if (!isUserAdmin) {
        redirect('/')
    }

    const supabase = await createClient()

    // Fetch summary stats
    const { data: properties } = await supabase.from('properties').select('status, is_approved')
    const { data: contacts } = await supabase.from('inquiries').select('id, created_at')

    const pendingCount = properties?.filter(p => !p.is_approved).length || 0
    const activeCount = properties?.filter(p => p.is_approved && p.status === 'published').length || 0

    // Inquiries in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentInquiries = contacts?.filter(c => c.created_at >= oneDayAgo).length || 0

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24">
            <div className="container mx-auto px-4">
                {/* Minimal Identification & Actions */}
                <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
                    <div className="flex items-center space-x-2">
                        <div className="bg-amber-500 text-navy-secondary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                            Secret Mode
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Access Only</span>
                    </div>

                    <Link href="/list-property" className="flex items-center space-x-2 bg-navy-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>AIで物件を取り込む</span>
                    </Link>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-amber-50 p-3 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <TrendingUp className="w-6 h-6 text-amber-500 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">¥ ---,---</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Stripe連携準備中</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-navy-primary/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-navy-primary group-hover:text-white transition-colors">
                                <Home className="w-6 h-6 text-navy-primary group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Listings</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{activeCount} <span className="text-sm font-medium">物件</span></p>
                        <div className="flex items-center mt-1 text-emerald-500 font-bold text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" /> 公開中
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-red-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-red-50 p-3 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Clock className="w-6 h-6 text-red-500 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{pendingCount} <span className="text-sm font-medium">物件</span></p>
                        <div className="flex items-center mt-1 text-red-500 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> 承認待ち
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-navy-secondary/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-navy-secondary group-hover:text-white transition-colors">
                                <MessageSquare className="w-6 h-6 text-navy-secondary group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquiries (24h)</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{recentInquiries} <span className="text-sm font-medium">件</span></p>
                        <p className="text-xs text-slate-400 font-medium mt-1">直近24時間の問い合わせ</p>
                    </div>
                </div>

                {/* Main Management Section */}
                <div className="grid grid-cols-1 gap-12">
                    <AdminProjectManagement />
                    <AdminPropertyManagement />
                    <AdminUserManagement />
                </div>
            </div>
        </div>
    )
}
