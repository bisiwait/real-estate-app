/** unstable_cache / revalidateTag 用（物件一覧） */
export const PROPERTY_LIST_CACHE_TAG = 'properties-list'

export function propertyListCacheTagForFilters(keyParts: string[]): string[] {
    return [PROPERTY_LIST_CACHE_TAG, ...keyParts]
}
