import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreditSection from '@/components/dashboard/CreditSection'
import DashboardActions from '@/components/dashboard/DashboardActions'
import InquiryList from '@/components/dashboard/InquiryList'
import FlashMessage from '@/components/dashboard/FlashMessage'
import StatusFilter from '@/components/dashboard/StatusFilter'
import AgentStatusToggles from '@/components/dashboard/AgentStatusToggles'
import {
    PlusCircle,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    LayoutDashboard,
    Building2,
    Mail
} from 'lucide-react'

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: { tab?: string; profile_updated?: string; filter?: string; status?: string }
}) {
    const { tab = 'properties', profile_updated, filter = 'all', status = 'all' } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch Profile (Credits & Plan)
    const { data: profile } = await supabase
        .from('profiles')
        .select('available_credits, plan')
        .eq('id', user.id)
        .single()

    // Fetch Properties
    const { data: properties } = await supabase
        .from('properties')
        .select('*, area:areas(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    let filteredProperties = properties || []
    if (filter === 'rent') {
        filteredProperties = filteredProperties.filter(p => p.is_for_rent && !p.is_presale)
    } else if (filter === 'sale') {
        filteredProperties = filteredProperties.filter(p => p.is_for_sale && !p.is_presale)
    } else if (filter === 'presale') {
        filteredProperties = filteredProperties.filter(p => p.is_presale)
    }

    if (status !== 'all') {
        filteredProperties = filteredProperties.filter(p => p.status === status)
    }

    // Fetch Inquiries
    const { data: rawInquiries, error: inquiriesError } = await supabase
        .from('inquiries')
        .select('*, property:properties(title)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

    if (inquiriesError) {
        console.error('Error fetching inquiries:', inquiriesError)
    }

    // Fetch Replies for these inquiries separately to avoid join complexity/RLS issues blocking the whole list
    let inquiries = rawInquiries || []
    if (inquiries.length > 0) {
        const inquiryIds = inquiries.map(i => i.id)
        const { data: allReplies, error: repliesError } = await supabase
            .from('inquiry_replies')
            .select('*')
            .in('inquiry_id', inquiryIds)

        if (repliesError) {
            console.error('Error fetching replies:', repliesError)
        } else {
            // Attach replies to their respective inquiries
            inquiries = inquiries.map(inq => ({
                ...inq,
                replies: allReplies?.filter(r => r.inquiry_id === inq.id) || []
            }))
        }
    }


    const stats = {
        total: properties?.length || 0,
        published: properties?.filter(p => p.status === 'published' || p.status === 'under_negotiation' || p.status === 'contracted').length || 0,
        draft: properties?.filter(p => p.status === 'draft').length || 0,
        pending: properties?.filter(p => p.status === 'pending').length || 0,
        expired: properties?.filter(p => p.status === 'expired').length || 0,
        unreadInquiries: inquiries?.filter(i => !i.is_read).length || 0
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-navy-secondary py-12 text-white">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                                <LayoutDashboard className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">掲載主ダッシュボード</h1>
                                <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Listing Management</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            {profile?.plan === 'premium' && (
                                <Link
                                    href="/dashboard/presale"
                                    className="bg-amber-500 text-white px-8 py-3.5 rounded-full font-bold hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 w-full md:w-auto"
                                >
                                    <Building2 className="w-5 h-5 flex-shrink-0" />
                                    <span>プレセール投稿 (Premium)</span>
                                </Link>
                            )}
                            <Link
                                href="/list-property"
                                className="bg-white text-navy-primary px-8 py-3.5 rounded-full font-bold hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 w-full md:w-auto"
                            >
                                <PlusCircle className="w-5 h-5 flex-shrink-0" />
                                <span>物件を新規掲載する</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10">
                {profile_updated === 'true' && (
                    <FlashMessage message="プロフィール情報を更新しました。" duration={3000} />
                )}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Stats Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Credits Card */}
                        <CreditSection initialCredits={profile?.available_credits || 0} plan={profile?.plan} />

                        {/* Summary List */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">概要</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-bold">公開中</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.published}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-navy-primary/5 text-navy-primary">
                                    <div className="flex items-center space-x-3">
                                        <Mail className="w-5 h-5" />
                                        <span className="text-sm font-bold">新着お問い合わせ</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.unreadInquiries}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 text-amber-600">
                                    <div className="flex items-center space-x-3">
                                        <Clock className="w-5 h-5" />
                                        <span className="text-sm font-bold">承認待ち</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.pending}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50 text-red-600">
                                    <div className="flex items-center space-x-3">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-sm font-bold">期限切れ等</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.expired + stats.draft}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Tab Switcher */}
                        <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-100 flex space-x-2">
                            <Link
                                href="?tab=properties"
                                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all ${tab === 'properties'
                                    ? 'bg-navy-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                <span>掲載物件 ({stats.total})</span>
                            </Link>
                            <Link
                                href="?tab=inquiries"
                                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all relative ${tab === 'inquiries'
                                    ? 'bg-navy-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                <span>お問い合わせ ({inquiries?.length || 0})</span>
                                {stats.unreadInquiries > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                                        {stats.unreadInquiries}
                                    </span>
                                )}
                            </Link>
                        </div>

                        {/* Content Area */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            {tab === 'properties' ? (
                                <>
                                    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <h3 className="text-xl font-black text-navy-secondary">登録物件一覧</h3>
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full sm:w-auto">
                                                <Link href={`?tab=properties&filter=all&status=${status}`} prefetch={false} className={`whitespace-nowrap px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center min-w-[80px] ${filter === 'all' ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'}`}>すべて</Link>
                                                <Link href={`?tab=properties&filter=rent&status=${status}`} prefetch={false} className={`whitespace-nowrap px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center min-w-[100px] ${filter === 'rent' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}>賃貸 (RENT)</Link>
                                                <Link href={`?tab=properties&filter=sale&status=${status}`} prefetch={false} className={`whitespace-nowrap px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center min-w-[100px] ${filter === 'sale' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-orange-600'}`}>売買 (SALE)</Link>
                                                <Link href={`?tab=properties&filter=presale&status=${status}`} prefetch={false} className={`whitespace-nowrap px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center min-w-[100px] ${filter === 'presale' ? 'bg-amber-500 shadow-sm text-white' : 'text-slate-500 hover:text-amber-600'}`}>プレセール</Link>
                                            </div>

                                            <div className="w-full sm:w-36">
                                                <StatusFilter filter={filter} status={status} />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">表示: {filteredProperties.length} / 全: {stats.total} 件</span>
                                    </div>

                                    <div className="divide-y divide-slate-50">
                                        {filteredProperties && filteredProperties.length > 0 ? (
                                            filteredProperties.map((property) => (
                                                <div key={property.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center space-x-6">
                                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                            {property.images?.[0] ? (
                                                                <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                    <LayoutDashboard className="w-8 h-8" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-1">
                                                                {property.status === 'published' && (
                                                                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">公開中</span>
                                                                )}
                                                                {property.status === 'under_negotiation' && (
                                                                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">商談中</span>
                                                                )}
                                                                {property.status === 'contracted' && (
                                                                    <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">成約済</span>
                                                                )}
                                                                {property.status === 'pending' && (
                                                                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">承認待ち</span>
                                                                )}
                                                                {property.status === 'draft' && (
                                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">下書き</span>
                                                                )}
                                                                {property.status === 'expired' && (
                                                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">期限切れ</span>
                                                                )}
                                                                <span className="text-xs text-slate-400 font-medium">#{property.id.slice(0, 8)}</span>
                                                                <AgentStatusToggles propertyId={property.id} currentStatus={property.status} />
                                                            </div>
                                                            <h4 className="text-lg font-bold text-navy-secondary mb-1">{property.title}</h4>
                                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
                                                                <span className="text-slate-400">{property.area?.name || 'Unknown Area'}</span>
                                                                <div className="flex items-center space-x-3">
                                                                    {property.is_for_rent && (
                                                                        <span className="text-navy-primary">
                                                                            <span className="text-[10px] font-bold opacity-50 mr-1">RENT:</span>
                                                                            {property.rent_price?.toLocaleString()} THB
                                                                        </span>
                                                                    )}
                                                                    {property.is_for_sale && (
                                                                        <span className="text-navy-primary">
                                                                            <span className="text-[10px] font-bold opacity-50 mr-1">SALE:</span>
                                                                            {property.sale_price?.toLocaleString()} THB
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col md:flex-row items-center gap-2">
                                                        <div className="flex gap-2 min-w-max">
                                                            {property.is_presale ? (
                                                                <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-amber-200">
                                                                    PRESALE
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    {property.is_for_rent && (
                                                                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-indigo-100">
                                                                            RENT
                                                                        </span>
                                                                    )}
                                                                    {property.is_for_sale && (
                                                                        <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-orange-100">
                                                                            SALE
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        <Link
                                                            href={`/properties/${property.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center space-x-1 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all border border-transparent hover:border-slate-100"
                                                        >
                                                            <span>詳細</span>
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Link>
                                                        <DashboardActions propertyId={property.id} propertyTitle={property.title} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-20 text-center">
                                                <p className="text-slate-400 font-medium">登録されている物件はありません</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                        <h3 className="text-xl font-black text-navy-secondary">届いたお問い合わせ</h3>
                                        <span className="text-xs font-bold text-slate-400">Total: {inquiries?.length || 0} messages</span>
                                    </div>
                                    <InquiryList initialInquiries={inquiries || []} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
