export type ListingFormArea = {
    id: string
    name: string
    region: { name: string }
}

/** 物件登録フォーム用: Pattaya → Sriracha → その他 */
export function sortListingFormAreas(areas: ListingFormArea[]): ListingFormArea[] {
    return [...areas].sort((a, b) => {
        const regionA = a.region?.name || ''
        const regionB = b.region?.name || ''
        if (regionA === 'Pattaya' && regionB !== 'Pattaya') return -1
        if (regionA !== 'Pattaya' && regionB === 'Pattaya') return 1
        if (regionA === 'Sriracha' && regionB !== 'Sriracha') return -1
        if (regionA !== 'Sriracha' && regionB === 'Sriracha') return 1
        if (regionA !== regionB) return regionA.localeCompare(regionB)
        return a.name.localeCompare(b.name)
    })
}
