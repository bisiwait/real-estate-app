import { revalidatePath, revalidateTag } from 'next/cache'
import { PROPERTY_LIST_CACHE_TAG } from '@/lib/services/propertyListCacheTags'

/** 物件の公開状態が変わったあと一覧キャッシュを無効化 */
export function revalidatePropertyListPages() {
    revalidateTag(PROPERTY_LIST_CACHE_TAG)
    for (const locale of ['jp', 'en', 'th'] as const) {
        revalidatePath(`/${locale}/properties`)
    }
    revalidatePath('/')
}
