import type { ListingFormArea } from '@/lib/listing-form/sort-areas'

export type ListingFormMetaPayload = {
    areas: ListingFormArea[]
    projects: Record<string, unknown>[]
    developers: { id: string; name: string }[]
}

export async function fetchListingFormMeta(): Promise<ListingFormMetaPayload> {
    const res = await fetch('/api/agent/listing-form-meta', { credentials: 'include' })
    const json = (await res.json().catch(() => ({}))) as ListingFormMetaPayload & { error?: string }
    if (!res.ok) {
        throw new Error(json.error || 'エリア一覧の取得に失敗しました。')
    }
    return {
        areas: json.areas ?? [],
        projects: (json.projects ?? []) as Record<string, unknown>[],
        developers: json.developers ?? [],
    }
}
