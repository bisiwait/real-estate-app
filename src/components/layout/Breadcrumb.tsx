'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'

// パスセグメントを日本語に変換するためのマッピング辞書
const pathTranslations: Record<string, string> = {
    'properties': '物件を探す',
    'auth': '認証',
    'callback': '処理中',
    'login': 'ログイン',
    'register': '新規登録',
    'pricing': '料金プラン',
    'dashboard': 'ダッシュボード',
    'profile': 'プロフィール',
    'favorites': 'お気に入り',
    'list-property': '物件を掲載する',
    'about': '当サイトについて',
    'contact': 'お問い合わせ',
    'lp': 'ランディングページ',
    'post-property': '物件掲載ガイド',
    'admin-secret': '管理者画面',
}

export default function Breadcrumb() {
    const pathname = usePathname()
    const [dynamicLabel, setDynamicLabel] = useState<string | null>(null)

    // カスタムイベントをリッスンして動的ラベルを設定
    useEffect(() => {
        const handleUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ label: string | null }>
            setDynamicLabel(customEvent.detail.label)
        }

        window.addEventListener('breadcrumb-update', handleUpdate)
        return () => window.removeEventListener('breadcrumb-update', handleUpdate)
    }, [])

    // パスが変わったら一旦リセットする
    useEffect(() => {
        setDynamicLabel(null)
    }, [pathname])

    // トップページの場合はパンくずリストを表示しない
    if (pathname === '/') return null

    // パスを「/」で分割し、空文字を除外
    const pathSegments = pathname.split('/').filter(segment => segment !== '')

    return (
        <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-200 py-2 sm:py-3">
            <div className="container mx-auto px-3 sm:px-4">
                <ol className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-slate-500 overflow-x-auto whitespace-nowrap">
                    <li>
                        <Link href="/" className="hover:text-navy-primary transition-colors flex items-center">
                            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="sr-only">ホーム</span>
                        </Link>
                    </li>

                    {pathSegments.map((segment, index) => {
                        const href = `/${pathSegments.slice(0, index + 1).join('/')}`
                        const isLast = index === pathSegments.length - 1
                        let label = pathTranslations[segment] || segment

                        if (segment.length > 20 && segment.includes('-')) {
                            label = '詳細'
                        }

                        // スマホでは「詳細」を非表示にする
                        if (label === '詳細' && !dynamicLabel) {
                            return (
                                <li key={href} className="hidden sm:flex items-center">
                                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                                    {isLast ? (
                                        <span className="font-bold text-navy-secondary" aria-current="page">{label}</span>
                                    ) : (
                                        <Link href={href} className="hover:text-navy-primary transition-colors">{label}</Link>
                                    )}
                                </li>
                            )
                        }

                        return (
                            <li key={href} className="flex items-center">
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-slate-400 flex-shrink-0" />
                                {isLast ? (
                                    <span className="font-bold text-navy-secondary truncate max-w-[150px] sm:max-w-none" aria-current="page">
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
