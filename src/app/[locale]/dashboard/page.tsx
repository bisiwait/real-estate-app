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
        <div className="bg-slate-50 min-h-screen pb-20 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header */}
            <div className="bg-navy-secondary py-8 md:py-12 text-white">
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                            <div className="bg-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
                                <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-3xl font-black tracking-tight truncate">ダッシュボード</h1>
                                <p className="text-slate-400 text-[10px] sm:text-sm font-medium mt-0.5 sm:mt-1 uppercase tracking-widest">Listing Management</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
                            {activePlan === 'premium' && (
                                <Link
                                    href="/dashboard/presale"
                                    className="bg-amber-500 text-white px-4 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-bold hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2 w-full md:w-auto"
                                >
                                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    <span>プレセール投稿</span>
                                </Link>
                            )}
                            <Link
                                href="/list-property"
                                className="bg-white text-navy-primary px-4 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-bold hover:bg-slate-50 transition-all shadow-lg flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                <span>物件を新規掲載する</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 mt-6 sm:-mt-10">
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
                        <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-md border border-slate-100 grid grid-cols-3 gap-1">
                            <Link
                                href="?tab=properties"
                                className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center ${tab === 'properties'
                                    ? 'bg-navy-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>物件 ({stats.total})</span>
                            </Link>
                            <Link
                                href="?tab=inquiries"
                                className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-bold transition-all relative text-center ${tab === 'inquiries'
                                    ? 'bg-navy-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>メール ({inquiries?.length || 0})</span>
                                {stats.unreadInquiries > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[8px] sm:text-[10px] text-white ring-2 ring-white">
                                        {stats.unreadInquiries}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href="/dashboard/leads"
                                className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-sm font-bold transition-all text-center text-slate-400 hover:text-navy-primary hover:bg-slate-50`}
                            >
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>LINE ({stats.leadsCount})</span>
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
                                            <div className="grid grid-cols-4 sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                                                <Link href={`?tab=properties&filter=all&status=${status}`} prefetch={false} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'all' ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'}`}>すべて</Link>
                                                <Link href={`?tab=properties&filter=rent&status=${status}`} prefetch={false} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'rent' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}>賃貸</Link>
                                                <Link href={`?tab=properties&filter=sale&status=${status}`} prefetch={false} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'sale' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-orange-600'}`}>売買</Link>
                                                <Link href={`?tab=properties&filter=presale&status=${status}`} prefetch={false} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'presale' ? 'bg-amber-500 shadow-sm text-white' : 'text-slate-500 hover:text-amber-600'}`}>プレセール</Link>
                                            </div>

                                            <div className="w-full sm:w-36">
                                                <StatusFilter filter={filter} status={status} />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">表示: {filteredProperties.length} / 全: {stats.total} 件</span>
                                    </div>

                                    {/* Mobile: 1-column compact cards / Desktop: horizontal row list */}
                                    {filteredProperties && filteredProperties.length > 0 ? (<>
                                        {/* ── MOBILE LIST (< sm) ── */}
                                        <div className="sm:hidden divide-y divide-slate-100">
                                            {filteredProperties.map((property) => (
                                                <div key={property.id} className="p-3 active:bg-slate-50 transition-colors">
                                                    {/* Top row: image + info */}
                                                    <div className="flex gap-3">
                                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 shadow-sm">
                                                            {property.images?.[0] ? (
                                                                <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                    <LayoutDashboard className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                            <div className="absolute top-1 left-1">
                                                                {property.status === 'published' && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">公開</span>}
                                                                {property.status === 'pending' && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">待ち</span>}
                                                                {property.status === 'draft' && <span className="bg-slate-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">下書</span>}
                                                                {property.status === 'under_negotiation' && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">商談</span>}
                                                                {property.status === 'contracted' && <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">成約</span>}
                                                                {property.status === 'expired' && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">期限切</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                {property.is_presale && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-amber-200">PRESALE</span>}
                                                                {!property.is_presale && property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">RENT</span>}
                                                                {!property.is_presale && property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-100">SALE</span>}
                                                                <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                                                            </div>
                                                            <p className="text-[13px] font-black text-navy-secondary leading-tight line-clamp-2">{property.title}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">{property.area?.name || '—'}</p>
                                                            <div className="text-[13px] font-black text-navy-primary mt-1 tabular-nums">
                                                                {property.is_for_rent && <span className="mr-3">{property.rent_price?.toLocaleString()} ฿/月</span>}
                                                                {property.is_for_sale && <span>{property.sale_price?.toLocaleString()} ฿</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Action bar: full-width, clearly tappable buttons */}
                                                    <div className="mt-2 flex items-stretch bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                                        <Link
                                                            href={`/properties/${property.id}`}
                                                            target="_blank"
                                                            className="flex-1 flex items-center justify-center gap-1 py-3 text-[11px] font-bold text-slate-500 active:bg-slate-100 active:scale-[0.97] transition-all"
                                                        >
                                                            <ChevronRight className="w-3.5 h-3.5" /> 詳細
                                                        </Link>
                                                        <div className="w-px bg-slate-200" />
                                                        <div className="flex-1 flex items-center justify-center">
                                                            <DashboardActions
                                                                propertyId={property.id}
                                                                propertyTitle={property.title}
                                                                profile={profile}
                                                                property={property}
                                                                agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Status toggles: separate row below */}
                                                    <div className="mt-2 flex items-center justify-between px-1">
                                                        <AgentStatusToggles propertyId={property.id} currentStatus={property.status} />
                                                        <PropertyConfirmButton propertyId={property.id} title={property.title} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ── DESKTOP ROW LIST (sm+) ── */}
                                        <div className="hidden sm:block overflow-x-hidden pb-4">
                                            <div className="divide-y divide-slate-50 w-full">
                                                {filteredProperties.map((property) => (
                                                    <div key={property.id} className="p-4 lg:p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 lg:gap-6">
                                                        <div className="flex items-center space-x-4 lg:space-x-6 min-w-0 flex-1">
                                                            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                                {property.images?.[0] ? (
                                                                    <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                        <LayoutDashboard className="w-6 h-6 lg:w-8 lg:h-8" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    {property.status === 'published' && <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">公開中</span>}
                                                                    {property.status === 'pending' && <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">承認待ち</span>}
                                                                    {property.status === 'draft' && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">下書き</span>}
                                                                    {property.status === 'under_negotiation' && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">商談中</span>}
                                                                    {property.status === 'contracted' && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold">成約済</span>}
                                                                    {property.status === 'expired' && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">期限切れ</span>}
                                                                    <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">#{property.id.slice(0, 8)}</span>
                                                                    <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                                                                    <AgentStatusToggles propertyId={property.id} currentStatus={property.status} />
                                                                </div>
                                                                <h4 className="text-sm lg:text-lg font-bold text-navy-secondary mb-1 truncate">{property.title}</h4>
                                                                <div className="flex flex-wrap items-center gap-x-3 text-xs lg:text-sm font-medium">
                                                                    <span className="text-slate-400">{property.area?.name || 'Unknown Area'}</span>
                                                                    {property.is_for_rent && <span className="text-navy-primary font-bold tabular-nums"><span className="text-[9px] opacity-50 uppercase mr-1">Rent</span>{property.rent_price?.toLocaleString()}</span>}
                                                                    {property.is_for_sale && <span className="text-navy-primary font-bold tabular-nums"><span className="text-[9px] opacity-50 uppercase mr-1">Sale</span>{property.sale_price?.toLocaleString()}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <div className="flex gap-1">
                                                                {property.is_presale ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-200">PS</span> : <>
                                                                    {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 uppercase">R</span>}
                                                                    {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-orange-100 uppercase">S</span>}
                                                                </>}
                                                            </div>
                                                            <Link href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer" className="px-2 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-100 flex items-center">
                                                                <span className="hidden lg:inline">詳細</span><ChevronRight className="w-4 h-4" />
                                                            </Link>
                                                            <PropertyConfirmButton propertyId={property.id} title={property.title} />
                                                            <DashboardActions
                                                                propertyId={property.id}
                                                                propertyTitle={property.title}
                                                                profile={profile}
                                                                property={property}
                                                                agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>) : (
                                        <div className="p-20 text-center">
                                            <p className="text-slate-400 font-medium">登録されている物件はありません</p>
                                        </div>
                                    )}
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
