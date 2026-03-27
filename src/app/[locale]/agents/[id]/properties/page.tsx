import { getDictionary } from '@/lib/i18n/get-dictionary'
import AgentPropertiesList from './AgentPropertiesList'

export const dynamic = 'force-dynamic'

export default async function AgentPropertiesPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { locale, id: agentId } = await params
    const searchParamsObj = await searchParams
    const dict = await getDictionary(locale)

    // We use the admin client here to bypass RLS on the profiles table since public read isn't enabled
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch Agent Name for Header
    const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', agentId)
        .single()

    if (agentError) {
        console.error("Fetch agent error:", agentError)
    }

    if (!agent) {
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Error: Agent Not Found</h1>
                <p>ID: {agentId}</p>
                <p>Error details: {JSON.stringify(agentError)}</p>
                <p>If you recently fixed permissions, try clearing Next.js cache or restarting the dev server.</p>
            </div>
        )
    }

    // Filter Logic
    const type = typeof searchParamsObj.type === 'string' ? searchParamsObj.type : 'all'

    let query = supabase
        .from('properties')
        .select('*, area:areas(name, region:regions(name))', { count: 'exact' })
        .eq('user_id', agentId)
        .eq('status', 'published')

    // Listing Type Filter
    if (type === 'rent') {
        query = query.eq('is_for_rent', true).eq('is_presale', false)
    } else if (type === 'sell') {
        query = query.eq('is_for_sale', true).eq('is_presale', false)
    } else if (type === 'presale') {
        query = query.eq('is_presale', true)
    }

    // Simple Sorting (default newest)
    const sort = typeof searchParamsObj.sort === 'string' ? searchParamsObj.sort : 'newest'
    if (sort === 'price_asc') {
        if (type === 'rent') {
            query = query.order('rent_price', { ascending: true, nullsFirst: false })
            query = query.order('sale_price', { ascending: true, nullsFirst: false })
        } else {
            query = query.order('sale_price', { ascending: true, nullsFirst: false })
            query = query.order('rent_price', { ascending: true, nullsFirst: false })
        }
        query = query.order('price', { ascending: true, nullsFirst: false })
    } else if (sort === 'price_desc') {
        if (type === 'rent') {
            query = query.order('rent_price', { ascending: false, nullsFirst: false })
            query = query.order('sale_price', { ascending: false, nullsFirst: false })
        } else {
            query = query.order('sale_price', { ascending: false, nullsFirst: false })
            query = query.order('rent_price', { ascending: false, nullsFirst: false })
        }
        query = query.order('price', { ascending: false, nullsFirst: false })
    } else {
        query = query.order('created_at', { ascending: false })
    }

    // Temporary Pagination
    query = query.limit(50)

    const { data: properties, count } = await query

    return (
        <AgentPropertiesList
            dict={dict}
            locale={locale}
            agent={agent}
            agentId={agentId}
            properties={properties || []}
            count={count}
            type={type}
            sort={sort}
        />
    )
}
