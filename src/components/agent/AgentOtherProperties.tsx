'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PropertyCard from '../property/PropertyCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface AgentOtherPropertiesProps {
    agentId: string
    currentPropertyId: string
    agentName?: string
    dict: any
    locale: string
}

export default function AgentOtherProperties({ agentId, currentPropertyId, agentName, dict, locale }: AgentOtherPropertiesProps) {
    const [properties, setProperties] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchAgentProperties() {
            setLoading(true)
            const { data, error } = await supabase
                .from('properties')
                .select(`
                    *,
                    area:areas(
                        name,
                        region:regions(name)
                    ),
                    project:projects(*)
                `)
                .eq('user_id', agentId)
                .in('status', ['published', 'under_negotiation', 'contracted'])
                .neq('id', currentPropertyId)
                .order('updated_at', { ascending: false })
                .limit(8)

            if (error) {
                console.error('Error fetching agent properties:', error)
            } else {
                setProperties(data || [])
            }
            setLoading(false)
        }

        fetchAgentProperties()
    }, [agentId, currentPropertyId, supabase])

    if (loading) {
        return (
            <div className="mt-16 space-y-6 px-4">
                <div className="h-6 w-48 bg-slate-100 animate-pulse rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (properties.length === 0) {
        return null
    }

    const agentListingsUrl = `/${locale}/agents/${agentId}/properties`

    return (
        <div className="mt-16 mb-8 space-y-6">
            <div className="mb-6 px-4">
                <div className="flex flex-wrap items-end justify-between gap-3 gap-y-2">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-normal text-navy-secondary leading-tight">
                            {dict.property.agent_other_listings}
                        </h2>
                        <span className="mt-1 text-xs text-slate-400 uppercase tracking-widest block font-normal">
                            Other properties by {agentName || 'this agent'}
                        </span>
                    </div>
                    <Link
                        href={agentListingsUrl}
                        className="shrink-0 text-sm font-normal text-navy-primary hover:text-indigo-600 transition-colors underline-offset-4 hover:underline"
                    >
                        {dict.common?.view_all ?? 'すべて見る'}
                    </Link>
                </div>
            </div>

            <div className="relative -mx-4 overflow-visible px-4 pt-2 md:px-10">
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={24}
                    slidesPerView={1.2}
                    navigation={{
                        nextEl: '.swiper-agent-next',
                        prevEl: '.swiper-agent-prev',
                    }}
                    breakpoints={{
                        640: { slidesPerView: 2.2 },
                        1024: { slidesPerView: 3.2 },
                        1280: { slidesPerView: 4 }
                    }}
                    className="!pb-1"
                >
                    {properties.map((prop) => {
                        const formattedProp = {
                            ...prop,
                            area_name: prop.area?.name,
                            city_name: prop.area?.region?.name
                        }
                        return (
                            <SwiperSlide key={prop.id}>
                                <PropertyCard property={formattedProp} dict={dict} />
                            </SwiperSlide>
                        )
                    })}
                </Swiper>

                <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-12 md:block">
                    <button
                        type="button"
                        aria-label="Previous"
                        className="swiper-agent-prev pointer-events-auto absolute top-1/2 left-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-navy-primary shadow-lg transition-all hover:bg-navy-primary hover:text-white disabled:pointer-events-none disabled:opacity-0"
                    >
                        <ArrowRight className="h-5 w-5 rotate-180" />
                    </button>
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-12 md:block">
                    <button
                        type="button"
                        aria-label="Next"
                        className="swiper-agent-next pointer-events-auto absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-navy-primary shadow-lg transition-all hover:bg-navy-primary hover:text-white disabled:pointer-events-none disabled:opacity-0"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
