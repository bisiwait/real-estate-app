'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Breadcrumb({
    labels = {},
    comparePageTitle,
    homeAriaLabel,
}: {
    labels?: Record<string, string>
    /** /compare 用の末尾ラベル（dict.compare.title） */
    comparePageTitle?: string
    /** ホームアイコン用（dict.common.home） */
    homeAriaLabel?: string
}) {
    const pathname = usePathname()
    const [dynamicLabel, setDynamicLabel] = useState<string | null>(null)

    // ... (rest of the component logic)
    useEffect(() => {
        const handleUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ label: string | null }>
            setDynamicLabel(customEvent.detail.label)
        }

        window.addEventListener('breadcrumb-update', handleUpdate)
        return () => window.removeEventListener('breadcrumb-update', handleUpdate)
    }, [])

    useEffect(() => {
        setDynamicLabel(null)
    }, [pathname])

    const pathSegments = pathname.split('/').filter(segment => segment !== '')
    const localesArr = ['jp', 'en', 'th']
    const hasLocale = localesArr.includes(pathSegments[0])
    const currentLocale = hasLocale ? pathSegments[0] : 'jp'
    const displaySegments = hasLocale ? pathSegments.slice(1) : pathSegments

    // Skip dashboard subpaths that shouldn't be breadcrumbed or have special handling
    if (pathname === '/' || (hasLocale && displaySegments.length === 0)) return null

    // サンクスページはパンくず非表示（レイアウトをシンプルに）
    if (displaySegments[0] === 'signup' && displaySegments[1] === 'success') return null

    // Special handling for dashboard/edit/[id] to avoid "edit" being a link to 404
    const isEditPage = displaySegments[0] === 'dashboard' && displaySegments[1] === 'edit'

    /** /admin-secret/users は一覧ルートが無く 404 になるため、users セグメントはリンクにしない */
    const isAdminUsersNonRoutableSegment = (segment: string, index: number) =>
        displaySegments[0] === 'admin-secret' && segment === 'users' && index === 1

    // 物件掲載: ホーム > ダッシュボード > 物件掲載（URL は /list-property のまま）
    const isListPropertyPage =
        displaySegments.length === 1 && displaySegments[0] === 'list-property'

    // 物件比較: ホーム › マイページ › タイトル（区切りは他ページと同じ ChevronRight）
    const isComparePage = displaySegments.length === 1 && displaySegments[0] === 'compare'

    const dashboardLabel = labels['dashboard'] || 'Dashboard'
    const listPropertyLabel = labels['list-property'] || 'List Property'
    const mypageLabel = labels['mypage'] || 'My Page'
    const compareLabel = comparePageTitle || labels['compare'] || 'Compare'

    if (isComparePage) {
        const mypageHref = `/${currentLocale}/mypage`
        return (
            <nav aria-label="Breadcrumb" className="border-b border-slate-200 bg-slate-50 py-2 sm:py-3">
                <div className="container mx-auto min-w-0 max-w-full px-3 sm:px-4">
                    <ol className="flex min-w-0 touch-pan-x items-center space-x-1 overflow-x-auto overscroll-x-contain whitespace-nowrap text-xs text-slate-500 sm:space-x-2 sm:text-sm">
                        <li>
                            <Link
                                href={`/${currentLocale}`}
                                className="flex items-center transition-colors hover:text-navy-primary"
                                aria-label={homeAriaLabel || 'Home'}
                            >
                                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                            </Link>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="mx-0.5 h-3 w-3 flex-shrink-0 text-slate-400 sm:mx-1 sm:h-4 sm:w-4" aria-hidden />
                            <Link href={mypageHref} className="transition-colors hover:text-navy-primary">
                                {mypageLabel}
                            </Link>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="mx-0.5 h-3 w-3 flex-shrink-0 text-slate-400 sm:mx-1 sm:h-4 sm:w-4" aria-hidden />
                            <span
                                className="max-w-[150px] truncate font-bold text-navy-secondary sm:max-w-none"
                                aria-current="page"
                            >
                                {compareLabel}
                            </span>
                        </li>
                    </ol>
                </div>
            </nav>
        )
    }

    if (isListPropertyPage) {
        const dashboardHref = `/${currentLocale}/dashboard`
        return (
            <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200 py-2 sm:py-3">
                <div className="container mx-auto min-w-0 max-w-full px-3 sm:px-4">
                    <ol className="flex min-w-0 items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-slate-500 overflow-x-auto overscroll-x-contain whitespace-nowrap touch-pan-x">
                        <li>
                            <Link
                                href={`/${currentLocale}`}
                                className="hover:text-navy-primary transition-colors flex items-center"
                            >
                                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="sr-only">Home</span>
                            </Link>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                            <Link href={dashboardHref} className="hover:text-navy-primary transition-colors">
                                {dashboardLabel}
                            </Link>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                            <span className="font-bold text-navy-secondary truncate max-w-[150px] sm:max-w-none" aria-current="page">
                                {listPropertyLabel}
                            </span>
                        </li>
                    </ol>
                </div>
            </nav>
        )
    }

    return (
        <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200 py-2 sm:py-3">
            <div className="container mx-auto min-w-0 max-w-full px-3 sm:px-4">
                <ol className="flex min-w-0 items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-slate-500 overflow-x-auto overscroll-x-contain whitespace-nowrap touch-pan-x">
                    <li>
                        <Link href={`/${currentLocale}`} className="hover:text-navy-primary transition-colors flex items-center">
                            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="sr-only">Home</span>
                        </Link>
                    </li>

                    {displaySegments.map((segment, index) => {
                        const href = `/${currentLocale}/${displaySegments.slice(0, index + 1).join('/')}`
                        const isLast = index === displaySegments.length - 1
                        let label = labels[segment] || segment

                        const isEditSegment = isEditPage && segment === 'edit'
                        const noLinkSegment = isEditSegment || isAdminUsersNonRoutableSegment(segment, index)

                        if (segment.length > 20 && segment.includes('-')) {
                            label = labels['detail'] || 'Detail'
                        }

                        if (label === (labels['detail'] || 'Detail') && !dynamicLabel) {
                            return (
                                <li key={href} className="hidden sm:flex items-center">
                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                                    {isLast || noLinkSegment ? (
                                        <span className="font-bold text-navy-secondary" aria-current={isLast ? 'page' : undefined}>
                                            {label}
                                        </span>
                                    ) : (
                                        <Link href={href} className="hover:text-navy-primary transition-colors">{label}</Link>
                                    )}
                                </li>
                            )
                        }

                        return (
                            <li key={href} className="flex items-center">
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                                {isLast || noLinkSegment ? (
                                    <span
                                        className="font-bold text-navy-secondary truncate max-w-[150px] sm:max-w-none"
                                        aria-current={isLast ? 'page' : undefined}
                                    >
                                        {dynamicLabel || label}
                                    </span>
                                ) : (
                                    <Link href={href} className="hover:text-navy-primary transition-colors">
                                        {label}
                                    </Link>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>
        </nav>
    )
}
