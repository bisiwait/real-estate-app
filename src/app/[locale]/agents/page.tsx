import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, ChevronRight, ShieldCheck, User } from 'lucide-react'
import { createStaticClient } from '@/lib/supabase/static'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { getPublicSiteUrl } from '@/lib/site-url'

export const revalidate = 120

type AgentsPageDict = {
    meta_title: string
    meta_description: string
    hero_title: string
    hero_subtitle: string
    listings_label: string
    empty_title: string
    empty_desc: string
    verified: string
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const p = dict.agents_page as AgentsPageDict
    const base = getPublicSiteUrl()
    return {
        title: p.meta_title,
        description: p.meta_description,
        alternates: { canonical: `${base}/${locale}/agents` },
        openGraph: {
            title: p.meta_title,
            description: p.meta_description,
            url: `${base}/${locale}/agents`,
            siteName: 'Chonburi Home',
        },
    }
}

type AgentRow = {
    id: string
    full_name: string | null
    avatar_url: string | null
    company_name: string | null
    is_verified: boolean | null
    user_role: string | null
    is_admin: boolean | null
}

export default async function AgentsDirectoryPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const p = dict.agents_page as AgentsPageDict
    const supabase = createStaticClient()

    const { data: published, error: pubError } = await supabase
        .from('properties')
        .select('user_id')
        .eq('status', 'published')

    if (pubError) {
        console.error('[agents] properties fetch:', pubError)
    }

    const listingCount = new Map<string, number>()
    for (const row of published ?? []) {
        const uid = row.user_id as string | null
        if (!uid) continue
        listingCount.set(uid, (listingCount.get(uid) ?? 0) + 1)
    }

    const ownerIds = [...listingCount.keys()]

    let agents: AgentRow[] = []
    if (ownerIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, company_name, is_verified, user_role, is_admin')
            .in('id', ownerIds)

        if (profError) {
            console.error('[agents] profiles fetch:', profError)
        } else {
            agents = (profiles ?? []).filter(
                (row) => row.user_role !== 'admin' && row.is_admin !== true
            ) as AgentRow[]
        }
    }

    const sorted = [...agents].sort((a, b) => {
        const ca = listingCount.get(a.id) ?? 0
        const cb = listingCount.get(b.id) ?? 0
        if (cb !== ca) return cb - ca
        return (a.full_name || '').localeCompare(b.full_name || '', locale === 'jp' ? 'ja' : undefined)
    })

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-navy-secondary text-white pt-20 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-6 h-full w-full">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="border border-white/10" />
                        ))}
                    </div>
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl font-black mb-4 tracking-tight">{p.hero_title}</h1>
                    <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">{p.hero_subtitle}</p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sorted.map((agent) => {
                        const count = listingCount.get(agent.id) ?? 0
                        return (
                            <Link
                                key={agent.id}
                                href={`/${locale}/agents/${agent.id}`}
                                className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col items-start text-left"
                            >
                                <div className="flex items-start gap-4 w-full mb-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                                        {agent.avatar_url ? (
                                            <Image
                                                src={agent.avatar_url}
                                                alt={agent.full_name || 'Agent'}
                                                width={80}
                                                height={80}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-10 h-10 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-xl font-black text-navy-secondary group-hover:text-navy-primary transition-colors truncate">
                                                {agent.full_name || 'Agent'}
                                            </h2>
                                            {agent.is_verified && (
                                                <span
                                                    className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-tight text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"
                                                    title={p.verified}
                                                >
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {p.verified}
                                                </span>
                                            )}
                                        </div>
                                        {agent.company_name && (
                                            <p className="text-sm text-slate-500 font-medium mt-1 truncate">{agent.company_name}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto w-full pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {p.listings_label}
                                        </span>
                                        <span className="text-sm font-black text-navy-secondary">{count}</span>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-navy-primary group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {sorted.length === 0 && (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-slate-100">
                        <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-navy-secondary mb-2">{p.empty_title}</h3>
                        <p className="text-slate-500 max-w-md mx-auto">{p.empty_desc}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
