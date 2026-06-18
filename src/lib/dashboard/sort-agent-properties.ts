export type AgentDashboardPropertySort = 'newest' | 'oldest' | 'price_asc' | 'price_desc'

function updatedAtMs(row: { updated_at?: string | null; created_at?: string | null }): number {
    const raw = row.updated_at || row.created_at
    const t = raw ? new Date(raw).getTime() : 0
    return Number.isFinite(t) ? t : 0
}

function sortPriceForFilter(
    row: { rent_price?: number | null; sale_price?: number | null },
    filter: string
): number | null {
    if (filter === 'rent') {
        const n = Number(row.rent_price)
        return Number.isFinite(n) ? n : null
    }
    if (filter === 'sale' || filter === 'presale') {
        const n = Number(row.sale_price)
        return Number.isFinite(n) ? n : null
    }
    return null
}

export function isAgentDashboardPriceSortAllowed(filter: string): boolean {
    return filter === 'rent' || filter === 'sale' || filter === 'presale'
}

export function sortAgentDashboardProperties<T extends Record<string, unknown>>(
    items: T[],
    sort: AgentDashboardPropertySort,
    filter: string
): T[] {
    const copy = [...items]

    copy.sort((a, b) => {
        if (sort === 'newest') {
            return updatedAtMs(b) - updatedAtMs(a)
        }
        if (sort === 'oldest') {
            return updatedAtMs(a) - updatedAtMs(b)
        }

        const priceA = sortPriceForFilter(a, filter)
        const priceB = sortPriceForFilter(b, filter)
        if (priceA == null && priceB == null) {
            return updatedAtMs(b) - updatedAtMs(a)
        }
        if (priceA == null) return 1
        if (priceB == null) return -1
        if (sort === 'price_asc') {
            return priceA - priceB || updatedAtMs(b) - updatedAtMs(a)
        }
        if (sort === 'price_desc') {
            return priceB - priceA || updatedAtMs(b) - updatedAtMs(a)
        }
        return 0
    })

    return copy
}
