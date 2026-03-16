'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PropertyCard from '../property/PropertyCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
                .order('created_at', { ascending: false })
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
            <div className="mt-12 space-y-6 px-4">
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

    return (
        <div className="mt-12 mb-8 space-y-6">
            <div className="w-full mb-8 px-4">
                <h2 className="text-base font-normal text-navy-secondary leading-tight mb-2">
                    {dict.property.agent_other_listings}
                </h2>
                <span className="text-xs text-slate-400 uppercase tracking-widest block font-normal">
                    Other properties by {agentName || 'this agent'}
                </span>
            </div>

            <div className="relative -mx-4 px-4 overflow-visible">
                <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={24}
                    slidesPerView={1.2}
                    navigation={{
                        nextEl: '.swiper-agent-next',
                        prevEl: '.swiper-agent-prev',
                    }}
                    pagination={{ clickable: true, dynamicBullets: true }}
                    breakpoints={{
                        640: { slidesPerView: 2.2 },
                        1024: { slidesPerView: 3.2 },
                        1280: { slidesPerView: 4 }
                    }}
                    className="pb-14"
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

                {/* Custom Navigation */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 z-20 hidden lg:block">
                    <button className="swiper-agent-prev w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-navy-primary hover:bg-navy-primary hover:text-white transition-all -ml-6 border border-slate-100 disabled:opacity-0">
                        <ArrowRight className="w-6 h-6 rotate-180" />
                    </button>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 hidden lg:block">
                    <button className="swiper-agent-next w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-navy-primary hover:bg-navy-primary hover:text-white transition-all -mr-6 border border-slate-100 disabled:opacity-0">
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="mt-4 flex justify-center">
                <Link href={`/${locale}/agents/${agentId}`} className="text-sm font-normal text-navy-primary hover:text-indigo-600 transition-colors flex items-center gap-1 group">
                    {dict.common.view_all}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <style jsx global>{`
                .swiper-pagination-bullet {
                    background: #1e293b !important;
                    opacity: 0.2;
                }
                .swiper-pagination-bullet-active {
                    opacity: 1;
                    background: #0f172a !important;
                }
            `}</style>
        </div>
    )
}
