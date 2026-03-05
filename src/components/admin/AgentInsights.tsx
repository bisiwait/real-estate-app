import { useState, useEffect } from 'react'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import {
    TrendingUp,
    Users,
    MessageSquare,
    Eye,
    AlertTriangle,
    RefreshCw,
    ShieldCheck,
    Ban,
    Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Mock Data for the chart
const mockChartData = [
    { name: '2/4', views: 400, inquiries: 24 },
    { name: '2/5', views: 300, inquiries: 13 },
    { name: '2/6', views: 200, inquiries: 98 },
    { name: '2/7', views: 278, inquiries: 39 },
    { name: '2/8', views: 189, inquiries: 48 },
    { name: '2/9', views: 239, inquiries: 38 },
    { name: '2/10', views: 349, inquiries: 43 },
    { name: '2/11', views: 400, inquiries: 24 },
    { name: '2/12', views: 300, inquiries: 13 },
    { name: '2/13', views: 200, inquiries: 98 },
    { name: '2/14', views: 450, inquiries: 40 },
    { name: '2/15', views: 520, inquiries: 55 },
    { name: '2/16', views: 480, inquiries: 30 },
    { name: '2/17', views: 600, inquiries: 70 },
];

export default function AgentInsights({ agentId }: { agentId: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [agentData, setAgentData] = useState<any>(null)
    const [staleProperties, setStaleProperties] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalViews: 0,
        conversions: 0,
        activeListings: 0,
        avgResponseTime: 0
    })

    const [chartData, setChartData] = useState<any[]>([])
    const [dateRange, setDateRange] = useState('30')

    // Profile Settings States
    const [isVerified, setIsVerified] = useState(false)
    const [isSuspended, setIsSuspended] = useState(false)
    const [listingLimit, setListingLimit] = useState(10)
    const [adminNote, setAdminNote] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // 1. Fetch Agent Profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', agentId)
                    .single()

                if (profileError) throw profileError

                setAgentData(profile)
                setIsVerified(profile.is_verified || false)
                setIsSuspended(profile.is_suspended || false)
                setListingLimit(profile.max_listings || 10)
                setAdminNote(profile.admin_notes || '')

                // 2. Fetch Stale Properties (updated > 30 days ago)
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                const { data: stale, error: staleError } = await supabase
                    .from('properties')
                    .select('id, title, updated_at')
                    .eq('user_id', agentId)
                    .lt('updated_at', thirtyDaysAgo.toISOString())
                    .limit(10)

                if (staleError) throw staleError
                setStaleProperties(stale || [])

                // 3. Fetch KPI Stats (derived from property counts and views)
                const { data: props, error: propsError } = await supabase
                    .from('properties')
                    .select('id, status, total_views')
                    .eq('user_id', agentId)

                if (propsError) throw propsError

                const totalViews = props?.reduce((acc: number, p: any) => acc + (p.total_views || 0), 0) || 0
                const activeListings = props?.filter((p: any) => p.status === 'published').length || 0

                setStats({
                    totalViews,
                    activeListings,
                    conversions: 8.4, // Placeholder until inquiry stats are mature
                    avgResponseTime: 1.8 // Placeholder
                })

                // 4. Fetch Chart Data (from property_stats)
                if (props && props.length > 0) {
                    const propIds = props.map((p: any) => p.id)
                    const { data: trendData, error: trendError } = await supabase
                        .from('property_stats')
                        .select('date, views, inquiries')
                        .in('property_id', propIds)
                        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                        .order('date', { ascending: true })

                    if (trendError) throw trendError

                    // Aggregate by date
                    const aggregated: { [key: string]: { name: string, views: number, inquiries: number } } = {}
                    trendData?.forEach(item => {
                        const dateStr = new Date(item.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                        if (!aggregated[dateStr]) {
                            aggregated[dateStr] = { name: dateStr, views: 0, inquiries: 0 }
                        }
                        aggregated[dateStr].views += item.views || 0
                        aggregated[dateStr].inquiries += item.inquiries || 0
                    })

                    setChartData(Object.values(aggregated))
                }

            } catch (error: any) {
                console.error('Error fetching agent insights:', error)
            } finally {
                setLoading(false)
            }
        }

        if (agentId) fetchData()
    }, [agentId, dateRange])

    const [saveSuccess, setSaveSuccess] = useState(false)

    const handleSaveSettings = async () => {
        setSaving(true)
        setSaveSuccess(false)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified: isVerified,
                    is_suspended: isSuspended,
                    max_listings: listingLimit,
                    admin_notes: adminNote
                })
                .eq('id', agentId)

            if (error) {
                throw error
            }

            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (error: any) {
            console.error('Error saving settings:', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <RefreshCw className="w-10 h-10 text-navy-primary animate-spin opacity-20" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="総物件閲覧数"
                    value={stats.totalViews.toLocaleString()}
                    trend="+12%"
                    icon={<Eye className="w-5 h-5" />}
                    color="blue"
                />
                <KPICard
                    title="問い合わせ転換率"
                    value={`${stats.conversions}%`}
                    trend="+2.1%"
                    icon={<MessageSquare className="w-5 h-5" />}
                    color="indigo"
                />
                <KPICard
                    title="公開中物件数"
                    value={stats.activeListings.toString()}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="emerald"
                />
                <KPICard
                    title="平均レスポンス時間"
                    value={`${stats.avgResponseTime}h`}
                    trend="-15%"
                    trendPositive={true}
                    icon={<Users className="w-5 h-5" />}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Chart */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-lg font-black text-navy-secondary">パフォーマンス推移</h4>
                            <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">直近30日のアクティビティ</p>
                        </div>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-navy-secondary outline-none"
                        >
                            <option value="30">過去30日間</option>
                            <option value="7">過去7日間</option>
                        </select>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.length > 0 ? chartData : mockChartData}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '1.25rem',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 'black'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorViews)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stale Properties Check */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-navy-secondary">ヘルスチェック</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">放置物件 (30日以上更新なし)</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {staleProperties.length > 0 ? (
                            staleProperties.map((prop) => {
                                const days = Math.floor((new Date().getTime() - new Date(prop.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                                return (
                                    <div key={prop.id} className="group p-4 bg-slate-50 hover:bg-white border hover:border-amber-200 rounded-2xl transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">未更新 {days}日間</span>
                                            <button className="text-navy-primary hover:text-blue-600 transition-colors" title="リマインド送信">
                                                <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
                                            </button>
                                        </div>
                                        <h5 className="text-xs font-black text-navy-secondary truncate">{prop.title}</h5>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">ID: {prop.id.split('-')[0]}</p>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-20 text-center opacity-40">
                                <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">放置物件はありません</p>
                            </div>
                        )}
                    </div>

                    <button
                        disabled={staleProperties.length === 0}
                        className="w-full mt-6 py-4 bg-navy-primary hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-navy-primary text-white rounded-2xl font-black text-sm transition-all shadow-md active:scale-[0.98]"
                    >
                        一括更新リマインドを送信
                    </button>
                </div>
            </div>

            {/* Admin Controls */}
            <div className="bg-navy-secondary rounded-[2.5rem] p-10 shadow-2xl text-white">
                <div className="flex flex-wrap items-start justify-between gap-10">
                    <div className="flex-1 min-w-[300px]">
                        <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                            <ShieldCheck className="text-emerald-400" />
                            管理コントロール
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className={isVerified ? "text-emerald-400" : "text-slate-400"} />
                                        <span className="text-sm font-black">認証済みエージェント</span>
                                    </div>
                                    <button
                                        onClick={() => setIsVerified(!isVerified)}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${isVerified ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isVerified ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Ban className={isSuspended ? "text-red-400" : "text-slate-400"} />
                                        <span className="text-sm font-black">アカウント一時停止</span>
                                    </div>
                                    <button
                                        onClick={() => setIsSuspended(!isSuspended)}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${isSuspended ? 'bg-red-500' : 'bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isSuspended ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">掲載上限数</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={listingLimit}
                                        onChange={(e) => setListingLimit(parseInt(e.target.value) || 0)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:ring-2 focus:ring-navy-primary"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">件</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-[300px]">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">内部用管理者メモ</label>
                            <Edit3 size={14} className="text-slate-400" />
                        </div>
                        <textarea
                            rows={5}
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="管理者への共有事項を記入してください..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-navy-primary resize-none"
                        />
                        <div className="flex items-center justify-end mt-4 gap-4">
                            {saveSuccess && (
                                <span className="text-emerald-400 text-xs font-black animate-in fade-in slide-in-from-right-2 duration-300">
                                    設定を保存しました
                                </span>
                            )}
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="px-8 py-3 bg-white text-navy-secondary rounded-xl font-black text-sm hover:bg-slate-100 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '設定を保存'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function KPICard({ title, value, trend, icon, color, trendPositive = true }: any) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    }

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={`${colors[color as keyof typeof colors]} p-3 rounded-2xl`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-[10px] font-black ${trendPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
            <p className="text-2xl font-black text-navy-secondary">{value}</p>
        </div>
    )
}
