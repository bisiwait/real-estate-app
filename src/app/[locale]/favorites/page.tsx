import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import { Heart, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { getDictionary } from '@/lib/i18n/get-dictionary'

export default async function FavoritesPage({ params }: { params: { locale: string } }) {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${locale}/login`)
    }

    // Role check for admins and agents
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin'
    const isAgent = profile?.user_role === 'agent'

    if (isAdmin) {
        redirect(`/${locale}/admin-secret`)
    }
    if (isAgent) {
        redirect(`/${locale}/dashboard`)
    }

    const { data: favorites, error } = await supabase
        .from('favorites')
        .select(`
            property:properties (
                *,
                area:areas (
                    name,
                    region:regions (
                        name
                    )
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching favorites:', error)
    }

    const favoriteProperties = (favorites || [])
        .map(f => f.property)
        .filter(Boolean)
        .map((p: any) => ({
            ...p,
            city_name: p.area?.region?.name || 'Pattaya',
            area_name: p.area?.name || 'Unknown'
        }))

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-20 [overflow-anchor:none]">
            {/* Header（大きな blur はスクロール時の合成コストが高いため控えめに） */}
            <div className="relative overflow-hidden bg-navy-secondary pb-24 pt-20 text-white">
                <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-400" />
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex items-center space-x-4 mb-6">
                        <Link href={`/${locale}/properties`} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-4xl font-black tracking-tight flex items-center">
                            <Heart className="w-8 h-8 mr-4 text-red-400 fill-current" />
                            {dict.labels.favorites}
                        </h1>
                    </div>
                    <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
                        {dict.labels.no_favorites_desc}
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="container mx-auto px-4 -mt-10 relative z-20">
                {favoriteProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favoriteProperties.map((property: any) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                                dict={dict}
                                hideFavoriteButton
                                openDetailInNewTab
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-slate-100 max-w-3xl mx-auto">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Heart className="w-12 h-12 text-red-200" />
                        </div>
                        <h3 className="text-2xl font-black text-navy-secondary mb-4">{dict.labels.no_favorites}</h3>
                        <p className="text-slate-500 mb-10 text-lg">
                            {dict.labels.no_favorites_desc}
                        </p>
                        <Link
                            href={`/${locale}/properties`}
                            className="inline-flex items-center bg-navy-primary text-white px-10 py-4 rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
                        >
                            <Home className="w-5 h-5 mr-3" />
                            {dict.labels.go_find_properties}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
