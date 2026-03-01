'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PropertyCard from './PropertyCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { MessageSquare, ArrowRight, Home } from 'lucide-react'
import Link from 'next/link'

interface RelatedPropertiesProps {
    currentPropertyId: string
    buildingName: string | null
    projectName: string | null
}

export default function RelatedProperties({ currentPropertyId, buildingName, projectName }: RelatedPropertiesProps) {
    const [properties, setProperties] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchRelatedProperties() {
            if (!buildingName && !projectName) {
                setLoading(false)
                return
            }

            let query = supabase
                .from('active_listings')
                .select('*')
                .neq('id', currentPropertyId)
                .limit(6)

            // Match by building_name or project_name
            const filters = []
            if (buildingName) filters.push(`building_name.eq.${buildingName}`)
            if (projectName) filters.push(`project_name.eq.${projectName}`)

            if (filters.length > 0) {
                query = query.or(filters.join(','))
            } else {
                setLoading(false)
                return
            }

            const { data, error } = await query

            if (error) {
                console.error('Error fetching related properties:', error)
            } else {
                setProperties(data || [])
            }
            setLoading(false)
        }

        fetchRelatedProperties()
    }, [currentPropertyId, buildingName, projectName, supabase])

    if (loading) {
        return (
            <div className="mt-20 space-y-8">
                <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (properties.length === 0) {
        return null // 関連物件がない場合は何も表示しない
    }

    return (
        <div className="mt-24 space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-navy-secondary mb-2">
                        この建物の他の物件
                    </h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Other units in {buildingName || projectName}
                    </p>
                </div>
                <div className="hidden md:flex space-x-3">
                    {/* Navigation buttons will be handled by Swiper, but we can style them */}
                </div>
            </div>

            <div className="relative -mx-4 px-4 overflow-visible">
                <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={24}
                    slidesPerView={1.2}
                    navigation={{
                        nextEl: '.swiper-related-next',
                        prevEl: '.swiper-related-prev',
                    }}
                    pagination={{ clickable: true, dynamicBullets: true }}
                    breakpoints={{
                        640: { slidesPerView: 2.2 },
                        1024: { slidesPerView: 3.2 },
                        1280: { slidesPerView: 4 }
                    }}
                    className="pb-14"
                >
                    {properties.map((prop) => (
                        <SwiperSlide key={prop.id}>
                            <PropertyCard property={prop} />
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Custom Navigation */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 z-20 hidden lg:block">
                    <button className="swiper-related-prev w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-navy-primary hover:bg-navy-primary hover:text-white transition-all -ml-6 border border-slate-100 disabled:opacity-0">
                        <ArrowRight className="w-6 h-6 rotate-180" />
                    </button>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 hidden lg:block">
                    <button className="swiper-related-next w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-navy-primary hover:bg-navy-primary hover:text-white transition-all -mr-6 border border-slate-100 disabled:opacity-0">
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
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
