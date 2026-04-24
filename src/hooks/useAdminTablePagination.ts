'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
    type AdminListLimit,
    parseAdminListLimit,
    parseAdminListPage,
} from '@/lib/admin-list-url'

const PAGE_PARAM = 'page'
const LIMIT_PARAM = 'limit'

export function useAdminTablePagination() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const limit = useMemo(
        () => parseAdminListLimit(searchParams.get(LIMIT_PARAM)),
        [searchParams]
    )
    const page = useMemo(() => parseAdminListPage(searchParams.get(PAGE_PARAM)), [searchParams])

    const replaceQuery = useCallback(
        (mutate: (p: URLSearchParams) => void) => {
            const p = new URLSearchParams(searchParams.toString())
            mutate(p)
            const qs = p.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [pathname, router, searchParams]
    )

    const setPage = useCallback(
        (next: number) => {
            replaceQuery((p) => {
                if (next <= 1) p.delete(PAGE_PARAM)
                else p.set(PAGE_PARAM, String(next))
            })
        },
        [replaceQuery]
    )

    const setLimit = useCallback(
        (next: AdminListLimit) => {
            replaceQuery((p) => {
                p.set(LIMIT_PARAM, String(next))
                p.delete(PAGE_PARAM)
            })
        },
        [replaceQuery]
    )

    return { limit, page, setPage, setLimit, replaceQuery }
}
