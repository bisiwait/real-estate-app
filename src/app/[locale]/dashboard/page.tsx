import { createClient } from '@/lib/supabase/server'
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
    Mail,
    RefreshCw,
    Users,
    Crown
} from 'lucide-react'
import FreshnessBadge from '@/components/dashboard/FreshnessBadge'
import PropertyConfirmButton from '@/components/dashboard/PropertyConfirmButton'
import BulkConfirmButton from '@/components/dashboard/BulkConfirmButton'
import PremiumPromoCard from '@/components/dashboard/PremiumPromoCard'
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus'

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
        .select('available_credits, plan, plan_type, full_name, phone, current_period_end, auto_renew')
        .eq('id', user.id)
        .single()

    // Determine the active plan (prefer plan_type from new system, fallback to legacy plan)
    const activePlan = profile?.plan_type || profile?.plan || 'free'

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


    // Fetch Leads Count
    const { count: leadsCount } = await supabase
        .from('inquiry_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id)

    const stats = {
        total: properties?.length || 0,
        published: properties?.filter(p => p.status === 'published' || p.status === 'under_negotiation' || p.status === 'contracted').length || 0,
        draft: properties?.filter(p => p.status === 'draft').length || 0,
        pending: properties?.filter(p => p.status === 'pending').length || 0,
        expired: properties?.filter(p => p.status === 'expired').length || 0,
        unreadInquiries: inquiries?.filter(i => !i.is_read).length || 0,
        leadsCount: leadsCount || 0
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-navy-secondary py-10 md:py-12 text-white">
                <div className="container mx-auto px-3 sm:px-4">
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
                            {activePlan === 'premium' && (
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
            <div className="container mx-auto px-3 sm:px-4 -mt-10">
                {profile_updated === 'true' && (
                    <FlashMessage message="プロフィール情報を更新しました。" duration={3000} />
                )}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Stats Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Subscription Status (Trial countdown / Portal link) */}
                        <SubscriptionStatus profile={profile} />

                        {/* Credits Card (Free users only) */}
                        {activePlan !== 'premium' && (
                            <CreditSection profile={profile} />
                        )}

                        {/* Premium Promo Card (Free users only) */}
                        {activePlan !== 'premium' && (
                            <PremiumPromoCard plan={activePlan} />
                        )}

                        {/* Simple Premium Label (Premium users only) */}
                        {activePlan === 'premium' && (
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在のプラン</p>
                                        <p className="text-sm font-black text-navy-secondary">プレミアムプラン</p>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                <span>メール問い合わせ ({inquiries?.length || 0})</span>
                                {stats.unreadInquiries > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                                        {stats.unreadInquiries}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href="/dashboard/leads"
                                className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all text-slate-400 hover:text-navy-primary hover:bg-slate-50 border border-transparent hover:border-navy-primary/10"
                            >
                                <Users className="w-4 h-4" />
                                <span>LINE問い合わせ ({stats.leadsCount})</span>
                            </Link>
                        </div>

                        {/* Content Area */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            {tab === 'properties' ? (
                                <>
                                    <div className="p-4 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-lg sm:text-xl font-black text-navy-secondary">登録物件一覧</h3>
                                            <BulkConfirmButton
                                                propertyIds={filteredProperties
                                                    .filter(p => p.status === 'published')
                                                    .map(p => p.id)}
                                            />
                                        </div>
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

                                    <div className="overflow-x-auto sm:overflow-visible pb-4">
                                        <div className="divide-y divide-slate-50 min-w-0 sm:min-w-[1000px]">
                                            {filteredProperties && filteredProperties.length > 0 ? (
                                                filteredProperties.map((property) => (
                                                    <div key={property.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                                                        <div className="flex items-center space-x-4 sm:space-x-6 min-w-0 flex-1">
                                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                                {property.images?.[0] ? (
                                                                    <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                        <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {property.status === 'published' && <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">公開中</span>}
                                                                        {property.status === 'pending' && <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">承認待ち</span>}
                                                                        {property.status === 'draft' && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">下書き</span>}
                                                                        {property.status === 'under_negotiation' && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">商談中</span>}
                                                                        {property.status === 'contracted' && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">成約済</span>}
                                                                        {property.status === 'expired' && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">期限切れ</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">#{property.id.slice(0, 8)}</span>
                                                                        <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                                                                    </div>
                                                                    <div className="hidden sm:block">
                                                                        <AgentStatusToggles propertyId={property.id} currentStatus={property.status} />
                                                                    </div>
                                                                </div>
                                                                <h4 className="text-sm sm:text-lg font-bold text-navy-secondary mb-0.5 sm:mb-1 truncate">{property.title}</h4>
                                                                {/* Mobile-friendly meta layout (keeps desktop as-is via sm:*) */}
                                                                <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
                                                                    {/* Area (mobile: full-width pill, desktop: simple text) */}
                                                                    <div className="sm:hidden w-full">
                                                                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">AREA</div>
                                                                                <div className="text-sm font-black text-navy-secondary truncate">
                                                                                    {property.area?.name || 'Unknown Area'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="shrink-0">
                                                                                <div className="flex gap-1.5">
                                                                                    {property.is_presale ? (
                                                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-200">PRESALE</span>
                                                                                    ) : (
                                                                                        <>
                                                                                            {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 uppercase">Rent</span>}
                                                                                            {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-orange-100 uppercase">Sale</span>}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                                        <span className="text-slate-400">{property.area?.name || 'Unknown Area'}</span>
                                                                    </div>

                                                                    {/* Prices */}
                                                                    <div className="flex flex-wrap items-center gap-3">
                                                                        {property.is_for_rent && (
                                                                            <span className="inline-flex items-baseline gap-1 text-navy-primary font-bold tabular-nums">
                                                                                <span className="text-[9px] opacity-50 uppercase">Rent</span>
                                                                                {property.rent_price?.toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                        {property.is_for_sale && (
                                                                            <span className="inline-flex items-baseline gap-1 text-navy-primary font-bold tabular-nums">
                                                                                <span className="text-[9px] opacity-50 uppercase">Sale</span>
                                                                                {property.sale_price?.toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Status toggles (mobile: own row, larger buttons) */}
                                                                    <div className="sm:hidden w-full pt-1">
                                                                        <AgentStatusToggles
                                                                            propertyId={property.id}
                                                                            currentStatus={property.status}
                                                                            className="w-full justify-start"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                                            <div className="flex gap-1.5">
                                                                {property.is_presale ? (
                                                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-200">PRESALE</span>
                                                                ) : (
                                                                    <>
                                                                        {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 uppercase">Rent</span>}
                                                                        {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-orange-100 uppercase">Sale</span>}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 sm:gap-2">
                                                                <Link
                                                                    href={`/properties/${property.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-100 flex items-center"
                                                                >
                                                                    <span className="hidden sm:inline">詳細</span>
                                                                    <ChevronRight className="w-4 h-4 ml-1 sm:ml-0" />
                                                                </Link>
                                                                <PropertyConfirmButton propertyId={property.id} title={property.title} />
                                                                <DashboardActions
                                                                    propertyId={property.id}
                                                                    propertyTitle={property.title}
                                                                    profile={profile}
                                                                    property={property}
                                                                    agent={{
                                                                        full_name: profile?.full_name,
                                                                        phone: profile?.phone
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-20 text-center">
                                                    <p className="text-slate-400 font-medium">登録されている物件はありません</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>{/* Inquiries List View */}
                                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                        <h3 className="text-xl font-black text-navy-secondary">届いたメール問い合わせ</h3>
                                        <span className="text-xs font-bold text-slate-400">Total: {inquiries?.length || 0} messages</span>
                                    </div>
                                    <InquiryList initialInquiries={inquiries || []} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
